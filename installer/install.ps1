param([string]$ProjectDir = (Split-Path $PSScriptRoot -Parent))

# ── Log file (บันทึก output ทุกอย่างลงไฟล์) ──────────────────
$LogFile = Join-Path $ProjectDir "install_log.txt"
Start-Transcript -Path $LogFile -Force | Out-Null

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

function Pause-Exit($msg) {
    if ($msg) { Write-Err $msg }
    Write-Host "`n  Log ไฟล์: $LogFile" -ForegroundColor Gray
    Stop-Transcript | Out-Null
    Read-Host "`nกด Enter เพื่อออก"
    exit 1
}

# ── Sanitize folder name → container prefix ───────────────────
function Get-Prefix($name) {
    $s = $name.ToLower() -replace '[^a-z0-9_-]','_' -replace '_+','_'
    return $s.Trim('_','-')
}

# ── Find first free TCP port ───────────────────────────────────
function Find-FreePort($start) {
    for ($p = $start; $p -lt ($start + 300); $p++) {
        $tcp = New-Object Net.Sockets.TcpClient
        try { $tcp.Connect('127.0.0.1', $p); $tcp.Close() }
        catch { return $p }
    }
    throw "No free port near $start"
}

# ── Patch docker-compose.yaml in place ────────────────────────
function Update-Compose($path, $prefix, $pgPort, $dirPort, $nextPort) {
    Copy-Item $path "$path.bak" -Force
    Write-Ok "Backup → docker-compose.yaml.bak"

    $c = [IO.File]::ReadAllText($path)

    $pgName  = if ($c -match 'container_name:\s+(\S+_db)\b')       { $Matches[1] } else { 'bdt_directus_db' }
    $dirName = if ($c -match 'container_name:\s+(\S+_directus)\b') { $Matches[1] } else { 'bdt_directus' }
    $nxtName = if ($c -match 'container_name:\s+(\S+_nextjs)\b')   { $Matches[1] } else { 'bdt_nextjs' }
    $pgOld   = if ($c -match '"(\d+):5432"') { $Matches[1] } else { '5433' }
    $dirOld  = if ($c -match '"(\d+):8055"') { $Matches[1] } else { '8056' }
    $nxtOld  = if ($c -match '"(\d+):3000"') { $Matches[1] } else { '3012' }
    $volOld  = if ($c -match '\b(\w+postgres_data)\b') { $Matches[1] } else { 'postgres_data' }

    $c = $c.Replace($pgName,  "${prefix}_db")
    $c = $c.Replace($dirName, "${prefix}_directus")
    $c = $c.Replace($nxtName, "${prefix}_nextjs")
    $c = $c.Replace("`"${pgOld}:5432`"",  "`"${pgPort}:5432`"")
    $c = $c.Replace("`"${dirOld}:8055`"", "`"${dirPort}:8055`"")
    $c = $c.Replace("`"${nxtOld}:3000`"", "`"${nextPort}:3000`"")
    $c = $c -replace 'PUBLIC_URL:\s+http://localhost:\d+',
                     "PUBLIC_URL: http://localhost:${dirPort}"
    $c = $c -replace 'NEXT_PUBLIC_DIRECTUS_URL:\s+http://localhost:\d+',
                     "NEXT_PUBLIC_DIRECTUS_URL: http://localhost:${dirPort}"
    $c = $c.Replace($volOld, "${prefix}_postgres_data")

    [IO.File]::WriteAllText($path, $c, [Text.Encoding]::UTF8)
    return "${prefix}_db"
}

# ─────────────────────────────────────────────────────────────
#  MAIN (wrapped ป้องกันหน้าต่างปิดกะทันหัน)
# ─────────────────────────────────────────────────────────────
try {
    Set-Location $ProjectDir

    $folderName = Split-Path $ProjectDir -Leaf
    $prefix     = Get-Prefix $folderName

    Write-Banner "BDT Next Direct — Docker Installer"
    Write-Host "`n  โฟลเดอร์   : $folderName"
    Write-Host "  Container  : ${prefix}_*"
    Write-Host "  Log file   : $LogFile" -ForegroundColor Gray

    # ── check Docker ──────────────────────────────────────────
    Write-Step "ตรวจสอบ Docker"
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Pause-Exit "Docker ไม่ได้รันอยู่ หรือยังไม่ได้ติดตั้ง`n     กรุณาเปิด Docker Desktop แล้วลองใหม่"
    }
    Write-Ok "Docker พร้อมใช้งาน"

    $composePath = Join-Path $ProjectDir "docker-compose.yaml"
    if (-not (Test-Path $composePath)) { Pause-Exit "ไม่พบ docker-compose.yaml" }

    # ── find free ports ───────────────────────────────────────
    Write-Step "หา port ที่ว่าง"
    $pgPort   = Find-FreePort 5433
    $dirPort  = Find-FreePort 8056
    $nextPort = Find-FreePort 3012
    Write-Ok "PostgreSQL  → $pgPort"
    Write-Ok "Directus    → $dirPort"
    Write-Ok "Next.js     → $nextPort"

    # ── patch compose ─────────────────────────────────────────
    Write-Step "อัปเดต docker-compose.yaml"
    $pgContainer = Update-Compose $composePath $prefix $pgPort $dirPort $nextPort
    Write-Ok "เสร็จแล้ว"

    # ── build + start (retry 3 ครั้งกรณี network timeout) ────
    Write-Step "Build และ Start containers  (อาจใช้เวลาหลายนาที)"
    $built = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if ($attempt -gt 1) {
            Write-Warn "ลองใหม่ครั้งที่ $attempt/3 (รอ 10 วินาที)..."
            Start-Sleep 10
        }
        docker compose up -d --build
        if ($LASTEXITCODE -eq 0) { $built = $true; break }
        Write-Warn "ครั้งที่ $attempt ล้มเหลว"
    }
    if (-not $built) { Pause-Exit "docker compose up ล้มเหลวทุกครั้ง — ดู log ด้านบน" }
    Write-Ok "Containers กำลังรัน"

    # ── wait for postgres ─────────────────────────────────────
    Write-Step "รอ PostgreSQL พร้อม"
    $ready = $false
    for ($i = 1; $i -le 40; $i++) {
        docker exec $pgContainer pg_isready -U directus 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Write-Host "`r   รอ... ($i/40)" -NoNewline
        Start-Sleep 3
    }
    Write-Host ""

    if (-not $ready) {
        Write-Warn "PostgreSQL ยังไม่พร้อม — ข้ามการ import database"
    } else {
        Write-Ok "PostgreSQL พร้อมแล้ว"

        $dumpPath = Join-Path $ProjectDir "dump.sql"
        if (Test-Path $dumpPath) {
            Write-Step "Import database (dump.sql)"
            cmd /c "docker exec -i $pgContainer psql -U directus -d directus < `"$dumpPath`""
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Import สำเร็จ"
                Write-Step "Restart Directus เพื่อโหลด schema ใหม่"
                docker compose restart directus | Out-Null
                Write-Ok "รอ 10 วินาที..."
                Start-Sleep 10
            } else {
                Write-Warn "Import อาจมีปัญหา — ดู: docker compose logs directus"
            }
        } else {
            Write-Warn "ไม่พบ dump.sql — ข้ามการ import"
        }
    }

    # ── summary ───────────────────────────────────────────────
    Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
    Write-Host "  ✔  ติดตั้งเสร็จสมบูรณ์!" -ForegroundColor Green
    Write-Host ("=" * 54) -ForegroundColor Cyan
    Write-Host "`n  Frontend  :  http://localhost:$nextPort"
    Write-Host "  Directus  :  http://localhost:$dirPort"
    Write-Host "`n  Directus login"
    Write-Host "    Email    :  admin@example.com"
    Write-Host "    Password :  admin123"
    Write-Host "`n  Container names"
    Write-Host "    ${prefix}_db  /  ${prefix}_directus  /  ${prefix}_nextjs"
    Write-Host "`n  Log file  :  $LogFile" -ForegroundColor Gray
    Write-Host ("=" * 54) -ForegroundColor Cyan

} catch {
    Write-Host "`n" -NoNewline
    Write-Err "เกิดข้อผิดพลาดที่ไม่คาดคิด:"
    Write-Host "  $_" -ForegroundColor Red
    Write-Host "`n  รายละเอียดทั้งหมดอยู่ใน: $LogFile" -ForegroundColor Yellow
}

Stop-Transcript | Out-Null
Read-Host "`nกด Enter เพื่อออก"
