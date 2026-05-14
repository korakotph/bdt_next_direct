#!/usr/bin/env python3
"""BDT Next Direct — Management Server"""
import json
import os
import re
import shutil
import subprocess
import threading
import time
import uuid
import zipfile
from datetime import datetime

from flask import Flask, Response, abort, jsonify, render_template, send_from_directory

app = Flask(__name__)

PROJECT_DIR = os.environ.get("PROJECT_DIR", "/project")
EXPORTS_DIR = os.path.join(PROJECT_DIR, "_exports")

_jobs: dict = {}
_lock = threading.Lock()


# ── helpers ───────────────────────────────────────────────────────────────────

def compose_info() -> dict:
    d = {
        "pg":        "bdt_next_direct_db",
        "directus":  "bdt_next_direct_directus",
        "nextjs":    "bdt_next_direct_nextjs",
        "manager":   "bdt_next_direct_manager",
        "dir_port":  "8056",
        "next_port": "3012",
    }
    try:
        txt = open(os.path.join(PROJECT_DIR, "docker-compose.yaml")).read()
        for pat, key in [
            (r'container_name:\s*(\S+_db)\b',        "pg"),
            (r'container_name:\s*(\S+_directus)\b',   "directus"),
            (r'container_name:\s*(\S+_nextjs)\b',     "nextjs"),
            (r'container_name:\s*(\S+_manager)\b',    "manager"),
            (r'"(\d+):8055"',                         "dir_port"),
            (r'"(\d+):3000"',                         "next_port"),
        ]:
            m = re.search(pat, txt)
            if m:
                d[key] = m.group(1)
    except Exception:
        pass
    return d


def project_name() -> str:
    return re.sub(r"_db$", "", compose_info()["pg"])


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


def stream_cmd(cmd: list, emit, stdin_bytes: bytes = None) -> int:
    emit(f"$ {' '.join(str(c) for c in cmd)}")
    try:
        p = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE if stdin_bytes is not None else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=PROJECT_DIR,
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


def compose_run(args: list, emit) -> int:
    pname = project_name()
    cf = os.path.join(PROJECT_DIR, "docker-compose.yaml")
    return stream_cmd(["docker", "compose", "-f", cf, "-p", pname] + args, emit)


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


# ── setup ─────────────────────────────────────────────────────────────────────

def do_setup(emit):
    info = compose_info()
    pg = info["pg"]

    emit("═══ Setup เริ่มต้น ═══")

    emit("▶ Build Next.js image (อาจใช้เวลาหลายนาที)")
    compose_run(["build", "nextjs"], emit)

    emit("▶ เริ่ม PostgreSQL")
    rc = compose_run(["up", "-d", "postgres"], emit)
    if rc != 0:
        emit("✘ ไม่สามารถเริ่ม postgres ได้")
        return

    emit("▶ รอ PostgreSQL พร้อม")
    ready = False
    for i in range(40):
        r = subprocess.run(
            ["docker", "exec", pg, "pg_isready", "-U", "directus"],
            capture_output=True, timeout=5,
        )
        if r.returncode == 0:
            ready = True
            break
        emit(f"   รอ... ({i + 1}/40)")
        time.sleep(3)

    if not ready:
        emit("⚠ PostgreSQL ยังไม่พร้อม — ดำเนินการต่อ")
    else:
        emit("✔ PostgreSQL พร้อมแล้ว")
        _import_dump(emit, pg)

    emit("▶ เริ่ม Directus และ Next.js")
    compose_run(["up", "-d", "directus", "nextjs"], emit)

    emit("▶ รอ Directus พร้อม")
    dir_ready = False
    for i in range(40):
        r = subprocess.run(
            ["curl", "-sf", "http://directus:8055/server/health"],
            capture_output=True, timeout=5,
        )
        if r.returncode == 0:
            dir_ready = True
            break
        emit(f"   รอ... ({i + 1}/40)")
        time.sleep(3)

    if dir_ready:
        emit("✔ Directus พร้อมแล้ว")
    else:
        emit("⚠ Directus ยังไม่ตอบสนอง — ตรวจสอบ logs")

    emit("═══ Setup เสร็จสมบูรณ์! ═══")
    emit(f'  Frontend  : http://<server-ip>:{info["next_port"]}')
    emit(f'  Directus  : http://<server-ip>:{info["dir_port"]}')
    emit(f'  Admin     : http://<server-ip>:{info["dir_port"]}/admin/setup')


def _import_dump(emit, pg: str):
    dump_path = os.path.join(PROJECT_DIR, "dump.sql")
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
    if r.returncode == 0:
        emit("✔ Import สำเร็จ")
    else:
        emit(f"⚠ Import warning: {r.stderr.decode(errors='replace')[:300]}")

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


# ── export ────────────────────────────────────────────────────────────────────

def do_export(emit):
    import pathlib

    info = compose_info()
    pg = info["pg"]

    emit("═══ Export เริ่มต้น ═══")
    os.makedirs(EXPORTS_DIR, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    tmp = os.path.join(EXPORTS_DIR, f"_tmp_{ts}")
    os.makedirs(tmp, exist_ok=True)

    parts = []

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
        parts.append("dump.sql")
    else:
        emit(f"⚠ pg_dump: {r.stderr.decode(errors='replace')[:200]}")

    emit("▶ Export uploads")
    src = os.path.join(PROJECT_DIR, "directus", "uploads")
    if os.path.isdir(src):
        dst = os.path.join(tmp, "directus", "uploads")
        shutil.copytree(src, dst)
        count = sum(1 for p in pathlib.Path(dst).rglob("*") if p.is_file())
        emit(f"✔ directus/uploads/ ({count} files)")
        parts.append("directus/uploads/")
    else:
        emit("⚠ ไม่พบ directus/uploads/ — ข้าม")

    emit("▶ สร้าง zip archive")
    zip_name = f"export_{ts}.zip"
    zip_path = os.path.join(EXPORTS_DIR, zip_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(tmp):
            for fn in files:
                fp = os.path.join(root, fn)
                zf.write(fp, os.path.relpath(fp, tmp))
    shutil.rmtree(tmp)

    mb = os.path.getsize(zip_path) / 1024 / 1024
    emit(f"✔ {zip_name} ({mb:.1f} MB)")
    emit("═══ Export เสร็จสมบูรณ์! ═══")
    emit(f"DOWNLOAD:{zip_name}")


# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/status")
def api_status():
    info = compose_info()
    return jsonify({
        "containers": {
            "postgres":  container_status(info["pg"]),
            "directus":  container_status(info["directus"]),
            "nextjs":    container_status(info["nextjs"]),
            "manager":   container_status(info["manager"]),
        },
        "info": info,
    })


@app.post("/api/setup")
def api_setup():
    return jsonify({"job_id": start_job(do_setup)})


@app.post("/api/export")
def api_export():
    return jsonify({"job_id": start_job(do_export)})


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
    out = []
    try:
        for fn in sorted(os.listdir(EXPORTS_DIR), reverse=True):
            if fn.endswith(".zip"):
                fp = os.path.join(EXPORTS_DIR, fn)
                out.append({
                    "name":     fn,
                    "size_mb":  round(os.path.getsize(fp) / 1024 / 1024, 1),
                    "created":  datetime.fromtimestamp(
                                    os.path.getmtime(fp)
                                ).strftime("%Y-%m-%d %H:%M"),
                })
    except Exception:
        pass
    return jsonify(out)


@app.get("/api/download/<path:filename>")
def api_download(filename: str):
    if ".." in filename or "/" in filename:
        abort(400)
    return send_from_directory(EXPORTS_DIR, filename, as_attachment=True)


if __name__ == "__main__":
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    app.run(host="0.0.0.0", port=9090, debug=False, threaded=True)
