/**
 * Extraction des lignes mercuriale depuis un fichier Word (.docx).
 * Tente d'abord le convertisseur Python (python-docx, plus fiable pour les tableaux complexes).
 * Sinon utilise mammoth pour convertir en HTML, puis cheerio pour parser les tableaux.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  if (isNaN(n)) return null;
  return n === Math.floor(n) ? Math.floor(n) : n;
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

/**
 * Tente l'extraction via le convertisseur Python (convertisseur.py --json).
 * @param {Buffer} buffer
 * @returns {{ lines: Array, errors: string[] } | null} null si Python indisponible ou échec
 */
function tryPythonExtract(buffer) {
  const tmpDir = process.env.TMP || process.env.TEMP || '/tmp';
  const tmpIn = path.join(tmpDir, `mercurial_extract_${Date.now()}.docx`);
  const converterPath = path.join(__dirname, '..', '..', '..', 'convertisseur.py');
  try {
    if (!fs.existsSync(converterPath)) return null;
    fs.writeFileSync(tmpIn, buffer);
    const pyCmds = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
    let py = null;
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
    for (const cmd of pyCmds) {
      py = spawnSync(cmd, [converterPath, tmpIn, '--json'], {
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 50 * 1024 * 1024,
        cwd: path.dirname(converterPath),
        env,
      });
      if (py.status === 0 && py.stdout) break;
    }
    fs.unlinkSync(tmpIn);
    if (!py || py.status !== 0 || !py.stdout) return null;
    const lines = JSON.parse(py.stdout.trim());
    if (!Array.isArray(lines) || lines.length === 0) return null;
    return { lines, errors: [] };
  } catch {
    try {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    } catch (_) {}
    return null;
  }
}

/**
 * Extrait les lignes mercuriale depuis un buffer Buffer.
 * Utilise le convertisseur Python en priorité si disponible, sinon mammoth.
 * @param {Buffer} buffer
 * @returns {Promise<{ lines: Array<{ type, code, designation, conditionnement?, prix_min?, prix_moyen?, prix_max?, categorie? }>, errors: string[] }>}
 */
export async function extractMercurialeFromDocx(buffer) {
  const pythonResult = tryPythonExtract(buffer);
  if (pythonResult) {
    return pythonResult;
  }
  const errors = [];
  const lines = [];
  let currentCategorie = 'Divers';

  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html);

  $('table').each((_, table) => {
    const $table = $(table);
    const rows = $table.find('tr').toArray();
    if (rows.length === 0) return;

    let headers = [];
    let startRow = 0;
    const allRowsCells = rows.map((r) => $(r).find('td, th').toArray().map((el) => $(el).text().trim()));
    const firstRowCells = allRowsCells[0] || [];
    const hasPrixHeaders = (cells) => {
      const t = cells.join(' ').toLowerCase();
      return t.includes('minimum') && (t.includes('maximum') || t.includes('moyen'));
    };
    if (isHeaderRow(firstRowCells)) {
      headers = firstRowCells;
      startRow = 1;
    } else {
      for (let r = 0; r < Math.min(5, rows.length); r++) {
        const cells = allRowsCells[r] || [];
        if (hasPrixHeaders(cells)) {
          headers = cells;
          startRow = r + 1;
          break;
        }
      }
      if (headers.length === 0) {
        headers = firstRowCells;
        startRow = 0;
      }
    }

    const indices = getColumnIndices(headers);

    for (let i = startRow; i < rows.length; i++) {
      const cells = $(rows[i]).find('td, th').toArray().map((el) => $(el).text().trim());
      const hasContent = cells.some((c) => cleanText(c).length > 0);
      if (!hasContent) continue;
      if (i > startRow && isHeaderRow(cells)) continue;

      const get = (idx) => (idx >= 0 && idx < cells.length ? cells[idx] : '');
      let code = cleanText(get(indices.code));
      let designation = cleanText(get(indices.designation));
      let unite = cleanText(get(indices.unite)) || 'Unité';
      let prixMin = cleanPrice(get(indices.prix_min));
      let prixMoyen = cleanPrice(get(indices.prix_moyen));
      let prixMax = cleanPrice(get(indices.prix_max));

      for (let c = 0; c < cells.length; c++) {
        const v = cleanPrice(get(c));
        if (v != null && v > 0) {
          if (prixMin == null) prixMin = v;
          else if (prixMoyen == null) prixMoyen = v;
          else if (prixMax == null) prixMax = v;
          else break;
        }
      }
      if (!code && !designation) {
        for (let c = 0; c < Math.min(3, cells.length); c++) {
          const t = cleanText(get(c));
          if (t && !/^\d+$/.test(t) && t.length > 2) { designation = t; break; }
          if (t && /^[\d.]+$/.test(t)) { code = t; break; }
        }
      }
      if (!unite && cells.length >= 3) unite = cleanText(get(2)) || 'Unité';
      if (!code && designation) code = `L${i}`;
      if (!designation && code) designation = code;
      if (!code && !designation) {
        const first = cells.find((c) => cleanText(c).length > 0);
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
  });

  return { lines, errors };
}
