/**
 * 17 régions du Burkina Faso (découpage 2025) et mercuriales régionales.
 * Noms officiels avec toponymes endogènes (juillet 2025).
 * Prix de référence (Kadiogo) avec coefficients par région pour refléter les écarts (transport, disponibilité).
 */

const ANNEE_MERCURIALE = 2026;

export const REGIONS_BURKINA = [
  { id: 'centre', nom: 'Kadiogo', chefLieu: 'Ouagadougou', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_CENTRE.docx` },
  { id: 'boucle-mouhoun', nom: 'Bankui', chefLieu: 'Dédougou', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_BOUCLE_MOUHOUN.docx` },
  { id: 'cascades', nom: 'Tannounyan', chefLieu: 'Banfora', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_CASCADES.docx` },
  { id: 'centre-est', nom: 'Nakambé', chefLieu: 'Tenkodogo', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_CENTRE_EST.docx` },
  { id: 'centre-nord', nom: 'Kuilsé', chefLieu: 'Kaya', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_CENTRE_NORD.docx` },
  { id: 'centre-ouest', nom: 'Nando', chefLieu: 'Koudougou', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_CENTRE_OUEST.docx` },
  { id: 'centre-sud', nom: 'Nazinon', chefLieu: 'Manga', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_CENTRE_SUD.docx` },
  { id: 'est', nom: 'Goulmou', chefLieu: 'Fada N\'Gourma', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_EST.docx` },
  { id: 'hauts-bassins', nom: 'Guiriko', chefLieu: 'Bobo-Dioulasso', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_HAUTS_BASSINS.docx` },
  { id: 'nord', nom: 'Yaadga', chefLieu: 'Ouahigouya', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_NORD.docx` },
  { id: 'plateau-central', nom: 'Oubri', chefLieu: 'Ziniaré', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_PLATEAU_CENTRAL.docx` },
  { id: 'sahel', nom: 'Liptako', chefLieu: 'Dori', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_SAHEL.docx` },
  { id: 'sud-ouest', nom: 'Djôrô', chefLieu: 'Gaoua', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_SUD_OUEST.docx` },
  { id: 'ouagadougou', nom: 'Ouagadougou (Ville)', chefLieu: 'Ouagadougou', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_OUAGADOUGOU.docx` },
  { id: 'sirba', nom: 'Sirba', chefLieu: 'Bogandé', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_BOGANDE.docx` },
  { id: 'soum', nom: 'Soum', chefLieu: 'Djibo', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_DJIBO.docx` },
  { id: 'tapoa', nom: 'Tapoa', chefLieu: 'Diapaga', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_DIAPAGA.docx` },
  { id: 'sourou', nom: 'Sourou', chefLieu: 'Tougan', docxExemple: `Mercuriale_${ANNEE_MERCURIALE}_TOUGAN.docx` },
];

// Modèle mercuriale : Code hiérarchique, Désignation/Caractéristiques, Conditionnement, Prix HTVA (Minimum, Moyen, Maximum)
// type: 'category' = ligne de catégorie (sans conditionnement ni prix), 'article' = article avec prix
// Aucune donnée par défaut : importer via CSV ou Word.
const LIGNES_REF = [];

// Coefficient multiplicateur par région (1 = référence Kadiogo). Reflète écarts régionaux.
const COEF_REGIONS = {
  centre: 1,
  ouagadougou: 0.98,
  'boucle-mouhoun': 1.08,
  cascades: 1.06,
  'centre-est': 1.05,
  'centre-nord': 1.07,
  'centre-ouest': 1.04,
  'centre-sud': 1.03,
  est: 1.12,
  'hauts-bassins': 1.02,
  nord: 1.10,
  'plateau-central': 1.05,
  sahel: 1.15,
  'sud-ouest': 1.08,
  sirba: 1.12,
  soum: 1.14,
  tapoa: 1.13,
  sourou: 1.07,
};

/**
 * Retourne la mercuriale pour une région donnée.
 * Modèle : Code, Désignation/Caractéristiques, Conditionnement, Prix HTVA (Minimum, Moyen, Maximum).
 * Lignes type 'category' : pas de conditionnement ni prix. Lignes type 'article' : conditionnement + prix_min, prix_moyen, prix_max.
 */
export function getMercurialeForRegion(regionId) {
  const coef = COEF_REGIONS[regionId] ?? 1;
  return LIGNES_REF.map((ligne, index) => {
    const base = {
      id: `${regionId}-${ligne.code}-${index}`,
      code: ligne.code,
      designation: ligne.designation,
      type: ligne.type || 'article',
      categorie: ligne.categorie || 'Divers',
      regionId,
    };
    if (base.type === 'category') return base;
    const conditionnement = ligne.conditionnement || ligne.unite || 'Unité';
    const prix_min = ligne.prix_min != null ? Math.round(ligne.prix_min * coef) : (ligne.prix_ref != null ? Math.round(ligne.prix_ref * 0.95 * coef) : 0);
    const prix_moyen = ligne.prix_moyen != null ? Math.round(ligne.prix_moyen * coef) : (ligne.prix_ref != null ? Math.round(ligne.prix_ref * coef) : 0);
    const prix_max = ligne.prix_max != null ? Math.round(ligne.prix_max * coef) : (ligne.prix_ref != null ? Math.round(ligne.prix_ref * 1.05 * coef) : 0);
    return { ...base, conditionnement, prix_min, prix_moyen, prix_max, prix_ref: prix_moyen };
  });
}

/**
 * Toutes les mercuriales par région (pour affichage ou export).
 */
export function getAllMercuriales() {
  return REGIONS_BURKINA.reduce((acc, region) => {
    acc[region.id] = getMercurialeForRegion(region.id);
    return acc;
  }, {});
}
