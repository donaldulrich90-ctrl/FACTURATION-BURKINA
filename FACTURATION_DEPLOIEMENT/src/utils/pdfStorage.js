/**
 * Stockage des PDF mercuriale dans IndexedDB (supporte des fichiers lourds).
 * Mercuriale commune : une seule base partagée par tous (clé : global|regionId).
 * Garantit que les Blobs récupérés sont valides pour la lecture (type, taille).
 */

const DB_NAME = 'FasoMarchesMercuriale';
const DB_VERSION = 2;
const STORE_NAME = 'pdfByCompany';

function pk(companyId, regionId) {
  return `${companyId}|${regionId}`;
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponible dans ce navigateur.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (e.oldVersion < 2) {
        if (db.objectStoreNames.contains('pdfs')) {
          const tx = e.target.transaction;
          const oldStore = tx.objectStore('pdfs');
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
          const newStore = tx.objectStore(STORE_NAME);
          const cursorReq = oldStore.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              const { regionId, blob, fileName } = cursor.value;
              newStore.put({ id: pk('template', regionId), blob, fileName, regionId });
              cursor.continue();
            } else {
              db.deleteObjectStore('pdfs');
            }
          };
        } else if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      } else if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * S'assure que la valeur est un Blob utilisable pour PDF.js.
 * @param {unknown} value
 * @returns {Blob|null}
 */
function ensurePdfBlob(value) {
  if (!value) return null;
  if (value instanceof Blob) {
    if (value.size === 0) return null;
    return value.type && value.type.toLowerCase().includes('pdf')
      ? value
      : new Blob([value], { type: 'application/pdf' });
  }
  if (value instanceof ArrayBuffer) {
    return new Blob([value], { type: 'application/pdf' });
  }
  return null;
}

/**
 * Enregistre un PDF (Blob/File) pour une entreprise et une région.
 * @param {string} companyId - ID entreprise ou 'template' pour la mercuriale de référence
 * @param {string} regionId
 * @param {Blob|File} blob
 * @param {string} fileName
 * @returns {Promise<void>}
 */
export function storePdf(companyId, regionId, blob, fileName) {
  const b = ensurePdfBlob(blob);
  if (!b) return Promise.reject(new Error('Données PDF invalides (vide ou non reconnues).'));
  const scope = companyId || 'template';
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        id: pk(scope, regionId),
        companyId: scope,
        regionId,
        blob: b,
        fileName: fileName || `mercuriale-${regionId}.pdf`,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

/**
 * Récupère le Blob et le nom du fichier pour une entreprise et une région.
 * @param {string} companyId - ID entreprise ou 'template'
 * @param {string} regionId
 * @returns {Promise<{ blob: Blob, fileName: string } | null>}
 */
export function getPdfBlob(companyId, regionId) {
  const scope = companyId || 'template';
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(pk(scope, regionId));
      req.onsuccess = () => {
        const row = req.result;
        if (!row) {
          resolve(null);
          return;
        }
        const blob = ensurePdfBlob(row.blob);
        if (!blob) {
          resolve(null);
          return;
        }
        resolve({
          blob,
          fileName: row.fileName || `mercuriale-${regionId}.pdf`,
        });
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Supprime le PDF d'une entreprise et d'une région.
 * @param {string} companyId - ID entreprise ou 'template'
 * @param {string} regionId
 * @returns {Promise<void>}
 */
export function removePdf(companyId, regionId) {
  const scope = companyId || 'template';
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(pk(scope, regionId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}
