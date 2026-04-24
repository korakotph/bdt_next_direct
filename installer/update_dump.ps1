# installer/update_dump.ps1
# Export current database to dump.sql and apply ON DELETE SET NULL patch

param([string]$ProjectDir = (Split-Path $PSScriptRoot -Parent))

$LogFile = Join-Path $ProjectDir "update_dump_log.txt"
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
    Stop-Transcript | Out-Null
    Read-Host "`nPress Enter to exit"
    exit 1
}

function Get-PgContainer($path) {
    if (-not (Test-Path $path)) { return 'bdt_directus_db' }
    $c = [IO.File]::ReadAllText($path)
    if ($c -match 'container_name:\s+(\S+_db)\b') { return $Matches[1] }
    return 'bdt_directus_db'
}

# ─────────────────────────────────────────────────────────────
try {
    Set-Location $ProjectDir

    Write-Banner "BDT Next Direct - Update dump.sql"

    $composePath = Join-Path $ProjectDir "docker-compose.yaml"
    $pgContainer = Get-PgContainer $composePath
    $dumpPath    = Join-Path $ProjectDir "dump.sql"

    Write-Host "`n  Container : $pgContainer"
    Write-Host "  Output    : dump.sql"

    # check Docker
    Write-Step "Checking Docker"
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Pause-Exit "Docker is not running." }
    Write-Ok "Docker is ready"

    # check container running
    $state = docker inspect --format '{{.State.Running}}' $pgContainer 2>&1
    if ($state -ne 'true') { Pause-Exit "Container '$pgContainer' is not running. Run: docker compose up -d" }
    Write-Ok "Container '$pgContainer' is running"

    # backup old dump
    if (Test-Path $dumpPath) {
        $bak = $dumpPath + ".bak"
        Copy-Item $dumpPath $bak -Force
        Write-Ok "Old dump.sql backed up -> dump.sql.bak"
    }

    # export
    Write-Step "Exporting database"
    cmd /c "docker exec $pgContainer pg_dump -U directus --no-owner --no-acl directus > `"$dumpPath`""
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dumpPath)) {
        Pause-Exit "pg_dump failed"
    }
    $kb = [math]::Round((Get-Item $dumpPath).Length / 1KB)
    Write-Ok "Exported dump.sql ($kb KB)"

    # patch ON DELETE SET NULL
    Write-Step "Patching FK constraints (ON DELETE SET NULL)"
    $sql   = [IO.File]::ReadAllText($dumpPath)
    $before = ([regex]::Matches($sql, 'REFERENCES public\.directus_users\(id\);')).Count
    $sql   = $sql -replace 'REFERENCES public\.directus_users\(id\);',
                            'REFERENCES public.directus_users(id) ON DELETE SET NULL;'
    [IO.File]::WriteAllText($dumpPath, $sql, [Text.Encoding]::UTF8)
    Write-Ok "Patched $before constraint(s) -> ON DELETE SET NULL"

    Write-Host ("`n" + "=" * 54) -ForegroundColor Cyan
    Write-Host "  DONE!" -ForegroundColor Green
    Write-Host ("=" * 54) -ForegroundColor Cyan
    Write-Host "`n  dump.sql is ready. Commit and push to update the repo."
    Write-Host "  Log file: $LogFile" -ForegroundColor Gray
    Write-Host ("=" * 54) -ForegroundColor Cyan

} catch {
    Write-Err "Unexpected error: $_"
}

Stop-Transcript | Out-Null
Read-Host "`nPress Enter to exit"
