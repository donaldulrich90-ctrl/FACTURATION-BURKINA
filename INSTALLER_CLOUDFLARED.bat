@echo off
chcp 65001 >nul 2>nul
title Installation Cloudflare Tunnel - FasoMarchés
cd /d "%~dp0"

echo.
echo ==========================================
echo   Installation de cloudflared
echo   (Tunnel sans page mot de passe)
echo ==========================================
echo.

where cloudflared >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] cloudflared est deja installe.
    cloudflared --version
    pause
    exit /b 0
)

echo [INFO] Telechargement de cloudflared...
echo.

:: Telecharger depuis GitHub (version Windows amd64)
set "URL=https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
set "DEST=%CD%\cloudflared.exe"

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%URL%' -OutFile '%DEST%' -UseBasicParsing}"

if not exist "cloudflared.exe" (
    echo [ERREUR] Telechargement echoue.
    echo.
    echo Installez manuellement :
    echo 1. Allez sur https://github.com/cloudflare/cloudflared/releases
    echo 2. Telechargez cloudflared-windows-amd64.exe
    echo 3. Renommez en cloudflared.exe et placez dans ce dossier
    echo.
    pause
    exit /b 1
)

echo [OK] cloudflared installe dans ce dossier.
echo.
echo Vous pouvez maintenant lancer LANCER_EN_LIGNE.bat
echo L'acces sera direct, sans page mot de passe.
echo.
pause
