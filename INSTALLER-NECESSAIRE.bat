@echo off
chcp 65001 >nul
title FasoMarchés - Installation du nécessaire
cd /d "C:\Users\user\Documents\FACTURATION"

echo.
echo ============================================
echo   FasoMarchés - Installation du nécessaire
echo ============================================
echo.

:: 1) Détecter Node.js : d'abord dans le PATH, sinon dans Program Files
set "NODE_OK=0"
where node >nul 2>&1
if %errorlevel% equ 0 set "NODE_OK=1"

if %NODE_OK% equ 0 (
  if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
    set "NODE_OK=1"
    echo Node.js trouvé dans Program Files. PATH mis à jour pour cette session.
    echo.
  )
)

if %NODE_OK% equ 0 (
  echo [ERREUR] Node.js n'est pas installé ou pas dans le PATH.
  echo.
  echo Souhaitez-vous l'installer maintenant avec winget ?
  echo (Windows va ouvrir l'installation de Node.js LTS)
  echo.
  pause
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo.
    echo winget a échoué. Installez Node.js manuellement :
    echo 1. Allez sur https://nodejs.org
    echo 2. Téléchargez la version LTS
    echo 3. Installez en cochant "Add to PATH"
    echo 4. Fermez TOUTES les fenêtres de terminal, rouvrez-en une puis relancez ce script.
    echo.
    pause
    exit /b 1
  )
  echo.
  echo Node.js est installé. FERMEZ cette fenêtre, rouvrez un terminal
  echo puis double-cliquez sur INSTALLER-NECESSAIRE.bat une 2e fois pour installer les dépendances.
  echo.
  pause
  exit /b 0
)

:: 2) Afficher les versions pour vérifier
echo Node : 
node -v
echo npm  : 
call npm -v
echo.

:: 3) Nettoyer et installer les dépendances (évite erreurs de cache)
echo Installation des dépendances (npm install)...
echo Si une erreur apparaît, relancez ce script une 2e fois.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo Une erreur s'est produite. Tentative avec --legacy-peer-deps...
  call npm install --legacy-peer-deps
)
if errorlevel 1 (
  echo.
  echo [ERREUR] npm install a échoué. Vérifiez votre connexion Internet ou relancez plus tard.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Installation terminée avec succès.
echo ============================================
echo.
echo Vous pouvez maintenant lancer l'application avec LANCER.bat
echo ou en tapant dans ce dossier : npm run dev
echo.
pause
