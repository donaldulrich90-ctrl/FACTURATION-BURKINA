@echo off
chcp 65001 >nul 2>nul
title FasoMarches - Production
cd /d "%~dp0"
set "ROOT=%CD%"

echo.
echo ==========================================
echo   FasoMarches - Demarrage PRODUCTION
echo   (Pour mise en ligne derriere MikroTik)
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
echo [OK] Liberation du port 3001...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>nul

:: 3) Dependances
if not exist "node_modules" (
    echo [OK] Installation dependances frontend...
    call npm install --silent 2>nul
)
if not exist "server\node_modules" (
    echo [OK] Installation dependances serveur...
    cd server
    call npm install --silent 2>nul
    cd "%ROOT%"
)

:: 4) Build frontend
echo [OK] Construction du frontend (build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] Echec du build
    pause
    exit /b 1
)
echo [OK] Build termine

:: 5) Fichier .env serveur
if not exist "server\.env" (
    echo [OK] Creation du fichier .env...
    (
        echo DATABASE_URL="file:./dev.db"
        echo JWT_SECRET="fasomarches-secret-changez-en-production"
        echo JWT_EXPIRES_IN="7d"
        echo PORT=3001
        echo NODE_ENV=production
    ) > "server\.env"
)
:: S'assurer que NODE_ENV=production est present
findstr /C:"NODE_ENV" "server\.env" >nul 2>&1
if %errorlevel% neq 0 (
    echo NODE_ENV=production>> "server\.env"
)

:: 6) Base de donnees
cd server
call npx prisma generate >nul 2>&1
if not exist "prisma\dev.db" (
    echo [OK] Creation de la base...
    call npx prisma db push >nul 2>&1
    call npm run db:seed >nul 2>&1
)
cd "%ROOT%"

:: 7) Demarrer le serveur en production
echo.
echo [OK] Demarrage du serveur (port 3001)...
echo     URL locale: http://localhost:3001
echo     URL reseau: http://VOTRE_IP:3001
echo.
echo ==========================================
echo   Configurez votre MikroTik pour rediriger
echo   le port 3001 vers cette machine.
echo   Voir DEPLOIEMENT_MIKROTIK.md
echo ==========================================
echo.

set NODE_ENV=production
cd server
node src/index.js

cd "%ROOT%"
pause
