/**
 * Extraction des lignes mercuriale depuis un fichier Word (.docx).
 * Utilise mammoth pour convertir en HTML, puis parse les tableaux.
 */

import mammoth from 'mammoth';

const HEADER_KEYWORDS = {
  code: ['code', 'article'],
  designation: ['désignation', 'designation', 'libellé', 'libelle', 'caractéristiques'],
  unite: ['unité', 'unite', 'conditionnement', 'condition'],
  prix_min: ['minimum', 'min', 'mini'],
  prix_moyen: ['moyen', 'indicatif'],
  prix_max: ['maximum', 'max', 'plafond', 'prix unitaire plafond'],
};

/**
 * Parse un prix FCFA : gère espaces (42 500), virgule décimale (42,50), point milliers (42.500 ou 1.500.000).
 */
function cleanPrice(val) {
  if (!val || typeof val !== 'string') return null;
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

function cleanText(val) {
  if (!val) return '';
  return String(val).replace(/\s+/g, ' ').trim();
}

function getColumnIndices(headers) {
  const indices = { code: -1, designation: -1, unite: -1, prix_min: -1, prix_moyen: -1, prix_max: -1 };
  const h = headers.map((c) => String(c).toLowerCase());
  for (const [key, keywords] of Object.entries(HEADER_KEYWORDS)) {
    for (let i = 0; i < h.length; i++) {
      if (keywords.some((kw) => h[i].includes(kw))) {
        indices[key] = i;
        break;
      }
    }
  }
  if (indices.code < 0) indices.code = 0;
  if (indices.designation < 0) indices.designation = Math.min(1, h.length - 1);
  if (indices.unite < 0) indices.unite = Math.min(2, h.length - 1);
  if (indices.prix_min < 0 && indices.prix_max < 0 && h.length >= 6) {
    indices.prix_min = h.length - 3;
    indices.prix_moyen = h.length - 2;
    indices.prix_max = h.length - 1;
  } else if (indices.prix_max < 0 && h.length >= 4) {
    indices.prix_max = h.length - 1;
  }
  return indices;
}

function isHeaderRow(cells) {
  const text = cells.join(' ').toLowerCase();
  return ['code', 'désignation', 'designation', 'libellé', 'unité', 'conditionnement', 'minimum', 'maximum'].some((kw) => text.includes(kw));
}

// Noms de régions et chefs-lieux utilisés comme en-têtes dans les documents Word — à exclure des lignes "catégorie"
const NOMS_REGIONS_CHEFS_LIEUX = new Set([
  'ouagadougou', 'bobo-dioulasso', 'banfora', 'dédougou', 'dori', 'fada n\'gourma', 'fada-ngourma', 'koudougou',
  'tenkodogo', 'ziniaré', 'gaoua', 'kaya', 'manga', 'ouahigouya', 'bogandé', 'bogande', 'djibo', 'diapaga', 'tougan',
  'kadiogo', 'bankui', 'tannounyan', 'nakambé', 'kuilsé', 'nando', 'nazinon', 'goulmou', 'guiriko', 'yaadga',
  'oubri', 'liptako', 'djôrô', 'sirba', 'soum', 'tapoa', 'sourou', 'centre', 'boucle du mouhoun', 'cascades',
  'centre-est', 'centre-nord', 'centre-ouest', 'centre-sud', 'est', 'hauts-bassins', 'nord', 'plateau-central',
  'sahel', 'sud-ouest', 'mercuriale',
]);

function isRegionHeaderLine(line) {
  if (line.type !== 'category') return false;
  const des = (line.designation || '').trim().toLowerCase();
  const cond = (line.conditionnement || '').trim().toLowerCase();
  if (!des) return false;
  if (NOMS_REGIONS_CHEFS_LIEUX.has(des)) return true;
  if (des === cond && NOMS_REGIONS_CHEFS_LIEUX.has(cond)) return true;
  if (des === cond && des.length < 25 && /^[a-zàâäéèêëïîôùûüç\s\-']+$/i.test(des)) return true;
  return false;
}

function parseTableHtml(html) {
  const lines = [];
  let currentCategorie = 'Divers';
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;

  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = tableMatch[1];
    const rows = [];
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells = [];
      let cellMatch;
      const cellRegex2 = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      while ((cellMatch = cellRegex2.exec(rowMatch[1])) !== null) {
        const text = cellMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        cells.push(text);
      }
      if (cells.length) rows.push(cells);
    }

    if (rows.length === 0) continue;
    let headers = [];
    let startRow = 0;
    const hasPrixHeaders = (cells) => {
      const t = (cells || []).join(' ').toLowerCase();
      return t.includes('minimum') && (t.includes('maximum') || t.includes('moyen'));
    };
    if (isHeaderRow(rows[0])) {
      headers = rows[0];
      startRow = 1;
    } else {
      for (let r = 0; r < Math.min(5, rows.length); r++) {
        const cells = rows[r] || [];
        if (hasPrixHeaders(cells)) {
          headers = cells;
          startRow = r + 1;
          break;
        }
      }
      if (headers.length === 0) {
        headers = rows[0];
        startRow = 0;
      }
    }
    const indices = getColumnIndices(headers);

    for (let i = startRow; i < rows.length; i++) {
      const cells = rows[i];
      const hasContent = (cells || []).some((c) => cleanText(c).length > 0);
      if (!hasContent) continue;
      if (i > startRow && isHeaderRow(cells)) continue;

      const get = (idx) => (idx >= 0 && idx < cells.length ? cells[idx] : '');
      let code = cleanText(get(indices.code));
      let designation = cleanText(get(indices.designation));
      let unite = cleanText(get(indices.unite)) || 'Unité';
      let prixMin = cleanPrice(get(indices.prix_min));
      let prixMoyen = cleanPrice(get(indices.prix_moyen));
      let prixMax = cleanPrice(get(indices.prix_max));

      for (let c = 0; c < (cells || []).length; c++) {
        const v = cleanPrice(get(c));
        if (v != null && v > 0) {
          if (prixMin == null) prixMin = v;
          else if (prixMoyen == null) prixMoyen = v;
          else if (prixMax == null) prixMax = v;
          else break;
        }
      }
      if (!code && !designation) {
        for (let c = 0; c < Math.min(3, (cells || []).length); c++) {
          const t = cleanText(get(c));
          if (t && !/^\d+$/.test(t) && t.length > 2) { designation = t; break; }
          if (t && /^[\d.]+$/.test(t)) { code = t; break; }
        }
      }
      if (!unite && (cells || []).length >= 3) unite = cleanText(get(2)) || 'Unité';
      if (!code && designation) code = `L${i}`;
      if (!designation && code) designation = code;
      if (!code && !designation) {
        const first = (cells || []).find((c) => cleanText(c).length > 0);
        code = first ? cleanText(first) : `L${i}`;
        designation = code;
      }

      const hasPrix = prixMin != null || prixMoyen != null || prixMax != null;
      const pMin = prixMin ?? prixMoyen ?? prixMax;
      const pMoy = prixMoyen ?? prixMin ?? prixMax;
      const pMax = prixMax ?? prixMoyen ?? prixMin ?? prixMax;

      if (!hasPrix) {
        const catLine = { type: 'category', code: code || designation, designation: designation || code, categorie: currentCategorie };
        if (isRegionHeaderLine(catLine)) continue;
        lines.push(catLine);
        if (designation && designation.length < 80) currentCategorie = designation;
      } else {
        lines.push({
          type: 'article',
          code: code || designation,
          designation: designation || code,
          conditionnement: unite,
          prix_min: pMin ?? 0,
          prix_moyen: pMoy ?? 0,
          prix_max: pMax ?? pMoy ?? 0,
          categorie: currentCategorie,
        });
      }
    }
  }
  return lines;
}

/**
 * Extrait les lignes mercuriale depuis un Blob/File Word (.docx).
 * @param {Blob|File} blobOrFile
 * @returns {Promise<{ lines: Array, errors: string[], meta?: object }>}
 */
export async function extractAndParseDocx(blobOrFile) {
  if (!blobOrFile) throw new Error('Aucun fichier Word fourni.');
  const blob = blobOrFile instanceof Blob ? blobOrFile : new Blob([blobOrFile]);
  if (blob.size === 0) throw new Error('Le fichier Word est vide.');
  const ext = (blobOrFile.name || '').toLowerCase();
  if (!ext.endsWith('.docx')) throw new Error('Le fichier doit être un document Word (.docx).');

  const arrayBuffer = await blob.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const lines = parseTableHtml(html);

  const errors = [];
  if (lines.length === 0) {
    errors.push('Aucune ligne de mercuriale reconnue. Vérifiez le format du Word ou importez via CSV.');
  }

  return {
    lines,
    errors,
    meta: { count: lines.length },
  };
}
