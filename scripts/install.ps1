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

function Update-Compose($path, $prefix, $pgPort, $dirPort, $nextPort) {
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
    [IO.File]::WriteAllText($path, $c, [Text.Encoding]::UTF8)
    return "${prefix}_db"
}

# -------------------------------------------------------------
try {
    Set-Location $ProjectDir

    $folderName = Split-Path $ProjectDir -Leaf
    $prefix     = Get-Prefix $folderName

    Write-Banner "BDT Next Direct - Docker Installer"
    Write-Host "`n  Folder    : $folderName"
    Write-Host "  Container : ${prefix}_*"
    Write-Host "  Log file  : $LogFile" -ForegroundColor Gray

    # Detect container runtime: docker (Docker Desktop / Rancher Desktop dockerd) or nerdctl (Rancher Desktop containerd)
    Write-Step "Checking container runtime"
    $DOCKER = $null

    $dockerExists  = $null -ne (Get-Command docker  -ErrorAction SilentlyContinue)
    $nerdctlExists = $null -ne (Get-Command nerdctl -ErrorAction SilentlyContinue)

    if ($dockerExists) {
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $DOCKER = "docker" }
    }
    if (-not $DOCKER -and $nerdctlExists) {
        nerdctl info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $DOCKER = "nerdctl" }
    }

    if (-not $DOCKER) {
        if ($dockerExists) {
            # docker found but not running - check ownership error
            $ddPath = "C:\ProgramData\DockerDesktop"
            $ownershipBad = $false
            if (Test-Path $ddPath) {
                try {
                    $owner = (Get-Acl $ddPath -ErrorAction Stop).Owner
                    $ownershipBad = $owner -notmatch '^(NT AUTHORITY|BUILTIN\\Administrators|NT SERVICE|SYSTEM)'
                } catch { $ownershipBad = $true }
            }
            if ($ownershipBad) {
                Write-Err "Docker Desktop ownership error detected"
                Write-Host ""
                Write-Host "  Error: C:\ProgramData\DockerDesktop is not owned by an elevated account" -ForegroundColor Red
                Write-Host "  (Docker Desktop says: 'For security reason ... must be owned by an elevated account')" -ForegroundColor Gray
                Write-Host ""
                $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
                    [Security.Principal.WindowsBuiltInRole]::Administrator)
                if ($isAdmin) {
                    Write-Host "  Running as Administrator - can fix automatically" -ForegroundColor Cyan
                    $fix = Read-Host "  Fix ownership automatically? (Y/n)"
                    if ($fix -ne 'n' -and $fix -ne 'N') {
                        Write-Step "Fixing ownership..."
                        takeown /f $ddPath /r /d y 2>&1 | Out-Null
                        icacls $ddPath /grant "Administrators:F" /t 2>&1 | Out-Null
                        Write-Ok "Ownership fixed - please restart Docker Desktop, then run install.bat again."
                    }
                } else {
                    Write-Host "  Fix: open Command Prompt as administrator and run:" -ForegroundColor Cyan
                    Write-Host "    takeown /f `"C:\ProgramData\DockerDesktop`" /r /d y" -ForegroundColor White
                    Write-Host "    icacls `"C:\ProgramData\DockerDesktop`" /grant Administrators:F /t" -ForegroundColor White
                    Write-Host ""
                    Write-Host "  Then restart Docker Desktop and run install.bat again." -ForegroundColor Yellow
                    Write-Host "  Or right-click install.bat -> 'Run as administrator' to fix automatically." -ForegroundColor Yellow
                }
            } else {
                Write-Err "Docker is installed but not running"
                Write-Host "  Please open Docker Desktop (or Rancher Desktop), then run install.bat again." -ForegroundColor Yellow
            }
        } elseif ($nerdctlExists) {
            Write-Err "nerdctl found but Rancher Desktop is not running"
            Write-Host "  Please open Rancher Desktop, then run install.bat again." -ForegroundColor Yellow
        } else {
            Write-Err "No container runtime found - please install one first"
            Write-Host ""
            Write-Host "  Options:" -ForegroundColor Cyan
            Write-Host "   1) Docker Desktop  : https://www.docker.com/products/docker-desktop"
            Write-Host "   2) Rancher Desktop : https://rancherdesktop.io  (free, supports all Windows editions)"
            Write-Host "      containerd mode uses nerdctl  |  dockerd mode uses docker"
            Write-Host "   3) Podman Desktop  : https://podman-desktop.io  (free, open-source)"
            Write-Host ""
            Write-Host "  After installing, open the app and wait for it to finish starting," -ForegroundColor Yellow
            Write-Host "  then run install.bat again." -ForegroundColor Yellow
        }
        Pause-Exit
    }
    Write-Ok "Container runtime: $DOCKER"

    $composePath = Join-Path $ProjectDir "docker-compose.yaml"
    if (-not (Test-Path $composePath)) { Pause-Exit "docker-compose.yaml not found" }

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
    $pgContainer = Update-Compose $composePath $prefix $pgPort $dirPort $nextPort
    Write-Ok "Done"

    # build nextjs image first (so it's ready when we start all services)
    Write-Step "Building Next.js image (may take several minutes)"
    $built = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if ($attempt -gt 1) {
            Write-Warn "Retry $attempt/3 (waiting 10s)..."
            Start-Sleep 10
        }
        & $DOCKER compose build nextjs
        if ($LASTEXITCODE -eq 0) { $built = $true; break }
        Write-Warn "Attempt $attempt failed"
    }
    if (-not $built) { Pause-Exit "$DOCKER compose build failed after 3 attempts. Check log above." }
    Write-Ok "Build complete"

    # start postgres only - import dump BEFORE Directus runs migrations
    Write-Step "Starting PostgreSQL"
    & $DOCKER compose up -d postgres
    if ($LASTEXITCODE -ne 0) { Pause-Exit "Failed to start postgres container." }

    # wait for postgres
    Write-Step "Waiting for PostgreSQL"
    $ready = $false
    for ($i = 1; $i -le 40; $i++) {
        & $DOCKER exec $pgContainer pg_isready -U directus 2>&1 | Out-Null
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
            & $DOCKER exec $pgContainer psql -U directus -d directus -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO directus; GRANT ALL ON SCHEMA public TO public;"
            Write-Ok "Schema reset"

            Write-Step "Importing database (dump.sql)"
            cmd /c "$DOCKER exec -i $pgContainer psql -U directus -d directus < `"$dumpPath`""
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Import successful"

                Write-Step "Removing old users and admin policies (set up new admin at /admin/setup)"
                & $DOCKER exec $pgContainer psql -U directus -d directus -c @"
DELETE FROM directus_access WHERE policy IN (SELECT id FROM directus_policies WHERE admin_access = true);
DELETE FROM directus_policies WHERE admin_access = true;
DELETE FROM directus_users;
"@ | Out-Null
                Write-Ok "Users and admin policies reset"
            } else {
                Write-Warn "Import may have had errors - continuing anyway"
            }
        } else {
            Write-Warn "dump.sql not found - skipping import"
        }
    }

    # now start all remaining services (Directus finds DB already populated)
    Write-Step "Starting Directus and Next.js"
    & $DOCKER compose up -d
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

    if ($dirReady) {
        Write-Ok "Directus is ready"
    } else {
        Write-Warn "Directus did not respond - check: $DOCKER compose logs directus"
    }

    Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
    Write-Host "  INSTALL COMPLETE!" -ForegroundColor Green
    Write-Host ("=" * 54) -ForegroundColor Cyan
    Write-Host "`n  Frontend  :  http://localhost:$nextPort"
    Write-Host "  Directus  :  http://localhost:$dirPort"
    Write-Host "`n  Directus Admin Setup"
    Write-Host "    http://localhost:$dirPort/admin/setup"
    Write-Host "`n  Containers : ${prefix}_db / ${prefix}_directus / ${prefix}_nextjs"
    Write-Host "  Log file   : $LogFile" -ForegroundColor Gray
    Write-Host ("=" * 54) -ForegroundColor Cyan

} catch {
    Write-Err "Unexpected error: $_"
    Write-Host "`n  Full log: $LogFile" -ForegroundColor Yellow
}

Stop-Transcript | Out-Null
Read-Host "`nPress Enter to exit"
