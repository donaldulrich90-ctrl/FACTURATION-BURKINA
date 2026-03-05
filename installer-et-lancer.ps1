# Script : installer le necessaire et lancer FasoMarches (React)
# Utilisation : clic droit > Executer avec PowerShell
# Ou dans PowerShell : .\installer-et-lancer.ps1

$projet = "C:\Users\user\Documents\FACTURATION"
Set-Location $projet

# S'assurer que Node est dans le PATH (Program Files si pas encore)
$nodePath = "C:\Program Files\nodejs"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (Test-Path "$nodePath\node.exe") {
        $env:PATH = "$nodePath;$env:PATH"
        Write-Host "Node.js trouve dans Program Files. PATH mis a jour." -ForegroundColor Yellow
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERREUR : Node.js non trouve. Lancez INSTALLER-NECESSAIRE.bat ou installez depuis https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "=== Installation des dependances (npm install) ===" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tentative avec --legacy-peer-deps..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR : npm install a echoue. Verifiez la connexion ou relancez plus tard." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "`n=== Demarrage de l'application (npm run dev) ===" -ForegroundColor Cyan
Write-Host "Ouvrez http://localhost:5173 dans le navigateur." -ForegroundColor Green
Start-Process "http://localhost:5173"
npm run dev
