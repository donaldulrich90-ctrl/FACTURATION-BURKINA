/**
 * Parse un fichier CSV d'articles de mercuriale.
 * Modèle : Code, Désignation/Caractéristiques, Conditionnement, Minimum, Moyen, Maximum (Prix HTVA FCFA), Catégorie.
 * Lignes sans conditionnement ni prix = type 'category'.
 * Séparateur : point-virgule (;) ou virgule (,)
 */

const HEADERS_FR = ['code', 'designation', 'conditionnement', 'minimum', 'moyen', 'maximum', 'categorie'];
const ALIASES = {
  code: ['code'],
  designation: ['designation', 'désignation', 'caractéristiques', 'caracteristiques', 'designation_caracteristiques'],
  conditionnement: ['conditionnement'],
  minimum: ['minimum', 'prix min', 'prix minimum', 'min', 'prix_ouagadougou_minimum', 'prix_centre_minimum'],
  moyen: ['moyen', 'prix moyen', 'moyenne', 'prix réf.', 'prix ref', 'prix_ref', 'prix ref.', 'prix_ouagadougou_moyen', 'prix_centre_moyen'],
  maximum: ['maximum', 'prix max', 'prix maximum', 'max', 'prix_ouagadougou_maximum', 'prix_centre_maximum'],
  categorie: ['categorie', 'catégorie', 'category'],
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Parse un prix FCFA : gère espaces (42 500), virgule décimale (42,50), point milliers (42.500 ou 1.500.000).
 */
function parsePrix(val) {
  if (val == null || val === '') return null;
  let s = String(val).replace(/\s/g, '').replace(/\u00a0/g, '').replace(/[^\d.,\-]/g, '');
  if (!s || s === '-' || s === '.') return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length === 3 && /^\d+$/.test(parts[1])) {
      s = parts.join('');
    } else {
      s = s.replace(',', '.');
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split('.');
    if (parts.length >= 2 && parts.every((p) => /^\d+$/.test(p)) && parts[parts.length - 1].length === 3) {
      s = parts.join('');
    }
  } else if (hasComma && hasDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s.replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? null : Math.round(n);
}

function detectSeparator(line) {
  if (line.includes(';')) return ';';
  return ',';
}

/**
 * @param {string} csvText - Contenu du fichier CSV
 * @returns {{ lines: Array<{ code, designation, type?, conditionnement?, prix_min?, prix_moyen?, prix_max?, categorie? }>, errors: string[] }}
 */
export function parseMercurialeCsv(csvText) {
  const errors = [];
  const lines = [];
  const text = (csvText || '').trim();
  if (!text) {
    errors.push('Fichier vide.');
    return { lines, errors };
  }

  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (rows.length < 2) {
    errors.push("Le fichier doit contenir une ligne d'en-tête et au moins une ligne de données.");
    return { lines, errors };
  }

  const sep = detectSeparator(rows[0]);
  const headerRow = rows[0].split(sep).map(normalizeHeader);
  const colIndex = {};
  HEADERS_FR.forEach((key) => {
    const aliases = ALIASES[key] || [key];
    for (let i = 0; i < headerRow.length; i++) {
      const h = headerRow[i];
      if (aliases.some((a) => h === a || h.includes(a.replace(/\s/g, '')))) {
        colIndex[key] = i;
        break;
      }
    }
    if (colIndex[key] === undefined && (key === 'code' || key === 'designation')) {
      colIndex[key] = key === 'code' ? 0 : 1;
    }
  });

  if (colIndex.code === undefined || colIndex.designation === undefined) {
    errors.push('Colonnes requises : Code, Désignation/Caractéristiques. Optionnel : Conditionnement, Minimum, Moyen, Maximum, Catégorie.');
    return { lines, errors };
  }

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const code = (cells[colIndex.code] || '').trim();
    const designation = (cells[colIndex.designation] || '').trim();
    if (!code && !designation) continue;

    const conditionnement = colIndex.conditionnement !== undefined ? (cells[colIndex.conditionnement] || '').trim() : '';
    const prixMin = colIndex.minimum !== undefined ? parsePrix(cells[colIndex.minimum]) : null;
    const prixMoyen = colIndex.moyen !== undefined ? parsePrix(cells[colIndex.moyen]) : null;
    const prixMax = colIndex.maximum !== undefined ? parsePrix(cells[colIndex.maximum]) : null;
    const categorie = (colIndex.categorie !== undefined ? cells[colIndex.categorie] : '')?.trim() || 'Divers';

    const hasPrix = prixMin != null || prixMoyen != null || prixMax != null;
    const isCategory = !hasPrix && !conditionnement;

    if (isCategory) {
      lines.push({
        type: 'category',
        code: code || `CAT-${i}`,
        designation: designation || 'Sans désignation',
        categorie,
      });
    } else {
      const prix_min = prixMin ?? prixMoyen ?? prixMax ?? 0;
      const prix_moyen = prixMoyen ?? prixMin ?? prixMax ?? 0;
      const prix_max = prixMax ?? prixMoyen ?? prixMin ?? 0;
      lines.push({
        type: 'article',
        code: code || `ART-${i}`,
        designation: designation || 'Sans désignation',
        conditionnement: conditionnement || 'Unité',
        prix_min,
        prix_moyen,
        prix_max,
        categorie,
      });
    }
  }

  return { lines, errors };
}

/** Contenu d'un fichier CSV exemple (modèle Prix HTVA Min / Moyen / Max) */
export const CSV_TEMPLATE = `Code;Désignation/Caractéristiques;Conditionnement;Minimum;Moyen;Maximum;Catégorie
03.1.1;Fournitures scolaires, de bureau et de presse;;;;
03.1.1.1.1;Agendas;;;;
03.1.1.1.1.0.001;Agenda grand format couverture estampillée 100 pages papier 80g;Unité;8000;9165;10000;Fournitures
03.1.1.1.1.0.002;Agenda grand format couverture estampillée 100 pages papier 80g;Paquet de 10;79000;91000;99000;Fournitures
FUR-BUR-001;Rame de papier A4 80g (Double A);Paquet;3200;3500;3800;Fournitures de bureau`;
