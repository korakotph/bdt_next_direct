#!/bin/bash
# scripts/export_data.sh — ใช้กับ Mac / Linux

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# ── Color helpers ─────────────────────────────────────────────
C_CYAN='\033[0;36m'; C_GREEN='\033[0;32m'
C_YELLOW='\033[1;33m'; C_RED='\033[0;31m'; C_RESET='\033[0m'
SEP=$(printf '═%.0s' {1..54})

banner()    { echo -e "\n${C_CYAN}${SEP}\n  $1\n${SEP}${C_RESET}"; }
step()      { echo -e "\n${C_YELLOW}▶  $1${C_RESET}"; }
ok()        { echo -e "   ${C_GREEN}✔  $1${C_RESET}"; }
warn()      { echo -e "   ${C_YELLOW}⚠  $1${C_RESET}"; }
err()       { echo -e "   ${C_RED}✘  $1${C_RESET}"; }
pause_exit() { read -rp $'\nกด Enter เพื่อออก...'; exit 1; }

# ── Read container info from docker-compose.yaml ──────────────
PG_CONTAINER="bdt_directus_db"
if [ -f "docker-compose.yaml" ]; then
    _pg=$(grep 'container_name:' docker-compose.yaml | grep '_db\b' | awk '{print $2}' | head -1)
    [ -n "$_pg" ] && PG_CONTAINER="$_pg"
fi

banner "BDT Next Direct — Data Exporter"
echo -e "\n  PostgreSQL container : $PG_CONTAINER"

# ── Check Docker ──────────────────────────────────────────────
step "ตรวจสอบ Docker"
if ! docker info &>/dev/null; then
    err "Docker ไม่ได้รันอยู่"
    pause_exit
fi
ok "Docker พร้อมใช้งาน"

# ── Check container running ───────────────────────────────────
STATE=$(docker inspect --format '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null || echo "false")
if [ "$STATE" != "true" ]; then
    err "Container '$PG_CONTAINER' ไม่ได้รันอยู่"
    echo "     รัน: docker compose up -d  แล้วลองใหม่"
    pause_exit
fi
ok "Container '$PG_CONTAINER' กำลังรัน"

# ── Create export dir ─────────────────────────────────────────
TS=$(date '+%Y%m%d_%H%M%S')
EXPORT_DIR="$PROJECT_DIR/_export_${TS}"
mkdir -p "$EXPORT_DIR"
PARTS=()

# ── Export database ───────────────────────────────────────────
step "Export database"
DUMP_OUT="$EXPORT_DIR/dump.sql"
if docker exec "$PG_CONTAINER" pg_dump -U directus --no-owner --no-acl directus > "$DUMP_OUT"; then
    KB=$(du -k "$DUMP_OUT" | cut -f1)
    ok "dump.sql  (${KB} KB)"
    PARTS+=("dump.sql")
else
    warn "pg_dump มีปัญหา"
fi

# ── Export uploads ────────────────────────────────────────────
step "Export uploads"
UPLOADS_SRC="$PROJECT_DIR/directus/uploads"
if [ -d "$UPLOADS_SRC" ]; then
    mkdir -p "$EXPORT_DIR/directus"
    cp -r "$UPLOADS_SRC" "$EXPORT_DIR/directus/uploads"
    FC=$(find "$EXPORT_DIR/directus/uploads" -type f | wc -l | tr -d ' ')
    ok "directus/uploads/  ($FC files)"
    PARTS+=("directus/uploads/")
else
    warn "ไม่พบ directus/uploads/ — ข้าม"
fi

# ── Create zip ────────────────────────────────────────────────
step "สร้าง zip archive"
ZIP_NAME="export_${TS}.zip"
ZIP_PATH="$PROJECT_DIR/$ZIP_NAME"
(cd "$EXPORT_DIR" && zip -r "$ZIP_PATH" . -q)
MB=$(du -m "$ZIP_PATH" | cut -f1)
FC=$(find "$EXPORT_DIR" -type f | wc -l | tr -d ' ')
ok "$ZIP_NAME  ($FC files, ${MB} MB)"

# ── Cleanup ───────────────────────────────────────────────────
rm -rf "$EXPORT_DIR"

# ── Summary ───────────────────────────────────────────────────
echo -e "\n${C_CYAN}${SEP}${C_RESET}"
echo -e "${C_GREEN}  ✔  Export เสร็จสมบูรณ์!${C_RESET}"
echo -e "${C_CYAN}${SEP}${C_RESET}"
echo ""
echo "  ไฟล์ : $ZIP_NAME"
echo "  ที่   : $PROJECT_DIR"
echo ""
echo "  ภายใน zip"
for p in "${PARTS[@]}"; do echo -e "    ${C_GREEN}✔${C_RESET}  $p"; done
echo ""
echo "  วิธีนำเข้าบนเครื่องใหม่"
echo "    1. แตก zip → วางทับโฟลเดอร์โปรเจกต์"
echo "    2. double-click install.command (Mac) หรือ install.bat (Windows)"
echo -e "${C_CYAN}${SEP}${C_RESET}"

read -rp $'\nกด Enter เพื่อออก...'
