/**
 * Parse le texte OCR d'une photo de facture pour extraire client et articles.
 * Adapté aux factures françaises / africaines (FCFA, etc.)
 */

/**
 * Extrait les nombres d'une chaîne (ex: "1 500 000" -> 1500000, "1.500" -> 1500)
 */
function parsePrix(str) {
  if (!str || typeof str !== 'string') return null;
  const noSpaces = str.replace(/\s/g, '');
  let numStr = noSpaces.match(/[\d.,]+/)?.[0];
  if (!numStr) return null;
  const hasComma = numStr.includes(',');
  if (hasComma && !numStr.includes('.')) {
    numStr = numStr.replace(',', '.');
  } else if (hasComma) {
    numStr = numStr.replace(/,/g, '');
  }
  const n = parseFloat(numStr);
  return isNaN(n) ? null : Math.round(n);
}

/**
 * Extrait tous les nombres d'une ligne
 */
function extractNumbers(line) {
  const numbers = [];
  const parts = line.split(/\s+/);
  for (const p of parts) {
    const n = parsePrix(p);
    if (n != null && n > 0) numbers.push(n);
  }
  return numbers;
}

/**
 * Détermine si une ligne ressemble à une ligne d'article (a du texte + des nombres)
 */
function looksLikeItemLine(line) {
  const trimmed = line.trim();
  if (trimmed.length < 2) return false;
  const numbers = extractNumbers(trimmed);
  return numbers.length >= 1 && numbers.length <= 6 && numbers.some((n) => n > 0);
}

/**
 * Parse une ligne d'article : Désignation [Qté] [P.U.] [Total]
 * Les nombres sont souvent à la fin de la ligne.
 * Supporte : "Article  2  150000  300000" ou "Article 2 x 150000 = 300000" ou "Article 300000"
 */
function parseItemLine(line) {
  const trimmed = line.trim();
  // Sépare texte et nombres (les nombres peuvent être collés comme "150000")
  const tokens = trimmed.split(/\s+/);
  const numbers = [];
  const textParts = [];
  for (const p of tokens) {
    const n = parsePrix(p);
    if (n != null && n >= 0) numbers.push(n);
    else if (p.length > 0) textParts.push(p);
  }
  const designation = textParts.join(' ').replace(/\s+/g, ' ').trim() || 'Article';
  if (numbers.length === 0) return { designation: designation || 'Article', quantity: 1, priceUnit: 0 };
  const total = numbers[numbers.length - 1];
  const qty = numbers.length === 1 ? 1 : numbers[0];
  const priceUnit = numbers.length >= 3 ? numbers[numbers.length - 2] : (qty > 0 && qty !== total ? Math.round(total / qty) : total);
  return {
    designation: designation || 'Article',
    quantity: Math.max(1, qty),
    priceUnit: Math.max(0, priceUnit || total),
  };
}

/**
 * Parse le texte OCR complet
 */
export function parseFactureFromOcr(ocrText) {
  const lines = (ocrText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let client = '';
  const items = [];
  let inTable = false;
  const skipWords = ['désignation', 'designation', 'description', 'quantité', 'quantite', 'qté', 'qte', 'p.u.', 'pu', 'prix', 'unitaire', 'total', 'montant', 'tva', 'ht', 'ttc', 'f cfa', 'fcfa', 'facture', 'devis', 'n°', 'numero', 'date', 'client', 'adresse', 'ifu', 'rccm'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (!inTable && skipWords.some((w) => lower.includes(w)) && line.length < 50) {
      if (client && !lower.includes('total') && !lower.includes('tva')) continue;
      inTable = lower.includes('désignation') || lower.includes('designation') || lower.includes('qté') || lower.includes('quantité');
      continue;
    }

    if (!inTable && looksLikeItemLine(line)) {
      const nums = extractNumbers(line);
      if (nums.length >= 1 && nums.some((n) => n >= 50)) {
        inTable = true;
      }
    }

    if (inTable && looksLikeItemLine(line)) {
      const item = parseItemLine(line);
      if (item.designation && item.quantity > 0 && item.priceUnit > 0) {
        if (!skipWords.some((w) => item.designation.toLowerCase().includes(w))) {
          items.push(item);
        }
      }
    } else if (!inTable && client === '' && line.length > 2 && line.length < 80) {
      if (!/^\d+$/.test(line) && !line.match(/^\d[\d\s.,]+\d$/)) {
        if (!skipWords.some((w) => lower.startsWith(w))) {
          client = line;
        }
      }
    }
  }

  if (client === '' && lines.length > 0) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const l = lines[i];
      if (l.length > 3 && l.length < 60 && !/^\d+$/.test(l)) {
        client = l;
        break;
      }
    }
  }

  return { client: client || 'Client à vérifier', items: items.length > 0 ? items : [{ designation: 'Vérifier et compléter', quantity: 1, priceUnit: 0 }] };
}
