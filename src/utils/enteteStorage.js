/**
 * Stockage de l'entête entreprise (logo, signature, cachet) dans IndexedDB.
 * IndexedDB permet plusieurs centaines de Mo, contrairement à localStorage (~5 Mo).
 */

const DB_NAME = 'fasomarches_entete';
const DB_VERSION = 1;
const STORE = 'entetes';
const LEGACY_KEY = 'platform_company_entete';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'companyId' });
      }
    };
  });
}

/** Migre les données depuis localStorage vers IndexedDB (rétrocompatibilité) */
async function migrateFromLocalStorage(companyId) {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const entetes = JSON.parse(raw);
    const data = entetes[companyId];
    if (!data) return null;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put({ companyId, data });
    });
    db.close();
    delete entetes[companyId];
    if (Object.keys(entetes).length === 0) {
      localStorage.removeItem(LEGACY_KEY);
    } else {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(entetes));
    }
    return data;
  } catch {
    return null;
  }
}

export async function getEntete(companyId) {
  try {
    const db = await openDb();
    const data = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(companyId);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => reject(tx.error);
    });
    db.close();
    if (data) return data;
    const migrated = await migrateFromLocalStorage(companyId);
    if (migrated) return migrated;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    const entetes = JSON.parse(raw);
    return entetes[companyId] || {};
  } catch {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return {};
      const entetes = JSON.parse(raw);
      return entetes[companyId] || {};
    } catch {
      return {};
    }
  }
}

export async function setEntete(companyId, data) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put({ companyId, data });
    });
    db.close();
    return true;
  } catch (err) {
    throw err;
  }
}
