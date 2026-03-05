/**
 * Schéma de données - Facture DGI Burkina Faso / UEMOA
 * Conforme à la Direction Générale des Impôts (DGI) et Facture Électronique Certifiée (FEC)
 *
 * @module factureSchema
 */

/**
 * Émetteur de la facture (société vendeuse)
 * @typedef {Object} Emetteur
 * @property {string} name - Nom de l'entreprise
 * @property {string} ifu - Identifiant Fiscal Unique (10 chiffres)
 * @property {string} [rccm] - Registre de Commerce
 * @property {string} [regimeFiscal] - Régime fiscal (RS, RSI, etc.)
 * @property {string} [address] - Adresse postale
 * @property {string} [contact] - Téléphone ou email
 * @property {string} [logoUrl] - URL du logo
 */

/**
 * Client / Institution acheteuse (marchés publics)
 * @typedef {Object} Client
 * @property {string} name - Nom de l'Institution / Ministère
 * @property {string} [direction] - Direction (DAF, PRM, etc.)
 * @property {string} [address] - Adresse
 * @property {string} [ifu] - IFU du client
 * @property {string} [rccm] - RCCM du client
 */

/**
 * Références marché public (optionnel)
 * @typedef {Object} MarcheRef
 * @property {string} [numero] - N° du Marché / Contrat
 * @property {string} [objet] - Objet du marché
 * @property {string} [bonCommande] - N° Bon de Commande
 */

/**
 * Ligne de facture
 * @typedef {Object} FactureItem
 * @property {string} designation - Désignation de l'article
 * @property {number} quantity - Quantité
 * @property {string} [unite] - Unité (U, Lot, Forfait)
 * @property {number} priceUnit - Prix unitaire HT
 * @property {number} [price] - Alias de priceUnit
 * @property {string} [id] - Identifiant unique
 */

/**
 * Totaux calculés conformes DGI
 * - TVA 18% s'ajoute au HT → TTC
 * - AIRSI (précompte 0/2/5%) déduit du TTC → Net à payer
 * @typedef {Object} TotauxFacture
 * @property {number} totalHT - Total hors taxes
 * @property {number} tva - Montant TVA (18%)
 * @property {number} totalTTC - Montant TTC
 * @property {number} airsi - Montant AIRSI/précompte
 * @property {number} airsiTaux - Taux AIRSI appliqué (0, 2 ou 5)
 * @property {number} netAPayer - Net à payer (TTC - AIRSI)
 */

/**
 * Données FEC (Facture Électronique Certifiée)
 * @typedef {Object} FECData
 * @property {string} [uuid] - Identifiant unique pour certification DGI
 * @property {string} [qrData] - Données encodées du QR Code
 * @property {string} [hash] - Empreinte de vérification
 */

/**
 * Facture complète pour prévisualisation et export
 * @typedef {Object} FactureData
 * @property {string} numero - Numéro (format FAC-YYYY-XXXX)
 * @property {Date|string} dateFacture - Date d'émission
 * @property {Emetteur} emetteur
 * @property {Client} client
 * @property {MarcheRef} [marche]
 * @property {FactureItem[]} items
 * @property {number} [airsiTaux] - 0, 2 ou 5
 * @property {TotauxFacture} [totaux]
 * @property {FECData} [fec]
 */

export const UNITE_OPTIONS = ['U', 'Lot', 'Forfait'];
export const AIRSI_TAUX_VALIDES = [0, 2, 5];
export const TVA_RATE_DGI = 18; // %
export const IFU_LENGTH = 10;
