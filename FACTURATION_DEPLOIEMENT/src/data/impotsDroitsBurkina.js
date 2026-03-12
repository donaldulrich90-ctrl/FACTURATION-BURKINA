/**
 * Référentiel impôts, droits et paramètres fiscaux / sociaux — Burkina Faso
 * Sources : DGI (dgi.bf), CNSS (cnssbf.org), Code du travail (Loi 2008-28), Budget État
 */

// ——— TVA ———
export const TVA_BURKINA = {
  taux: 18,
  libelle: 'TVA (Taxe sur la Valeur Ajoutée)',
  base: 'Base hors taxes',
  applicabilite: 'Personnes physiques ou morales : ventes, importations, travaux immobiliers, prestations de services.',
  exoneration: 'Exportations, agriculture, pêche, certaines activités sociales (liste DGI).',
  declaration: 'Déclaration périodique (mensuelle ou trimestrielle selon régime). Paiement via eSintax.',
  lien: 'https://dgi.bf/',
};

// ——— IUTS (Impôt Unique sur les Traitements et Salaires) ———
export const IUTS_BURKINA = {
  libelle: 'IUTS — Impôt Unique sur les Traitements et Salaires',
  description: 'Impôt sur les revenus salariaux (remplace l\'IR pour les salaires).',
  reference: 'Code Général des Impôts (CGI), Livre 1 - Impôts directs.',
  barème: [
    { tranche: '0 - 25 000 F/mois', taux: 0, cumul: 0 },
    { tranche: '25 001 - 100 000 F', taux: 12.1, cumul: 9075 },
    { tranche: '100 001 - 200 000 F', taux: 13.9, cumul: 22805 },
    { tranche: '200 001 - 400 000 F', taux: 15.7, cumul: 54225 },
    { tranche: '400 001 - 600 000 F', taux: 18.4, cumul: 91065 },
    { tranche: '600 001 - 1 000 000 F', taux: 21.1, cumul: 147905 },
    { tranche: '1 000 001 - 1 500 000 F', taux: 23.8, cumul: 242905 },
    { tranche: '1 500 001 - 2 500 000 F', taux: 26.5, cumul: 368905 },
    { tranche: '2 500 001 - 4 000 000 F', taux: 29.2, cumul: 548905 },
    { tranche: 'Au-delà de 4 000 000 F', taux: 31.9, cumul: 986905 },
  ],
  abattement: 'Abattement forfaitaire possible (voir CGI).',
  lien: 'https://dgi.bf/',
};

// ——— Retenue à la source (RTS) ———
export const RTS_BURKINA = {
  libelle: 'Retenue à la source (RTS)',
  tauxGeneral: 5,
  tauxTravauxPublics: 1,
  condition: 'Bénéficiaire immatriculé à l\'IFU : 5 %. Travaux immobiliers et travaux publics : 1 %.',
  lien: 'https://dgi.bf/',
};

// ——— CNSS ———
export const CNSS_BURKINA = {
  libelle: 'CNSS — Caisse Nationale de Sécurité Sociale',
  branches: [
    { nom: 'Accidents du travail / Maladies professionnelles', employeur: '3 %', salarie: '0 %' },
    { nom: 'Prestations familiales', employeur: '6 %', salarie: '0 %' },
    { nom: 'Retraite', employeur: '4.5 %', salarie: '4.5 %' },
    { nom: 'Assurance maladie', employeur: '2.5 %', salarie: '2.5 %' },
  ],
  plafond: 'Salaire plafonné pour le calcul des cotisations (voir cnssbf.org).',
  declaration: 'DRS (Déclaration des Rémunérations et Salaires) à déposer selon calendrier CNSS.',
  lien: 'https://cnssbf.org/',
  eservices: 'https://eservices.cnss.bf/',
};

// ——— SMIG / Droit du travail ———
export const DROIT_TRAVAIL_BURKINA = {
  code: 'Loi n° 2008-28 du 13 mai 2008 — Code du travail',
  smig: {
    secteurGeneral: 45000,
    unite: 'F CFA / mois',
    horaire: 259.62,
    uniteHoraire: 'F CFA / heure',
    agricole: 1917.52,
    uniteAgricole: 'F CFA / jour (8 h)',
  },
  conges: {
    annuels: '2,5 jours ouvrables par mois de travail (30 jours/an environ).',
    maladie: 'Règles et justificatifs selon Code du travail.',
    maternite: '14 semaines (Code du travail).',
  },
  dureeTravail: '40 h / semaine (secteur général). Heures sup selon textes.',
  contrat: 'CDI, CDD (durée max et renouvellements selon Code du travail), stage, apprentissage.',
  lien: 'https://servicepublic.gov.bf/',
};

// ——— Autres impôts et taxes ———
export const AUTRES_IMPOTS_BURKINA = [
  { nom: 'Impôt sur les sociétés (IS)', description: 'Bénéfices des sociétés. Taux et régimes selon activité.', lien: 'https://dgi.bf/' },
  { nom: 'Impôt sur les bénéfices industriels et commerciaux (BIC)', description: 'Bénéfices des entreprises individuelles et assimilés.', lien: 'https://dgi.bf/' },
  { nom: 'Taxe sur les activités financières (TAF)', description: 'Activités bancaires et assurances.', lien: 'https://dgi.bf/' },
  { nom: 'Droits d\'enregistrement', description: 'Actes, mutations, sociétés.', lien: 'https://dgi.bf/' },
  { nom: 'Timbre fiscal', description: 'Quittances, contrats, actes.', lien: 'https://dgi.bf/' },
];

// ——— Plan comptable SYSCOHADA (classes principales) ———
export const PLAN_COMPTABLE_SYSCOHADA = [
  { classe: 1, libelle: 'Comptes de capitaux' },
  { classe: 2, libelle: 'Comptes d\'immobilisations' },
  { classe: 3, libelle: 'Comptes de stocks et en-cours' },
  { classe: 4, libelle: 'Comptes de tiers' },
  { classe: 5, libelle: 'Comptes financiers' },
  { classe: 6, libelle: 'Comptes de charges' },
  { classe: 7, libelle: 'Comptes de produits' },
  { classe: 8, libelle: 'Comptes de résultat' },
];

// Liens officiels
export const LIENS_OFFICIELS = {
  dgi: 'https://dgi.bf/',
  esintax: 'https://esintax.bf/',
  cnss: 'https://cnssbf.org/',
  servicePublic: 'https://servicepublic.gov.bf/',
  rccm: 'https://fichiernationalrccm.bf/',
};
