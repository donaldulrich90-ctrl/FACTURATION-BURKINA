/**
 * Structure hiérarchique de la mercuriale : grands groupes (FOURNITURES, MATÉRIEL, PRESTATIONS…)
 * et sous-catégories basées sur les codes (01.1, 01.2…).
 *
 * Format de sortie :
 * [
 *   {
 *     groupe: "FOURNITURES",
 *     sousGroupes: [
 *       { sousGroupe: "01.1", articles: [...] },
 *       { sousGroupe: "01.2", articles: [...] },
 *     ]
 *   },
 *   ...
 * ]
 */

// Code valide Mercuriale BF : commence par 2 chiffres et un point (ex: 03.1.1.1.1.0.001)
const VALID_CODE_REGEX = /^\d{2}\.\d/;

// Préfixes de code → groupe (classification CPF Burkina)
const CODE_TO_GROUPE = {
  '01': 'Bâtiment et travaux',
  '02': 'Équipements et matériel',
  '03': 'Fournitures',
  '04': 'Services',
  '05': 'Transport',
  '06': 'Communication',
  '07': 'Divers',
};

function getCodePrefix(code) {
  if (!code || typeof code !== 'string') return 'Divers';
  const parts = code.trim().split(/[.\s]/).filter(Boolean);
  if (parts.length === 0) return 'Divers';
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[1]}`;
}

/**
 * Transforme les lignes plates de mercuriale en structure par groupe.
 * - groupe : nom de la catégorie principale (ex: FOURNITURES, MATÉRIEL, PRESTATIONS)
 * - articles : tableau d’objets { code, designation, unite, prix_min, prix_moyen, prix_max }
 * Les articles sont regroupés sous leur catégorie (champ categorie) et triés par code.
 *
 * @param {Array<{ type: string, code: string, designation: string, conditionnement?: string, unite?: string, categorie?: string, prix_min?: number, prix_moyen?: number, prix_max?: number }>} lines
 * @returns {Array<{ groupe: string, articles: Array<{ code: string, designation: string, unite: string, prix_min: number|null, prix_moyen: number|null, prix_max: number|null }> }>}
 */
export function buildMercurialeByGroup(lines) {
  if (!Array.isArray(lines)) return [];

  const groupMap = new Map(); // groupe → Map(sousGroupe → articles[])
  const groupOrder = []; // ordre d’apparition des groupes

  for (const item of lines) {
    if (!item || typeof item !== 'object') continue;
    if (item.type !== 'article') continue;
    const codeStr = (item.code ?? '').toString().trim();
    if (!VALID_CODE_REGEX.test(codeStr)) continue; // Exclure lignes mal extraites (code = nom produit)

    let groupe = (item.categorie && String(item.categorie).trim()) || '';
    if (!groupe || groupe === 'Divers') {
      const prefix = (item.code || '').split('.')[0];
      groupe = CODE_TO_GROUPE[prefix] || groupe || 'Divers';
    }
    const sousGroupe = getCodePrefix(item.code);
    const cond = (item.conditionnement || item.unite || 'Unité').toString().trim();
    const article = {
      code: (item.code ?? '').toString().trim(),
      designation: (item.designation ?? '').toString().trim(),
      unite: cond || 'Unité',
      prix_min: item.prix_min != null ? Number(item.prix_min) : null,
      prix_moyen: item.prix_moyen != null ? Number(item.prix_moyen) : (item.prix_ref != null ? Number(item.prix_ref) : null),
      prix_max: item.prix_max != null ? Number(item.prix_max) : null,
    };

    if (!groupMap.has(groupe)) {
      groupOrder.push(groupe);
      groupMap.set(groupe, new Map());
    }
    const sousMap = groupMap.get(groupe);
    if (!sousMap.has(sousGroupe)) {
      sousMap.set(sousGroupe, []);
    }
    sousMap.get(sousGroupe).push(article);
  }

  for (const [, sousMap] of groupMap) {
    for (const [, articles] of sousMap) {
      articles.sort((a, b) => {
        const av = String(a.code);
        const bv = String(b.code);
        return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
  }

  return groupOrder.map((groupe) => ({
    groupe,
    sousGroupes: Array.from(groupMap.get(groupe) || [], ([sousGroupe, articles]) => ({
      sousGroupe,
      articles,
    })).sort((a, b) => a.sousGroupe.localeCompare(b.sousGroupe, undefined, { numeric: true, sensitivity: 'base' })),
  }));
}

/**
 * Filtre la structure par groupe en conservant l’affichage par groupe.
 * Recherche par nom (désignation) ou par code ; seuls les groupes contenant au moins un article
 * correspondant sont conservés, avec uniquement les articles correspondants.
 *
 * @param {Array<{ groupe: string, articles: Array<{ code: string, designation: string, [key: string]: any }> }>} grouped
 * @param {string} searchTerm
 * @returns {Array<{ groupe: string, articles: Array }>}
 */
export function filterMercurialeBySearch(grouped, searchTerm) {
  if (!Array.isArray(grouped)) return [];
  const term = (searchTerm || '').trim().toLowerCase();
  if (term === '') return grouped;

  return grouped
    .map((section) => {
      const sousGroupes = (section.sousGroupes || [])
        .map((sg) => ({
          ...sg,
          articles: sg.articles.filter(
            (a) =>
              (a.designation && a.designation.toLowerCase().includes(term)) ||
              (a.code && a.code.toLowerCase().includes(term))
          ),
        }))
        .filter((sg) => sg && Array.isArray(sg.articles) && sg.articles.length > 0);
      return { ...section, sousGroupes: sousGroupes || [] };
    })
    .filter((section) => section && Array.isArray(section.sousGroupes) && section.sousGroupes.length > 0);
}
