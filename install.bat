@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"
if errorlevel 1 (
    powershell -command "Write-Host ''; Write-Host '══════════════════════════════════════════════════════' -ForegroundColor Cyan; Write-Host '  เกิดข้อผิดพลาด — ดูรายละเอียดได้ที่ไฟล์ install_log.txt' -ForegroundColor Red; Write-Host '══════════════════════════════════════════════════════' -ForegroundColor Cyan"
    pause
)
