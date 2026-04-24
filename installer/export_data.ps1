param([string]$ProjectDir = (Split-Path $PSScriptRoot -Parent))

# ── Console helpers ───────────────────────────────────────────
function Write-Banner($t) {
    Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
    Write-Host "  $t" -ForegroundColor Cyan
    Write-Host ("=" * 54) -ForegroundColor Cyan
}
function Write-Step($m) { Write-Host "`n▶  $m" -ForegroundColor Yellow }
function Write-Ok($m)   { Write-Host "   ✔  $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "   ⚠  $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "   ✘  $m" -ForegroundColor Red }
function Pause-Exit     { Read-Host "`nกด Enter เพื่อออก"; exit 1 }

# ── Read container name from docker-compose.yaml ─────────────
function Get-ComposeInfo($path) {
    $info = @{ pg = 'bdt_directus_db'; dir = 'bdt_directus'; dirPort = '8056' }
    if (-not (Test-Path $path)) { return $info }
    $c = [IO.File]::ReadAllText($path)
    if ($c -match 'container_name:\s+(\S+_db)\b')       { $info.pg  = $Matches[1] }
    if ($c -match 'container_name:\s+(\S+_directus)\b') { $info.dir = $Matches[1] }
    if ($c -match '"(\d+):8055"')                        { $info.dirPort = $Matches[1] }
    return $info
}

# ═════════════════════════════════════════════════════════════
#  MAIN
# ═════════════════════════════════════════════════════════════
Set-Location $ProjectDir

Write-Banner "BDT Next Direct — Data Exporter"

$info        = Get-ComposeInfo (Join-Path $ProjectDir "docker-compose.yaml")
$pgContainer = $info.pg

Write-Host "`n  PostgreSQL container : $pgContainer"
Write-Host "  Directus container  : $($info.dir)"

# ── check Docker ──────────────────────────────────────────────
Write-Step "ตรวจสอบ Docker"
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker ไม่ได้รันอยู่"
    Pause-Exit
}
Write-Ok "Docker พร้อมใช้งาน"

# ── check container running ───────────────────────────────────
$state = docker inspect --format '{{.State.Running}}' $pgContainer 2>&1
if ($state -ne 'true') {
    Write-Err "Container '$pgContainer' ไม่ได้รันอยู่"
    Write-Host "     รัน: docker compose up -d  แล้วลองใหม่"
    Pause-Exit
}
Write-Ok "Container '$pgContainer' กำลังรัน"

# ── create export dir ─────────────────────────────────────────
$ts        = Get-Date -Format 'yyyyMMdd_HHmmss'
$exportDir = Join-Path $ProjectDir "_export_$ts"
New-Item -ItemType Directory -Path $exportDir | Out-Null
$parts = @()

# ── export database ───────────────────────────────────────────
Write-Step "Export database"
$dumpOut = Join-Path $exportDir "dump.sql"
cmd /c "docker exec $pgContainer pg_dump -U directus --no-owner --no-acl directus > `"$dumpOut`""
if ($LASTEXITCODE -eq 0 -and (Test-Path $dumpOut)) {
    $kb = [math]::Round((Get-Item $dumpOut).Length / 1KB)
    Write-Ok "dump.sql  ($kb KB)"
    $parts += 'dump.sql'
} else {
    Write-Warn "pg_dump มีปัญหา"
}

# ── export uploads ────────────────────────────────────────────
Write-Step "Export uploads"
$uploadsSrc = Join-Path $ProjectDir "directus\uploads"
if (Test-Path $uploadsSrc) {
    $uploadsDst = Join-Path $exportDir "uploads"
    Copy-Item $uploadsSrc $uploadsDst -Recurse
    $fc = (Get-ChildItem $uploadsDst -Recurse -File).Count
    Write-Ok "uploads/  ($fc files)"
    $parts += 'uploads/'
} else {
    Write-Warn "ไม่พบ directus\uploads\ — ข้าม"
}

# ── zip ───────────────────────────────────────────────────────
Write-Step "สร้าง zip archive"
$zipName = "export_$ts.zip"
$zipPath = Join-Path $ProjectDir $zipName
Compress-Archive -Path "$exportDir\*" -DestinationPath $zipPath -CompressionLevel Optimal
$mb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
$fc = (Get-ChildItem $exportDir -Recurse -File).Count
Write-Ok "$zipName  ($fc files, $mb MB)"

# ── cleanup ───────────────────────────────────────────────────
Remove-Item $exportDir -Recurse -Force

# ── summary ───────────────────────────────────────────────────
Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
Write-Host "  ✔  Export เสร็จสมบูรณ์!" -ForegroundColor Green
Write-Host ("=" * 54) -ForegroundColor Cyan
Write-Host "`n  ไฟล์ : $zipName"
Write-Host "  ที่   : $ProjectDir"
Write-Host "`n  ภายใน zip"
foreach ($p in $parts) { Write-Host "    ✔  $p" -ForegroundColor Green }
Write-Host "`n  วิธีนำเข้าบนเครื่องใหม่"
Write-Host "    1. แตก zip → วางทับโฟลเดอร์โปรเจกต์"
Write-Host "    2. double-click install.bat"
Write-Host ("=" * 54) -ForegroundColor Cyan

Read-Host "`nกด Enter เพื่อออก"
