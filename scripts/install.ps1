# scripts/install.ps1

param([string]$ProjectDir = (Split-Path $PSScriptRoot -Parent))

$LogFile = Join-Path $ProjectDir "install_log.txt"
Start-Transcript -Path $LogFile -Force | Out-Null

function Write-Banner($t) {
    Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
    Write-Host "  $t" -ForegroundColor Cyan
    Write-Host ("=" * 54) -ForegroundColor Cyan
}
function Write-Step($m) { Write-Host "`n>> $m" -ForegroundColor Yellow }
function Write-Ok($m)   { Write-Host "   [OK]  $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "   [!!]  $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "   [XX]  $m" -ForegroundColor Red }

function Pause-Exit($msg) {
    if ($msg) { Write-Err $msg }
    Write-Host "`n  Log file: $LogFile" -ForegroundColor Gray
    Stop-Transcript | Out-Null
    Read-Host "`nPress Enter to exit"
    exit 1
}

function Get-Prefix($name) {
    $s = $name.ToLower() -replace '[^a-z0-9_-]','_' -replace '_+','_'
    return $s.Trim('_','-')
}

function Find-FreePort($start) {
    for ($p = $start; $p -lt ($start + 300); $p++) {
        $tcp = New-Object Net.Sockets.TcpClient
        try { $tcp.Connect('127.0.0.1', $p); $tcp.Close() }
        catch { return $p }
    }
    throw "No free port near $start"
}

function Update-Compose($path, $prefix, $pgPort, $dirPort, $nextPort, $adminEmail, $adminPass) {
    Copy-Item $path "$path.bak" -Force
    Write-Ok "Backup -> docker-compose.yaml.bak"

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
    $c = $c -replace 'ADMIN_EMAIL:\s+\S+',     "ADMIN_EMAIL: ${adminEmail}"
    $c = $c -replace 'ADMIN_PASSWORD:\s+\S+',  "ADMIN_PASSWORD: ${adminPass}"

    [IO.File]::WriteAllText($path, $c, [Text.Encoding]::UTF8)
    return "${prefix}_db"
}

# ─────────────────────────────────────────────────────────────
try {
    Set-Location $ProjectDir

    $folderName = Split-Path $ProjectDir -Leaf
    $prefix     = Get-Prefix $folderName

    Write-Banner "BDT Next Direct - Docker Installer"
    Write-Host "`n  Folder    : $folderName"
    Write-Host "  Container : ${prefix}_*"
    Write-Host "  Log file  : $LogFile" -ForegroundColor Gray

    # check Docker
    Write-Step "Checking Docker"
    $dockerExists = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
    if (-not $dockerExists) {
        Write-Err "docker not found — please install Docker first"
        Write-Host ""
        Write-Host "  Docker installation options:" -ForegroundColor Cyan
        Write-Host "   1) Docker Desktop  : https://www.docker.com/products/docker-desktop"
        Write-Host "   2) Rancher Desktop : https://rancherdesktop.io  (free, Docker Desktop alternative)"
        Write-Host "   3) Podman Desktop  : https://podman-desktop.io  (free, open-source)"
        Write-Host ""
        Write-Host "  After installing, open the app and wait for it to finish starting," -ForegroundColor Yellow
        Write-Host "  then run install.bat again." -ForegroundColor Yellow
        Pause-Exit
    }
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        # Detect C:\ProgramData\DockerDesktop ownership error
        $ddPath = "C:\ProgramData\DockerDesktop"
        $ownershipBad = $false
        if (Test-Path $ddPath) {
            try {
                $owner = (Get-Acl $ddPath -ErrorAction Stop).Owner
                # Elevated owners: NT AUTHORITY\SYSTEM, BUILTIN\Administrators, etc.
                $ownershipBad = $owner -notmatch '^(NT AUTHORITY|BUILTIN\\Administrators|NT SERVICE|SYSTEM)'
            } catch { $ownershipBad = $true }
        }

        if ($ownershipBad) {
            Write-Err "Docker Desktop ownership error detected"
            Write-Host ""
            Write-Host "  Error: C:\ProgramData\DockerDesktop is not owned by an elevated account" -ForegroundColor Red
            Write-Host "  (Docker Desktop แสดง: 'For security reason ... must be owned by an elevated account')" -ForegroundColor Gray
            Write-Host ""

            $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
                [Security.Principal.WindowsBuiltInRole]::Administrator)

            if ($isAdmin) {
                Write-Host "  ตรวจพบว่ารันด้วยสิทธิ์ Administrator — แก้ไขอัตโนมัติได้เลย" -ForegroundColor Cyan
                $fix = Read-Host "  แก้ไข ownership อัตโนมัติเลยไหม? (Y/n)"
                if ($fix -ne 'n' -and $fix -ne 'N') {
                    Write-Step "Fixing C:\ProgramData\DockerDesktop ownership..."
                    takeown /f $ddPath /r /d y 2>&1 | Out-Null
                    icacls $ddPath /grant "Administrators:F" /t 2>&1 | Out-Null
                    Write-Ok "Ownership fixed"
                    Write-Host ""
                    Write-Host "  กรุณา restart Docker Desktop แล้วรัน install.bat อีกครั้ง" -ForegroundColor Yellow
                    Pause-Exit
                }
            } else {
                Write-Host "  วิธีแก้ไข — เปิด Command Prompt แบบ 'Run as administrator' แล้วรัน:" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "    takeown /f `"C:\ProgramData\DockerDesktop`" /r /d y" -ForegroundColor White
                Write-Host "    icacls `"C:\ProgramData\DockerDesktop`" /grant Administrators:F /t" -ForegroundColor White
                Write-Host ""
                Write-Host "  จากนั้น restart Docker Desktop แล้วรัน install.bat อีกครั้ง" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "  หรือจะ Right-click install.bat -> 'Run as administrator' แล้วรันใหม่" -ForegroundColor Yellow
                Write-Host "  เพื่อให้โปรแกรมแก้ไขให้อัตโนมัติ" -ForegroundColor Yellow
            }
            Pause-Exit
        }

        Write-Err "Docker is installed but not running"
        Write-Host ""
        Write-Host "  Please open Docker Desktop (or Rancher Desktop / Podman Desktop)" -ForegroundColor Yellow
        Write-Host "  and wait for the tray icon to stop spinning, then run install.bat again." -ForegroundColor Yellow
        Pause-Exit
    }
    Write-Ok "Docker is ready"

    $composePath = Join-Path $ProjectDir "docker-compose.yaml"
    if (-not (Test-Path $composePath)) { Pause-Exit "docker-compose.yaml not found" }

    # admin credentials
    Write-Step "Admin account setup"
    $adminEmail = Read-Host "  Admin email    (default: admin@example.com)"
    if (-not $adminEmail) { $adminEmail = "admin@example.com" }
    $adminPass  = Read-Host "  Admin password (default: admin123)"
    if (-not $adminPass)  { $adminPass  = "admin123" }
    Write-Ok "Email    : $adminEmail"
    Write-Ok "Password : $adminPass"

    # find free ports
    Write-Step "Finding available ports"
    $pgPort   = Find-FreePort 5433
    $dirPort  = Find-FreePort 8056
    $nextPort = Find-FreePort 3012
    Write-Ok "PostgreSQL  -> $pgPort"
    Write-Ok "Directus    -> $dirPort"
    Write-Ok "Next.js     -> $nextPort"

    # patch compose
    Write-Step "Updating docker-compose.yaml"
    $pgContainer = Update-Compose $composePath $prefix $pgPort $dirPort $nextPort $adminEmail $adminPass
    Write-Ok "Done"

    # build nextjs image first (so it's ready when we start all services)
    Write-Step "Building Next.js image (may take several minutes)"
    $built = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if ($attempt -gt 1) {
            Write-Warn "Retry $attempt/3 (waiting 10s)..."
            Start-Sleep 10
        }
        docker compose build nextjs
        if ($LASTEXITCODE -eq 0) { $built = $true; break }
        Write-Warn "Attempt $attempt failed"
    }
    if (-not $built) { Pause-Exit "docker compose build failed after 3 attempts. Check log above." }
    Write-Ok "Build complete"

    # start postgres only — import dump BEFORE Directus runs migrations
    Write-Step "Starting PostgreSQL"
    docker compose up -d postgres
    if ($LASTEXITCODE -ne 0) { Pause-Exit "Failed to start postgres container." }

    # wait for postgres
    Write-Step "Waiting for PostgreSQL"
    $ready = $false
    for ($i = 1; $i -le 40; $i++) {
        docker exec $pgContainer pg_isready -U directus 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Write-Host "`r   Waiting... ($i/40)" -NoNewline
        Start-Sleep 3
    }
    Write-Host ""

    if (-not $ready) {
        Write-Warn "PostgreSQL not ready - skipping database import"
    } else {
        Write-Ok "PostgreSQL is ready"

        $dumpPath = Join-Path $ProjectDir "dump.sql"
        if (Test-Path $dumpPath) {
            Write-Step "Resetting database schema"
            docker exec $pgContainer psql -U directus -d directus -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO directus; GRANT ALL ON SCHEMA public TO public;"
            Write-Ok "Schema reset"

            Write-Step "Importing database (dump.sql)"
            cmd /c "docker exec -i $pgContainer psql -U directus -d directus < `"$dumpPath`""
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Import successful"
            } else {
                Write-Warn "Import may have had errors - continuing anyway"
            }
        } else {
            Write-Warn "dump.sql not found - skipping import"
        }
    }

    # now start all remaining services (Directus finds DB already populated)
    Write-Step "Starting Directus and Next.js"
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { Pause-Exit "Failed to start all containers." }
    Write-Ok "All containers are running"

    # wait for Directus health endpoint
    Write-Step "Waiting for Directus to be ready"
    $dirReady = $false
    for ($i = 1; $i -le 40; $i++) {
        try {
            $h = Invoke-WebRequest -Uri "http://localhost:${dirPort}/server/health" `
                 -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($h.StatusCode -eq 200) { $dirReady = $true; break }
        } catch {}
        Write-Host "`r   Waiting... ($i/40)" -NoNewline
        Start-Sleep 3
    }
    Write-Host ""

    # update admin credentials via Directus API
    if ($dirReady) {
        Write-Ok "Directus is ready"

        if ($adminEmail -ne "admin@example.com" -or $adminPass -ne "admin123") {
            Write-Step "Updating admin credentials"
            try {
                $loginBody = '{"email":"admin@example.com","password":"admin123"}'
                $loginResp = Invoke-RestMethod -Uri "http://localhost:${dirPort}/auth/login" `
                    -Method POST -Body $loginBody -ContentType "application/json"
                $token = $loginResp.data.access_token

                if ($token) {
                    $patchBody = "{`"email`":`"${adminEmail}`",`"password`":`"${adminPass}`"}"
                    Invoke-RestMethod -Uri "http://localhost:${dirPort}/users/me" `
                        -Method PATCH -Body $patchBody -ContentType "application/json" `
                        -Headers @{ Authorization = "Bearer $token" } | Out-Null
                    Write-Ok "Credentials updated successfully"
                } else {
                    Write-Warn "Could not get token - please change password in Directus admin"
                }
            } catch {
                Write-Warn "Could not update credentials via API: $_ - please change in Directus admin"
            }
        }
    } else {
        Write-Warn "Directus did not respond - check: docker compose logs directus"
    }

    Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
    Write-Host "  INSTALL COMPLETE!" -ForegroundColor Green
    Write-Host ("=" * 54) -ForegroundColor Cyan
    Write-Host "`n  Frontend  :  http://localhost:$nextPort"
    Write-Host "  Directus  :  http://localhost:$dirPort"
    Write-Host "`n  Directus login"
    Write-Host "    Email    :  $adminEmail"
    Write-Host "    Password :  $adminPass"
    Write-Host "`n  Containers : ${prefix}_db / ${prefix}_directus / ${prefix}_nextjs"
    Write-Host "  Log file   : $LogFile" -ForegroundColor Gray
    Write-Host ("=" * 54) -ForegroundColor Cyan

} catch {
    Write-Err "Unexpected error: $_"
    Write-Host "`n  Full log: $LogFile" -ForegroundColor Yellow
}

Stop-Transcript | Out-Null
Read-Host "`nPress Enter to exit"
