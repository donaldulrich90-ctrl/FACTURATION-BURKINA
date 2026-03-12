@echo off
chcp 65001 >nul 2>nul
title FasoMarchés - Créer démarrage automatique
cd /d "%~dp0"
set "ROOT=%CD%"

echo.
echo ==========================================
echo   FasoMarchés - Démarrage automatique
echo   Au démarrage de Windows
echo ==========================================
echo.

:: Créer un script dans le dossier Démarrage
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "BATFILE=%STARTUP%\FasoMarches_Demarrer.bat"

(
echo @echo off
echo cd /d "%ROOT%\server"
echo set NODE_ENV=production
echo start "FasoMarchés" /min cmd /k "node src/index.js"
) > "%BATFILE%"

echo [OK] Fichier créé : %BATFILE%
echo.
echo   FasoMarchés démarrera automatiquement au prochain
echo   démarrage de Windows.
echo.
echo   Pour désactiver : supprimez ce fichier
echo   %BATFILE%
echo.
pause
