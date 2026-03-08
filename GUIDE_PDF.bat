@echo off
chcp 65001 >nul 2>nul
cd /d "%~dp0"
echo.
echo ==========================================
echo   Guide utilisateur - Export PDF
echo ==========================================
echo.
echo Ouverture du guide dans le navigateur...
echo.
echo Pour enregistrer en PDF :
echo   1. Appuyez sur Ctrl+P (ou Fichier ^> Imprimer)
echo   2. Choisissez "Enregistrer au format PDF" ou "Microsoft Print to PDF"
echo   3. Cliquez sur Enregistrer
echo.
start "" "GUIDE_ENTREPRISES.html"
echo.
pause
