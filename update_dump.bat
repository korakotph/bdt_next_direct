@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\update_dump.ps1"
if errorlevel 1 (
    echo.
    echo Error - check update_dump_log.txt for details
    pause
)
