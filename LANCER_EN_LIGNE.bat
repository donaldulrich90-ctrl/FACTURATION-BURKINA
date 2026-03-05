@echo off
chcp 65001 >nul 2>nul
title FasoMarches - Lancement en ligne (test)
cd /d "%~dp0"
set "ROOT=%CD%"

echo.
echo ==========================================
echo   FasoMarches - Lancement EN LIGNE
echo   (Lien public pour tester depuis 4G, etc.)
echo ==========================================
echo.

:: 1) Verifier Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js introuvable. Telechargez sur https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js detecte

:: 2) Liberer le port 3001
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>nul

:: 3) Dependances
if not exist "node_modules" (
    echo [OK] Installation des dependances...
    call npm install --silent 2>nul
)
if not exist "server\node_modules" (
    echo [OK] Installation des dependances serveur...
    cd server
    call npm install --silent 2>nul
    cd "%ROOT%"
)
echo [OK] Dependances OK

:: 4) Base de donnees
cd server
if not exist "prisma\dev.db" (
    echo [OK] Creation de la base...
    call npx prisma generate >nul 2>&1
    call npx prisma db push >nul 2>&1
    call npm run db:seed >nul 2>&1
)
call npx prisma generate >nul 2>&1
cd "%ROOT%"
echo [OK] Base de donnees pret

:: 5) Build de l'application
echo [OK] Compilation de l'application...
call npm run build >nul 2>&1
if not exist "dist\index.html" (
    echo [ERREUR] Echec du build. Lancez: npm run build
    pause
    exit /b 1
)
echo [OK] Build termine

:: 6) Demarrer le serveur en mode production (port 3001)
echo [OK] Demarrage du serveur...
start "FasoMarches - Serveur" cmd /k "cd /d %ROOT%\server && set NODE_ENV=production && set SERVE_FRONTEND=true && node src/index.js"
timeout /t 5 /nobreak >nul 2>nul

:: 7) Creer le tunnel public
echo.
echo [OK] Creation du lien public...
echo.

:: Essayer cloudflared d'abord (sans page mot de passe)
set "CLOUDFLARED="
where cloudflared >nul 2>&1
if %errorlevel% equ 0 set "CLOUDFLARED=cloudflared"
if not defined CLOUDFLARED if exist "%ROOT%\cloudflared.exe" set "CLOUDFLARED=%ROOT%\cloudflared.exe"
if defined CLOUDFLARED (
    echo [OK] Utilisation de Cloudflare Tunnel (acces direct, pas de mot de passe)
    start "FasoMarches - Tunnel" cmd /k "cd /d %ROOT% && %CLOUDFLARED% tunnel --url http://localhost:3001"
) else (
    echo [OK] Utilisation de localtunnel
    echo.
    echo   IMPORTANT - Mot de passe tunnel : Ouvrez https://loca.lt/mytunnelpassword
    echo   sur ce PC pour obtenir votre IP. Partagez cette IP avec les testeurs :
    echo   ils devront l'entrer dans la page demandee.
    echo.
    start "" "https://loca.lt/mytunnelpassword"
    start "FasoMarches - Tunnel" cmd /k "npx --yes localtunnel --port 3001"
)

timeout /t 12 /nobreak >nul 2>nul

echo.
echo ==========================================
echo   Plateforme lancee !
echo ==========================================
echo.
echo   LOCAL : http://localhost:3001
echo   EN LIGNE : Regardez la fenetre "FasoMarches - Tunnel"
echo   - Cloudflare : https://xxx.trycloudflare.com (acces direct)
echo   - Localtunnel : https://xxx.loca.lt (mot de passe = votre IP)
echo   Pour eviter la page mot de passe : lancez INSTALLER_CLOUDFLARED.bat
echo   Partagez l'URL pour tester depuis 4G ou autre appareil.
echo.
echo   Connexion : admin@plateforme.com / admin123
echo ==========================================
echo.
echo   IMPORTANT : Gardez les 2 fenetres ouvertes.
echo   Fermez pour arreter.
echo.
start "" "http://localhost:3001"
pause
