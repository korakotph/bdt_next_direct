@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"
if errorlevel 1 (
    echo.
    echo ════════════════════════════════════════════════════════
    echo   เกิดข้อผิดพลาด — ดูรายละเอียดได้ที่ไฟล์ install_log.txt
    echo ════════════════════════════════════════════════════════
    pause
)
