@echo off
chcp 65001 >nul 2>nul
title FasoMarches - Lancement
cd /d "%~dp0"
set "ROOT=%CD%"

echo.
echo ==========================================
echo   FasoMarches - Demarrage automatique
echo ==========================================
echo.

:: 1) Verifier Node.js
set "NODE_OK=0"
where node >nul 2>&1
if %errorlevel% equ 0 set "NODE_OK=1"
if %NODE_OK% equ 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
        set "NODE_OK=1"
    )
)
if %NODE_OK% equ 0 (
    echo [ERREUR] Node.js introuvable.
    echo Telechargez-le sur https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js detecte

:: 2) Liberer les ports 3001 et 5173 (eviter EADDRINUSE)
echo [OK] Liberation des ports...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>nul

:: 3) Dependances frontend
if not exist "node_modules" (
    echo [OK] Installation des dependances frontend...
    call npm install --silent 2>nul
    if errorlevel 1 call npm install --legacy-peer-deps --silent 2>nul
)
if not exist "node_modules" (
    echo [ERREUR] Echec npm install frontend
    pause
    exit /b 1
)
echo [OK] Dependances frontend OK

:: 4) Dependances serveur
if not exist "server\node_modules" (
    echo [OK] Installation des dependances serveur...
    cd server
    call npm install --silent 2>nul
    cd "%ROOT%"
)
if not exist "server\node_modules" (
    echo [ERREUR] Echec npm install serveur
    pause
    exit /b 1
)
echo [OK] Dependances serveur OK

:: 5) Fichier .env serveur
if not exist "server\.env" (
    echo [OK] Creation du fichier .env...
    (
        echo DATABASE_URL="file:./dev.db"
        echo JWT_SECRET="fasomarches-secret-changez-en-production"
        echo JWT_EXPIRES_IN="7d"
        echo PORT=3001
    ) > "server\.env"
)

:: 6) Base de donnees SQLite
cd server
echo [OK] Preparation de la base de donnees...
call npx prisma generate >nul 2>&1
if not exist "prisma\dev.db" (
    echo [OK] Premiere installation - creation et seed...
    call npx prisma db push >nul 2>&1
)
call npx prisma db push >nul 2>&1
call npm run db:seed >nul 2>&1
if not exist "prisma\dev.db" (
    echo [ERREUR] Base non creee. Verifiez server\.env
    cd "%ROOT%"
    pause
    exit /b 1
)
cd "%ROOT%"
echo [OK] Base de donnees pret

:: 6b) Optionnel : Python pour extraction Word (convertisseur)
where python >nul 2>&1
if %errorlevel% equ 0 (
    python -c "import docx" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INFO] Installation des dependances Python pour extraction Word...
        pip install -r requirements.txt -q 2>nul
    )
)

:: 7) Demarrer API + Frontend (une seule commande, une fenetre)
echo [OK] Demarrage API (3001) + Frontend (5173)...
start "FasoMarches - API + Frontend" cmd /k "cd /d %ROOT% && npm run dev"

:: 8) Attendre le demarrage
echo [OK] Attente du demarrage (8 s)...
timeout /t 8 /nobreak >nul 2>nul

:: 9) Ouvrir le navigateur
echo [OK] Ouverture du navigateur...
start "" "http://localhost:5173"

echo.
echo ==========================================
echo   Plateforme lancee !
echo   URL: http://localhost:5173
echo   Connexion: admin@plateforme.com / admin123
echo ==========================================
echo.
echo Fermez la fenetre "FasoMarches" pour arreter.
pause
