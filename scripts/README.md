# Scripts d'extraction Mercurial

## Extraction PDF → CSV / Excel

Deux scripts pour extraire les données du **Mercurial des prix au Burkina Faso** depuis un PDF.

### Installation

```bash
cd scripts
pip install -r requirements.txt
```

### Option 1 : PyMuPDF (extract_mercurial.py)

Parser optimisé pour le format Mercuriale 2026 BF. Produit un CSV prêt pour l'import Prisma.

```bash
python extract_mercurial.py <chemin_mercurial.pdf> [region_id] [output.csv]
```

### Option 2 : pdfplumber + pandas (extract_mercurial_plumber.py)

Extraction par tableaux, export CSV et Excel. Utile si PyMuPDF ne détecte pas bien les tableaux.

```bash
python extract_mercurial_plumber.py <chemin_mercurial.pdf> [output.csv]
```

Génère aussi un fichier `.xlsx` à côté du CSV.

**Exemples :**

```bash
# Extraction avec région par défaut (centre)
python extract_mercurial.py ../mercurial.pdf

# Spécifier la région
python extract_mercurial.py mercurial.pdf centre mercurial_centre.csv
python extract_mercurial.py mercurial.pdf ouagadougou mercurial_ouaga.csv
```

### Régions disponibles (IDs Prisma)

- `centre`, `boucle-mouhoun`, `cascades`, `centre-est`, `centre-nord`, `centre-ouest`
- `centre-sud`, `est`, `hauts-bassins`, `nord`, `plateau-central`, `sahel`
- `sud-ouest`, `ouagadougou`

### Colonnes CSV (import Django/Prisma)

| Colonne | Description |
|---------|-------------|
| code | Code article |
| designation | Désignation du produit |
| unite | Unité / conditionnement |
| prix_unitaire_plafond | Prix plafond (nombres nettoyés) |
| region_id | ID de la région |
| page | Numéro de page source |

### Import dans Prisma (MercurialeArticle)

Après génération du CSV, utilisez un script d'import ou :

```javascript
// Exemple d'import manuel
const rows = await parseCSV('mercurial_export.csv');
for (const r of rows) {
  await prisma.mercurialeArticle.create({
    data: {
      code: r.code,
      designation: r.designation,
      conditionnement: r.unite || 'Unité',
      prix_max: r.prix_unitaire_plafond ? parseInt(r.prix_unitaire_plafond) : null,
      regionId: r.region_id,
      companyId: 'template',
    },
  });
}
```
