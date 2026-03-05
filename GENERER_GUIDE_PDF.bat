@echo off
chcp 65001 >nul 2>nul
title Generation du guide PDF
cd /d "%~dp0"

echo.
echo ==========================================
echo   Guide PDF - FasoMarches / MikroTik
echo ==========================================
echo.
echo Option 1 : Ouvrir le guide HTML (enregistrer en PDF via Ctrl+P)
echo Option 2 : Generer le PDF automatiquement (necessite npm)
echo.
echo Choisissez :
echo   [1] Ouvrir le guide (recommandé - rapide)
echo   [2] Generer PDF avec md-to-pdf (telecharge Puppeteer ~150 Mo)
echo   [Q] Quitter
echo.
choice /c 12Q /n /m "Votre choix (1, 2 ou Q) : "

if errorlevel 3 goto :eof
if errorlevel 2 goto :genpdf
if errorlevel 1 goto :openhtml

:openhtml
echo.
echo Ouverture du guide dans le navigateur...
echo Pour enregistrer en PDF : Ctrl+P puis "Enregistrer au format PDF"
echo.
start "" "Guide_Deploiement_MikroTik.html"
goto :eof

:genpdf
echo.
echo Generation du PDF (premiere fois : telechargement ~2 min)...
npx --yes md-to-pdf DEPLOIEMENT_MIKROTIK.md
if %errorlevel% equ 0 (
    echo.
    echo [OK] PDF genere : Guide_Deploiement_MikroTik.pdf
    start "" "Guide_Deploiement_MikroTik.pdf"
) else (
    echo [ERREUR] Echec. Utilisez l'option 1 pour ouvrir le guide HTML.
)
pause
goto :eof
