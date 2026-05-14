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

PROJECTS_ROOT      = os.environ.get("PROJECTS_ROOT",      "/projects_root")
HOST_PROJECTS_ROOT = os.environ.get("HOST_PROJECTS_ROOT", "").strip()

_jobs: dict = {}
_lock = threading.Lock()


# ── path helpers ──────────────────────────────────────────────────────────────

def get_project_dir(prefix: str) -> str:
    """Container-internal path for a project via the PROJECTS_ROOT mount."""
    return os.path.join(PROJECTS_ROOT, prefix)


def get_project_host_dir(prefix: str) -> str:
    """Resolve a project's actual host path for docker compose --project-directory.

    Tries HOST_PROJECTS_ROOT env first, then auto-detects via docker inspect by
    looking at the /directus/uploads bind-mount source on the project's containers.
    """
    if HOST_PROJECTS_ROOT:
        return os.path.join(HOST_PROJECTS_ROOT, prefix)
    for cname in [f"{prefix}_directus", f"{prefix}_db", f"{prefix}_nextjs"]:
        try:
            r = subprocess.run(
                ["docker", "inspect", "--format",
                 "{{range .Mounts}}{{.Source}}|{{.Destination}}\n{{end}}", cname],
                capture_output=True, text=True, timeout=5,
            )
            for line in r.stdout.splitlines():
                if "|" not in line:
                    continue
                src, dst = line.split("|", 1)
                if dst == "/directus/uploads":
                    return str(pathlib.Path(src).parent.parent)
        except Exception:
            pass
    return ""


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


def compose_run(args: list, emit, prefix: str,
                compose_file: str = None, host_dir: str = None) -> int:
    if compose_file is None:
        compose_file = os.path.join(get_project_dir(prefix), "docker-compose.yaml")
    if host_dir is None:
        host_dir = get_project_host_dir(prefix)
    return stream_cmd(
        ["docker", "compose", "-f", compose_file,
         "--project-directory", host_dir, "-p", prefix] + args,
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

def do_setup(emit, prefix: str):
    project_dir  = get_project_dir(prefix)
    host_dir     = get_project_host_dir(prefix)
    compose_file = os.path.join(project_dir, "docker-compose.yaml")
    info = compose_info(prefix)
    pg   = info["pg"]
    emit(f"═══ Setup: {prefix} ═══")

    if not host_dir:
        emit("✘ ไม่พบ host path ของโปรเจค — ตรวจสอบ HOST_PROJECTS_ROOT")
        return

    emit("▶ Build Next.js image (อาจใช้เวลาหลายนาที)")
    compose_run(["build", "nextjs"], emit, prefix=prefix,
                compose_file=compose_file, host_dir=host_dir)

    emit("▶ เริ่ม PostgreSQL")
    if compose_run(["up", "-d", "postgres"], emit, prefix=prefix,
                   compose_file=compose_file, host_dir=host_dir) != 0:
        emit("✘ ไม่สามารถเริ่ม postgres ได้")
        return

    if _wait_for_pg(emit, pg):
        _import_dump(emit, pg, os.path.join(project_dir, "dump.sql"))

    emit("▶ เริ่ม Directus, Next.js และ Adminer")
    compose_run(["up", "-d", "directus", "nextjs", "adminer"], emit,
                prefix=prefix, compose_file=compose_file, host_dir=host_dir)
    _wait_for_directus(emit, prefix)

    emit("═══ Setup เสร็จสมบูรณ์! ═══")
    emit(f'  Frontend  : http://<server-ip>:{info["next_port"]}')
    emit(f'  Directus  : http://<server-ip>:{info["dir_port"]}')
    emit(f'  Adminer   : http://<server-ip>:{info["adminer_port"]}')
    emit(f'  Admin     : http://<server-ip>:{info["dir_port"]}/admin/setup')


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


# ── create project ────────────────────────────────────────────────────────────

def do_create_project(name: str, template_prefix: str, emit):
    prefix = re.sub(r"[^a-z0-9_-]", "_", name.lower().strip())
    prefix = re.sub(r"_+", "_", prefix).strip("_")
    if not prefix:
        emit("✘ ชื่อโปรเจคไม่ถูกต้อง")
        return

    template_dir  = get_project_dir(template_prefix)
    template_host = get_project_host_dir(template_prefix)
    target_c      = get_project_dir(prefix)
    host_parent   = os.path.dirname(template_host) if template_host else ""
    target_h      = os.path.join(host_parent, prefix) if host_parent else ""

    if os.path.exists(target_c):
        emit(f"✘ โฟลเดอร์ {prefix} มีอยู่แล้ว")
        return

    emit(f"═══ สร้างโปรเจค: {prefix} ═══")
    emit(f"   Template : {template_prefix}")
    if target_h:
        emit(f"   โฟลเดอร์ : {target_h}")

    emit("▶ คัดลอก template")
    shutil.copytree(template_dir, target_c,
                    ignore=shutil.ignore_patterns(".git", "_exports", "*.bak"))
    up = os.path.join(target_c, "directus", "uploads")
    shutil.rmtree(up, ignore_errors=True)
    os.makedirs(up, exist_ok=True)
    emit("✔ คัดลอกเสร็จ")

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

    emit("▶ ตั้งค่า docker-compose.yaml")
    compose_path = os.path.join(target_c, "docker-compose.yaml")
    with open(compose_path) as f:
        txt = f.read()

    for svc in ("db", "directus", "nextjs", "adminer"):
        m = re.search(rf"container_name:\s*(\S+_{svc})\b", txt)
        if m:
            txt = txt.replace(m.group(1), f"{prefix}_{svc}")

    txt = re.sub(r'"(\d+):5432"', f'"{pg_port}:5432"',        txt)
    txt = re.sub(r'"(\d+):8055"', f'"{dir_port}:8055"',       txt)
    txt = re.sub(r'"(\d+):3000"', f'"{next_port}:3000"',      txt)
    txt = re.sub(r'"(\d+):8080"', f'"{adminer_port}:8080"',   txt)
    txt = re.sub(r"PUBLIC_URL: http://localhost:\d+",
                 f"PUBLIC_URL: http://localhost:{dir_port}", txt)
    txt = re.sub(r"NEXT_PUBLIC_DIRECTUS_URL: http://localhost:\d+",
                 f"NEXT_PUBLIC_DIRECTUS_URL: http://localhost:{dir_port}", txt)
    txt = re.sub(r'SESSION_COOKIE_NAME: "[^"]+_session_token"',
                 f'SESSION_COOKIE_NAME: "{prefix}_session_token"', txt)
    txt = re.sub(r'REFRESH_TOKEN_COOKIE_NAME: "[^"]+_refresh_token"',
                 f'REFRESH_TOKEN_COOKIE_NAME: "{prefix}_refresh_token"', txt)
    txt = re.sub(r"\S+_postgres_data", f"{prefix}_postgres_data", txt)

    with open(compose_path, "w") as f:
        f.write(txt)
    emit("✔ ตั้งค่าเสร็จ")

    emit("▶ Build Next.js image (อาจใช้เวลาหลายนาที)")
    compose_run(["build", "nextjs"], emit, prefix=prefix,
                compose_file=compose_path, host_dir=target_h)

    emit("▶ เริ่ม PostgreSQL")
    compose_run(["up", "-d", "postgres"], emit, prefix=prefix,
                compose_file=compose_path, host_dir=target_h)

    if _wait_for_pg(emit, f"{prefix}_db", retries=30):
        _import_dump(emit, f"{prefix}_db", os.path.join(target_c, "dump.sql"))

    emit("▶ เริ่ม containers ทั้งหมด")
    compose_run(["up", "-d", "directus", "nextjs", "adminer"], emit,
                prefix=prefix, compose_file=compose_path, host_dir=target_h)

    emit("═══ สร้างโปรเจคเสร็จสมบูรณ์! ═══")
    emit(f"  Frontend  : http://<server-ip>:{next_port}")
    emit(f"  Directus  : http://<server-ip>:{dir_port}")
    emit(f"  Adminer   : http://<server-ip>:{adminer_port}")
    emit(f"  Admin     : http://<server-ip>:{dir_port}/admin/setup")


# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return render_template("index.html")


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


@app.post("/api/projects")
def api_create_project():
    data     = request.get_json(silent=True) or {}
    name     = (data.get("name")     or "").strip()
    template = (data.get("template") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    if not template:
        return jsonify({"error": "template required"}), 400
    job_id = start_job(lambda emit: do_create_project(name, template, emit))
    return jsonify({"job_id": job_id})


@app.post("/api/setup")
def api_setup():
    data   = request.get_json(silent=True) or {}
    prefix = (data.get("project") or "").strip()
    if not prefix:
        return jsonify({"error": "project required"}), 400
    job_id = start_job(lambda emit: do_setup(emit, prefix))
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
            SELECT t.table_name,
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
