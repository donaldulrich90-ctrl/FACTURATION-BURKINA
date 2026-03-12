@echo off
chcp 65001 >nul 2>nul
title FasoMarchés - Installation et démarrage
cd /d "%~dp0"
set "ROOT=%CD%"

echo.
echo ==========================================
echo   FasoMarchés - Installation et démarrage
echo   Plateforme en ligne 24h/24
echo ==========================================
echo.

:: 1) Vérifier Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js introuvable.
    echo.
    echo   Téléchargez et installez Node.js depuis : https://nodejs.org
    echo   Choisissez la version LTS.
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js détecté : 
node -v
echo.

:: 2) Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo [OK] Installation des dépendances frontend...
    call npm install --silent
    if %errorlevel% neq 0 (
        echo [ERREUR] Échec npm install. Essayez : npm install --legacy-peer-deps
        pause
        exit /b 1
    )
)
if not exist "server\node_modules" (
    echo [OK] Installation des dépendances serveur...
    cd server
    call npm install --silent
    cd "%ROOT%"
    if %errorlevel% neq 0 (
        echo [ERREUR] Échec npm install serveur
        pause
        exit /b 1
    )
)
echo [OK] Dépendances installées
echo.

:: 3) Build frontend si dist manquant
if not exist "dist\index.html" (
    echo [OK] Construction du frontend...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERREUR] Échec du build
        pause
        exit /b 1
    )
)
echo [OK] Application prête
echo.

:: 4) Base de données
cd server
call npx prisma generate >nul 2>&1
if not exist "prisma\dev.db" (
    echo [OK] Création de la base de données...
    call npx prisma db push >nul 2>&1
    call npm run db:seed >nul 2>&1
)
cd "%ROOT%"
echo [OK] Base de données prête
echo.

:: 5) Fichier .env
if not exist "server\.env" (
    echo [OK] Création du fichier .env...
    (
        echo DATABASE_URL="file:./dev.db"
        echo JWT_SECRET="fasomarches-secret-changez-en-production"
        echo JWT_EXPIRES_IN="7d"
        echo PORT=3001
        echo NODE_ENV=production
    ) > "server\.env"
)
findstr /C:"NODE_ENV" "server\.env" >nul 2>&1
if %errorlevel% neq 0 (
    echo NODE_ENV=production>> "server\.env"
)
echo.

:: 6) Libérer le port 3001
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>nul

:: 7) Démarrer le serveur
echo ==========================================
echo   DÉMARRAGE DU SERVEUR
echo ==========================================
echo.
echo   URL locale  : http://localhost:3001
echo   URL réseau  : http://VOTRE_IP:3001
echo.
echo   Connexion : admin@plateforme.com / admin123
echo.
echo   Gardez cette fenêtre ouverte. Fermez pour arrêter.
echo ==========================================
echo.

set NODE_ENV=production
cd server
node src/index.js

cd "%ROOT%"
pause
