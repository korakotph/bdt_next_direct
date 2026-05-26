#!/usr/bin/env python3
"""BDT Next Direct — Management Server"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import threading
import time
import uuid
import zipfile
from datetime import datetime

from flask import Flask, Response, abort, jsonify, render_template, request, send_from_directory

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024 * 1024  # 2 GB

PROJECTS_ROOT   = os.environ.get("PROJECTS_ROOT", "/projects_root")
BASE_PATH       = os.environ.get("BASE_PATH",     "").rstrip("/")
CADDY_CONTAINER    = os.environ.get("CADDY_CONTAINER",    "caddy")
CADDY_NETWORK      = os.environ.get("CADDY_NETWORK",      "caddy_web")
CADDY_CONF_DIR     = os.path.join(PROJECTS_ROOT, "_caddy")
PUBLIC_HOST        = os.environ.get("PUBLIC_HOST", "").rstrip("/")

_jobs: dict = {}
_lock = threading.Lock()


# ── path helpers ──────────────────────────────────────────────────────────────

def get_project_dir(prefix: str) -> str:
    """Path for a project — same on host and inside manager container."""
    return os.path.join(PROJECTS_ROOT, prefix)



def get_exports_dir(prefix: str) -> str:
    return os.path.join(get_project_dir(prefix), "_exports")


# ── docker / compose helpers ──────────────────────────────────────────────────

def compose_info(prefix: str) -> dict:
    d = {
        "pg":           f"{prefix}_db",
        "directus":     f"{prefix}_directus",
        "nextjs":       f"{prefix}_nextjs",
        "adminer":      f"{prefix}_adminer",
        "dir_port":     "8056",
        "next_port":    "3012",
        "adminer_port": "8057",
    }
    compose_file = os.path.join(get_project_dir(prefix), "docker-compose.yaml")
    try:
        txt = open(compose_file).read()
        for pat, key in [
            (r'container_name:\s*(\S+_db)\b',        "pg"),
            (r'container_name:\s*(\S+_directus)\b',   "directus"),
            (r'container_name:\s*(\S+_nextjs)\b',     "nextjs"),
            (r'container_name:\s*(\S+_adminer)\b',    "adminer"),
            (r'"(\d+):8055"',                         "dir_port"),
            (r'"(\d+):3000"',                         "next_port"),
            (r'"(\d+):8080"',                         "adminer_port"),
        ]:
            m = re.search(pat, txt)
            if m:
                d[key] = m.group(1)
    except Exception:
        pass
    return d


def container_status(name: str) -> str:
    if not name:
        return "unknown"
    try:
        r = subprocess.run(
            ["docker", "inspect", "--format", "{{.State.Status}}", name],
            capture_output=True, text=True, timeout=5,
        )
        return r.stdout.strip() or "not_found"
    except Exception:
        return "unknown"


def list_templates() -> list[str]:
    """Return names of directories in PROJECTS_ROOT that contain a next-app/ subdir."""
    result = []
    try:
        for entry in sorted(os.scandir(PROJECTS_ROOT), key=lambda e: e.name):
            if not entry.is_dir():
                continue
            if entry.name.startswith(("_", ".")):
                continue
            if os.path.isdir(os.path.join(entry.path, "next-app")):
                result.append(entry.name)
    except Exception:
        pass
    return result


def used_host_ports() -> set:
    """Return all host ports reserved by any container (running OR stopped)."""
    try:
        r = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{.Ports}}"],
            capture_output=True, text=True, timeout=5,
        )
        ports = set()
        for line in r.stdout.splitlines():
            for m in re.finditer(r":(\d+)->", line):
                ports.add(int(m.group(1)))
        return ports
    except Exception:
        return set()


def find_free_ports(specs: list) -> dict:
    """Allocate multiple free ports atomically.

    Takes a list of (name, start_port) tuples. Each allocated port is
    immediately reserved so subsequent lookups in the same call won't
    pick the same value.

    Example:
        ports = find_free_ports([("pg", 5433), ("dir", 8056), ("adm", 8057)])
    """
    used = used_host_ports()
    result = {}
    for name, start in specs:
        port = start
        while port in used:
            port += 1
        used.add(port)
        result[name] = port
    return result


def detect_projects() -> list:
    """Detect all BDT stacks by container name pattern {prefix}_{db|directus|nextjs|adminer}."""
    try:
        r = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{.Names}}\t{{.State}}\t{{.Ports}}"],
            capture_output=True, text=True, timeout=10,
        )
        stacks: dict = {}
        for line in r.stdout.splitlines():
            parts = line.split("\t", 2)
            if len(parts) < 2:
                continue
            name  = parts[0].lstrip("/")
            state = parts[1]
            ports = parts[2] if len(parts) > 2 else ""

            m = re.match(r"^(.+)_(db|directus|nextjs|adminer|manager)$", name)
            if not m:
                continue
            prefix, svc = m.group(1), m.group(2)
            # Skip the standalone manager container itself
            if name == "bdt_manager":
                continue

            if prefix not in stacks:
                stacks[prefix] = {"name": prefix, "services": {}, "ports": {}}
            stacks[prefix]["services"][svc] = state

            port_map = {"8055": "directus", "3000": "nextjs", "8080": "adminer",
                        "9090": "manager", "5432": "db"}
            for pm in re.finditer(r":(\d+)->(\d+)", ports):
                hp, cp = pm.group(1), pm.group(2)
                if cp in port_map:
                    stacks[prefix]["ports"][port_map[cp]] = int(hp)

        result = [s for s in stacks.values()
                  if "db" in s["services"] or "directus" in s["services"]]
        return sorted(result, key=lambda p: p["name"])
    except Exception:
        return []


def stream_cmd(cmd: list, emit, stdin_bytes: bytes = None) -> int:
    emit(f"$ {' '.join(str(c) for c in cmd)}")
    try:
        p = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE if stdin_bytes is not None else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if stdin_bytes is not None:
            p.stdin.write(stdin_bytes)
            p.stdin.close()
        for raw in iter(p.stdout.readline, b""):
            emit(raw.decode("utf-8", errors="replace").rstrip())
        p.wait()
        return p.returncode
    except Exception as e:
        emit(f"ERROR: {e}")
        return -1


def compose_run(args: list, emit, prefix: str, compose_file: str = None) -> int:
    project_dir = get_project_dir(prefix)
    if compose_file is None:
        compose_file = os.path.join(project_dir, "docker-compose.yaml")
    return stream_cmd(
        ["docker", "compose", "-f", compose_file,
         "--project-directory", project_dir, "-p", prefix] + args,
        emit,
    )


# ── job runner ────────────────────────────────────────────────────────────────

def start_job(fn) -> str:
    jid = uuid.uuid4().hex[:8]
    job: dict = {"lines": [], "status": "running"}

    def emit(msg: str):
        with _lock:
            job["lines"].append(msg)

    def worker():
        try:
            fn(emit)
            with _lock:
                job["status"] = "done"
        except Exception as exc:
            with _lock:
                job["lines"].append(f"FATAL: {exc}")
                job["status"] = "error"

    with _lock:
        _jobs[jid] = job
    threading.Thread(target=worker, daemon=True).start()
    return jid


# ── shared sub-tasks ──────────────────────────────────────────────────────────

def _wait_for_pg(emit, pg: str, retries: int = 40) -> bool:
    for i in range(retries):
        r = subprocess.run(
            ["docker", "exec", pg, "pg_isready", "-U", "directus"],
            capture_output=True, timeout=5,
        )
        if r.returncode == 0:
            emit("✔ PostgreSQL พร้อมแล้ว")
            return True
        emit(f"   รอ... ({i + 1}/{retries})")
        time.sleep(3)
    emit("⚠ PostgreSQL ยังไม่พร้อม")
    return False


def _wait_for_directus(emit, prefix: str, retries: int = 40):
    """Wait for directus health via docker exec wget (no inter-container network needed)."""
    cname = f"{prefix}_directus"
    for i in range(retries):
        r = subprocess.run(
            ["docker", "exec", cname,
             "wget", "-qO-", "http://localhost:8055/server/health"],
            capture_output=True, timeout=5,
        )
        if r.returncode == 0:
            emit("✔ Directus พร้อมแล้ว")
            return
        emit(f"   รอ... ({i + 1}/{retries})")
        time.sleep(3)
    emit("⚠ Directus ไม่ตอบสนอง")


def _import_dump(emit, pg: str, dump_path: str):
    if not os.path.exists(dump_path):
        emit("⚠ ไม่พบ dump.sql — ข้าม import")
        return

    emit("▶ Reset database schema")
    subprocess.run(
        ["docker", "exec", pg, "psql", "-U", "directus", "-d", "directus",
         "-c",
         "DROP SCHEMA public CASCADE; CREATE SCHEMA public; "
         "GRANT ALL ON SCHEMA public TO directus; "
         "GRANT ALL ON SCHEMA public TO public;"],
        capture_output=True, timeout=30,
    )
    emit("✔ Schema reset")

    emit("▶ Import database (dump.sql)")
    with open(dump_path, "rb") as f:
        data = f.read()
    r = subprocess.run(
        ["docker", "exec", "-i", pg, "psql", "-U", "directus", "-d", "directus"],
        input=data, capture_output=True, timeout=300,
    )
    emit("✔ Import สำเร็จ" if r.returncode == 0 else
         f"⚠ Import warning: {r.stderr.decode(errors='replace')[:300]}")

    emit("▶ Reset admin users/policies")
    subprocess.run(
        ["docker", "exec", pg, "psql", "-U", "directus", "-d", "directus",
         "-c",
         "DELETE FROM directus_access WHERE policy IN "
         "(SELECT id FROM directus_policies WHERE admin_access = true); "
         "DELETE FROM directus_policies WHERE admin_access = true; "
         "DELETE FROM directus_users;"],
        capture_output=True, timeout=30,
    )
    emit("✔ Users/admin policies reset")


# ── setup ─────────────────────────────────────────────────────────────────────

def do_setup(emit, prefix: str, server_url: str = ""):
    project_dir  = get_project_dir(prefix)
    compose_file = os.path.join(project_dir, "docker-compose.yaml")
    info = compose_info(prefix)
    pg   = info["pg"]
    emit(f"═══ Setup: {prefix} ═══")

    emit("▶ อัพเดต NEXT_PUBLIC_DIRECTUS_URL ใน compose")
    _patch_nextjs_directus_url_compose_only(emit, prefix, server_url)

    emit("▶ Build Next.js image (อาจใช้เวลาหลายนาที)")
    compose_run(["build", "nextjs"], emit, prefix=prefix, compose_file=compose_file)

    emit("▶ เริ่ม PostgreSQL")
    if compose_run(["up", "-d", "postgres"], emit, prefix=prefix,
                   compose_file=compose_file) != 0:
        emit("✘ ไม่สามารถเริ่ม postgres ได้")
        return

    if _wait_for_pg(emit, pg):
        _import_dump(emit, pg, os.path.join(project_dir, "dump.sql"))

    emit("▶ เริ่ม Directus, Next.js และ Adminer")
    compose_run(["up", "-d", "directus", "nextjs", "adminer"], emit,
                prefix=prefix, compose_file=compose_file)
    _wait_for_directus(emit, prefix)

    emit("▶ ตั้งค่า Reverse Proxy")
    write_proxy_conf(prefix, emit)
    ok, msg = sync_caddyfile(emit)
    emit(f"✔ Caddy reload {'สำเร็จ' if ok else f'ล้มเหลว: {msg}'}")

    emit("═══ Setup เสร็จสมบูรณ์! ═══")
    emit(f'  Frontend  : http://<server-ip>/{prefix}/')
    emit(f'  Directus  : http://<server-ip>/{prefix}-admin/')
    emit(f'  Adminer   : http://<server-ip>/{prefix}-db/')
    emit(f'  Admin     : http://<server-ip>/{prefix}-admin/admin/setup')


# ── export ────────────────────────────────────────────────────────────────────

def do_export(emit, prefix: str):
    project_dir = get_project_dir(prefix)
    exports_dir = get_exports_dir(prefix)
    info = compose_info(prefix)
    pg   = info["pg"]
    emit(f"═══ Export: {prefix} ═══")
    os.makedirs(exports_dir, exist_ok=True)

    ts  = datetime.now().strftime("%Y%m%d_%H%M%S")
    tmp = os.path.join(exports_dir, f"_tmp_{ts}")
    os.makedirs(tmp, exist_ok=True)

    emit("▶ Export database")
    r = subprocess.run(
        ["docker", "exec", pg, "pg_dump",
         "-U", "directus", "--no-owner", "--no-acl",
         "--exclude-table-data=directus_users", "directus"],
        capture_output=True, timeout=120,
    )
    if r.returncode == 0:
        p = os.path.join(tmp, "dump.sql")
        with open(p, "wb") as f:
            f.write(r.stdout)
        emit(f"✔ dump.sql ({os.path.getsize(p) // 1024} KB)")
    else:
        emit(f"⚠ pg_dump: {r.stderr.decode(errors='replace')[:200]}")

    emit("▶ Export uploads")
    src = os.path.join(project_dir, "directus", "uploads")
    if os.path.isdir(src):
        dst = os.path.join(tmp, "directus", "uploads")
        shutil.copytree(src, dst)
        count = sum(1 for fp in pathlib.Path(dst).rglob("*") if fp.is_file())
        emit(f"✔ directus/uploads/ ({count} files)")
    else:
        emit("⚠ ไม่พบ directus/uploads/ — ข้าม")

    emit("▶ สร้าง zip archive")
    zip_name = f"export_{ts}.zip"
    zip_path = os.path.join(exports_dir, zip_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(tmp):
            for fn in files:
                fp = os.path.join(root, fn)
                zf.write(fp, os.path.relpath(fp, tmp))
    shutil.rmtree(tmp)

    mb = os.path.getsize(zip_path) / 1024 / 1024
    emit(f"✔ {zip_name} ({mb:.1f} MB)")
    emit("═══ Export เสร็จสมบูรณ์! ═══")
    emit(f"DOWNLOAD:{prefix}/{zip_name}")


def _directus_public_url(prefix: str, server_url: str = "") -> str:
    base = server_url.rstrip("/") or PUBLIC_HOST.rstrip("/")
    if base:
        return f"{base}/{prefix}-admin"
    info = compose_info(prefix)
    return f"http://localhost:{info.get('dir_port', '8055')}"


def _patch_directus_public_url(emit, prefix: str, server_url: str):
    """Rewrite PUBLIC_URL in the project's docker-compose.yaml and restart Directus."""
    new_url = _directus_public_url(prefix, server_url)
    compose_path = os.path.join(get_project_dir(prefix), "docker-compose.yaml")
    if not os.path.isfile(compose_path):
        return
    with open(compose_path, "r") as f:
        content = f.read()
    updated = re.sub(r'PUBLIC_URL:.*', f'PUBLIC_URL: {new_url}', content)
    if updated == content:
        emit(f"   PUBLIC_URL ถูกต้องแล้ว: {new_url}")
        return
    with open(compose_path, "w") as f:
        f.write(updated)
    emit(f"✔ PUBLIC_URL → {new_url}")
    compose_run(["restart", "directus"], emit, prefix=prefix)


def _patch_nextjs_directus_url_compose_only(emit, prefix: str, server_url: str) -> bool:
    """Rewrite NEXT_PUBLIC_DIRECTUS_URL in compose file only. Returns True if changed."""
    new_url = _directus_public_url(prefix, server_url)
    compose_path = os.path.join(get_project_dir(prefix), "docker-compose.yaml")
    if not os.path.isfile(compose_path):
        return False
    with open(compose_path, "r") as f:
        content = f.read()
    updated = re.sub(r'NEXT_PUBLIC_DIRECTUS_URL:.*', f'NEXT_PUBLIC_DIRECTUS_URL: {new_url}', content)
    if updated == content:
        emit(f"   NEXT_PUBLIC_DIRECTUS_URL ถูกต้องแล้ว: {new_url}")
        return False
    with open(compose_path, "w") as f:
        f.write(updated)
    emit(f"✔ NEXT_PUBLIC_DIRECTUS_URL → {new_url}")
    return True


def _patch_nextjs_directus_url(emit, prefix: str, server_url: str):
    """Rewrite NEXT_PUBLIC_DIRECTUS_URL in compose and rebuild+restart nextjs."""
    changed = _patch_nextjs_directus_url_compose_only(emit, prefix, server_url)
    if changed:
        emit("▶ rebuild + restart nextjs (อาจใช้เวลา 1-2 นาที)")
        compose_run(["up", "-d", "--build", "nextjs"], emit, prefix=prefix)
    emit(f"▶ re-connect containers → {CADDY_NETWORK}")
    for c in [f"{prefix}_nextjs", f"{prefix}_directus", f"{prefix}_adminer"]:
        _network_connect(c, emit)


def do_import_zip(emit, prefix: str, zip_path: str, server_url: str = ""):
    project_dir = get_project_dir(prefix)
    info = compose_info(prefix)
    pg      = info.get("pg", f"{prefix}_db")
    new_url = _directus_public_url(prefix, server_url)
    emit(f"═══ Import ZIP: {prefix} ═══")

    tmp = zip_path + "_extracted"
    try:
        emit("▶ แตก zip")
        with zipfile.ZipFile(zip_path, "r") as zf:
            # Normalize Windows backslash paths before extracting
            for member in zf.infolist():
                member.filename = member.filename.replace("\\", "/")
                zf.extract(member, tmp)
        emit("✔ แตกไฟล์สำเร็จ")

        dump_path = os.path.join(tmp, "dump.sql")
        if os.path.isfile(dump_path):
            if new_url:
                with open(dump_path, "r", encoding="utf-8", errors="replace") as f:
                    sql = f.read()
                # Replace every http://localhost:PORT occurrence with the new URL
                replaced = re.sub(r'http://localhost:\d+', new_url, sql)
                if replaced != sql:
                    count = len(re.findall(r'http://localhost:\d+', sql))
                    with open(dump_path, "w", encoding="utf-8") as f:
                        f.write(replaced)
                    emit(f"✔ Replace localhost URLs → {new_url} ({count} จุด)")
            if not _wait_for_pg(emit, pg, retries=10):
                emit("✘ PostgreSQL ไม่พร้อม — ยกเลิก import database")
            else:
                _import_dump(emit, pg, dump_path)
        else:
            emit("⚠ ไม่พบ dump.sql ใน zip — ข้าม import database")

        # Find uploads directory (supports both / and \ ZIP path formats)
        uploads_src = None
        for root, dirs, _ in os.walk(tmp):
            if (os.path.basename(root) == "uploads" and
                    os.path.basename(os.path.dirname(root)) == "directus"):
                uploads_src = root
                break
        if uploads_src:
            uploads_dst = os.path.join(project_dir, "directus", "uploads")
            os.makedirs(uploads_dst, exist_ok=True)
            os.chmod(uploads_dst, 0o777)
            count = 0
            for src_file in pathlib.Path(uploads_src).rglob("*"):
                if not src_file.is_file():
                    continue
                rel = src_file.relative_to(uploads_src)
                dst_file = pathlib.Path(uploads_dst) / rel
                dst_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(src_file), str(dst_file))
                count += 1
            emit(f"✔ คัดลอก uploads {count} ไฟล์")
        else:
            emit("⚠ ไม่พบ directus/uploads/ ใน zip — ข้าม")

        emit("▶ อัพเดต PUBLIC_URL และ restart Directus")
        _patch_directus_public_url(emit, prefix, server_url)

        emit("▶ อัพเดต NEXT_PUBLIC_DIRECTUS_URL และ rebuild Next.js")
        _patch_nextjs_directus_url(emit, prefix, server_url)

        emit("═══ Import เสร็จสมบูรณ์! ═══")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        os.remove(zip_path)


# ── create instance ───────────────────────────────────────────────────────────

def _generate_compose(prefix: str, template_dir: str,
                      pg_port: int, dir_port: int,
                      next_port: int, adminer_port: int,
                      server_url: str = "") -> str:
    directus_public_url = _directus_public_url(prefix, server_url)
    return f"""\
services:
  postgres:
    image: postgres:16
    container_name: {prefix}_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: directus
      POSTGRES_DB: directus
    volumes:
      - {prefix}_postgres_data:/var/lib/postgresql/data
    ports:
      - "{pg_port}:5432"

  directus:
    image: directus/directus:latest
    container_name: {prefix}_directus
    restart: unless-stopped
    depends_on:
      - postgres
    ports:
      - "{dir_port}:8055"
    environment:
      CORS_ENABLED: "true"
      CORS_ORIGIN: "*"
      CORS_METHODS: "GET,POST,PATCH,DELETE,OPTIONS"
      CORS_HEADERS: "Content-Type,Authorization"
      KEY: "supersecretkey"
      SECRET: "supersecretsecret"
      DB_CLIENT: "pg"
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: directus
      DB_USER: directus
      DB_PASSWORD: directus
      STORAGE_LOCATIONS: local
      STORAGE_LOCAL_DRIVER: local
      STORAGE_LOCAL_ROOT: /directus/uploads
      PUBLIC_URL: {directus_public_url}
      SESSION_COOKIE_NAME: "{prefix}_session_token"
      REFRESH_TOKEN_COOKIE_NAME: "{prefix}_refresh_token"
    volumes:
      - ./directus/uploads:/directus/uploads
      - {template_dir}/directus/migrations:/directus/migrations
      - {template_dir}/directus/extensions:/directus/extensions

  nextjs:
    build:
      context: {template_dir}/next-app
      args:
        NEXT_PUBLIC_DIRECTUS_URL: {directus_public_url}
        NEXT_PUBLIC_BASE_PATH: "/{prefix}"
    container_name: {prefix}_nextjs
    restart: unless-stopped
    ports:
      - "{next_port}:3000"
    environment:
      DIRECTUS_INTERNAL_URL: http://{prefix}_directus:8055
      NEXT_PUBLIC_DIRECTUS_URL: {directus_public_url}
      NEXT_PUBLIC_BASE_PATH: "/{prefix}"
    depends_on:
      - directus

  adminer:
    image: adminer
    container_name: {prefix}_adminer
    restart: unless-stopped
    ports:
      - "{adminer_port}:8080"
    environment:
      ADMINER_DEFAULT_SERVER: postgres
    depends_on:
      - postgres

volumes:
  {prefix}_postgres_data:
"""


def do_create_project(name: str, template_prefix: str, emit, server_url: str = ""):
    prefix = re.sub(r"[^a-z0-9_-]", "_", name.lower().strip())
    prefix = re.sub(r"_+", "_", prefix).strip("_")
    if not prefix:
        emit("✘ ชื่อโปรเจคไม่ถูกต้อง")
        return

    template_dir = get_project_dir(template_prefix)
    if not os.path.isdir(os.path.join(template_dir, "next-app")):
        emit(f"✘ template '{template_prefix}' ไม่มีโฟลเดอร์ next-app/")
        return

    instance_dir = get_project_dir(prefix)
    if os.path.exists(instance_dir):
        emit(f"✘ โฟลเดอร์ {prefix} มีอยู่แล้ว")
        return

    emit(f"═══ สร้าง instance: {prefix} ═══")
    emit(f"   Template  : {template_prefix}  ({template_dir}/next-app)")
    emit(f"   Instance  : {instance_dir}")

    emit("▶ หา port ที่ว่าง")
    ports = find_free_ports([
        ("pg",      5433),
        ("dir",     8056),
        ("next",    3012),
        ("adminer", 8057),
    ])
    pg_port      = ports["pg"]
    dir_port     = ports["dir"]
    next_port    = ports["next"]
    adminer_port = ports["adminer"]
    emit(f"   PostgreSQL → {pg_port}")
    emit(f"   Directus   → {dir_port}")
    emit(f"   Next.js    → {next_port}")
    emit(f"   Adminer    → {adminer_port}")

    emit("▶ สร้างโครงสร้าง instance")
    uploads_dir = os.path.join(instance_dir, "directus", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    os.chmod(uploads_dir, 0o777)

    compose_path = os.path.join(instance_dir, "docker-compose.yaml")
    with open(compose_path, "w") as f:
        f.write(_generate_compose(prefix, template_dir,
                                  pg_port, dir_port, next_port, adminer_port,
                                  server_url))
    emit("✔ docker-compose.yaml พร้อม")

    emit("▶ Build Next.js image (อาจใช้เวลาหลายนาที)")
    compose_run(["build", "--no-cache", "nextjs"], emit, prefix=prefix, compose_file=compose_path)

    emit("▶ เริ่ม PostgreSQL")
    compose_run(["up", "-d", "postgres"], emit, prefix=prefix, compose_file=compose_path)

    # Import dump.sql from instance dir if present, else fall back to template dir
    dump_path = os.path.join(instance_dir, "dump.sql")
    if not os.path.isfile(dump_path):
        dump_path = os.path.join(template_dir, "dump.sql")
    if _wait_for_pg(emit, f"{prefix}_db", retries=30):
        _import_dump(emit, f"{prefix}_db", dump_path)

    emit("▶ เริ่ม containers ทั้งหมด")
    compose_run(["up", "-d", "--no-build", "directus", "adminer"], emit,
                prefix=prefix, compose_file=compose_path)
    compose_run(["up", "-d", "nextjs"], emit,
                prefix=prefix, compose_file=compose_path)

    emit("▶ ตั้งค่า Reverse Proxy")
    write_proxy_conf(prefix, emit)
    ok, msg = sync_caddyfile(emit)
    emit(f"✔ Caddy reload {'สำเร็จ' if ok else f'ล้มเหลว: {msg}'}")

    emit("═══ สร้าง instance เสร็จสมบูรณ์! ═══")
    emit(f"  Frontend       : http://<server-ip>/{prefix}/")
    emit(f"  Directus API   : http://<server-ip>/{prefix}-admin/  (สำหรับ Next.js)")
    emit(f"  Directus Admin : http://<server-ip>:{dir_port}/admin/setup")
    emit(f"  Adminer        : http://<server-ip>/{prefix}-db/")


# ── delete project ────────────────────────────────────────────────────────────

def do_delete_project(emit, prefix: str, delete_files: bool = False):
    project_dir  = get_project_dir(prefix)
    compose_file = os.path.join(project_dir, "docker-compose.yaml")
    emit(f"═══ ลบโปรเจค: {prefix} ═══")

    emit("▶ ปิด containers และลบ volumes")
    compose_run(["down", "-v", "--remove-orphans"], emit, prefix=prefix,
                compose_file=compose_file)

    emit("▶ ลบ reverse proxy config")
    remove_proxy_conf(prefix)
    ok, msg = sync_caddyfile(emit)
    emit(f"✔ Caddy reload {'สำเร็จ' if ok else f'ล้มเหลว: {msg}'}")

    if delete_files:
        emit("▶ ลบโฟลเดอร์โปรเจค")
        if os.path.isdir(project_dir):
            shutil.rmtree(project_dir)
            emit(f"✔ ลบ {project_dir} แล้ว")
        else:
            emit(f"⚠ ไม่พบโฟลเดอร์ {project_dir}")

    emit("▶ เคลียร์ Docker images ที่ไม่ได้ใช้")
    stream_cmd(["docker", "image", "prune", "-f"], emit)

    emit("═══ ลบโปรเจคเสร็จสมบูรณ์! ═══")


# ── reverse proxy (Caddy) ────────────────────────────────────────────────────

CADDY_CONF_FILE = "/etc/caddy/Caddyfile"
BDT_START = "    # BDT-MANAGED-START"
BDT_END   = "    # BDT-MANAGED-END"


def proxy_conf_path(prefix: str) -> str:
    return os.path.join(CADDY_CONF_DIR, f"{prefix}.conf")


def proxy_enabled(prefix: str) -> bool:
    return os.path.isfile(proxy_conf_path(prefix))


def _caddy_read_caddyfile() -> str | None:
    r = subprocess.run(
        ["docker", "exec", CADDY_CONTAINER, "cat", CADDY_CONF_FILE],
        capture_output=True, text=True, timeout=10,
    )
    return r.stdout if r.returncode == 0 else None


def _caddy_write_caddyfile(content: str) -> bool:
    r = subprocess.run(
        ["docker", "exec", "-i", CADDY_CONTAINER,
         "sh", "-c", f"cat > {CADDY_CONF_FILE}"],
        input=content, capture_output=True, text=True, timeout=10,
    )
    return r.returncode == 0


def _build_bdt_block() -> str:
    """Build the BDT routes block from all .conf files in CADDY_CONF_DIR."""
    lines = []
    if not os.path.isdir(CADDY_CONF_DIR):
        return ""
    for fname in sorted(os.listdir(CADDY_CONF_DIR)):
        if not fname.endswith(".conf"):
            continue
        try:
            raw = open(os.path.join(CADDY_CONF_DIR, fname)).read()
            for line in raw.splitlines():
                if line.startswith("#"):
                    continue
                lines.append(("    " + line) if line.strip() else "")
            lines.append("")
        except Exception:
            pass
    return "\n".join(lines).rstrip()


def sync_caddyfile(emit=None) -> tuple[bool, str]:
    """Rebuild BDT section in the live Caddyfile and reload Caddy."""
    content = _caddy_read_caddyfile()
    if content is None:
        msg = "ไม่สามารถอ่าน Caddyfile จาก Caddy container"
        if emit:
            emit(f"⚠ {msg}")
        return False, msg

    bdt_block = _build_bdt_block()
    inner = f"\n{bdt_block}\n" if bdt_block else "\n"

    if BDT_START in content and BDT_END in content:
        si = content.index(BDT_START)
        ei = content.index(BDT_END) + len(BDT_END)
        new_content = content[:si] + BDT_START + inner + BDT_END + content[ei:]
    else:
        # First time: insert before catch-all `handle {` (no path)
        m = re.search(r'\n(\s*handle\s*\{)', content)
        insertion = f"\n{BDT_START}{inner}{BDT_END}"
        if m:
            new_content = content[: m.start()] + insertion + content[m.start():]
        else:
            idx = content.rfind("}")
            new_content = content[:idx] + insertion + "\n}"

    if not _caddy_write_caddyfile(new_content):
        msg = "ไม่สามารถเขียน Caddyfile"
        if emit:
            emit(f"⚠ {msg}")
        return False, msg

    return reload_caddy()


def _network_connect(container: str, emit=None, retries: int = 10) -> bool:
    """Connect container to CADDY_NETWORK, retry until container exists."""
    for i in range(retries):
        r = subprocess.run(
            ["docker", "network", "connect", CADDY_NETWORK, container],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode == 0:
            if emit:
                emit(f"   ✔ {container} → {CADDY_NETWORK}")
            return True
        stderr = r.stderr.strip()
        if "already exists" in stderr:
            if emit:
                emit(f"   ✔ {container} → {CADDY_NETWORK} (already connected)")
            return True
        if emit:
            emit(f"   รอ {container}... ({i + 1}/{retries})")
        time.sleep(2)
    if emit:
        emit(f"   ⚠ ไม่สามารถ connect {container}: {stderr}")
    return False


def _network_disconnect(container: str):
    subprocess.run(
        ["docker", "network", "disconnect", CADDY_NETWORK, container],
        capture_output=True, timeout=10,
    )


def write_proxy_conf(prefix: str, emit=None):
    """Connect containers to Caddy network, save .conf file, sync Caddyfile."""
    nextjs   = f"{prefix}_nextjs"
    directus = f"{prefix}_directus"
    adminer  = f"{prefix}_adminer"
    for c in [nextjs, directus, adminer]:
        _network_connect(c, emit)
    os.makedirs(CADDY_CONF_DIR, exist_ok=True)
    # Named matcher catches /admin/* asset requests that originate from this
    # instance's admin page (identified by Referer header). Required because
    # Directus admin SPA has hardcoded /admin/assets/... paths.
    conf = (
        f"# BDT Manager — {prefix} (auto-generated)\n"
        f"@{prefix}_admin_ref {{\n"
        f"    path /admin*\n"
        f"    header Referer */{prefix}-admin*\n"
        f"}}\n"
        f"handle @{prefix}_admin_ref {{\n"
        f"    reverse_proxy {directus}:8055\n"
        f"}}\n"
        f"handle /{prefix}-admin* {{\n"
        f"    uri strip_prefix /{prefix}-admin\n"
        f"    reverse_proxy {directus}:8055\n"
        f"}}\n"
        f"handle /{prefix}-db* {{\n"
        f"    uri strip_prefix /{prefix}-db\n"
        f"    reverse_proxy {adminer}:8080\n"
        f"}}\n"
        f"handle /{prefix}* {{\n"
        f"    reverse_proxy {nextjs}:3000\n"
        f"}}\n"
    )
    with open(proxy_conf_path(prefix), "w") as f:
        f.write(conf)


def remove_proxy_conf(prefix: str):
    p = proxy_conf_path(prefix)
    if os.path.isfile(p):
        os.remove(p)
    for c in [f"{prefix}_nextjs", f"{prefix}_directus", f"{prefix}_adminer"]:
        _network_disconnect(c)


def reload_caddy() -> tuple[bool, str]:
    r = subprocess.run(
        ["docker", "exec", CADDY_CONTAINER,
         "caddy", "reload", "--config", CADDY_CONF_FILE],
        capture_output=True, text=True, timeout=10,
    )
    return r.returncode == 0, (r.stderr or r.stdout).strip()


def _startup_caddy_sync():
    """Re-sync Caddy on manager startup (restores routes if Caddy was restarted)."""
    time.sleep(5)
    if os.path.isdir(CADDY_CONF_DIR) and any(
        f.endswith(".conf") for f in os.listdir(CADDY_CONF_DIR)
    ):
        sync_caddyfile()


threading.Thread(target=_startup_caddy_sync, daemon=True).start()


# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return render_template("index.html", base_path=BASE_PATH)


@app.get("/api/status")
def api_status():
    prefix = request.args.get("project", "").strip()
    if not prefix:
        return jsonify({"project": "", "containers": {}})
    info = compose_info(prefix)
    return jsonify({
        "project": prefix,
        "containers": {
            "postgres": container_status(info["pg"]),
            "directus": container_status(info["directus"]),
            "nextjs":   container_status(info["nextjs"]),
            "adminer":  container_status(info["adminer"]),
        },
        "info": info,
    })


@app.get("/api/projects")
def api_projects():
    return jsonify(detect_projects())


@app.get("/api/templates")
def api_templates():
    return jsonify(list_templates())


@app.delete("/api/projects/<prefix>")
def api_delete_project(prefix: str):
    if not re.match(r"^[a-z0-9_-]+$", prefix):
        abort(400)
    data         = request.get_json(silent=True) or {}
    delete_files = bool(data.get("delete_files", False))
    job_id = start_job(lambda emit: do_delete_project(emit, prefix, delete_files))
    return jsonify({"job_id": job_id})


@app.post("/api/projects")
def api_create_project():
    data     = request.get_json(silent=True) or {}
    name     = (data.get("name")     or "").strip()
    template = (data.get("template") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    if not template:
        return jsonify({"error": "template required"}), 400
    scheme = request.headers.get("X-Forwarded-Proto", "http")
    host   = request.headers.get("X-Forwarded-Host") or request.host.split(":")[0]
    server_url = PUBLIC_HOST or f"{scheme}://{host}"
    job_id = start_job(lambda emit: do_create_project(name, template, emit, server_url))
    return jsonify({"job_id": job_id})


@app.post("/api/setup")
def api_setup():
    data   = request.get_json(silent=True) or {}
    prefix = (data.get("project") or "").strip()
    if not prefix:
        return jsonify({"error": "project required"}), 400
    scheme = request.headers.get("X-Forwarded-Proto", "http")
    host   = request.headers.get("X-Forwarded-Host") or request.host.split(":")[0]
    server_url = PUBLIC_HOST or f"{scheme}://{host}"
    job_id = start_job(lambda emit: do_setup(emit, prefix, server_url))
    return jsonify({"job_id": job_id})


@app.post("/api/fix-url/<prefix>")
def api_fix_url(prefix: str):
    """Patch PUBLIC_URL + NEXT_PUBLIC_DIRECTUS_URL and rebuild nextjs for an existing project."""
    if not re.match(r"^[a-z0-9_-]+$", prefix):
        abort(400)
    scheme = request.headers.get("X-Forwarded-Proto", "http")
    host   = request.headers.get("X-Forwarded-Host") or request.host.split(":")[0]
    server_url = PUBLIC_HOST or f"{scheme}://{host}"
    def _fix(emit):
        emit(f"═══ Fix URL: {prefix} ═══")
        emit("▶ อัพเดต PUBLIC_URL (Directus)")
        _patch_directus_public_url(emit, prefix, server_url)
        emit("▶ อัพเดต NEXT_PUBLIC_DIRECTUS_URL (Next.js) + rebuild")
        _patch_nextjs_directus_url(emit, prefix, server_url)
        emit("═══ เสร็จสมบูรณ์! ═══")
    job_id = start_job(_fix)
    return jsonify({"job_id": job_id})


@app.post("/api/import/<prefix>")
def api_import(prefix: str):
    if not re.match(r"^[a-z0-9_-]+$", prefix):
        abort(400)
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "file required"}), 400
    if not f.filename.endswith(".zip"):
        return jsonify({"error": "ต้องเป็นไฟล์ .zip เท่านั้น"}), 400
    tmp_path = os.path.join(get_exports_dir(prefix), f"import_{uuid.uuid4().hex}.zip")
    os.makedirs(get_exports_dir(prefix), exist_ok=True)
    f.save(tmp_path)
    scheme = request.headers.get("X-Forwarded-Proto", "http")
    host   = request.headers.get("X-Forwarded-Host") or request.host.split(":")[0]
    server_url = PUBLIC_HOST or f"{scheme}://{host}"
    job_id = start_job(lambda emit: do_import_zip(emit, prefix, tmp_path, server_url))
    return jsonify({"job_id": job_id})


@app.post("/api/export")
def api_export():
    data   = request.get_json(silent=True) or {}
    prefix = (data.get("project") or "").strip()
    if not prefix:
        return jsonify({"error": "project required"}), 400
    job_id = start_job(lambda emit: do_export(emit, prefix))
    return jsonify({"job_id": job_id})


@app.get("/api/stream/<job_id>")
def api_stream(job_id: str):
    with _lock:
        job = _jobs.get(job_id)
    if not job:
        abort(404)

    def generate():
        cursor = 0
        while True:
            with _lock:
                batch  = job["lines"][cursor:]
                total  = len(job["lines"])
                status = job["status"]
            for line in batch:
                yield f"data: {json.dumps(line)}\n\n"
            cursor = total
            if status != "running" and cursor == total:
                yield f'data: {json.dumps("__DONE__")}\n\n'
                return
            time.sleep(0.1)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/exports")
def api_exports():
    prefix = request.args.get("project", "").strip()
    if not prefix:
        return jsonify([])
    exports_dir = get_exports_dir(prefix)
    out = []
    try:
        for fn in sorted(os.listdir(exports_dir), reverse=True):
            if fn.endswith(".zip"):
                fp = os.path.join(exports_dir, fn)
                out.append({
                    "name":    fn,
                    "size_mb": round(os.path.getsize(fp) / 1024 / 1024, 1),
                    "created": datetime.fromtimestamp(
                                   os.path.getmtime(fp)
                               ).strftime("%Y-%m-%d %H:%M"),
                })
    except Exception:
        pass
    return jsonify(out)


@app.get("/api/download/<prefix>/<path:filename>")
def api_download(prefix: str, filename: str):
    if ".." in prefix or ".." in filename or "/" in filename:
        abort(400)
    return send_from_directory(get_exports_dir(prefix), filename, as_attachment=True)


@app.get("/api/proxy")
def api_proxy_list():
    projects = detect_projects()
    return jsonify([
        {"prefix": p["name"], "enabled": proxy_enabled(p["name"])}
        for p in projects
    ])


@app.post("/api/proxy/<prefix>/enable")
def api_proxy_enable(prefix: str):
    if not re.match(r"^[a-z0-9_-]+$", prefix):
        abort(400)
    messages = []
    write_proxy_conf(prefix, emit=messages.append)
    ok, msg = sync_caddyfile(emit=messages.append)
    return jsonify({"ok": ok, "msg": msg, "log": messages})


@app.delete("/api/proxy/<prefix>")
def api_proxy_disable(prefix: str):
    if not re.match(r"^[a-z0-9_-]+$", prefix):
        abort(400)
    remove_proxy_conf(prefix)
    ok, msg = sync_caddyfile()
    return jsonify({"ok": ok, "msg": msg})


# ── database browser ─────────────────────────────────────────────────────────

def pg_query(pg: str, sql: str, timeout: int = 30) -> list[dict]:
    wrapped = (
        "SELECT COALESCE(json_agg(row_to_json(__r)), '[]'::json)"
        f" FROM ({sql}) __r"
    )
    r = subprocess.run(
        ["docker", "exec", pg,
         "psql", "-U", "directus", "-d", "directus", "-t", "-A", "-c", wrapped],
        capture_output=True, text=True, timeout=timeout,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip())
    out = r.stdout.strip()
    return json.loads(out) if out else []


def pg_scalar(pg: str, sql: str) -> str:
    r = subprocess.run(
        ["docker", "exec", pg,
         "psql", "-U", "directus", "-d", "directus", "-t", "-A", "-c", sql],
        capture_output=True, text=True, timeout=15,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


@app.get("/api/db/tables")
def api_db_tables():
    project = request.args.get("project", "").strip()
    if not project:
        return jsonify({"error": "project required"}), 400
    pg = f"{project}_db"
    try:
        tables = pg_query(pg, """
            SELECT t.table_name AS name,
                   s.n_live_tup AS row_count,
                   COUNT(c.column_name) AS col_count
            FROM information_schema.tables t
            LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
            LEFT JOIN information_schema.columns c
                   ON c.table_name = t.table_name AND c.table_schema = 'public'
            WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
            GROUP BY t.table_name, s.n_live_tup
            ORDER BY t.table_name
        """)
        for t in tables:
            t["row_count"] = int(t["row_count"]) if t.get("row_count") is not None else None
            t["col_count"] = int(t.get("col_count", 0))
        return jsonify(tables)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/db/table/<table_name>")
def api_db_table(table_name: str):
    if not re.match(r"^[a-zA-Z0-9_]+$", table_name):
        abort(400)
    project   = request.args.get("project", "").strip()
    if not project:
        return jsonify({"error": "project required"}), 400
    pg        = f"{project}_db"
    page      = max(1, int(request.args.get("page", 1)))
    page_size = min(200, max(10, int(request.args.get("page_size", 50))))
    search    = request.args.get("search", "").strip()

    try:
        columns = pg_query(pg, f"""
            SELECT column_name AS name, data_type AS type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = '{table_name}'
            ORDER BY ordinal_position
        """)
        if not columns:
            return jsonify({"error": "Table not found"}), 404

        where = ""
        if search:
            text_types = {"character varying", "text", "varchar", "char", "name", "uuid"}
            text_cols  = [c["name"] for c in columns if c["type"] in text_types]
            if text_cols:
                escaped = search.replace("'", "''").replace("%", r"\%").replace("_", r"\_")
                conds   = [f"""CAST("{c}" AS TEXT) ILIKE '%{escaped}%' ESCAPE '\\'"""
                           for c in text_cols]
                where   = "WHERE " + " OR ".join(conds)

        total  = int(pg_scalar(pg, f'SELECT COUNT(*) FROM "{table_name}" {where}'))
        offset = (page - 1) * page_size
        rows   = pg_query(pg,
            f'SELECT * FROM "{table_name}" {where} LIMIT {page_size} OFFSET {offset}',
            timeout=60,
        )
        str_rows = [
            {k: (str(v) if v is not None else None) for k, v in row.items()}
            for row in rows
        ]
        return jsonify({
            "columns":   columns,
            "rows":      str_rows,
            "total":     total,
            "page":      page,
            "page_size": page_size,
            "pages":     max(1, (total + page_size - 1) // page_size),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9090, debug=False, threaded=True)
