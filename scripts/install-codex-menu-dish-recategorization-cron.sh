#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${JUCART_MENU_DISH_RECAT_LOG_DIR:-$REPO_ROOT/var/log}"
SCHEDULE="${JUCART_MENU_DISH_RECAT_CRON_SCHEDULE:-15 3 * * *}"
LIBRARY_ID="${JUCART_MENU_DISH_LIBRARY_ID:-}"
if [[ -z "$LIBRARY_ID" ]]; then
  printf "JUCART_MENU_DISH_LIBRARY_ID is required to install this cron.\n" >&2
  exit 1
fi
CRON_COMMAND="JUCART_MENU_DISH_LIBRARY_ID=$LIBRARY_ID node $REPO_ROOT/scripts/schedule-menu-dish-recategorization.mjs >> $LOG_DIR/jucart-menu-dish-recategorization.cron.log 2>&1"
NODE_DIR="$(dirname "$(command -v node)")"
SYSTEM_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
CRON_PATH="${JUCART_MENU_DISH_RECAT_CRON_PATH:-$NODE_DIR:$SYSTEM_PATH}"
BEGIN_MARKER="# BEGIN Jucart Codex menu dish recategorization"
END_MARKER="# END Jucart Codex menu dish recategorization"
TEMP_CRON="$(mktemp)"

mkdir -p "$LOG_DIR"

{
  crontab -l 2>/dev/null | sed "/$BEGIN_MARKER/,/$END_MARKER/d" || true
  printf "%s\n" "$BEGIN_MARKER"
  printf "PATH=%s\n" "$CRON_PATH"
  printf "%s %s\n" "$SCHEDULE" "$CRON_COMMAND"
  printf "%s\n" "$END_MARKER"
} > "$TEMP_CRON"

crontab "$TEMP_CRON"
rm -f "$TEMP_CRON"

printf "Installed Jucart menu dish recategorization cron: %s %s\n" "$SCHEDULE" "$CRON_COMMAND"
