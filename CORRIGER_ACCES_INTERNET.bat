@echo off
chcp 65001 >nul 2>nul
title Correction accès Internet - FasoMarchés
:: EXECUTER EN TANT QU'ADMINISTRATEUR (clic droit > Exécuter en tant qu'administrateur)

echo.
echo ==========================================
echo   Ouverture du port 3001 - Pare-feu Windows
echo   (OBLIGATOIRE pour l'accès depuis Internet)
echo ==========================================
echo.

:: Vérifier les droits admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Ce script doit être exécuté en tant qu'administrateur.
    echo.
    echo Faites : Clic droit sur ce fichier ^> Exécuter en tant qu'administrateur
    echo.
    pause
    exit /b 1
)

echo [OK] Droits administrateur détectés.
echo.

:: Supprimer l'ancienne règle si elle existe
netsh advfirewall firewall delete rule name="FasoMarches Port 3001" >nul 2>&1

:: Ajouter la règle
netsh advfirewall firewall add rule name="FasoMarches Port 3001" dir=in action=allow protocol=TCP localport=3001

if %errorlevel% equ 0 (
    echo [OK] Règle pare-feu ajoutée avec succès !
    echo.
    echo Le port 3001 est maintenant autorisé.
    echo Votre plateforme devrait être accessible depuis Internet.
    echo.
    echo Testez : http://VOTRE_IP_PUBLIQUE:3001
) else (
    echo [ERREUR] Échec de l'ajout de la règle.
)

echo.
pause
