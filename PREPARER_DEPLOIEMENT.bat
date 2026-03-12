@echo off
chcp 65001 >nul 2>nul
title FasoMarchés - Préparation du déploiement
cd /d "%~dp0"
set "ROOT=%CD%"
set "DEST=%~dp0FACTURATION_DEPLOIEMENT"

echo.
echo ==========================================
echo   FasoMarchés - Préparation du déploiement
echo   Transfert vers ordinateur dédié
echo ==========================================
echo.

:: 1) Créer le dossier de destination
if exist "%DEST%" (
    echo [INFO] Suppression de l'ancien dossier...
    rmdir /s /q "%DEST%"
)
mkdir "%DEST%"
echo [OK] Dossier créé : %DEST%
echo.

:: 2) Copier les fichiers (exclure node_modules, .git, etc.)
echo [OK] Copie des fichiers...
robocopy "%ROOT%" "%DEST%" /E /XD node_modules "server\node_modules" .git dist build .cache FACTURATION_DEPLOIEMENT /XF *.log /NFL /NDL /NJH /NJS /nc /ns /np
if %errorlevel% geq 8 (
    echo [ERREUR] Échec de la copie
    pause
    exit /b 1
)
echo [OK] Fichiers copiés
echo.

:: 3) Inclure la base de données actuelle (dev.db) si elle existe
if exist "%ROOT%\server\prisma\dev.db" (
    echo [OK] Copie de la base dev.db...
    copy /Y "%ROOT%\server\prisma\dev.db" "%DEST%\server\prisma\dev.db" >nul
) else (
    echo [INFO] Pas de base existante - une nouvelle sera créée automatiquement
)
echo.

:: 4) Build du frontend
echo [OK] Construction du frontend (build)...
call npm run build >nul 2>&1
if exist "%ROOT%\dist\index.html" (
    echo [OK] Copie du dossier dist...
    xcopy "%ROOT%\dist" "%DEST%\dist\" /E /I /Q >nul
    echo [OK] Build inclus
) else (
    echo [ATTENTION] Build manquant - exécutez "npm run build" avant le transfert
)
echo.

:: 5) Fichier server\.env (copier l'existant ou créer un modèle)
if exist "%ROOT%\server\.env" (
    echo [OK] Copie du fichier .env existant...
    copy /Y "%ROOT%\server\.env" "%DEST%\server\.env" >nul
) else if not exist "%DEST%\server\.env" (
    echo [OK] Création du fichier server\.env...
    (
        echo DATABASE_URL="file:./dev.db"
        echo JWT_SECRET="changez-moi-en-production-avec-une-cle-longue-et-aleatoire"
        echo JWT_EXPIRES_IN="7d"
        echo PORT=3001
        echo NODE_ENV=production
    ) > "%DEST%\server\.env"
)
echo.

:: 6) Creer le fichier README
echo ========================================== > "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo   FasoMarches - Deploiement ordinateur dedie >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo ========================================== >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo. >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo   Transferez ce dossier sur l'ordinateur dedie. >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo   Puis double-cliquez sur INSTALLER_ET_LANCER.bat >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo. >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo   URL : http://localhost:3001 ou http://IP:3001 >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo   Connexion : admin@plateforme.com / admin123 >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo. >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo   Voir GUIDE_DEPLOIEMENT_ORDINATEUR_DEDIE.md >> "%DEST%\LIRE_MOI_DEPLOIEMENT.txt"
echo [OK] Fichier LIRE_MOI_DEPLOIEMENT.txt créé
echo.

:: 7) Copier le guide de déploiement
if exist "%ROOT%\GUIDE_DEPLOIEMENT_ORDINATEUR_DEDIE.md" (
    copy /Y "%ROOT%\GUIDE_DEPLOIEMENT_ORDINATEUR_DEDIE.md" "%DEST%\" >nul
) else (
    echo [INFO] Le guide sera créé automatiquement
)
echo.

echo ==========================================
echo   PRÉPARATION TERMINÉE
echo ==========================================
echo.
echo   Dossier prêt : %DEST%
echo.
echo   Transférez ce dossier sur l'autre ordinateur via :
echo   - Clé USB
echo   - Partage réseau
echo   - Copie sur un disque
echo.
echo.
echo   Sur l'autre ordinateur : double-cliquez sur INSTALLER_ET_LANCER.bat
echo ==========================================
echo.
pause
