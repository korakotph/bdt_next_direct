"""
BDT Next Direct — Docker Installer
  • ตั้งชื่อ container ตามชื่อโฟลเดอร์
  • หา port ที่ว่างอัตโนมัติ
  • build + start containers
  • import dump.sql เข้า PostgreSQL
"""

import os, sys, re, socket, subprocess, time, shutil, platform

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def project_dir():
    return os.path.dirname(sys.executable if getattr(sys, 'frozen', False)
                           else os.path.abspath(__file__))

def sanitize(name: str) -> str:
    name = name.lower()
    name = re.sub(r'[^a-z0-9_-]', '_', name)
    name = re.sub(r'_+', '_', name)
    return name.strip('_-') or 'app'

def is_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(('127.0.0.1', port)) != 0

def free_port(preferred: int) -> int:
    for p in range(preferred, preferred + 300):
        if is_free(p):
            return p
    raise RuntimeError(f"No free port near {preferred}")

def hr(char='─', n=54):
    print(char * n)

def banner(title: str):
    hr('═')
    print(f"  {title}")
    hr('═')

def step(msg: str):
    print(f"\n▶  {msg}")

def ok(msg: str):
    print(f"   ✔  {msg}")

def warn(msg: str):
    print(f"   ⚠  {msg}")

def err(msg: str):
    print(f"   ✘  {msg}")

# ──────────────────────────────────────────────
# docker-compose.yaml patcher
# ──────────────────────────────────────────────

def patch_compose(path: str, prefix: str,
                  pg_port: int, dir_port: int, next_port: int):
    """Patch docker-compose.yaml in-place, preserving comments."""

    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()

    # ── backup ──
    bak = path + '.bak'
    shutil.copy2(path, bak)
    ok(f"Backup → docker-compose.yaml.bak")

    # ── read current values with yaml ──
    try:
        import yaml
        cfg = yaml.safe_load(src)
        svcs = cfg.get('services', {})
        old_pg_name  = svcs.get('postgres',  {}).get('container_name', 'bdt_directus_db')
        old_dir_name = svcs.get('directus',  {}).get('container_name', 'bdt_directus')
        old_nxt_name = svcs.get('nextjs',    {}).get('container_name', 'bdt_nextjs')
        pg_ports  = svcs.get('postgres', {}).get('ports', ['5433:5432'])
        dir_ports = svcs.get('directus', {}).get('ports', ['8056:8055'])
        nxt_ports = svcs.get('nextjs',   {}).get('ports', ['3012:3000'])
        old_pg_host  = str(pg_ports[0]).split(':')[0]
        old_dir_host = str(dir_ports[0]).split(':')[0]
        old_nxt_host = str(nxt_ports[0]).split(':')[0]
        old_vol = list(cfg.get('volumes', {'postgres_data': None}).keys())[0]
    except Exception:
        # fallback defaults
        old_pg_name, old_dir_name, old_nxt_name = 'bdt_directus_db', 'bdt_directus', 'bdt_nextjs'
        old_pg_host, old_dir_host, old_nxt_host = '5433', '8056', '3012'
        old_vol = 'postgres_data'

    new_pg_name  = f"{prefix}_db"
    new_dir_name = f"{prefix}_directus"
    new_nxt_name = f"{prefix}_nextjs"
    new_vol      = f"{prefix}_postgres_data"

    # ── patch container names ──
    src = src.replace(old_pg_name,  new_pg_name)
    src = src.replace(old_dir_name, new_dir_name)
    src = src.replace(old_nxt_name, new_nxt_name)

    # ── patch host ports ──
    src = re.sub(rf'"{old_pg_host}:5432"',   f'"{pg_port}:5432"',   src)
    src = re.sub(rf'"{old_dir_host}:8055"',  f'"{dir_port}:8055"',  src)
    src = re.sub(rf'"{old_nxt_host}:3000"',  f'"{next_port}:3000"', src)

    # ── patch Directus PUBLIC_URL ──
    src = re.sub(
        r'PUBLIC_URL:\s*http://localhost:\d+',
        f'PUBLIC_URL: http://localhost:{dir_port}', src
    )

    # ── patch NEXT_PUBLIC_DIRECTUS_URL (build args + env) ──
    src = re.sub(
        r'NEXT_PUBLIC_DIRECTUS_URL:\s*http://localhost:\d+',
        f'NEXT_PUBLIC_DIRECTUS_URL: http://localhost:{dir_port}', src
    )

    # ── patch volume name ──
    src = src.replace(old_vol, new_vol)

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(src)

    return new_pg_name

# ──────────────────────────────────────────────
# Postgres readiness probe
# ──────────────────────────────────────────────

def wait_postgres(container: str, retries: int = 40) -> bool:
    for i in range(retries):
        r = subprocess.run(
            ['docker', 'exec', container, 'pg_isready', '-U', 'directus'],
            capture_output=True
        )
        if r.returncode == 0:
            return True
        sys.stdout.write(f"\r   รอ PostgreSQL... ({i+1}/{retries})")
        sys.stdout.flush()
        time.sleep(3)
    print()
    return False

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    if platform.system() == 'Windows':
        os.system('color')          # enable ANSI on Windows console

    banner("BDT Next Direct — Docker Installer")

    root = project_dir()
    os.chdir(root)

    folder  = os.path.basename(root)
    prefix  = sanitize(folder)

    print(f"\n  โฟลเดอร์   : {folder}")
    print(f"  Container  : {prefix}_*")

    # ── check docker ──
    step("ตรวจสอบ Docker")
    try:
        subprocess.run(['docker', 'info'], capture_output=True, check=True)
        ok("Docker พร้อมใช้งาน")
    except (subprocess.CalledProcessError, FileNotFoundError):
        err("Docker ไม่ได้รันอยู่ หรือยังไม่ได้ติดตั้ง")
        print("     กรุณาเปิด Docker Desktop แล้วลองใหม่")
        input("\nกด Enter เพื่อออก...")
        sys.exit(1)

    # ── check docker-compose.yaml ──
    compose_path = os.path.join(root, 'docker-compose.yaml')
    if not os.path.exists(compose_path):
        err("ไม่พบ docker-compose.yaml ใน " + root)
        input("\nกด Enter เพื่อออก...")
        sys.exit(1)

    # ── find free ports ──
    step("หา port ที่ว่าง")
    pg_port   = free_port(5433)
    dir_port  = free_port(8056)
    next_port = free_port(3012)
    ok(f"PostgreSQL  → {pg_port}")
    ok(f"Directus    → {dir_port}")
    ok(f"Next.js     → {next_port}")

    # ── patch docker-compose.yaml ──
    step("อัปเดต docker-compose.yaml")
    pg_container = patch_compose(compose_path, prefix,
                                 pg_port, dir_port, next_port)
    ok("เสร็จแล้ว")

    # ── build Next.js image first ──
    step("Build Next.js image (อาจใช้เวลาหลายนาที)")
    result = subprocess.run(['docker', 'compose', 'build', 'nextjs'])
    if result.returncode != 0:
        err("docker compose build ล้มเหลว — ดู error ด้านบน")
        input("\nกด Enter เพื่อออก...")
        sys.exit(1)
    ok("Build เสร็จแล้ว")

    # ── start postgres only — import dump BEFORE Directus runs ──
    step("เริ่ม PostgreSQL")
    result = subprocess.run(['docker', 'compose', 'up', '-d', 'postgres'])
    if result.returncode != 0:
        err("ไม่สามารถเริ่ม postgres ได้")
        input("\nกด Enter เพื่อออก...")
        sys.exit(1)

    # ── wait postgres ──
    step("รอ PostgreSQL พร้อม")
    if not wait_postgres(pg_container):
        warn("PostgreSQL ยังไม่พร้อม — ข้ามการ import database")
    else:
        print()
        ok("PostgreSQL พร้อมแล้ว")

        dump = os.path.join(root, 'dump.sql')
        if os.path.exists(dump):
            step("Reset database schema")
            subprocess.run(
                ['docker', 'exec', pg_container,
                 'psql', '-U', 'directus', '-d', 'directus',
                 '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; '
                       'GRANT ALL ON SCHEMA public TO directus; '
                       'GRANT ALL ON SCHEMA public TO public;'],
                capture_output=True
            )
            ok("Schema reset แล้ว")

            step("Import database (dump.sql)")
            with open(dump, 'rb') as f:
                r = subprocess.run(
                    ['docker', 'exec', '-i', pg_container,
                     'psql', '-U', 'directus', '-d', 'directus'],
                    stdin=f
                )
            if r.returncode == 0:
                ok("Import สำเร็จ")
            else:
                warn("Import อาจมีปัญหาบางส่วน — ดำเนินการต่อ")

            step("ลบ users และ admin policies เดิมออก (ตั้งค่า admin ใหม่ได้ที่ /admin/setup)")
            subprocess.run(
                ['docker', 'exec', pg_container,
                 'psql', '-U', 'directus', '-d', 'directus',
                 '-c', (
                     'DELETE FROM directus_access WHERE policy IN '
                     '(SELECT id FROM directus_policies WHERE admin_access = true);'
                     'DELETE FROM directus_policies WHERE admin_access = true;'
                     'DELETE FROM directus_users;'
                 )],
                capture_output=True
            )
            ok("Users และ admin policies reset แล้ว")
        else:
            warn("ไม่พบ dump.sql — ข้ามการ import database")

    # ── start remaining services (Directus finds DB already populated) ──
    step("เริ่ม Directus และ Next.js")
    result = subprocess.run(['docker', 'compose', 'up', '-d'])
    if result.returncode != 0:
        err("ไม่สามารถเริ่ม containers ทั้งหมดได้")
        input("\nกด Enter เพื่อออก...")
        sys.exit(1)
    ok("Containers ทั้งหมดกำลังรัน")

    # ── wait for Directus health endpoint ──
    step("รอ Directus พร้อม")
    dir_ready = False
    for i in range(1, 41):
        try:
            import urllib.request
            urllib.request.urlopen(
                f'http://localhost:{dir_port}/server/health', timeout=2)
            dir_ready = True
            break
        except Exception:
            sys.stdout.write(f"\r   รอ... ({i}/40)")
            sys.stdout.flush()
            time.sleep(3)
    print()

    if dir_ready:
        ok("Directus พร้อมแล้ว")
    else:
        warn("Directus ไม่ตอบสนอง — ตรวจสอบ: docker compose logs directus")

    # ── summary ──
    print()
    hr('═')
    print("  ✔  ติดตั้งเสร็จสมบูรณ์!")
    hr('═')
    print(f"\n  Frontend  :  http://localhost:{next_port}")
    print(f"  Directus  :  http://localhost:{dir_port}")
    print(f"\n  Directus Admin Setup")
    print(f"    http://localhost:{dir_port}/admin/setup")
    print(f"\n  Container names")
    print(f"    {prefix}_db")
    print(f"    {prefix}_directus")
    print(f"    {prefix}_nextjs")
    hr('═')

    input("\nกด Enter เพื่อออก...")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nยกเลิก")
