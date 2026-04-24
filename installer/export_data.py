"""
BDT Next Direct — Data Exporter
  • Export PostgreSQL database  →  dump.sql
  • Export directus/uploads/   →  uploads/
  • บีบอัดทุกอย่างลงใน  export_YYYYMMDD_HHMMSS.zip
"""

import os, sys, re, subprocess, shutil, zipfile, platform
from datetime import datetime

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def project_dir():
    return os.path.dirname(sys.executable if getattr(sys, 'frozen', False)
                           else os.path.abspath(__file__))

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
# Read container names from docker-compose.yaml
# ──────────────────────────────────────────────

def read_compose(path: str) -> dict:
    info = {
        'pg_container':  'bdt_directus_db',
        'dir_container': 'bdt_directus',
        'dir_port':      '8056',
    }
    if not os.path.exists(path):
        return info

    try:
        import yaml
        with open(path, 'r', encoding='utf-8') as f:
            cfg = yaml.safe_load(f)
        svcs = cfg.get('services', {})
        pg  = svcs.get('postgres', {})
        d   = svcs.get('directus', {})
        if pg.get('container_name'):
            info['pg_container'] = pg['container_name']
        if d.get('container_name'):
            info['dir_container'] = d['container_name']
        dir_ports = d.get('ports', ['8056:8055'])
        info['dir_port'] = str(dir_ports[0]).split(':')[0]
    except Exception:
        # fallback: regex
        with open(path, 'r', encoding='utf-8') as f:
            src = f.read()
        m = re.search(r'container_name:\s+(\S+_db)\b', src)
        if m:
            info['pg_container'] = m.group(1)
        m = re.search(r'container_name:\s+(\S+_directus)\b', src)
        if m:
            info['dir_container'] = m.group(1)
        m = re.search(r'"(\d+):8055"', src)
        if m:
            info['dir_port'] = m.group(1)

    return info

# ──────────────────────────────────────────────
# Zip helper
# ──────────────────────────────────────────────

def zip_dir(src_dir: str, zip_path: str):
    total = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, _, files in os.walk(src_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                arcname = os.path.relpath(fpath, src_dir)
                zf.write(fpath, arcname)
                total += 1
    return total

# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    if platform.system() == 'Windows':
        os.system('color')

    banner("BDT Next Direct — Data Exporter")

    root = project_dir()
    os.chdir(root)

    compose_path = os.path.join(root, 'docker-compose.yaml')
    info = read_compose(compose_path)
    pg_container = info['pg_container']

    print(f"\n  PostgreSQL container : {pg_container}")
    print(f"  Directus container  : {info['dir_container']}")

    # ── check Docker ──
    step("ตรวจสอบ Docker")
    try:
        subprocess.run(['docker', 'info'], capture_output=True, check=True)
        ok("Docker พร้อมใช้งาน")
    except (subprocess.CalledProcessError, FileNotFoundError):
        err("Docker ไม่ได้รันอยู่ หรือยังไม่ได้ติดตั้ง")
        input("\nกด Enter เพื่อออก...")
        sys.exit(1)

    # ── check container ──
    r = subprocess.run(
        ['docker', 'inspect', '--format', '{{.State.Running}}', pg_container],
        capture_output=True, text=True
    )
    if r.stdout.strip() != 'true':
        err(f"Container '{pg_container}' ไม่ได้รันอยู่")
        print("     รัน:  docker compose up -d  แล้วลองใหม่")
        input("\nกด Enter เพื่อออก...")
        sys.exit(1)
    ok(f"Container '{pg_container}' กำลังรัน")

    # ── create export dir ──
    timestamp  = datetime.now().strftime('%Y%m%d_%H%M%S')
    export_dir = os.path.join(root, f'_export_{timestamp}')
    os.makedirs(export_dir, exist_ok=True)

    success_parts = []

    # ── export database ──
    step("Export database")
    dump_out = os.path.join(export_dir, 'dump.sql')
    try:
        r = subprocess.run(
            ['docker', 'exec', pg_container,
             'pg_dump', '-U', 'directus', '--no-owner', '--no-acl', 'directus'],
            capture_output=True
        )
        if r.returncode == 0 and r.stdout:
            with open(dump_out, 'wb') as f:
                f.write(r.stdout)
            size_kb = os.path.getsize(dump_out) / 1024
            ok(f"dump.sql  ({size_kb:.0f} KB)")
            success_parts.append('dump.sql')
        else:
            warn("pg_dump มีปัญหา:")
            print("     " + r.stderr.decode(errors='replace')[:300])
    except Exception as e:
        warn(f"pg_dump error: {e}")

    # ── export uploads ──
    step("Export uploads")
    uploads_src = os.path.join(root, 'directus', 'uploads')
    if os.path.exists(uploads_src):
        uploads_dst = os.path.join(export_dir, 'uploads')
        shutil.copytree(uploads_src, uploads_dst)
        fc = sum(len(fs) for _, _, fs in os.walk(uploads_dst))
        ok(f"uploads/  ({fc} files)")
        success_parts.append('uploads/')
    else:
        warn("ไม่พบ directus/uploads/ — ข้าม")

    # ── zip ──
    step("สร้าง zip archive")
    zip_name = f'export_{timestamp}.zip'
    zip_path = os.path.join(root, zip_name)
    n = zip_dir(export_dir, zip_path)
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    ok(f"{zip_name}  ({n} files, {size_mb:.2f} MB)")

    # ── cleanup temp dir ──
    shutil.rmtree(export_dir, ignore_errors=True)

    # ── summary ──
    print()
    hr('═')
    print("  ✔  Export เสร็จสมบูรณ์!")
    hr('═')
    print(f"\n  ไฟล์ : {zip_name}")
    print(f"  ที่   : {root}")
    print(f"\n  ภายใน zip")
    for p in success_parts:
        print(f"    ✔  {p}")
    print()
    print("  วิธีนำเข้าบนเครื่องใหม่")
    print("    1. แตก zip → วางทับโฟลเดอร์โปรเจกต์")
    print("    2. รัน install.exe  (จะ import dump.sql อัตโนมัติ)")
    hr('═')

    input("\nกด Enter เพื่อออก...")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nยกเลิก")
