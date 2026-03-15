/**
 * Extraction du texte d'un PDF et parsing pour en tirer des lignes de mercuriale.
 * Utilise pdfjs-dist installé en local (package npm) avec worker configuré pour Vite.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Worker PDF.js : servi depuis public/pdf.worker.min.mjs (copié par postinstall)
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
}

/**
 * Vérifie qu'une entrée est un Blob utilisable (ou File) et retourne un Blob.
 * @param {unknown} input
 * @returns {Promise<Blob>}
 */
async function ensureBlob(input) {
  if (!input) throw new Error('Aucune donnée PDF fournie.');
  if (input instanceof Blob) {
    if (input.size === 0) throw new Error('Le fichier PDF est vide.');
    if (input.type && !input.type.toLowerCase().includes('pdf'))
      throw new Error('Le fichier doit être un PDF.');
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Blob([input], { type: 'application/pdf' });
  }
  if (ArrayBuffer.isView(input)) {
    return new Blob([input], { type: 'application/pdf' });
  }
  throw new Error('Format de données PDF non supporté (attendu: Blob, File ou ArrayBuffer).');
}

/** Seuil de caractères par page en dessous duquel le PDF est considéré comme probablement scanné */
const SCANNED_PDF_CHARS_PER_PAGE = 80;

/** Nombre max de pages à traiter (limite de charge pour connexion limitée) */
const MAX_PAGES = 500;

/**
 * Extrait tout le texte d'un PDF avec métadonnées (nombre de pages, détection PDF scanné).
 * @param {Blob|File|ArrayBuffer} blobOrBuffer
 * @returns {Promise<{ text: string, numPages: number, isLikelyScanned: boolean }>}
 */
export async function extractTextFromPdfWithMeta(blobOrBuffer) {
  const blob = await ensureBlob(blobOrBuffer);
  const arrayBuffer = await blob.arrayBuffer();
  if (arrayBuffer.byteLength === 0) throw new Error('Le fichier PDF est vide.');

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    standardFontDataUrl: undefined,
    disableFontFace: false,
  });

  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, MAX_PAGES);
  if (numPages === 0) return { text: '', numPages: 0, isLikelyScanned: false };

  const lines = [];
  let totalChars = 0;
  const LINE_Y_TOLERANCE = 15; // regrouper texte sur même ligne (tableaux avec cellules de tailles variées)
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent({ includeMarkedContent: false });
    const rawItems = textContent.items.filter((item) => item && typeof item.str === 'string');
    const items = rawItems.map((item) => {
      const t = item.transform;
      const y = Array.isArray(t) && t.length >= 6 ? t[5] : 0;
      const x = Array.isArray(t) && t.length >= 5 ? t[4] : 0;
      return { str: item.str, y, x, hasEOL: !!item.hasEOL };
    });
    // Méthode 1 : utiliser hasEOL (fiable pour beaucoup de PDFs)
    const byHasEOL = [];
    let lineBuf = [];
    for (const item of items) {
      totalChars += item.str.length;
      lineBuf.push(item.str);
      if (item.hasEOL) {
        byHasEOL.push(lineBuf.join(' ').trim());
        lineBuf = [];
      }
    }
    if (lineBuf.length) byHasEOL.push(lineBuf.join(' ').trim());

    // Méthode 2 : tri par Y puis X (pour PDFs où hasEOL est peu fiable)
    items.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > LINE_Y_TOLERANCE) return dy;
      return a.x - b.x;
    });
    const byPosition = [];
    let lastY = null;
    let currentLine = [];
    for (const item of items) {
      const y = item.y;
      if (lastY !== null && Math.abs(y - lastY) > LINE_Y_TOLERANCE) {
        if (currentLine.length) byPosition.push(currentLine.join(' ').trim());
        currentLine = [];
      }
      currentLine.push(item.str);
      lastY = y;
    }
    if (currentLine.length) byPosition.push(currentLine.join(' ').trim());

    const linesEOL = byHasEOL.filter((l) => l.length > 0).length;
    const linesPos = byPosition.filter((l) => l.length > 0).length;
    const useEOL = linesEOL >= linesPos;
    const pageLines = (useEOL ? byHasEOL : byPosition).filter((l) => l.length > 0);
    if (i > 1 && lines.length > 0) lines.push('');
    lines.push(...pageLines);
  }
  const text = lines.join('\n');
  const charsPerPage = numPages > 0 ? totalChars / numPages : 0;
  const isLikelyScanned = charsPerPage < SCANNED_PDF_CHARS_PER_PAGE && numPages > 0;
  return { text, numPages, isLikelyScanned };
}

/**
 * Extrait tout le texte d'un PDF (Blob/File).
 * @param {Blob|File|ArrayBuffer} blobOrBuffer
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(blobOrBuffer) {
  const { text } = await extractTextFromPdfWithMeta(blobOrBuffer);
  return text;
}

// Codes : hiérarchiques (03.1.1.1), numériques (001, 1.2), ou alphanum avec tiret (FUR-BUR-001). Espaces en début autorisés. "Sous-catégorie 03.1" accepté.
const CODE_PATTERN = /^\s*(?:Sous-catégorie\s+)?([\d.]+\.[\d.]+(?:\.\d+)*|\d+(?:\.\d+)*|[A-Z]{2,}-[A-Z0-9-]+\d+)/i;
const CONDITIONNEMENTS = ['unité', 'unités', 'paquet', 'paquets', 'sac', 'sacs', 'carton', 'cartons', 'boîte', 'boîtes', 'bidon', 'bidons', 'paquet de 10', 'paquet de 5', 'ramette', 'botte'];

/**
 * Parse un prix FCFA : gère espaces (42 500), virgule décimale (42,50), point milliers (42.500 ou 1.500.000).
 * Aligné sur importMercurialeCsv pour cohérence des imports PDF/CSV/Word.
 */
function parsePrix(s) {
  if (s == null || s === '') return null;
  let str = String(s).replace(/\s/g, '').replace(/\u00a0/g, '').replace(/[^\d.,\-]/g, '');
  if (!str || str === '-' || str === '.') return null;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && !hasDot) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3 && /^\d+$/.test(parts[1])) {
      str = parts.join('');
    } else {
      str = str.replace(',', '.');
    }
  } else if (hasDot && !hasComma) {
    const parts = str.split('.');
    if (parts.length >= 2 && parts.every((p) => /^\d+$/.test(p)) && parts[parts.length - 1].length === 3) {
      str = parts.join('');
    }
  } else if (hasComma && hasDot) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(str.replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? null : Math.round(n);
}

/**
 * Fusionne les montants avec espace comme séparateur de milliers.
 * Ex: "135 000" -> "135000", "1 35 000" -> "135000".
 * Évite que le PDF fragmenté ne donne "35" au lieu de "135 000".
 */
function normalizePrixAvecMilliers(str) {
  if (!str || typeof str !== 'string') return str;
  let s = str;
  // "1 35 000" ou "13 5 000" -> fusionner en un nombre
  s = s.replace(/\b(\d)\s+(\d{1,2})\s+(\d{3})\b/g, (_, a, b, c) => a + b + c);
  // "135 000" ou "35 000" -> fusionner
  s = s.replace(/\b(\d{1,3})\s+(\d{3})\b/g, (_, a, b) => a + b);
  return s;
}

/**
 * Extrait les 1 à 3 derniers nombres de la chaîne (méthode par regex, en repli).
 * Cherche des montants F CFA typiques (ex: 135000, 165 000, 12 500).
 */
function extractPricesByRegex(str) {
  const normalized = normalizePrixAvecMilliers(str);
  const allNumbers = [...normalized.matchAll(/\b(\d{4,7})\b/g)].map((m) => parseInt(m[1], 10));
  if (allNumbers.length === 0) return [];
  const lastThree = allNumbers.slice(-3);
  if (lastThree.length === 1) return lastThree;
  if (lastThree.length === 2) return [lastThree[0], lastThree[0], lastThree[1]];
  return [lastThree[0], lastThree[1], lastThree[2]];
}

/**
 * Extrait les prix en fin de ligne. Ordre PDF typique : ... | Min | Moyen | Max
 * Gère les nombres fragmentés (ex: "135 000", "35"+"000", etc.).
 */
function extractPricesFromEnd(str) {
  const normalized = normalizePrixAvecMilliers(str);
  const parts = normalized.trim().split(/\s{2,}|\t/);
  const numbers = [];
  let pendingZeros = 0;
  for (let i = parts.length - 1; i >= 0 && numbers.length < 3; i--) {
    const p = parts[i];
    const pClean = (p || '').replace(/\s/g, '');
    const n = parsePrix(p);
    if (n === 0 || (n == null && /^0+$/.test(pClean) && pClean.length >= 2)) {
      pendingZeros = pClean.length;
      continue;
    }
    if (n != null && n > 0) {
      let val = n;
      if (pendingZeros > 0 && val < 1000) val = val * Math.pow(10, pendingZeros);
      pendingZeros = 0;
      numbers.unshift(val);
    }
  }
  // Si pas assez de prix trouvés ou prix suspects (< 500 F), essayer la regex
  const hasSuspicious = numbers.some((v) => v > 0 && v < 500);
  if (numbers.length < 2 || hasSuspicious) {
    const byRegex = extractPricesByRegex(normalized);
    if (byRegex.length >= 1 && (!hasSuspicious || byRegex.every((v) => v >= 500))) {
      return byRegex;
    }
  }
  // numbers est déjà [Min, Moyen, Max] (ordre gauche→droite dans la ligne)
  if (numbers.length === 3) return [numbers[0], numbers[1], numbers[2]]; // [Min, Moyen, Max]
  if (numbers.length === 2) return [numbers[0], Math.round((numbers[0] + numbers[1]) / 2), numbers[1]]; // [Min, Moyen≈moyenne, Max]
  return numbers;
}

/**
 * Fusionne les lignes de continuation : quand une ligne ne commence pas par un code
 * (ex. suite de désignation ou prix seuls à cause de cellules de tailles différentes),
 * on l'accole à la ligne précédente pour reconstituer la ligne logique complète.
 */
function mergeContinuationLines(rawLines) {
  const merged = [];
  for (const line of rawLines) {
    if (!line) continue;
    const hasCode = CODE_PATTERN.test(line);
    if (hasCode && merged.length) {
      merged.push(line);
    } else if (hasCode) {
      merged.push(line);
    } else if (merged.length) {
      merged[merged.length - 1] = merged[merged.length - 1] + ' ' + line;
    }
    // première ligne sans code : on la garde quand même pour ne pas perdre du contenu en début de doc
    else {
      merged.push(line);
    }
  }
  return merged;
}

/**
 * Parse le texte extrait pour en faire des lignes mercuriale (catégories et articles).
 * @param {string} text
 * @returns {{ lines: Array<{ type, code, designation, conditionnement?, prix_min?, prix_moyen?, prix_max?, categorie? }>, errors: string[] }}
 */
export function parseMercurialeFromText(text) {
  const errors = [];
  const lines = [];
  const rawLines = (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const mergedLines = mergeContinuationLines(rawLines);
  let currentCategorie = 'Divers';

  for (const line of mergedLines) {
    const codeMatch = line.match(CODE_PATTERN);
    if (!codeMatch) continue;
    const code = codeMatch[1].trim();
    let rest = line.slice(codeMatch[0].length).trim().replace(/^\s*[;.\-]\s*/, '').trim();
    const prices = extractPricesFromEnd(rest);
    const hasPrices = prices.length >= 1;
    let designationPart = rest;
    if (hasPrices) {
      const lastPart = rest.split(/\s{2,}|\t/).pop() || '';
      if (/^\d[\d\s,.]*$/.test(lastPart.replace(/\s/g, ''))) {
        designationPart = rest.slice(0, rest.length - lastPart.length).trim();
      }
      for (let i = 0; i < 3 && rest.length; i++) {
        const m = rest.match(/\s+(\d[\d\s,.]*)\s*$/);
        if (m) {
          rest = rest.slice(0, rest.length - m[0].length).trim();
        }
      }
      designationPart = rest;
    }
    let conditionnement = '';
    let designation = designationPart;
    for (const cond of CONDITIONNEMENTS) {
      const re = new RegExp('\\b' + cond.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      const m = designationPart.match(re);
      if (m) {
        conditionnement = m[0];
        designation = designationPart.replace(re, '').replace(/\s{2,}/g, ' ').trim();
        break;
      }
    }
    if (!designation) designation = code;
    const prix_min = prices[0] ?? null;
    const prix_moyen = prices.length >= 2 ? prices[1] : prices[0];
    const prix_max = prices.length >= 3 ? prices[2] : prices[prices.length - 1];

    if (!hasPrices && !conditionnement) {
      lines.push({
        type: 'category',
        code,
        designation,
        categorie: currentCategorie,
      });
      if (designation.length < 80) currentCategorie = designation;
    } else {
      lines.push({
        type: 'article',
        code,
        designation,
        conditionnement: conditionnement || 'Unité',
        prix_min: prix_min ?? 0,
        prix_moyen: prix_moyen ?? 0,
        prix_max: prix_max ?? prix_moyen ?? 0,
        categorie: currentCategorie,
      });
    }
  }

  // Tri par code pour respecter l'ordre de la mercuriale (001, 002, … 033) même si le PDF les donne dans un autre ordre
  sortLinesByCode(lines);

  return { lines, errors };
}

/**
 * Compare deux codes hiérarchiques (ex. 03.1.1.1.1.0.001) segment par segment pour un tri naturel.
 */
function compareCodes(a, b) {
  const segA = String(a).split('.').map((s) => parseInt(s, 10) || 0);
  const segB = String(b).split('.').map((s) => parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(segA.length, segB.length); i++) {
    const va = segA[i] ?? 0;
    const vb = segB[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function sortLinesByCode(lines) {
  lines.sort((a, b) => compareCodes(a.code, b.code));
}

/**
 * Extrait le texte d'un PDF puis parse pour obtenir les lignes mercuriale, avec validation et métadonnées.
 * @param {Blob|File|ArrayBuffer} blobOrBuffer
 * @returns {Promise<{ lines: Array, errors: string[], meta?: { numPages, isLikelyScanned, categoriesCount, articlesCount, validationWarnings } }>}
 */
export async function extractAndParsePdfWithValidation(blobOrBuffer) {
  try {
    const { text, numPages, isLikelyScanned } = await extractTextFromPdfWithMeta(blobOrBuffer);
    const { lines, errors } = parseMercurialeFromText(text);
    const categoriesCount = lines.filter((l) => l.type === 'category').length;
    const articlesCount = lines.filter((l) => l.type === 'article').length;
    const validationWarnings = [];
    if (isLikelyScanned) {
      validationWarnings.push('Ce PDF semble être un document scanné : l\'extraction automatique peut être incomplète. Pour de meilleurs résultats, utilisez un PDF natif (texte sélectionnable).');
    }
    if (lines.length === 0 && !errors.length) {
      validationWarnings.push('Aucune ligne de mercuriale reconnue (codes, désignations ou prix non détectés). Vérifiez le format du PDF ou importez via CSV.');
    }
    const lowPriceCount = lines.filter((l) => l.type === 'article' && (l.prix_moyen ?? l.prix_max ?? l.prix_min ?? 0) < 500).length;
    if (lowPriceCount > 0) {
      validationWarnings.push(`${lowPriceCount} article(s) avec un prix < 500 F CFA (souvent dus à une extraction fragmentée). Relancez l'extraction ou corrigez manuellement via CSV.`);
    }
    return {
      lines,
      errors,
      meta: {
        numPages,
        isLikelyScanned,
        categoriesCount,
        articlesCount,
        validationWarnings,
      },
    };
  } catch (err) {
    const msg = err?.message || 'Erreur lors de la lecture du PDF.';
    if (/password|invalid/i.test(msg)) {
      return { lines: [], errors: ['Ce PDF est protégé par mot de passe ou corrompu.'] };
    }
    if (/format|parse/i.test(msg)) {
      return { lines: [], errors: ['Fichier PDF invalide ou endommagé.'] };
    }
    return { lines: [], errors: [msg] };
  }
}

/**
 * Extrait le texte d'un PDF puis parse pour obtenir les lignes mercuriale.
 * @param {Blob|File|ArrayBuffer} blobOrBuffer
 * @returns {Promise<{ lines: Array, errors: string[], meta?: object }>}
 */
export async function extractAndParsePdf(blobOrBuffer) {
  const result = await extractAndParsePdfWithValidation(blobOrBuffer);
  return { lines: result.lines, errors: result.errors, meta: result.meta };
}
