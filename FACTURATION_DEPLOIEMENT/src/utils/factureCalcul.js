/**
 * Logique métier facturation DGI Burkina Faso / UEMOA
 * Conforme à la Direction Générale des Impôts (DGI) et FEC
 *
 * - Calculateur taxes : TVA 18% s'ajoute au HT, AIRSI (0/2/5%) déduit du TTC
 * - montantEnLettres() : conversion en français + "Francs CFA"
 * - genererNumeroFacture() : format FAC-YYYY-XXXX
 */

const TVA_RATE = 0.18; // 18% DGI Burkina
const AIRSI_RATES = [0, 0.02, 0.05]; // 0%, 2%, 5% (précompte)

/**
 * Calcule les totaux conformes DGI :
 * - TVA (18%) s'ajoute au HT si tvaAppliquee, sinon TTC = HT
 * - AIRSI (précompte) est déduit du TTC → Net à payer
 *
 * @param {number} totalHT - Total hors taxes (FCFA)
 * @param {number} airsiTaux - 0, 2 ou 5 (pourcentage)
 * @param {boolean} [tvaAppliquee=true] - Si true, TVA 18% appliquée ; si false, pas de TVA
 * @returns {{ totalHT, tva, totalTTC, airsi, airsiTaux, netAPayer }}
 */
export function calculerTotauxFacture(totalHT, airsiTaux = 0, tvaAppliquee = true) {
  const ht = Math.round(Number(totalHT) || 0);
  const tva = tvaAppliquee ? Math.round(ht * TVA_RATE) : 0;
  const totalTTC = ht + tva;
  const taux = Number(airsiTaux);
  const airsiPct = [0, 2, 5].includes(taux) ? taux / 100 : 0;
  const airsi = Math.round(totalTTC * airsiPct);
  const netAPayer = totalTTC - airsi;
  return {
    totalHT: ht,
    tva,
    totalTTC,
    airsi,
    airsiTaux: taux,
    netAPayer,
  };
}

/**
 * Convertit un montant en lettres (français) suivi de "Francs CFA"
 * Ex: 1 250 000 → "Un million deux cent cinquante mille Francs CFA"
 */
export function montantEnLettres(montant) {
  const n = Math.round(Number(montant) || 0);
  if (n === 0) return 'Zéro Francs CFA';
  const s = nombresEnLettres(n);
  return s ? `${s} Francs CFA` : '—';
}

/**
 * Arrêté la facture : montant en lettres + (chiffres) FCFA
 * Ex: 40 → "quarante (40) FCFA"
 * Ex: 1 250 000 → "un million deux cent cinquante mille (1 250 000) FCFA"
 */
export function arreteFactureMontant(montant) {
  const n = Math.round(Number(montant) || 0);
  if (n === 0) return 'zéro (0) FCFA';
  const s = nombresEnLettres(n);
  const chiffres = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return s ? `${s} (${chiffres}) FCFA` : `(${chiffres}) FCFA`;
}

/**
 * Montant arrêté pour devis marché à commande : lettres (chiffres) Franc CFA HTVA
 * Ex: 3 971 500 → "trois millions neuf cent soixante et onze mille cinq cents (3 971 500) Franc CFA HTVA"
 */
export function montantArreteHTVA(montant) {
  const n = Math.round(Number(montant) || 0);
  if (n === 0) return 'zéro (0) Franc CFA HTVA';
  const s = nombresEnLettres(n);
  const chiffres = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return s ? `${s} (${chiffres}) Franc CFA HTVA` : `(${chiffres}) Franc CFA HTVA`;
}

/**
 * Montant arrêté avec libellé personnalisé (HTVA ou TTC selon le choix TVA).
 * @param {number} montant
 * @param {string} suffixe - ex: "F CFA HTVA", "F CFA TTC", "Franc CFA HTVA", "Franc CFA TTC"
 */
export function montantArreteLibelle(montant, suffixe = 'F CFA') {
  const n = Math.round(Number(montant) || 0);
  if (n === 0) return `zéro (0) ${suffixe}`;
  const s = nombresEnLettres(n);
  const chiffres = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return s ? `${s} (${chiffres}) ${suffixe}` : `(${chiffres}) ${suffixe}`;
}

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
const DIZAINES_IRR = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];

function centaines(n) {
  if (n === 0) return '';
  if (n === 1) return 'cent';
  return UNITES[n] + ' cent';
}

function dizainesUnites(n) {
  if (n < 10) return UNITES[n];
  if (n < 20) return DIZAINES_IRR[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7) return 'soixante-' + (u > 0 ? DIZAINES_IRR[u] : 'dix');
  if (d === 9) return 'quatre-vingt-' + (u > 0 ? UNITES[u] : 'dix');
  if (d === 8) return 'quatre-vingt' + (u === 0 ? 's' : '-' + UNITES[u]);
  return DIZAINES[d] + (u > 0 ? '-' + UNITES[u] : '');
}

function troisChiffres(n) {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let s = '';
  if (c > 0) s = centaines(c) + (r > 0 ? ' ' : '');
  if (r > 0) s += dizainesUnites(r);
  return s;
}

function nombresEnLettres(n) {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + nombresEnLettres(-n);
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;
  const parts = [];
  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : troisChiffres(millions) + ' millions');
  }
  if (milliers > 0) {
    parts.push(milliers === 1 ? 'mille' : troisChiffres(milliers) + ' mille');
  }
  if (rest > 0) {
    parts.push(troisChiffres(rest));
  }
  return parts.join(' ').trim();
}

const NUMERO_PREFIXES = { proforma: 'PRO', definitive: 'FAC', bl: 'BL', spec_tech: 'SPEC' };

/**
 * Génère un numéro de document au format PREFIX-YYYY-XXXX
 * @param {number} sequence - Numéro séquentiel (ex: 1 → 0001)
 * @param {number} [year] - Année (défaut: année courante)
 * @param {string} [type='proforma'] - proforma | definitive | bl
 * @returns {string} Ex: "PRO-2025-0001", "FAC-2025-0001", "BL-2025-0001"
 */
export function genererNumeroFacture(sequence, year = new Date().getFullYear(), type = 'proforma') {
  const prefix = NUMERO_PREFIXES[type] || 'FAC';
  const seq = String(Math.max(1, Math.floor(sequence) || 1)).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

/**
 * Génère un UUID pour la FEC (Facture Électronique Certifiée)
 * Format standard pour identification unique côté DGI
 */
export function genererFecUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Valide le format IFU (10 chiffres)
 * @param {string} ifu
 * @returns {boolean}
 */
export function validerIFU(ifu) {
  if (!ifu || typeof ifu !== 'string') return false;
  const cleaned = ifu.replace(/\s/g, '');
  return /^\d{10}$/.test(cleaned);
}
