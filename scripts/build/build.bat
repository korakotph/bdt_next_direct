@echo off
chcp 65001 >nul
echo ════════════════════════════════════════════════════════
echo   BDT Next Direct — Build EXE (PyInstaller)
echo ════════════════════════════════════════════════════════
echo.

:: ── ตรวจสอบ Python ──────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ไม่พบ Python — ดาวน์โหลดได้ที่ https://www.python.org
    pause
    exit /b 1
)
echo [OK] พบ Python

:: ── ติดตั้ง dependencies ────────────────────────────────
echo.
echo ติดตั้ง dependencies...
python -m pip install -r "%~dp0requirements.txt" --quiet
if errorlevel 1 (
    echo [ERROR] pip install ล้มเหลว
    pause
    exit /b 1
)
echo [OK] dependencies พร้อม

:: ── output ไปที่โฟลเดอร์โปรเจกต์ (สองระดับเหนือ scripts\build\) ──
set OUT_DIR=%~dp0..\..

echo.
echo Build install.exe ...
python -m PyInstaller --onefile --console --clean ^
    --name install ^
    --distpath "%OUT_DIR%" ^
    --workpath "%~dp0build\install" ^
    --specpath "%~dp0build" ^
    "%~dp0install.py"
if errorlevel 1 (
    echo [ERROR] build install.exe ล้มเหลว
    pause
    exit /b 1
)
echo [OK] install.exe สร้างสำเร็จ

echo.
echo Build export_data.exe ...
python -m PyInstaller --onefile --console --clean ^
    --name export_data ^
    --distpath "%OUT_DIR%" ^
    --workpath "%~dp0build\export_data" ^
    --specpath "%~dp0build" ^
    "%~dp0export_data.py"
if errorlevel 1 (
    echo [ERROR] build export_data.exe ล้มเหลว
    pause
    exit /b 1
)
echo [OK] export_data.exe สร้างสำเร็จ

:: ── ลบ build cache ──────────────────────────────────────
rmdir /s /q "%~dp0build" 2>nul

echo.
echo ════════════════════════════════════════════════════════
echo   Build เสร็จสมบูรณ์!
echo.
echo   install.exe     → %OUT_DIR%\install.exe
echo   export_data.exe → %OUT_DIR%\export_data.exe
echo ════════════════════════════════════════════════════════
echo.
pause
