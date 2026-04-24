#!/bin/bash
# installer/update_dump.sh
# Export current database to dump.sql and apply ON DELETE SET NULL patch

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

C_CYAN='\033[0;36m'; C_GREEN='\033[0;32m'
C_YELLOW='\033[1;33m'; C_RED='\033[0;31m'; C_RESET='\033[0m'
SEP=$(printf '═%.0s' {1..54})

banner()    { echo -e "\n${C_CYAN}${SEP}\n  $1\n${SEP}${C_RESET}"; }
step()      { echo -e "\n${C_YELLOW}▶  $1${C_RESET}"; }
ok()        { echo -e "   ${C_GREEN}✔  $1${C_RESET}"; }
err()       { echo -e "   ${C_RED}✘  $1${C_RESET}"; }
pause_exit() { err "$1"; read -rp $'\nPress Enter to exit...'; exit 1; }

PG_CONTAINER="bdt_directus_db"
if [ -f "docker-compose.yaml" ]; then
    _pg=$(grep 'container_name:' docker-compose.yaml | grep '_db\b' | awk '{print $2}' | head -1)
    [ -n "$_pg" ] && PG_CONTAINER="$_pg"
fi

DUMP_PATH="$PROJECT_DIR/dump.sql"

banner "BDT Next Direct - Update dump.sql"
echo -e "\n  Container : $PG_CONTAINER"
echo    "  Output    : dump.sql"

step "Checking Docker"
docker info &>/dev/null || pause_exit "Docker is not running."
ok "Docker is ready"

STATE=$(docker inspect --format '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null || echo "false")
[ "$STATE" = "true" ] || pause_exit "Container '$PG_CONTAINER' is not running. Run: docker compose up -d"
ok "Container '$PG_CONTAINER' is running"

# backup
[ -f "$DUMP_PATH" ] && cp "$DUMP_PATH" "${DUMP_PATH}.bak" && ok "Old dump.sql backed up -> dump.sql.bak"

# export
step "Exporting database"
docker exec "$PG_CONTAINER" pg_dump -U directus --no-owner --no-acl directus > "$DUMP_PATH"
KB=$(du -k "$DUMP_PATH" | cut -f1)
ok "Exported dump.sql (${KB} KB)"

# patch ON DELETE SET NULL
step "Patching FK constraints (ON DELETE SET NULL)"
BEFORE=$(grep -c 'REFERENCES public\.directus_users(id);' "$DUMP_PATH" || true)
perl -i -pe 's/REFERENCES public\.directus_users\(id\);/REFERENCES public.directus_users(id) ON DELETE SET NULL;/g' "$DUMP_PATH"
ok "Patched $BEFORE constraint(s) -> ON DELETE SET NULL"

echo -e "\n${C_CYAN}${SEP}${C_RESET}"
echo -e "${C_GREEN}  DONE!${C_RESET}"
echo -e "${C_CYAN}${SEP}${C_RESET}"
echo ""
echo "  dump.sql is ready. Commit and push to update the repo."
echo -e "${C_CYAN}${SEP}${C_RESET}"

read -rp $'\nPress Enter to exit...'
