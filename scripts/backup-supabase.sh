#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${JUCART_SUPABASE_BACKUP_DIR:-$REPO_ROOT/var/backups/supabase}"
LOG_DIR="${JUCART_SUPABASE_LOG_DIR:-$REPO_ROOT/var/log}"
RETENTION_DAYS="${JUCART_SUPABASE_BACKUP_RETENTION_DAYS:-14}"
PNPM_BIN="${PNPM_BIN:-pnpm}"

STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
START_SECONDS="$(date -u +%s)"
ARCHIVE_NAME="jucart-supabase-${STAMP}.sql.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"
TEMP_DIR=""

cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}

sql_literal() {
  printf "'"
  printf "%s" "$1" | sed "s/'/''/g"
  printf "'"
}

duration_ms() {
  local finished_seconds
  finished_seconds="$(date -u +%s)"
  printf "%s" "$(((finished_seconds - START_SECONDS) * 1000))"
}

count_retained_backups() {
  find "$BACKUP_DIR" -type f -name "jucart-supabase-*.sql.tar.gz" | wc -l | tr -d " "
}

record_backup_run() {
  local status="$1"
  local finished_at="$2"
  local file_name="$3"
  local file_size_bytes="$4"
  local sha256="$5"
  local run_duration_ms="$6"
  local retained_count="$7"
  local error_message="$8"
  local sql_file

  sql_file="$(mktemp)"

  {
    printf "insert into public.developer_backup_runs (started_at, finished_at, status, file_name, file_size_bytes, sha256, duration_ms, retained_count, error_message) values ("
    sql_literal "$STARTED_AT"
    printf "::timestamptz, "
    sql_literal "$finished_at"
    printf "::timestamptz, "
    sql_literal "$status"
    printf ", "
    if [[ -n "$file_name" ]]; then sql_literal "$file_name"; else printf "null"; fi
    printf ", "
    if [[ -n "$file_size_bytes" ]]; then printf "%s" "$file_size_bytes"; else printf "null"; fi
    printf ", "
    if [[ -n "$sha256" ]]; then sql_literal "$sha256"; else printf "null"; fi
    printf ", %s, %s, " "$run_duration_ms" "$retained_count"
    if [[ -n "$error_message" ]]; then sql_literal "$error_message"; else printf "null"; fi
    printf ");\n"
  } > "$sql_file"

  (
    cd "$REPO_ROOT" &&
      "$PNPM_BIN" exec supabase db query --linked --file "$sql_file" >/dev/null
  )
  local query_status=$?
  rm -f "$sql_file"

  return "$query_status"
}

run_backup() {
  mkdir -p "$BACKUP_DIR" "$LOG_DIR"
  TEMP_DIR="$(mktemp -d)"

  node "$SCRIPT_DIR/export-supabase-backup.mjs" \
    "$TEMP_DIR/schema.sql" \
    "$TEMP_DIR/data.sql" || return 1

  {
    printf "backup_started_at=%s\n" "$STARTED_AT"
    printf "backup_file=%s\n" "$ARCHIVE_NAME"
    printf "schema_file=schema.sql\n"
    printf "data_file=data.sql\n"
  } > "$TEMP_DIR/manifest.txt"

  tar -czf "$ARCHIVE_PATH.tmp" -C "$TEMP_DIR" schema.sql data.sql manifest.txt || return 1
  mv "$ARCHIVE_PATH.tmp" "$ARCHIVE_PATH" || return 1

  find "$BACKUP_DIR" -type f -name "jucart-supabase-*.sql.tar.gz" -mtime +"$RETENTION_DAYS" -delete
}

main() {
  trap cleanup EXIT

  if run_backup; then
    local finished_at
    local file_size_bytes
    local sha256
    local retained_count

    finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    file_size_bytes="$(stat -c "%s" "$ARCHIVE_PATH")"
    sha256="$(sha256sum "$ARCHIVE_PATH" | awk '{print $1}')"
    retained_count="$(count_retained_backups)"

    record_backup_run \
      "success" \
      "$finished_at" \
      "$ARCHIVE_NAME" \
      "$file_size_bytes" \
      "$sha256" \
      "$(duration_ms)" \
      "$retained_count" \
      "" || printf "Backup created, but metadata could not be recorded in Supabase.\n" >&2

    printf "Backup created: %s\n" "$ARCHIVE_PATH"
    return 0
  fi

  local finished_at
  local retained_count
  finished_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  mkdir -p "$BACKUP_DIR"
  retained_count="$(count_retained_backups)"

  record_backup_run \
    "failed" \
    "$finished_at" \
    "" \
    "" \
    "" \
    "$(duration_ms)" \
    "$retained_count" \
    "Supabase backup command failed." || true

  printf "Supabase backup failed.\n" >&2
  return 1
}

main "$@"
