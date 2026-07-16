#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${JUCART_SUPABASE_LOG_DIR:-$REPO_ROOT/var/log}"
SCHEDULE="${JUCART_SUPABASE_BACKUP_CRON_SCHEDULE:-0 */6 * * *}"
CRON_COMMAND="$REPO_ROOT/scripts/backup-supabase.sh >> $LOG_DIR/supabase-backup.cron.log 2>&1"
NODE_DIR="$(dirname "$(command -v node)")"
PNPM_DIR="$(dirname "$(command -v pnpm)")"
SYSTEM_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
if [[ "$NODE_DIR" == "$PNPM_DIR" ]]; then
  DEFAULT_CRON_PATH="$NODE_DIR:$SYSTEM_PATH"
else
  DEFAULT_CRON_PATH="$NODE_DIR:$PNPM_DIR:$SYSTEM_PATH"
fi
CRON_PATH="${JUCART_SUPABASE_BACKUP_CRON_PATH:-$DEFAULT_CRON_PATH}"
RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
DBUS_ADDRESS="${JUCART_SUPABASE_BACKUP_DBUS_ADDRESS:-unix:path=$RUNTIME_DIR/bus}"
BEGIN_MARKER="# BEGIN Jucart Supabase backup"
END_MARKER="# END Jucart Supabase backup"
TEMP_CRON="$(mktemp)"

mkdir -p "$LOG_DIR"

{
  crontab -l 2>/dev/null | sed "/$BEGIN_MARKER/,/$END_MARKER/d" || true
  printf "%s\n" "$BEGIN_MARKER"
  printf "PATH=%s\n" "$CRON_PATH"
  printf "XDG_RUNTIME_DIR=%s\n" "$RUNTIME_DIR"
  printf "DBUS_SESSION_BUS_ADDRESS=%s\n" "$DBUS_ADDRESS"
  printf "%s %s\n" "$SCHEDULE" "$CRON_COMMAND"
  printf "%s\n" "$END_MARKER"
} > "$TEMP_CRON"

crontab "$TEMP_CRON"
rm -f "$TEMP_CRON"

printf "Installed Jucart Supabase backup cron: %s %s\n" "$SCHEDULE" "$CRON_COMMAND"
