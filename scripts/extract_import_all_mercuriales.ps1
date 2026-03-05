# Script d'extraction et import de toutes les mercuriales 2026 Burkina Faso
# Usage: .\extract_import_all_mercuriales.ps1
# Les fichiers Word (.docx) doivent être dans: C:\Users\user\Downloads\Mercuriale_2026_VersionFinale\Mercuriale_2026_VersionFinale\

$baseDocx = "C:\Users\user\Downloads\Mercuriale_2026_VersionFinale\Mercuriale_2026_VersionFinale"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Mapping: nom du PDF (sans extension) -> regionId Prisma
$mapping = @{
    "Mercuriale_2026_OUAGADOUGOU" = "ouagadougou"
    "Mercuriale_2026_BOBO-DIOULASSO" = "hauts-bassins"
    "Mercuriale_2026_BANFORA" = "cascades"
    "Mercuriale_2026_DEDOUGOU" = "boucle-mouhoun"
    "Mercuriale_2026_DORI" = "sahel"
    "Mercuriale_2026_FADA-NGOURMA" = "est"
    "Mercuriale_2026_KOUDOUGOU" = "centre-ouest"
    "Mercuriale_2026_TENKODOGO" = "centre-est"
    "Mercuriale_2026_ZINIARE" = "plateau-central"
    "Mercuriale_2026_GAOUA" = "sud-ouest"
    "Mercuriale_2026_KAYA" = "centre-nord"
    "Mercuriale_2026_MANGA" = "centre-sud"
    "Mercuriale_2026_OUAHIGOUYA" = "nord"
}

# PRESTATION_INTELLECTUELLE_BTP_2026 -> prestations-intellectuelles (région spéciale ou centre)
# On l'importe dans centre pour l'instant (pas de région dédiée)
$mapping["Mercuriale PRESTATION_INTELLECTUELLE_BTP_2026"] = "centre"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Extraction et import Mercuriales 2026 BF" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Python et python-docx
try {
    $null = python --version 2>&1
} catch {
    Write-Host "[ERREUR] Python non trouvé. Installez Python et python-docx (pip install python-docx)" -ForegroundColor Red
    exit 1
}

$ok = 0
$fail = 0

foreach ($entry in $mapping.GetEnumerator()) {
    $docxName = $entry.Key
    $regionId = $entry.Value
    $docxPath = Join-Path $baseDocx "$docxName.docx"
    $csvPath = Join-Path $scriptDir "mercurial_$regionId.csv"

    if (-not (Test-Path $docxPath)) {
        Write-Host "[SKIP] $docxName.docx introuvable" -ForegroundColor Yellow
        $fail++
        continue
    }

    Write-Host "[1/2] Extraction: $docxName -> $regionId" -ForegroundColor White
    & python "$scriptDir\extract_mercurial_docx.py" $docxPath $regionId $csvPath 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur extraction: $extractResult" -ForegroundColor Red
        $fail++
        continue
    }
    $lines = (Get-Content $csvPath | Measure-Object -Line).Lines - 1
    Write-Host "  -> $lines lignes extraites" -ForegroundColor Green

    Write-Host "[2/2] Import: $regionId" -ForegroundColor White
    $csvRelative = "..\scripts\mercurial_$regionId.csv"
    Push-Location "$projectRoot\server"
    npm run db:import-mercurial -- --replace --region $regionId $csvRelative 2>&1
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur import: $importResult" -ForegroundColor Red
        $fail++
        continue
    }
    Write-Host "  -> Import OK" -ForegroundColor Green
    $ok++
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Terminé: $ok régions importées, $fail échecs" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
