@echo off
chcp 65001 >nul 2>nul
cd /d "%~dp0\.."
echo.
echo ============================================
echo   Extraction et import Mercuriales 2026 BF
echo ============================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0extract_import_all_mercuriales.ps1"
echo.
pause
