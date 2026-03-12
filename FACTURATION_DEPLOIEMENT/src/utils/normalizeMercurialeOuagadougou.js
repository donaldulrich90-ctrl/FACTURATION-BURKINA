/**
 * Format de référence : Mercuriale Ouagadougou.
 * Toutes les mercuriales régionales sont normalisées pour reproduire ce format.
 *
 * Structure attendue par article :
 * - code : string (ex: 07.1.1.1.1.0.052)
 * - designation : string (description produit, peut être longue)
 * - conditionnement : string COURT (Unité, Paquet de 10, m², ml, etc.)
 * - prix_min, prix_moyen, prix_max : nombres
 */

/** Conditionnements courts reconnus (format Ouagadougou) */
const CONDITIONNEMENTS_COURTS = [
  'unité', 'unités', 'paquet de 10', 'paquet de 5', 'paquet de 100', 'paquet',
  'sac', 'sacs', 'carton', 'cartons', 'boîte', 'boîtes', 'bidon', 'bidons',
  'ramette', 'ramettes', 'botte', 'bottes', 'ml', 'm²', 'm³', 'kg', 'g', 'L',
  'format', 'lot', 'lots', 'forfait', 'jour', 'mois', 'année',
];

/** Extrait un conditionnement court d'un texte long (ex: "Agenda petit format avec..." → "format") */
function extraireConditionnementCourt(texte) {
  if (!texte || typeof texte !== 'string') return 'Unité';
  const t = texte.trim();
  if (t.length <= 30) return t || 'Unité';
  // Chercher le dernier conditionnement connu dans le texte
  for (const cond of CONDITIONNEMENTS_COURTS) {
    const re = new RegExp('\\b' + cond.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const m = t.match(re);
    if (m) return m[0];
  }
  // Paquet de N
  const mPaquet = t.match(/\bpaquet\s+de\s+(\d+)\b/i);
  if (mPaquet) return `Paquet de ${mPaquet[1]}`;
  return 'Unité';
}

/**
 * Normalise une ligne mercuriale pour correspondre au format Ouagadougou.
 * @param {Object} ligne - Ligne brute (API, PDF, CSV)
 * @returns {Object} Ligne normalisée
 */
function normalizeLigne(ligne) {
  if (!ligne) return ligne;
  if (ligne.type === 'category') return { ...ligne, code: (ligne.code ?? '').toString().trim(), designation: (ligne.designation ?? '').toString().trim() };

  let designation = (ligne.designation ?? '').toString().trim();
  let conditionnement = (ligne.conditionnement ?? ligne.unite ?? 'Unité').toString().trim();

  // Si le conditionnement est très long (>40 car.), c'est souvent une désignation mal parsée
  if (conditionnement.length > 40) {
    const condCourt = extraireConditionnementCourt(conditionnement);
    // Si la désignation est vide, utiliser le début du conditionnement comme désignation
    if (!designation) {
      designation = conditionnement.substring(0, 120).trim();
      if (conditionnement.length > 120) designation += '…';
    }
    conditionnement = condCourt;
  }

  // Si la désignation contient du texte de conditionnement à la fin, le retirer
  if (designation.length > 50) {
    for (const cond of CONDITIONNEMENTS_COURTS) {
      const re = new RegExp('\\s+' + cond.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
      if (re.test(designation)) {
        designation = designation.replace(re, '').trim();
        break;
      }
    }
  }

  // Conserver les prix exacts du document (pas de correction min/max/moyen)
  const prix_min = ligne.prix_min != null ? Number(ligne.prix_min) : null;
  const prix_moyen = ligne.prix_moyen != null ? Number(ligne.prix_moyen) : (ligne.prix_ref != null ? Number(ligne.prix_ref) : null);
  const prix_max = ligne.prix_max != null ? Number(ligne.prix_max) : null;

  return {
    ...ligne,
    type: ligne.type || 'article',
    code: (ligne.code ?? '').toString().trim(),
    designation: designation || (ligne.code ?? ''),
    conditionnement: conditionnement || 'Unité',
    unite: conditionnement || 'Unité',
    prix_min,
    prix_moyen,
    prix_max,
    prix_ref: prix_moyen ?? ligne.prix_ref ?? null,
  };
}

/**
 * Normalise les lignes d'une mercuriale pour reproduire le format Ouagadougou.
 * Appliqué à toutes les régions pour uniformiser l'affichage.
 *
 * @param {Array} lines - Lignes brutes de la mercuriale (toute région)
 * @returns {Array} Lignes normalisées au format Ouagadougou
 */
export function normalizeToOuagadougouFormat(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.filter(Boolean).map(normalizeLigne).filter(Boolean);
}
