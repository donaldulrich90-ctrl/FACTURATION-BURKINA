import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/client';
import { getMercurialeForRegion } from '../data/mercurialeRegions';
import { normalizeToOuagadougouFormat } from '../utils/normalizeMercurialeOuagadougou';
import { storePdf as storePdfIndexedDB, getPdfBlob, removePdf as removePdfIndexedDB } from '../utils/pdfStorage';
import { extractAndParseDocx } from '../utils/docxExtract';

const STORAGE_KEY = 'platform_mercuriales';
const PDF_SCOPE = 'global';

function loadFromStorage() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      console.warn('Mercuriale: espace de stockage insuffisant.');
    }
  }
}

const MercurialeContext = createContext(null);

export function MercurialeProvider({ children }) {
  const { apiMode } = useAuth();
  const [byRegion, setByRegion] = useState(loadFromStorage);
  const [apiCache, setApiCache] = useState({});

  const loadRegionFromApi = useCallback(async (regionId) => {
    try {
      const lines = await api.getMercuriale(regionId);
      setApiCache((prev) => ({ ...prev, [regionId]: lines }));
      return lines;
    } catch (e) {
      setApiCache((prev) => ({ ...prev, [regionId]: [] }));
      return [];
    }
  }, []);

  const refreshFromStorage = useCallback(() => {
    if (apiMode) {
      setApiCache({});
    } else {
      setByRegion(loadFromStorage());
    }
  }, [apiMode]);

  useEffect(() => {
    if (!apiMode) saveToStorage(byRegion);
  }, [apiMode, byRegion]);

  useEffect(() => {
    if (!apiMode) {
      const onStorage = (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            setByRegion(JSON.parse(e.newValue));
          } catch (_) {}
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
  }, [apiMode]);

  const getMercuriale = useCallback(
    (regionId) => {
      let lines = [];
      try {
        if (apiMode) {
          const cached = apiCache[regionId];
          if (cached && Array.isArray(cached)) {
            lines = cached.map((a) => ({ ...a, unite: a.conditionnement ?? a.unite, prix_ref: a.prix_moyen ?? a.prix_ref }));
          } else {
            lines = getMercurialeForRegion(regionId);
          }
        } else {
          const stored = byRegion[regionId];
          lines = stored?.lines && Array.isArray(stored.lines) ? stored.lines : getMercurialeForRegion(regionId);
        }
        return normalizeToOuagadougouFormat(lines);
      } catch (_) {
        return [];
      }
    },
    [apiMode, apiCache, byRegion]
  );

  const hasCachedRegion = useCallback(
    (regionId) => apiMode && apiCache[regionId] != null && Array.isArray(apiCache[regionId]),
    [apiMode, apiCache]
  );

  const getPdf = (regionId) => {
    if (apiMode) return null;
    const stored = byRegion[regionId];
    if (stored?.pdfStorage === 'indexeddb') {
      const fileName = stored.pdfFileName || `mercuriale-${regionId}.pdf`;
      return {
        fileName,
        getBlob: async () => {
          let r = await getPdfBlob(PDF_SCOPE, regionId);
          if (!r) r = await getPdfBlob('template', regionId);
          return r?.blob || null;
        },
      };
    }
    if (stored?.pdfBase64) {
      return { base64: stored.pdfBase64, fileName: stored.pdfFileName || `mercuriale-${regionId}.pdf` };
    }
    return null;
  };

  const setMercurialeLines = (regionId, lines) => {
    if (apiMode) return;
    setByRegion((prev) => ({
      ...prev,
      [regionId]: {
        ...prev[regionId],
        lines: lines.map((l, i) => ({ ...l, id: l.id || `${regionId}-${l.code}-${i}`, regionId })),
      },
    }));
  };

  const appendMercurialeLines = async (regionId, newLines) => {
    if (apiMode) {
      const result = await api.importMercuriale(regionId, newLines);
      await loadRegionFromApi(regionId);
      return result.added ?? 0;
    }
    const currentLines = getMercuriale(regionId);
    const existingCodes = new Set(currentLines.map((l) => String(l.code).trim()));
    const toAdd = newLines
      .filter((l) => l.code && !existingCodes.has(String(l.code).trim()))
      .map((l, i) => ({
        ...l,
        id: l.id || `${regionId}-import-${Date.now()}-${i}`,
        regionId,
        prix_ref: l.prix_moyen ?? l.prix_ref,
      }));
    if (toAdd.length === 0) return 0;
    setMercurialeLines(regionId, [...currentLines, ...toAdd]);
    return toAdd.length;
  };

  const clearMercurialeLines = async (regionId) => {
    if (apiMode) {
      await api.replaceMercuriale(regionId, []);
      await loadRegionFromApi(regionId);
      return 0;
    }
    setMercurialeLines(regionId, []);
    return 0;
  };

  const replaceMercurialeLines = async (regionId, newLines) => {
    if (apiMode) {
      const r = await api.replaceMercuriale(regionId, newLines);
      await loadRegionFromApi(regionId);
      return r.replaced ?? newLines.length;
    }
    const normalized = newLines.map((l, i) => ({
      ...l,
      id: l.id || `${regionId}-${l.code}-${i}`,
      regionId,
      prix_ref: l.prix_moyen ?? l.prix_ref,
    }));
    setMercurialeLines(regionId, normalized);
    return normalized.length;
  };

  const mergeMercurialeLines = async (regionId, newLines) => {
    if (apiMode) {
      const r = await api.importMercuriale(regionId, newLines);
      await loadRegionFromApi(regionId);
      return { added: r.added ?? 0, updated: r.updated ?? 0 };
    }
    const currentLines = getMercuriale(regionId);
    const byCode = new Map(currentLines.map((l) => [String(l.code).trim(), { ...l }]));
    let added = 0, updated = 0;
    for (const l of newLines) {
      if (!l.code) continue;
      const code = String(l.code).trim();
      const line = { ...l, id: l.id || `${regionId}-${code}-${Date.now()}`, regionId, prix_ref: l.prix_moyen ?? l.prix_ref };
      if (byCode.has(code)) {
        byCode.set(code, line);
        updated++;
      } else {
        byCode.set(code, line);
        added++;
      }
    }
    setMercurialeLines(regionId, Array.from(byCode.values()));
    return { added, updated };
  };

  const countDuplicateCodes = (regionId, newLines) => {
    const existing = new Set(getMercuriale(regionId).map((l) => String(l.code).trim()));
    return newLines.filter((l) => l.code && existing.has(String(l.code).trim())).length;
  };

  const setMercurialeDocx = (regionId, data, fileName) => {
    if (apiMode) return Promise.resolve();
    const name = fileName || `mercuriale-${regionId}.docx`;
    if (data instanceof Blob) {
      return storePdfIndexedDB(PDF_SCOPE, regionId, data, name).then(() => {
        setByRegion((prev) => ({
          ...prev,
          [regionId]: { ...(prev[regionId] || { lines: [] }), pdfFileName: name, pdfStorage: 'indexeddb' },
        }));
      });
    }
    setByRegion((prev) => ({
      ...prev,
      [regionId]: { ...(prev[regionId] || { lines: [] }), pdfBase64: data, pdfFileName: name },
    }));
    return Promise.resolve();
  };

  const removeMercurialeDocx = (regionId) => {
    if (apiMode) return;
    const stored = byRegion[regionId];
    if (stored?.pdfStorage === 'indexeddb') removePdfIndexedDB(PDF_SCOPE, regionId).catch(() => {});
    setByRegion((prev) => {
      const next = { ...prev };
      if (next[regionId]) {
        const { pdfBase64, pdfFileName, pdfStorage, ...rest } = next[regionId];
        next[regionId] = Object.keys(rest).length ? rest : undefined;
      }
      return next;
    });
  };

  const initRegionWithDefault = (regionId) => {
    if (apiMode) return;
    const lines = getMercurialeForRegion(regionId);
    setMercurialeLines(regionId, lines);
  };

  const copyFromTemplate = async () => {
    if (!apiMode) return false;
    try {
      await api.copyMercurialeFromTemplate();
      setApiCache({});
      return true;
    } catch (e) {
      return false;
    }
  };

  const extractDocxToLines = async (regionId) => {
    if (apiMode) return { lines: [], errors: ['Word en base locale uniquement.'] };
    const stored = byRegion[regionId];
    let blob = null;
    if (stored?.pdfStorage === 'indexeddb') {
      const r = await getPdfBlob(PDF_SCOPE, regionId).catch(() => null);
      blob = r?.blob ?? null;
    } else if (stored?.pdfBase64) {
      try {
        const binary = atob(stored.pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      } catch {
        return { lines: [], errors: ['Données Word corrompues.'] };
      }
    }
    if (!blob || blob.size === 0) return { lines: [], errors: ['Aucun fichier Word pour cette région.'] };
    return extractAndParseDocx(blob);
  };

  const value = {
    getMercuriale,
    hasCachedRegion,
    getPdf,
    setMercurialeLines,
    clearMercurialeLines,
    appendMercurialeLines,
    replaceMercurialeLines,
    mergeMercurialeLines,
    countDuplicateCodes,
    setMercurialeDocx,
    removeMercurialeDocx,
    extractDocxToLines,
    initRegionWithDefault,
    refreshFromStorage,
    copyFromTemplate,
    loadRegionFromApi,
    apiMode,
    byRegion,
  };

  return <MercurialeContext.Provider value={value}>{children}</MercurialeContext.Provider>;
}

export function useMercuriale() {
  const ctx = useContext(MercurialeContext);
  if (!ctx) throw new Error('useMercuriale must be used within MercurialeProvider');
  return ctx;
}
