#!/bin/bash
# scripts/install.sh — ใช้กับ Mac / Linux

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

# ── Sanitize → prefix ─────────────────────────────────────────
FOLDER_NAME="$(basename "$PROJECT_DIR")"
PREFIX=$(echo "$FOLDER_NAME" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9_-]/_/g' \
    | sed 's/__*/_/g' \
    | sed 's/^_//; s/_$//')
[ -z "$PREFIX" ] && PREFIX="app"

banner "BDT Next Direct — Docker Installer"
echo -e "\n  โฟลเดอร์  : $FOLDER_NAME"
echo    "  Container : ${PREFIX}_*"

# ── Check Docker ──────────────────────────────────────────────
step "ตรวจสอบ Docker"
if ! docker info &>/dev/null; then
    err "Docker ไม่ได้รันอยู่ หรือยังไม่ได้ติดตั้ง"
    echo "     กรุณาเปิด Docker Desktop แล้วลองใหม่"
    pause_exit
fi
ok "Docker พร้อมใช้งาน"

[ -f "docker-compose.yaml" ] || { err "ไม่พบ docker-compose.yaml"; pause_exit; }

# ── Admin credentials ─────────────────────────────────────────
step "ตั้งค่า Admin account"
read -rp "  Admin email    (default: admin@example.com): " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
read -rp "  Admin password (default: admin123): " ADMIN_PASS
ADMIN_PASS="${ADMIN_PASS:-admin123}"
ok "Email    : $ADMIN_EMAIL"
ok "Password : $ADMIN_PASS"

# ── Find free ports ───────────────────────────────────────────
find_free_port() {
    local port=$1
    while nc -z 127.0.0.1 "$port" 2>/dev/null; do
        ((port++))
    done
    echo "$port"
}

step "หา port ที่ว่าง"
PG_PORT=$(find_free_port 5433)
DIR_PORT=$(find_free_port 8056)
NEXT_PORT=$(find_free_port 3012)
ok "PostgreSQL  → $PG_PORT"
ok "Directus    → $DIR_PORT"
ok "Next.js     → $NEXT_PORT"

# ── Patch docker-compose.yaml ─────────────────────────────────
step "อัปเดต docker-compose.yaml"
cp docker-compose.yaml docker-compose.yaml.bak
ok "Backup → docker-compose.yaml.bak"

# Read current container names
PG_NAME=$(grep  'container_name:' docker-compose.yaml | grep  '_db\b'       | awk '{print $2}' | head -1)
DIR_NAME=$(grep 'container_name:' docker-compose.yaml | grep  '_directus\b' | awk '{print $2}' | head -1)
NXT_NAME=$(grep 'container_name:' docker-compose.yaml | grep  '_nextjs\b'   | awk '{print $2}' | head -1)
PG_NAME=${PG_NAME:-bdt_directus_db}
DIR_NAME=${DIR_NAME:-bdt_directus}
NXT_NAME=${NXT_NAME:-bdt_nextjs}

# Read current host ports
PG_OLD=$(grep  '".*:5432"' docker-compose.yaml | sed 's/.*"\([0-9]*\):5432".*/\1/')
DIR_OLD=$(grep '".*:8055"' docker-compose.yaml | sed 's/.*"\([0-9]*\):8055".*/\1/')
NXT_OLD=$(grep '".*:3000"' docker-compose.yaml | sed 's/.*"\([0-9]*\):3000".*/\1/')
PG_OLD=${PG_OLD:-5433}; DIR_OLD=${DIR_OLD:-8056}; NXT_OLD=${NXT_OLD:-3012}

# Read current volume name
VOL_OLD=$(grep -E '^\s+\w+postgres_data:' docker-compose.yaml \
    | awk '{print $1}' | tr -d ':' | head -1)
VOL_OLD=${VOL_OLD:-postgres_data}

# Replace (perl works on both Mac BSD & Linux GNU)
perl -i -pe "s/\Q${PG_NAME}\E/${PREFIX}_db/g"        docker-compose.yaml
perl -i -pe "s/\Q${DIR_NAME}\E/${PREFIX}_directus/g"  docker-compose.yaml
perl -i -pe "s/\Q${NXT_NAME}\E/${PREFIX}_nextjs/g"    docker-compose.yaml
perl -i -pe "s|\"${PG_OLD}:5432\"|\"${PG_PORT}:5432\"|g"    docker-compose.yaml
perl -i -pe "s|\"${DIR_OLD}:8055\"|\"${DIR_PORT}:8055\"|g"   docker-compose.yaml
perl -i -pe "s|\"${NXT_OLD}:3000\"|\"${NEXT_PORT}:3000\"|g"  docker-compose.yaml
perl -i -pe "s|PUBLIC_URL: http://localhost:\d+|PUBLIC_URL: http://localhost:${DIR_PORT}|g" \
    docker-compose.yaml
perl -i -pe "s|NEXT_PUBLIC_DIRECTUS_URL: http://localhost:\d+|NEXT_PUBLIC_DIRECTUS_URL: http://localhost:${DIR_PORT}|g" \
    docker-compose.yaml
perl -i -pe "s/\Q${VOL_OLD}\E/${PREFIX}_postgres_data/g" docker-compose.yaml
perl -i -pe "s|ADMIN_EMAIL: \S+|ADMIN_EMAIL: ${ADMIN_EMAIL}|g"    docker-compose.yaml
perl -i -pe "s|ADMIN_PASSWORD: \S+|ADMIN_PASSWORD: ${ADMIN_PASS}|g" docker-compose.yaml

ok "เสร็จแล้ว"
PG_CONTAINER="${PREFIX}_db"

# ── Build Next.js image first ─────────────────────────────────
step "Build Next.js image (อาจใช้เวลาหลายนาที)"
docker compose build nextjs || { err "docker compose build ล้มเหลว"; pause_exit; }
ok "Build เสร็จแล้ว"

# ── Start PostgreSQL only — import dump BEFORE Directus runs migrations ──
step "เริ่ม PostgreSQL"
docker compose up -d postgres || { err "ไม่สามารถเริ่ม postgres ได้"; pause_exit; }

# ── Wait for PostgreSQL ───────────────────────────────────────
step "รอ PostgreSQL พร้อม"
READY=false
for i in $(seq 1 40); do
    if docker exec "$PG_CONTAINER" pg_isready -U directus &>/dev/null; then
        READY=true; break
    fi
    printf "\r   รอ... (%s/40)" "$i"
    sleep 3
done
echo ""

if [ "$READY" = false ]; then
    warn "PostgreSQL ยังไม่พร้อม — ข้ามการ import database"
else
    ok "PostgreSQL พร้อมแล้ว"

    if [ -f "dump.sql" ]; then
        step "Reset database schema"
        docker exec "$PG_CONTAINER" psql -U directus -d directus \
            -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO directus; GRANT ALL ON SCHEMA public TO public;"
        ok "Schema reset แล้ว"

        step "Import database (dump.sql)"
        if docker exec -i "$PG_CONTAINER" psql -U directus -d directus < dump.sql; then
            ok "Import สำเร็จ"
        else
            warn "Import อาจมีปัญหาบางส่วน — ดำเนินการต่อ"
        fi
    else
        warn "ไม่พบ dump.sql — ข้ามการ import"
    fi
fi

# ── Start remaining services (Directus finds DB already populated) ────
step "เริ่ม Directus และ Next.js"
docker compose up -d || { err "ไม่สามารถเริ่ม containers ทั้งหมดได้"; pause_exit; }
ok "Containers ทั้งหมดกำลังรัน"
step "รอ 15 วินาที ให้ Directus initialize..."
sleep 15

# ── Summary ───────────────────────────────────────────────────
echo -e "\n${C_CYAN}${SEP}${C_RESET}"
echo -e "${C_GREEN}  ✔  ติดตั้งเสร็จสมบูรณ์!${C_RESET}"
echo -e "${C_CYAN}${SEP}${C_RESET}"
echo ""
echo "  Frontend  :  http://localhost:$NEXT_PORT"
echo "  Directus  :  http://localhost:$DIR_PORT"
echo ""
echo "  Directus login"
echo "    Email    :  admin@example.com"
echo "    Password :  admin123"
echo ""
echo "  Container names"
echo "    ${PREFIX}_db  /  ${PREFIX}_directus  /  ${PREFIX}_nextjs"
echo -e "${C_CYAN}${SEP}${C_RESET}"

read -rp $'\nกด Enter เพื่อออก...'
