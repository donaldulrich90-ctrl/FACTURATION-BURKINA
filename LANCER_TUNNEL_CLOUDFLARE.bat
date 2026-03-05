@echo off
chcp 65001 >nul 2>nul
title FasoMarchés - Tunnel Cloudflare (sans mot de passe)
cd /d "%~dp0"

echo.
echo ==========================================
echo   FasoMarchés - Accès Internet (Cloudflare)
echo   Aucun mot de passe requis !
echo ==========================================
echo.

:: Vérifier que cloudflared existe
if not exist "cloudflared.exe" (
    echo [ERREUR] cloudflared.exe introuvable.
    echo Téléchargez-le depuis : https://github.com/cloudflare/cloudflared/releases
    pause
    exit /b 1
)

:: Vérifier que le serveur tourne
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ATTENTION] Le serveur ne tourne pas sur le port 3001.
    echo Lancez d'abord LANCER_PRODUCTION.bat dans une autre fenêtre.
    echo.
    pause
    exit /b 1
)

echo [OK] Serveur détecté sur le port 3001.
echo.
echo Création du tunnel Cloudflare...
echo.
echo ==========================================
echo   Partagez l'URL https://xxx.trycloudflare.com
echo   affichée ci-dessous - AUCUN MOT DE PASSE !
echo ==========================================
echo.

cloudflared.exe tunnel --url http://localhost:3001

pause
