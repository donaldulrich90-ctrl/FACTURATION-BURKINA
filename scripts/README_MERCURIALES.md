# Import des Mercuriales 2026 Burkina Faso

## Prérequis

1. **Python 3** avec **python-docx** :
   ```bash
   pip install python-docx
   ```
   Ou depuis le dossier scripts :
   ```bash
   pip install -r scripts/requirements.txt
   ```

2. **Fichiers Word (.docx)** dans le dossier :
   ```
   C:\Users\user\Downloads\Mercuriale_2026_VersionFinale\Mercuriale_2026_VersionFinale\
   ```

3. **Base de données** initialisée (`npm run db:seed` dans `server/`)

## Lancement automatique (toutes les régions)

```powershell
cd c:\Users\user\Documents\FACTURATION\scripts
.\extract_import_all_mercuriales.ps1
```

Ou double-cliquer sur `extract_import_all_mercuriales.bat`

## Lancement manuel (une région)

### 1. Extraction Word → CSV

```bash
python scripts/extract_mercurial_docx.py "chemin/vers/Mercuriale_2026_OUAGADOUGOU.docx" ouagadougou scripts/mercurial_ouagadougou.csv
```

### 2. Import CSV → Base de données

```bash
cd server
npm run db:import-mercurial -- --replace --region ouagadougou ..\scripts\mercurial_ouagadougou.csv
```

## Mapping Word → Région

| Fichier Word | Région (regionId) |
|--------------|-------------------|
| Mercuriale_2026_OUAGADOUGOU.docx | ouagadougou |
| Mercuriale_2026_BOBO-DIOULASSO.docx | hauts-bassins |
| Mercuriale_2026_BANFORA.docx | cascades |
| Mercuriale_2026_DEDOUGOU.docx | boucle-mouhoun |
| Mercuriale_2026_DORI.docx | sahel |
| Mercuriale_2026_FADA-NGOURMA.docx | est |
| Mercuriale_2026_KOUDOUGOU.docx | centre-ouest |
| Mercuriale_2026_TENKODOGO.docx | centre-est |
| Mercuriale_2026_ZINIARE.docx | plateau-central |
| Mercuriale_2026_GAOUA.docx | sud-ouest |
| Mercuriale_2026_KAYA.docx | centre-nord |
| Mercuriale_2026_MANGA.docx | centre-sud |
| Mercuriale_2026_OUAHIGOUYA.docx | nord |
| Mercuriale PRESTATION_INTELLECTUELLE_BTP_2026.docx | centre |

## Note

- L'extraction depuis Word (.docx) est plus fiable que depuis PDF : les tableaux ont une structure native.
- `--replace` supprime les anciennes données de la région avant import.
