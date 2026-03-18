@echo off
chcp 65001 >nul 2>nul
cd /d "%~dp0"

echo.
echo ============================================
echo   Synchronisation Mercuriale Local ^> En ligne
echo ============================================
echo.

REM Vérifier que server/.env existe avec ONLINE_URL et JWT_TOKEN
if not exist "server\.env" (
    echo [ERREUR] Fichier server\.env introuvable.
    echo.
    echo Créez server\.env avec :
    echo   ONLINE_URL=https://fasomarche.duckdns.org
    echo   JWT_TOKEN=votre_token_super_admin
    echo.
    echo Pour obtenir le token :
    echo   1. Connectez-vous sur https://fasomarche.duckdns.org
    echo   2. F12 ^> Application ^> Local Storage
    echo   3. Copiez la valeur de "fasomarches_token"
    echo.
    pause
    exit /b 1
)

cd server
call npm run sync:mercuriale-online
cd ..

echo.
pause
