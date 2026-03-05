@echo off
chcp 65001 >nul 2>nul
title Ouverture du port 3001 - Pare-feu Windows
:: Ce script doit être exécuté en tant qu'administrateur (clic droit > Exécuter en tant qu'administrateur)

echo.
echo ==========================================
echo   Ouverture du port 3001 (FasoMarches)
echo   dans le pare-feu Windows
echo ==========================================
echo.

netsh advfirewall firewall add rule name="FasoMarches Port 3001" dir=in action=allow protocol=TCP localport=3001
if %errorlevel% equ 0 (
    echo [OK] Règle ajoutée : le port 3001 est maintenant autorisé.
    echo      La plateforme sera accessible depuis le réseau.
) else (
    echo [ERREUR] Échec. Exécutez ce fichier en clic droit ^> Exécuter en tant qu'administrateur
)

echo.
pause
