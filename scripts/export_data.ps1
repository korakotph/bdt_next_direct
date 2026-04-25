# scripts/export_data.ps1

param([string]$ProjectDir = (Split-Path $PSScriptRoot -Parent))

$LogFile = Join-Path $ProjectDir "export_log.txt"
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

function Get-ComposeInfo($path) {
    $info = @{ pg = 'bdt_directus_db'; dir = 'bdt_directus'; dirPort = '8056' }
    if (-not (Test-Path $path)) { return $info }
    $c = [IO.File]::ReadAllText($path)
    if ($c -match 'container_name:\s+(\S+_db)\b')       { $info.pg      = $Matches[1] }
    if ($c -match 'container_name:\s+(\S+_directus)\b') { $info.dir     = $Matches[1] }
    if ($c -match '"(\d+):8055"')                        { $info.dirPort = $Matches[1] }
    return $info
}

# ─────────────────────────────────────────────────────────────
try {
    Set-Location $ProjectDir

    Write-Banner "BDT Next Direct - Data Exporter"

    $info        = Get-ComposeInfo (Join-Path $ProjectDir "docker-compose.yaml")
    $pgContainer = $info.pg

    Write-Host "`n  PostgreSQL : $pgContainer"
    Write-Host "  Directus   : $($info.dir)"
    Write-Host "  Log file   : $LogFile" -ForegroundColor Gray

    # check Docker
    Write-Step "Checking Docker"
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Pause-Exit "Docker is not running. Please open Docker Desktop and try again."
    }
    Write-Ok "Docker is ready"

    # check container
    $state = docker inspect --format '{{.State.Running}}' $pgContainer 2>&1
    if ($state -ne 'true') {
        Pause-Exit "Container '$pgContainer' is not running. Run: docker compose up -d"
    }
    Write-Ok "Container '$pgContainer' is running"

    # create export dir
    $ts        = Get-Date -Format 'yyyyMMdd_HHmmss'
    $exportDir = Join-Path $ProjectDir "_export_$ts"
    New-Item -ItemType Directory -Path $exportDir | Out-Null
    $parts = @()

    # export database
    Write-Step "Exporting database"
    $dumpOut = Join-Path $exportDir "dump.sql"
    cmd /c "docker exec $pgContainer pg_dump -U directus --no-owner --no-acl directus > `"$dumpOut`""
    if ($LASTEXITCODE -eq 0 -and (Test-Path $dumpOut)) {
        $kb = [math]::Round((Get-Item $dumpOut).Length / 1KB)
        Write-Ok "dump.sql  ($kb KB)"
        $parts += 'dump.sql'
    } else {
        Write-Warn "pg_dump failed"
    }

    # export uploads
    Write-Step "Exporting uploads"
    $uploadsSrc = Join-Path $ProjectDir "directus\uploads"
    if (Test-Path $uploadsSrc) {
        $uploadsDst = Join-Path $exportDir "directus\uploads"
        New-Item -ItemType Directory -Path (Split-Path $uploadsDst -Parent) -Force | Out-Null
        Copy-Item $uploadsSrc $uploadsDst -Recurse
        $fc = (Get-ChildItem $uploadsDst -Recurse -File).Count
        Write-Ok "uploads/  ($fc files)"
        $parts += 'directus/uploads/'
    } else {
        Write-Warn "directus\uploads\ not found - skipping"
    }

    # zip
    Write-Step "Creating zip archive"
    $zipName = "export_$ts.zip"
    $zipPath = Join-Path $ProjectDir $zipName
    Compress-Archive -Path "$exportDir\*" -DestinationPath $zipPath -CompressionLevel Optimal
    $mb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    $fc = (Get-ChildItem $exportDir -Recurse -File).Count
    Write-Ok "$zipName  ($fc files, $mb MB)"

    # cleanup
    Remove-Item $exportDir -Recurse -Force

    Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
    Write-Host "  EXPORT COMPLETE!" -ForegroundColor Green
    Write-Host ("=" * 54) -ForegroundColor Cyan
    Write-Host "`n  File     : $zipName"
    Write-Host "  Location : $ProjectDir"
    Write-Host "`n  Contents"
    foreach ($p in $parts) { Write-Host "    [OK]  $p" -ForegroundColor Green }
    Write-Host "`n  To restore on a new machine:"
    Write-Host "    1. Extract zip -> place in project folder"
    Write-Host "    2. Run install.bat (Windows) or install.command (Mac)"
    Write-Host ("=" * 54) -ForegroundColor Cyan

} catch {
    Write-Err "Unexpected error: $_"
    Write-Host "`n  Full log: $LogFile" -ForegroundColor Yellow
}

Stop-Transcript | Out-Null
Read-Host "`nPress Enter to exit"
