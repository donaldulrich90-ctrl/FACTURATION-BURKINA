import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Bell,
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Menu,
  X,
  Printer,
  Building2,
  FileBarChart,
  FileCheck,
  Copy,
  Loader2,
  Trash2,
  Edit2,
  Settings,
  LogOut,
  Download,
  Calculator,
  BookOpen,
  ExternalLink,
  FolderSearch,
  FolderInput,
  FileSpreadsheet,
  Send,
  CheckSquare,
  Users,
  Wallet,
  Archive,
  Upload,
  Image,
  Percent,
  Moon,
  Sun,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandingBlock, { BrandingFooter } from '../components/BrandingBlock';
import { useMercuriale } from '../context/MercurialeContext';
import { api } from '../api/client';
import { REGIONS_BURKINA } from '../data/mercurialeRegions';
import {
  TVA_BURKINA,
  IUTS_BURKINA,
  RTS_BURKINA,
  CNSS_BURKINA,
  DROIT_TRAVAIL_BURKINA,
  AUTRES_IMPOTS_BURKINA,
  PLAN_COMPTABLE_SYSCOHADA,
  LIENS_OFFICIELS,
} from '../data/impotsDroitsBurkina';
import { buildMercurialeByGroup, filterMercurialeBySearch } from '../utils/mercurialeByGroup';
import { calculerTotauxFacture, genererNumeroFacture, genererFecUuid } from '../utils/factureCalcul';
import { exportFacturePdfVector, exportDaoPdf } from '../utils/exportFacturePdf';
import FacturePreview from '../components/FacturePreview';
import CompanyInfoBar from '../components/CompanyInfoBar';
import ImportFactureFromPhoto from '../components/ImportFactureFromPhoto';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { parseMercurialeCsv } from '../utils/importMercurialeCsv';
import { extractAndParseDocx } from '../utils/docxExtract';

const MOCK_FACTURES = [
  { id: 'F-2024-001', client: 'Direction Générale des Impôts', date: '2024-04-10', montant: 450000, statut: 'Payée' },
  { id: 'F-2024-002', client: 'Mairie de Bobo-Dioulasso', date: '2024-05-02', montant: 1250000, statut: 'En attente' },
  { id: 'F-2024-003', client: 'Projet Santé (PADS)', date: '2024-05-15', montant: 8900000, statut: 'Brouillon' },
];

const Dashboard = ({ onNavigateToTab }) => {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [loadingFactures, setLoadingFactures] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'info' });
  const [postingAnn, setPostingAnn] = useState(false);
  const isGérant = currentUser?.role === 'company_admin';
  const hasCompany = !!currentUser?.companyId && currentUser?.role !== 'super_admin';

  useEffect(() => {
    if (!hasCompany) return;
    setLoadingAnn(true);
    api.getAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setLoadingAnn(false));
  }, [hasCompany]);

  useEffect(() => {
    if (!isGérant || !hasCompany) return;
    setLoadingFactures(true);
    api.getFactures()
      .then(setFactures)
      .catch(() => setFactures([]))
      .finally(() => setLoadingFactures(false));
  }, [isGérant, hasCompany]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title?.trim() || !newAnnouncement.content?.trim()) return;
    setPostingAnn(true);
    try {
      const created = await api.postAnnouncement(newAnnouncement);
      setAnnouncements((prev) => [created, ...prev]);
      setNewAnnouncement({ title: '', content: '', type: 'info' });
    } catch (err) {
      const msg = err.message || 'Erreur lors de la publication';
      const hint = msg.includes('404') ? '\n\nRedémarrez le serveur (LANCER.bat) pour activer les annonces.' : '';
      alert(msg + hint);
    } finally {
      setPostingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    try {
      await api.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const alertes = announcements.filter((a) => a.type === 'alerte');
  const infos = announcements.filter((a) => a.type === 'info');

  const stats = useMemo(() => {
    const payees = factures.filter((f) => (f.statut || '').toLowerCase() === 'payée' || (f.statut || '').toLowerCase() === 'payee');
    const enAttente = factures.filter((f) => (f.statut || '').toLowerCase().includes('attente'));
    const chiffreAffaires = payees.reduce((s, f) => s + (f.totalTTC || f.netAPayer || 0), 0);
    const facturesAttente = enAttente.reduce((s, f) => s + (f.totalTTC || f.netAPayer || 0), 0);
    return { chiffreAffaires, facturesAttente, facturesRecentes: factures.slice(0, 8) };
  }, [factures]);

  const formatF = (n) => (n != null && !isNaN(n) ? `${Number(n).toLocaleString('fr-FR')} F` : '0 F');

  return (
    <div className="space-y-6">
      {/* Alertes / Journal télévisé — visible par TOUS */}
      {alertes.length > 0 && (
        <div className="rounded-faso-lg overflow-hidden border-2 border-faso-accent bg-faso-statut-attente-bg">
          <div className="px-4 py-2 bg-faso-accent text-faso-bg font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <AlertCircle size={18} />
            Journal & Alertes
          </div>
          <div className="p-4 space-y-3">
            {alertes.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-faso-text-800">{a.title}</p>
                  <p className="text-sm text-faso-text-600 mt-0.5 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-faso-text-500 mt-1">{a.createdBy?.name} • {new Date(a.createdAt).toLocaleString('fr-FR')}</p>
                </div>
                {isGérant && (
                  <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-faso-statut-rejete hover:underline text-xs shrink-0">Supprimer</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire annonce (gérant uniquement) */}
      {isGérant && hasCompany && (
        <Card className="border-l-4 border-l-faso-primary">
          <h3 className="font-bold text-faso-text-800 mb-4">Publier une annonce ou une alerte</h3>
          <form onSubmit={handlePostAnnouncement} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-faso-text-500 mb-1">Titre</label>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement((p) => ({ ...p, title: e.target.value }))}
                className="w-full border border-faso-border rounded-faso px-3 py-2 text-sm"
                placeholder="Ex: Réunion équipe demain 10h"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-faso-text-500 mb-1">Contenu</label>
              <textarea
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement((p) => ({ ...p, content: e.target.value }))}
                className="w-full border border-faso-border rounded-faso px-3 py-2 text-sm min-h-[80px]"
                placeholder="Message à transmettre à toute l'équipe..."
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  checked={newAnnouncement.type === 'info'}
                  onChange={() => setNewAnnouncement((p) => ({ ...p, type: 'info' }))}
                />
                Annonce normale
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  checked={newAnnouncement.type === 'alerte'}
                  onChange={() => setNewAnnouncement((p) => ({ ...p, type: 'alerte' }))}
                />
                Alerte / Journal (visible par tous)
              </label>
            </div>
            <button type="submit" disabled={postingAnn || !newAnnouncement.title?.trim() || !newAnnouncement.content?.trim()} className="px-4 py-2 bg-faso-primary text-white rounded-faso text-sm font-medium hover:bg-faso-primary-hover disabled:opacity-50">
              {postingAnn ? 'Publication...' : 'Publier'}
            </button>
          </form>
        </Card>
      )}

      {/* Annonces du gérant — visible par TOUS */}
      {hasCompany && (
        <Card>
          <h3 className="font-bold text-faso-text-800 mb-4">Annonces du gérant</h3>
          {loadingAnn ? (
            <p className="text-sm text-faso-text-500">Chargement...</p>
          ) : infos.length === 0 ? (
            <p className="text-sm text-faso-text-500">Aucune annonce pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {infos.map((a) => (
                <div key={a.id} className="border-b border-faso-border pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-faso-text-800">{a.title}</p>
                      <p className="text-sm text-faso-text-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                      <p className="text-xs text-faso-text-500 mt-1">{a.createdBy?.name} • {new Date(a.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    {isGérant && (
                      <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-faso-statut-rejete hover:underline text-xs shrink-0">Supprimer</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Chiffres d'affaires et factures en attente — GÉRANT UNIQUEMENT */}
      {isGérant && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-faso-primary">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-faso-statut-valide-bg rounded-faso text-faso-primary">
                <FileBarChart size={24} />
              </div>
              <div>
                <p className="text-sm text-faso-text-500 font-medium">Chiffre d'Affaires (payées)</p>
                <p className="text-2xl font-bold text-faso-text-800">{loadingFactures ? '...' : formatF(stats.chiffreAffaires)}</p>
              </div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-faso-statut-attente">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-faso-statut-attente-bg rounded-faso text-faso-statut-attente">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm text-faso-text-500 font-medium">Factures en attente</p>
                <p className="text-2xl font-bold text-faso-text-800">{loadingFactures ? '...' : formatF(stats.facturesAttente)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Statut des factures — GÉRANT UNIQUEMENT */}
      {isGérant && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-faso-text-800">Statut des Factures</h3>
            <button type="button" onClick={() => onNavigateToTab?.('facturation')} className="text-sm text-faso-primary hover:underline">Gérer</button>
          </div>
          {loadingFactures ? (
            <p className="text-sm text-faso-text-500">Chargement...</p>
          ) : stats.facturesRecentes.length === 0 ? (
            <p className="text-sm text-faso-text-500">Aucune facture.</p>
          ) : (
            <div className="space-y-4">
              {stats.facturesRecentes.map((facture) => (
                <div key={facture.id} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-faso-text-800 text-sm">{facture.client}</p>
                    <p className="text-xs text-faso-text-500 mt-0.5">{facture.dateFacture ? new Date(facture.dateFacture).toLocaleDateString('fr-FR') : '—'} • <span className="font-mono">{facture.numero}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-faso-text-900">{formatF(facture.totalTTC || facture.netAPayer)}</p>
                    <div className="mt-1 transform scale-90 origin-right">
                      <Badge status={facture.statut || 'Brouillon'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

const MercurialeView = ({ onAddToInvoice }) => {
  const [selectedRegionId, setSelectedRegionId] = useState('ouagadougou');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingMercuriale, setLoadingMercuriale] = useState(false);
  const [vueCompacte, setVueCompacte] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const { currentUser } = useAuth();
  const { getMercuriale, hasCachedRegion, getPdf, refreshFromStorage, loadRegionFromApi, copyFromTemplate, clearMercurialeLines, appendMercurialeLines, replaceMercurialeLines, mergeMercurialeLines, countDuplicateCodes, apiMode } = useMercuriale();
  const isCompany = currentUser?.companyId && currentUser?.role !== 'super_admin';
  const isCompanyAdmin = currentUser?.role === 'company_admin';
  const [importResult, setImportResult] = useState(null);
  const [importingRegion, setImportingRegion] = useState(null);
  const [previewImport, setPreviewImport] = useState(null);
  const [importMode, setImportMode] = useState('replace');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!apiMode) refreshFromStorage();
  }, [apiMode, refreshFromStorage]);

  useEffect(() => {
    if (!apiMode) return;
    const alreadyCached = hasCachedRegion(selectedRegionId);
    if (alreadyCached) return; // Évite la boucle infinie si l'API échoue (ECONNREFUSED)
    setLoadingMercuriale(true);
    loadRegionFromApi(selectedRegionId).finally(() => setLoadingMercuriale(false));
  }, [apiMode, selectedRegionId, loadRegionFromApi, hasCachedRegion]);

  const mercurialeRegion = useMemo(() => {
    try {
      const raw = getMercuriale(selectedRegionId);
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }, [getMercuriale, selectedRegionId]);
  const grouped = useMemo(() => {
    try {
      return buildMercurialeByGroup(mercurialeRegion);
    } catch (_) {
      return [];
    }
  }, [mercurialeRegion]);
  const filteredGrouped = useMemo(() => {
    if (!Array.isArray(grouped) || grouped.length === 0) return grouped || [];
    try {
      return filterMercurialeBySearch(grouped, searchTerm);
    } catch (_) {
      return [];
    }
  }, [grouped, searchTerm]);
  const formatPrix = (v) => (v != null && !isNaN(v) ? `${Number(v).toLocaleString('fr-FR')} F CFA` : '—');

  const selectedRegion = REGIONS_BURKINA.find(r => r.id === selectedRegionId);
  const pdfForRegion = getPdf(selectedRegionId);

  const handleDownloadPdf = async () => {
    if (!pdfForRegion) return;
    const fileName = pdfForRegion.fileName || `mercuriale-${selectedRegionId}.docx`;
    if (pdfForRegion.getBlob) {
      try {
        const blob = await pdfForRegion.getBlob();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } catch (_) {}
      return;
    }
    if (pdfForRegion.base64) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${pdfForRegion.base64}`;
      link.download = fileName;
      link.click();
    }
  };

  const handleImportCsv = (e) => {
    const file = e?.target?.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setImportResult({ ok: false, message: 'Le fichier doit être un CSV (.csv).' });
      return;
    }
    setImportResult(null);
    setImportingRegion(selectedRegionId);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { lines, errors } = parseMercurialeCsv(reader.result);
        if (errors.length) {
          setImportResult({ ok: false, message: errors.join(' ') });
          return;
        }
        const articles = (lines || []).filter((l) => l.type === 'article');
        if (articles.length === 0) {
          setImportResult({ ok: false, message: 'Aucun article valide dans le fichier.' });
          return;
        }
        const count = await replaceMercurialeLines(selectedRegionId, articles);
        setImportResult({ ok: true, message: `${count} article(s) importé(s) pour ${selectedRegion?.nom || selectedRegionId}.` });
        loadRegionFromApi(selectedRegionId);
      } catch (err) {
        let msg = err?.message || 'Erreur lors de l\'import.';
        if (/fetch|network|401|403|500/i.test(msg)) {
          msg += ' Vérifiez que le serveur est démarré (LANCER.bat) et que vous êtes connecté.';
        }
        setImportResult({ ok: false, message: msg });
      } finally {
        setImportingRegion(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImportDocx = (e) => {
    const file = e?.target?.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx') && !file.type?.includes('wordprocessingml')) {
      setImportResult({ ok: false, message: 'Le fichier doit être un Word (.docx).' });
      return;
    }
    setImportResult(null);
    setImportingRegion(selectedRegionId);
    extractAndParseDocx(file)
      .then((result) => {
        const { lines, errors } = result || {};
        if (errors?.length) {
          setImportResult({ ok: false, message: errors.join(' ') });
          return;
        }
        const articles = (lines || []).filter((l) => l.type === 'article');
        if (articles.length === 0) {
          setImportResult({ ok: false, message: 'Aucune ligne reconnue dans le Word. Essayez un CSV.' });
          return;
        }
        setPreviewImport({ regionId: selectedRegionId, regionName: selectedRegion?.nom || selectedRegionId, lines: articles, fileName: file.name });
      })
      .catch((err) => {
        let msg = err?.message || 'Erreur lors de la lecture du Word.';
        if (/fetch|network/i.test(msg)) {
          msg += ' Vérifiez que le serveur est démarré.';
        }
        setImportResult({ ok: false, message: msg });
      })
      .finally(() => setImportingRegion(null));
  };

  const handleConfirmImport = async () => {
    if (!previewImport) return;
    const { regionId, lines } = previewImport;
    setImportResult(null);
    setImporting(true);
    try {
      let message = '';
      if (importMode === 'replace') {
        const count = await replaceMercurialeLines(regionId, lines);
        message = `${count} article(s) importé(s).`;
      } else if (importMode === 'merge') {
        const { added, updated } = await mergeMercurialeLines(regionId, lines);
        message = `Fusion : ${added} nouveau(x), ${updated} mis à jour.`;
      } else {
        const added = await appendMercurialeLines(regionId, lines);
        const dup = countDuplicateCodes(regionId, lines);
        message = dup > 0 ? `${added} ajouté(s). ${dup} doublon(s) ignoré(s).` : `${added} article(s) ajouté(s).`;
      }
      setImportResult({ ok: true, message });
      setPreviewImport(null);
      loadRegionFromApi(selectedRegionId);
    } catch (err) {
      let msg = err?.message || 'Erreur lors de l\'import.';
      if (/fetch|network|401|403|500/i.test(msg)) {
        msg += ' Vérifiez que le serveur est démarré (LANCER.bat) et que vous êtes connecté.';
      }
      setImportResult({ ok: false, message: msg });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-faso-text-800">Mercuriale des Prix par région</h2>
            <p className="text-faso-text-500 text-sm">Choisissez une région — 17 régions du Burkina Faso (découpage 2025). Chaque entreprise dispose de sa propre base mercuriale (QSL). Le format d'affichage est uniformisé sur celui d'Ouagadougou.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(apiMode && (isCompanyAdmin || currentUser?.role === 'super_admin')) && (
              <>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover cursor-pointer disabled:opacity-50 text-sm font-medium">
                  <FileSpreadsheet size={18} />
                  {importingRegion === selectedRegionId ? 'Import...' : 'Importer CSV'}
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} disabled={!!importingRegion} />
                </label>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-faso-bg text-white rounded-lg hover:bg-faso-sidebar-end cursor-pointer disabled:opacity-50 text-sm font-medium">
                  <Upload size={18} />
                  {importingRegion === selectedRegionId ? 'Extraction...' : 'Importer Word'}
                  <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleImportDocx} disabled={!!importingRegion} />
                </label>
              </>
            )}
            {apiMode && isCompany && (
              <>
                <button
                  type="button"
                  onClick={async () => { await copyFromTemplate(); loadRegionFromApi(selectedRegionId); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover text-sm font-medium"
                >
                  <Copy size={18} />
                  Initialiser ma base depuis la référence
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Vider toute votre mercuriale ? Vous pourrez ensuite réinitialiser depuis la référence.')) return;
                    setClearingAll(true);
                    try {
                      for (const r of REGIONS_BURKINA) await clearMercurialeLines(r.id);
                      await loadRegionFromApi(selectedRegionId);
                    } finally { setClearingAll(false); }
                  }}
                  disabled={clearingAll}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-faso-statut-attente/30 text-faso-statut-attente rounded-lg hover:bg-faso-statut-attente-bg disabled:opacity-50 text-sm font-medium"
                >
                  <Trash2 size={18} />
                  {clearingAll ? 'Vidage...' : 'Vider ma mercuriale'}
                </button>
              </>
            )}
            <label className="text-sm font-medium text-faso-text-700 whitespace-nowrap">Région :</label>
            <button
              type="button"
              onClick={() => setVueCompacte(!vueCompacte)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${vueCompacte ? 'bg-faso-hover-bg text-faso-statut-brouillon' : 'bg-faso-statut-brouillon-bg text-faso-text-secondary hover:bg-faso-hover-bg'}`}
              title={vueCompacte ? 'Vue normale' : 'Vue compacte (plus de lignes visibles)'}
            >
              {vueCompacte ? 'Vue normale' : 'Vue compacte'}
            </button>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="border border-faso-border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[220px]"
            >
              {REGIONS_BURKINA.map(region => (
                <option key={region.id} value={region.id}>
                  {region.nom} ({region.chefLieu})
                </option>
              ))}
            </select>
            {pdfForRegion && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover text-sm font-medium"
              >
                <Download size={18} />
                Télécharger le Word officiel
              </button>
            )}
          </div>
        </div>
        {selectedRegion && (
          <div className="bg-faso-statut-valide-bg border border-violet-200 rounded-lg px-4 py-2 text-sm text-violet-800 flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium">Mercuriale affichée :</span> {selectedRegion.nom} — Chef-lieu {selectedRegion.chefLieu}.
              {pdfForRegion ? ' Un fichier Word officiel est disponible pour cette région.' : ' Les prix affichés sont les références par défaut.'}
            </span>
          </div>
        )}
        {importResult && (
          <div className={`p-4 rounded-lg text-sm font-medium ${importResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {importResult.ok ? <CheckCircle size={18} className="inline mr-2 align-middle" /> : <AlertCircle size={18} className="inline mr-2 align-middle" />}
            {importResult.message}
          </div>
        )}
        <div className="relative flex-1 sm:flex-none max-w-md">
          <Search className="absolute left-3 top-2.5 text-faso-text-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou code..."
            className="pl-10 pr-4 py-2 border border-faso-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-faso-border max-w-7xl mx-auto overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <table className={`w-full min-w-[800px] text-left border-collapse ${vueCompacte ? 'text-xs' : 'text-sm'}`}>
            <colgroup>
              <col style={{ width: '10%', minWidth: 90 }} />
              <col style={{ width: '30%', minWidth: 180 }} />
              <col style={{ width: '12%', minWidth: 90 }} />
              <col style={{ width: '12%', minWidth: 95 }} />
              <col style={{ width: '12%', minWidth: 95 }} />
              <col style={{ width: '12%', minWidth: 95 }} />
              <col style={{ width: '12%', minWidth: 130 }} />
            </colgroup>
            <thead className="bg-faso-statut-attente-bg text-faso-statut-attente font-semibold text-xs uppercase tracking-wider [&_th]:align-top">
              <tr>
                <th className={`sticky top-0 z-30 bg-faso-statut-attente-bg border-b-2 border-faso-statut-attente/30 w-[14%] min-w-[140px] shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ${vueCompacte ? 'p-1.5' : 'p-4'}`}>Code</th>
                <th className={`sticky top-0 z-30 bg-faso-statut-attente-bg border-b-2 border-faso-statut-attente/30 w-[27%] shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ${vueCompacte ? 'p-1.5' : 'p-4'}`}>Désignation</th>
                <th className={`sticky top-0 z-30 bg-faso-statut-attente-bg border-b-2 border-faso-statut-attente/30 w-[13%] min-w-[110px] overflow-hidden shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ${vueCompacte ? 'p-1.5' : 'p-4'}`}>Cond.</th>
                <th className={`sticky top-0 z-30 bg-faso-statut-attente-bg border-b-2 border-faso-statut-attente/30 text-right w-[11%] whitespace-nowrap font-bold shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ${vueCompacte ? 'p-1.5' : 'p-4'}`}>Min</th>
                <th className={`sticky top-0 z-30 bg-faso-statut-attente-bg border-b-2 border-faso-statut-attente/30 text-right w-[11%] whitespace-nowrap font-bold shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ${vueCompacte ? 'p-1.5' : 'p-4'}`}>Moyen</th>
                <th className={`sticky top-0 z-30 bg-faso-statut-attente-bg border-b-2 border-faso-statut-attente/30 text-right w-[11%] whitespace-nowrap font-bold shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ${vueCompacte ? 'p-1.5' : 'p-4'}`}>Max</th>
                <th className={`sticky top-0 z-30 bg-faso-statut-attente-bg border-b-2 border-faso-statut-attente/30 text-center w-[14%] min-w-[160px] shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ${vueCompacte ? 'p-1.5' : 'p-4'}`}>Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loadingMercuriale && filteredGrouped.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-faso-text-500">
                    <Loader2 size={48} className="mx-auto text-faso-text-300 mb-4 animate-spin" />
                    <p className="font-medium">Chargement...</p>
                  </td>
                </tr>
              ) : filteredGrouped.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-faso-text-500">
                    <Search size={48} className="mx-auto text-faso-text-300 mb-4" />
                    <p className="font-medium">Aucun article trouvé.</p>
                  </td>
                </tr>
              ) : (
                filteredGrouped.map((section, sectionIdx) => (
                  <React.Fragment key={`${section.groupe}-${sectionIdx}`}>
                    <tr className="bg-faso-statut-valide-bg text-faso-statut-valide border-b border-faso-statut-valide/30">
                      <td colSpan={7} className={`font-bold text-sm uppercase tracking-wide align-top overflow-hidden ${vueCompacte ? 'p-1' : 'p-3'}`}>
                        {section.groupe}
                      </td>
                    </tr>
                    {(section.sousGroupes || []).map((sous, sousIdx) => (
                      <React.Fragment key={`${section.groupe}-${sous.sousGroupe}-${sousIdx}`}>
                        <tr className="bg-faso-statut-brouillon-bg text-faso-text-primary border-b border-faso-border">
                          <td colSpan={7} className={`text-xs font-semibold tracking-wide align-top overflow-hidden ${vueCompacte ? 'p-1' : 'p-3'}`}>
                            Sous-cat. {sous.sousGroupe}
                          </td>
                        </tr>
                        {(sous.articles || []).filter(Boolean).map((article, idx) => {
                          const prixRef = article.prix_moyen ?? article.prix_min ?? article.prix_max ?? null;
                          const baseItem = {
                            code: article.code,
                            designation: article.designation,
                            conditionnement: article.unite,
                            unite: article.unite,
                            prix_min: article.prix_min,
                            prix_moyen: article.prix_moyen,
                            prix_max: article.prix_max,
                            prix_ref: prixRef,
                            refPrice: prixRef,
                          };
                          const addWithPrice = (prix) => {
                            if (prix == null) return;
                            onAddToInvoice({ ...baseItem, prix_ref: prix, refPrice: prix });
                          };
                          const hasMin = article.prix_min != null;
                          const hasMoyen = (article.prix_moyen ?? article.prix_max) != null;
                          const hasMax = article.prix_max != null;
                          return (
                            <tr key={`${section.groupe}-${sous.sousGroupe}-${article.code}-${idx}`} className="hover:bg-faso-hover-bg transition-colors border-b border-faso-border">
                              <td className={`font-mono text-faso-text-primary font-medium whitespace-nowrap align-top ${vueCompacte ? 'text-xs p-1.5' : 'text-sm p-4'}`} title={article.code}>{article.code}</td>
                              <td className={`font-medium text-faso-text-800 break-words align-top max-w-[280px] ${vueCompacte ? 'p-1.5' : 'p-4'}`} title={article.designation}>{article.designation}</td>
                              <td className={`text-faso-text-600 align-top overflow-hidden ${vueCompacte ? 'p-1.5' : 'p-4'}`} title={article.unite || 'Unité'}>
                                <span className="block truncate">{article.unite || 'Unité'}</span>
                              </td>
                              <td className={`text-right font-mono tabular-nums text-faso-text-secondary whitespace-nowrap align-top ${vueCompacte ? 'p-1.5' : 'p-4'}`}>{formatPrix(article.prix_min)}</td>
                              <td className={`text-right font-mono tabular-nums font-bold text-faso-statut-brouillon whitespace-nowrap align-top ${vueCompacte ? 'p-1.5' : 'p-4'}`}>{formatPrix(article.prix_moyen)}</td>
                              <td className={`text-right font-mono tabular-nums text-faso-text-secondary whitespace-nowrap align-top ${vueCompacte ? 'p-1.5' : 'p-4'}`}>{formatPrix(article.prix_max)}</td>
                              <td className={`align-top overflow-hidden ${vueCompacte ? 'p-1.5' : 'p-4'}`}>
                                <div className={`flex flex-wrap justify-center ${vueCompacte ? 'gap-0.5' : 'gap-2'}`}>
                                  {hasMin && (
                                    <button
                                      onClick={() => addWithPrice(article.prix_min)}
                                      className={`inline-flex items-center gap-1 font-medium text-faso-statut-valide bg-emerald-50 hover:bg-faso-primary hover:text-white rounded-lg transition-all ${vueCompacte ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1.5 text-sm'}`}
                                      title="Ajouter (prix min)"
                                    >
                                      <Plus size={vueCompacte ? 10 : 12} /> Min
                                    </button>
                                  )}
                                  {hasMoyen && (
                                    <button
                                      onClick={() => addWithPrice(article.prix_moyen ?? article.prix_max)}
                                      className={`inline-flex items-center gap-1 font-medium text-blue-600 bg-faso-statut-valide-bg hover:bg-blue-600 hover:text-white rounded-lg transition-all ${vueCompacte ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1.5 text-sm'}`}
                                      title="Ajouter (prix moyen)"
                                    >
                                      <Plus size={vueCompacte ? 10 : 12} /> Moyen
                                    </button>
                                  )}
                                  {hasMax && (
                                    <button
                                      onClick={() => addWithPrice(article.prix_max)}
                                      className={`inline-flex items-center gap-1 font-medium text-faso-statut-attente bg-faso-statut-attente-bg hover:bg-faso-accent/90 hover:text-white rounded-lg transition-all ${vueCompacte ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1.5 text-sm'}`}
                                      title="Ajouter (prix max)"
                                    >
                                      <Plus size={vueCompacte ? 10 : 12} /> Max
                                    </button>
                                  )}
                                  {!hasMin && !hasMoyen && !hasMax && (
                                    <span className="text-xs text-faso-text-400">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-bold text-faso-text-900 mb-2">Importer {previewImport.lines.length} article(s) — {previewImport.regionName}</h3>
            <div className="flex gap-4 my-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="text-faso-primary" />
                <span className="text-sm">Remplacer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="importMode" checked={importMode === 'add'} onChange={() => setImportMode('add')} className="text-faso-primary" />
                <span className="text-sm">Ajouter</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="importMode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="text-faso-primary" />
                <span className="text-sm">Fusionner</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreviewImport(null)} disabled={importing} className="flex-1 py-2 border border-faso-border rounded-lg text-faso-text-700 hover:bg-faso-hover-bg disabled:opacity-50">Annuler</button>
              <button onClick={handleConfirmImport} disabled={importing} className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium disabled:opacity-50">
                {importing ? 'Import en cours... (1-2 min)' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Format prix avec séparateur de milliers (ex: 10 000 F CFA) */
const formatPrixFCFA = (n) => (n != null && !isNaN(n) ? `${Number(n).toLocaleString('fr-FR')} F CFA` : '—');
/** Format numérique sans unité/monnaie */
const formatNombre = (n) => (n != null && !isNaN(n) ? Number(n).toLocaleString('fr-FR') : '—');

const InvoiceBuilder = ({ selectedMercurialeItem, clearSelection, mercurialeArticles = [], lastProcessedMercurialeRef, editingFactureId, editingFactureData, onClearEdit, onFactureSaved }) => {
  const { currentUser, getCompanyEntete, apiMode } = useAuth();
  const [docType, setDocType] = useState('proforma');
  const [modeFacture, setModeFacture] = useState('simple'); // simple | commande (marché à commande)
  const [sourceDocumentId, setSourceDocumentId] = useState(null);
  const [proformas, setProformas] = useState([]);
  const [definitives, setDefinitives] = useState([]);
  const [items, setItems] = useState([]);
  const [clientInfo, setClientInfo] = useState({ name: '', direction: '', ifu: '', rccm: '', address: '' });
  const [marcheRef, setMarcheRef] = useState({ numero: '', objet: '', bonCommande: '' });
  const [airsiTaux, setAirsiTaux] = useState(0);
  const [tvaAppliquee, setTvaAppliquee] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [searchArticle, setSearchArticle] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const autocompleteRef = React.useRef(null);
  const [factureTheme, setFactureTheme] = useState(() => {
    try {
      const raw = localStorage.getItem('fasomarches_facture_theme');
      const t = raw ? JSON.parse(raw) : {};
      return { palette: 'bleu', font: 'sans', watermark: true, ...t, logoSize: (t && t.logoSize) || 'large' };
    } catch {
      return { palette: 'bleu', font: 'sans', watermark: true, logoSize: 'large' };
    }
  });
  const [showDateOnFacture, setShowDateOnFacture] = useState(() => {
    try {
      const v = localStorage.getItem('fasomarches_facture_show_date');
      return v !== null ? v === 'true' : true;
    } catch { return true; }
  });
  const [showCaseTimbre, setShowCaseTimbre] = useState(true);
  const [showImportPhoto, setShowImportPhoto] = useState(false);
  const [showCachet, setShowCachet] = useState(() => {
    try {
      const v = localStorage.getItem('fasomarches_facture_show_cachet');
      return v !== null ? v === 'true' : false;
    } catch { return false; }
  });
  const [showSignature, setShowSignature] = useState(() => {
    try {
      const v = localStorage.getItem('fasomarches_facture_show_signature');
      return v !== null ? v === 'true' : false;
    } catch { return false; }
  });
  const [numeroFacture, setNumeroFacture] = useState(() => genererNumeroFacture(1, new Date().getFullYear(), 'proforma'));
  const [loadingFacture, setLoadingFacture] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState(null);
  const autosaveTimerRef = React.useRef(null);

  const fillFromSource = useCallback((doc) => {
    if (!doc) return;
    setDocType(doc.type || 'proforma');
    setSourceDocumentId(doc.sourceDocumentId || null);
    setClientInfo({
      name: doc.client || '',
      direction: doc.clientDirection || '',
      ifu: doc.clientIfu || '',
      rccm: doc.clientRccm || '',
      address: doc.clientAddr || '',
    });
    setMarcheRef({
      numero: doc.marcheNumero || '',
      objet: doc.objetMarche || '',
      bonCommande: doc.numBonCommande || '',
    });
    setAirsiTaux(doc.airsiTaux ?? 0);
    const itemsData = Array.isArray(doc.items) ? doc.items : (Array.isArray(doc.Items) ? doc.Items : []);
    const mappedItems = itemsData.map((it, i) => ({
      id: Date.now() + i,
      code: it.code || null,
      designation: it.designation || '',
      quantity: it.quantity || 1,
      qMin: it.qMin ?? it.quantity ?? 1,
      qMax: it.qMax ?? it.quantity ?? 1,
      price: it.priceUnit ?? it.price ?? 0,
      unite: it.unite || 'U',
      refPrice: it.priceUnit ?? it.price,
      prix_max: it.priceUnit ?? it.price,
    }));
    setItems(mappedItems);
  }, []);

  useEffect(() => {
    if (!editingFactureId) setNumeroFacture(genererNumeroFacture(1, new Date().getFullYear(), docType));
  }, [docType, editingFactureId]);

  useEffect(() => {
    if (!editingFactureId || !apiMode) {
      setLoadingFacture(false);
      return;
    }
    if (editingFactureData && editingFactureData.id === editingFactureId) {
      setLoadingFacture(false);
      setDocType(editingFactureData.type || 'proforma');
      setNumeroFacture(editingFactureData.numero || genererNumeroFacture(1, new Date().getFullYear(), editingFactureData.type || 'proforma'));
      fillFromSource(editingFactureData);
      return;
    }
    let cancelled = false;
    setLoadingFacture(true);
    api.getFacture(editingFactureId)
      .then((f) => {
        if (cancelled || !f) return;
        const facture = f.data ?? f;
        setDocType(facture.type || 'proforma');
        setNumeroFacture(facture.numero || genererNumeroFacture(1, new Date().getFullYear(), facture.type || 'proforma'));
        fillFromSource(facture);
      })
      .catch(() => { if (!cancelled) alert('Impossible de charger la facture.'); })
      .finally(() => { if (!cancelled) setLoadingFacture(false); });
    return () => { cancelled = true; };
  }, [editingFactureId, editingFactureData, apiMode, fillFromSource]);

  const addItem = (mercurialeItem) => {
    const prixRef = mercurialeItem.refPrice ?? mercurialeItem.prix_ref ?? mercurialeItem.prix_moyen ?? mercurialeItem.prix_max;
    const prixMax = mercurialeItem.prix_max ?? mercurialeItem.prix_ref;
    const unite = mercurialeItem.conditionnement || mercurialeItem.unite || 'U';
    const newItem = {
      id: Date.now(),
      code: mercurialeItem.code || null,
      designation: mercurialeItem.designation,
      quantity: 1,
      qMin: 1,
      qMax: 1,
      price: prixRef ?? 0,
      unite: ['U', 'Lot', 'Forfait'].includes(unite) ? unite : 'U',
      refPrice: prixRef,
      prix_max: prixMax,
    };
    setItems(prev => [...prev, newItem]);
  };

  const addEmptyItem = () => {
    const newItem = {
      id: Date.now(),
      code: null,
      designation: '',
      quantity: 1,
      qMin: 1,
      qMax: 1,
      price: 0,
      unite: 'U',
      refPrice: null,
      prix_max: null,
    };
    setItems(prev => [...prev, newItem]);
  };

  useEffect(() => {
    if (selectedMercurialeItem && (!lastProcessedMercurialeRef || lastProcessedMercurialeRef.current !== selectedMercurialeItem)) {
      if (lastProcessedMercurialeRef) lastProcessedMercurialeRef.current = selectedMercurialeItem;
      addItem(selectedMercurialeItem);
      clearSelection();
      setAlertMessage('Article ajouté depuis la mercuriale !');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    }
  }, [selectedMercurialeItem]);

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };
  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };
  const calculateTotal = () => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totaux = calculerTotauxFacture(calculateTotal(), airsiTaux, tvaAppliquee);

  const searchTerm = searchArticle.trim().toLowerCase();
  const suggestions = searchTerm.length >= 1
    ? mercurialeArticles.filter(
        (a) =>
          (a.designation && a.designation.toLowerCase().includes(searchTerm)) ||
          (a.code && a.code.toLowerCase().includes(searchTerm))
      ).slice(0, 15)
    : [];

  const handleSelectArticle = (article, prixChoisi) => {
    const prix = prixChoisi ?? article.prix_moyen ?? article.prix_ref ?? article.prix_min ?? article.prix_max;
    const itemToAdd = {
      code: article.code,
      designation: article.designation,
      conditionnement: article.conditionnement || article.unite,
      unite: article.conditionnement || article.unite,
      prix_min: article.prix_min,
      prix_moyen: article.prix_moyen,
      prix_max: article.prix_max,
      prix_ref: prix,
      refPrice: prix,
    };
    addItem(itemToAdd);
    setSearchArticle('');
    setShowSuggestions(false);
    setAlertMessage('Article ajouté depuis la mercuriale !');
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (apiMode) {
      if (docType === 'definitive') api.getProformas().then(setProformas).catch(() => setProformas([]));
      else if (docType === 'bl') api.getDefinitives().then(setDefinitives).catch(() => setDefinitives([]));
    }
  }, [apiMode, docType]);

  useEffect(() => {
    if (apiMode) api.getClients().then(setClients).catch(() => setClients([]));
  }, [apiMode]);

  useEffect(() => {
    try {
      localStorage.setItem('fasomarches_facture_theme', JSON.stringify(factureTheme));
    } catch {
      // ignore
    }
  }, [factureTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('fasomarches_facture_show_cachet', String(showCachet));
    } catch {}
  }, [showCachet]);
  useEffect(() => {
    try {
      localStorage.setItem('fasomarches_facture_show_signature', String(showSignature));
    } catch {}
  }, [showSignature]);

  useEffect(() => {
    try {
      localStorage.setItem('fasomarches_facture_show_date', String(showDateOnFacture));
    } catch {
      // ignore
    }
  }, [showDateOnFacture]);

  const handleImportFromPhoto = useCallback(({ client, items: importedItems }) => {
    setClientInfo((prev) => ({ ...prev, name: client || prev.name }));
    const mapped = (importedItems || []).map((it, i) => ({
      id: Date.now() + i,
      code: null,
      designation: it.designation || '',
      quantity: it.quantity || 1,
      qMin: it.quantity || 1,
      qMax: it.quantity || 1,
      price: it.priceUnit ?? 0,
      unite: 'U',
      refPrice: it.priceUnit ?? null,
      prix_max: it.priceUnit ?? null,
    }));
    setItems(mapped);
  }, []);

  const handleSourceSelect = (e) => {
    const id = e.target.value || null;
    setSourceDocumentId(id);
    if (id && docType === 'definitive') {
      const doc = proformas.find((p) => p.id === id);
      if (doc) fillFromSource(doc);
    } else if (id && docType === 'bl') {
      const doc = definitives.find((d) => d.id === id);
      if (doc) fillFromSource(doc);
    }
  };

  const handleDocTypeChange = (e) => {
    const t = e.target.value;
    setDocType(t);
    setSourceDocumentId(null);
    if (t === 'proforma') setProformas([]);
    if (t === 'definitive') setDefinitives([]);
    if (t === 'bl') setProformas([]);
  };

  const handleEnregistrer = async () => {
    if (!clientInfo.name?.trim() || items.length === 0) {
      alert('Client et au moins un article requis.');
      return;
    }
    if (!apiMode) {
      alert('Connectez-vous pour enregistrer.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: docType,
        numero: numeroFacture?.trim() || undefined,
        sourceDocumentId: sourceDocumentId || undefined,
        client: clientInfo.name,
        clientDirection: clientInfo.direction || undefined,
        clientIfu: clientInfo.ifu || undefined,
        clientRccm: clientInfo.rccm || undefined,
        clientAddr: clientInfo.address || undefined,
        marcheNumero: marcheRef.numero || undefined,
        objetMarche: marcheRef.objet || undefined,
        numBonCommande: marcheRef.bonCommande || undefined,
        airsiTaux,
        items: items.map((i) => ({
          code: i.code || undefined,
          designation: i.designation,
          quantity: i.quantity,
          qMin: i.qMin ?? i.quantity ?? 1,
          qMax: i.qMax ?? i.quantity ?? 1,
          priceUnit: i.price,
          unite: i.unite || 'U',
        })),
      };
      if (editingFactureId) {
        const updated = await api.patchFacture(editingFactureId, payload);
        setAlertMessage('Facture mise à jour ! Vous pouvez continuer à modifier.');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        if (onFactureSaved) onFactureSaved(updated);
      } else {
        await api.postFacture(payload);
        setAlertMessage('Facture enregistrée !');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
        setItems([]);
        setClientInfo({ name: '', direction: '', ifu: '', rccm: '', address: '' });
        setMarcheRef({ numero: '', objet: '', bonCommande: '' });
        setSourceDocumentId(null);
        setSelectedClientId('');
      }
      api.getClients().then(setClients).catch(() => {});
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const performAutosave = useCallback(async () => {
    if (!editingFactureId || !apiMode || !clientInfo.name?.trim() || items.length === 0) return;
    try {
      const payload = {
        type: docType,
        numero: numeroFacture?.trim() || undefined,
        sourceDocumentId: sourceDocumentId || undefined,
        client: clientInfo.name,
        clientDirection: clientInfo.direction || undefined,
        clientIfu: clientInfo.ifu || undefined,
        clientRccm: clientInfo.rccm || undefined,
        clientAddr: clientInfo.address || undefined,
        marcheNumero: marcheRef.numero || undefined,
        objetMarche: marcheRef.objet || undefined,
        numBonCommande: marcheRef.bonCommande || undefined,
        airsiTaux,
        items: items.map((i) => ({
          code: i.code || undefined,
          designation: i.designation,
          quantity: i.quantity,
          qMin: i.qMin ?? i.quantity ?? 1,
          qMax: i.qMax ?? i.quantity ?? 1,
          priceUnit: i.price,
          unite: i.unite || 'U',
        })),
      };
      const updated = await api.patchFacture(editingFactureId, payload);
      setAutosavedAt(Date.now());
      if (onFactureSaved) onFactureSaved(updated);
    } catch (err) {
      console.warn('Autosave échoué:', err);
    }
  }, [editingFactureId, apiMode, clientInfo, items, docType, numeroFacture, sourceDocumentId, marcheRef, airsiTaux, onFactureSaved]);

  useEffect(() => {
    if (!editingFactureId || !apiMode || loadingFacture || saving || !clientInfo.name?.trim() || items.length === 0) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      performAutosave();
      autosaveTimerRef.current = null;
    }, 1500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [editingFactureId, apiMode, loadingFacture, saving, clientInfo, items, docType, numeroFacture, sourceDocumentId, marcheRef, airsiTaux, performAutosave]);

  useEffect(() => {
    if (autosavedAt) {
      const t = setTimeout(() => setAutosavedAt(null), 2000);
      return () => clearTimeout(t);
    }
  }, [autosavedAt]);

  return (
    <div className="space-y-6 relative">
      {showImportPhoto && (
        <ImportFactureFromPhoto
          onImport={handleImportFromPhoto}
          onClose={() => setShowImportPhoto(false)}
        />
      )}
      {loadingFacture && (
        <div className="absolute inset-0 bg-white/90 dark:bg-faso-bg/90 flex items-center justify-center z-40 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={40} className="animate-spin text-faso-primary" />
            <p className="text-sm font-medium text-faso-text-700 dark:text-faso-text-300">Chargement de la facture…</p>
          </div>
        </div>
      )}
      {showAlert && (
        <div className="fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center animate-bounce">
          <CheckCircle size={20} className="mr-2" />
          {alertMessage || 'Enregistré !'}
        </div>
      )}
      {autosavedAt && !showAlert && (
        <div className="fixed top-20 right-4 bg-faso-bg text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm">
          <CheckCircle size={18} />
          Sauvegardé automatiquement
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-faso-text-800">Éditeur de documents</h2>
          <p className="text-faso-text-500 text-sm">Proforma → Facture définitive → Bon de livraison</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {editingFactureId && onClearEdit && (
            <button onClick={onClearEdit} className="flex items-center space-x-2 bg-faso-statut-brouillon-bg border border-slate-300 text-faso-statut-brouillon px-4 py-2 rounded-lg hover:bg-faso-hover-bg transition-colors text-sm font-medium">
              <X size={18} />
              <span>Annuler la modification</span>
            </button>
          )}
          <button onClick={() => setItems([])} className="flex items-center space-x-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
            <Trash2 size={18} />
            <span>Vider</span>
          </button>
          {!editingFactureId && (
            <button onClick={() => setShowImportPhoto(true)} className="flex items-center space-x-2 bg-faso-accent text-white px-4 py-2 rounded-lg hover:bg-faso-accent/90 transition-colors text-sm font-medium">
              <Image size={18} />
              <span>Importer depuis une photo</span>
            </button>
          )}
          <button onClick={() => setShowPreview(!showPreview)} className="flex items-center space-x-2 bg-faso-primary text-white px-4 py-2 rounded-lg hover:bg-faso-primary-hover transition-colors shadow-md text-sm font-medium">
            <Printer size={18} />
            <span>{showPreview ? 'Masquer' : 'Prévisualiser'}</span>
          </button>
          {apiMode && (
            <button onClick={handleEnregistrer} disabled={saving || !clientInfo.name?.trim() || items.length === 0} className="flex items-center space-x-2 bg-faso-primary text-white px-4 py-2 rounded-lg hover:bg-faso-primary-hover disabled:opacity-50 transition-colors shadow-md text-sm font-medium">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              <span>{saving ? 'Enregistrement…' : editingFactureId ? 'Mettre à jour' : 'Enregistrer'}</span>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-t-4 border-t-faso-primary">
            <h3 className="font-bold text-faso-text-700 mb-4 flex items-center space-x-2 pb-2 border-b border-faso-border">
              <FileText size={18} className="text-faso-primary" />
              <span>Type de document</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Type</label>
                <select value={docType} onChange={handleDocTypeChange} className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary outline-none">
                  <option value="proforma">Facture Proforma</option>
                  <option value="definitive">Facture Définitive (depuis proforma)</option>
                  <option value="bl">Bon de Livraison (depuis facture définitive)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Numéro de facture</label>
                <input
                  type="text"
                  value={numeroFacture}
                  onChange={(e) => setNumeroFacture(e.target.value)}
                  placeholder="Ex: FAC-2025-0001, PRO-2025-0001"
                  className="w-full border border-faso-border rounded-md p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Type de marché</label>
                <select
                  value={modeFacture}
                  onChange={(e) => setModeFacture(e.target.value)}
                  className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary outline-none"
                >
                  <option value="simple">Marché simple</option>
                  <option value="commande">Marché à commande</option>
                </select>
              </div>
              {docType === 'definitive' && apiMode && (
                <div>
                  <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Depuis la proforma</label>
                  <select value={sourceDocumentId || ''} onChange={handleSourceSelect} className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary outline-none">
                    <option value="">— Sélectionner une proforma —</option>
                    {proformas.map((p) => (
                      <option key={p.id} value={p.id}>{p.numero} — {p.client}</option>
                    ))}
                  </select>
                </div>
              )}
              {docType === 'bl' && apiMode && (
                <div>
                  <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Depuis la facture définitive</label>
                  <select value={sourceDocumentId || ''} onChange={handleSourceSelect} className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary outline-none">
                    <option value="">— Sélectionner une facture définitive —</option>
                    {definitives.map((d) => (
                      <option key={d.id} value={d.id}>{d.numero} — {d.client}</option>
                    ))}
                  </select>
                </div>
              )}
              {!apiMode && (docType === 'definitive' || docType === 'bl') && (
                <p className="text-xs text-amber-600">Connectez-vous pour créer depuis un document existant.</p>
              )}
              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-faso-border mt-3">
                <input
                  type="checkbox"
                  checked={showDateOnFacture}
                  onChange={(e) => setShowDateOnFacture(e.target.checked)}
                  className="rounded border-faso-border text-faso-primary focus:ring-faso-primary"
                />
                <span className="text-xs text-faso-text-600">Afficher la date (toutes les factures : proforma, définitive, BL)</span>
              </label>
              {docType === 'definitive' && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={showCaseTimbre}
                    onChange={(e) => setShowCaseTimbre(e.target.checked)}
                    className="rounded border-faso-border text-faso-primary focus:ring-faso-primary"
                  />
                  <span className="text-xs text-faso-text-600">Prévoir une case pour le timbre</span>
                </label>
              )}
              {currentUser?.role === 'company_admin' && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={showSignature}
                      onChange={(e) => setShowSignature(e.target.checked)}
                      className="rounded border-faso-border text-faso-primary focus:ring-faso-primary"
                    />
                    <span className="text-xs text-faso-text-600">Afficher la signature sur la facture</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={showCachet}
                      onChange={(e) => setShowCachet(e.target.checked)}
                      className="rounded border-faso-border text-faso-primary focus:ring-faso-primary"
                    />
                    <span className="text-xs text-faso-text-600">Afficher le cachet sur la facture</span>
                  </label>
                </>
              )}
            </div>
          </Card>
          <Card className="border-t-4 border-t-faso-primary">
            <h3 className="font-bold text-faso-text-700 mb-4 flex items-center space-x-2 pb-2 border-b border-faso-border">
              <Building2 size={18} className="text-faso-primary" />
              <span>Informations Client</span>
            </h3>
            <div className="space-y-3">
              {apiMode && clients.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Sélectionner un client existant</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedClientId(id);
                      if (id) {
                        const c = clients.find((x) => x.id === id);
                        if (c) setClientInfo({ name: c.name || '', direction: c.direction || '', ifu: c.ifu || '', rccm: c.rccm || '', address: c.address || '' });
                      } else {
                        setClientInfo({ name: '', direction: '', ifu: '', rccm: '', address: '' });
                      }
                    }}
                    className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none bg-faso-hover-bg"
                  >
                    <option value="">— Nouveau client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.direction ? ` (${c.direction})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Client / Institution</label>
                <input type="text" className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none" placeholder="Ex: SONABEL, Ministère..." value={clientInfo.name} onChange={e => { setClientInfo({...clientInfo, name: e.target.value}); setSelectedClientId(''); }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Direction (DAF/PRM)</label>
                <input type="text" className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none" placeholder="DAF, PRM..." value={clientInfo.direction} onChange={e => { setClientInfo({...clientInfo, direction: e.target.value}); setSelectedClientId(''); }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">N° IFU</label>
                  <input type="text" className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none" placeholder="00012345X" value={clientInfo.ifu} onChange={e => { setClientInfo({...clientInfo, ifu: e.target.value}); setSelectedClientId(''); }} maxLength={10} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">RCCM</label>
                  <input type="text" className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none" placeholder="BF-OUA..." value={clientInfo.rccm} onChange={e => { setClientInfo({...clientInfo, rccm: e.target.value}); setSelectedClientId(''); }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Adresse</label>
                <textarea className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none" rows="2" placeholder="Adresse postale..." value={clientInfo.address} onChange={e => { setClientInfo({...clientInfo, address: e.target.value}); setSelectedClientId(''); }}></textarea>
              </div>
            </div>
          </Card>
          <Card className="border-t-4 border-t-faso-statut-attente">
            <h3 className="font-bold text-faso-text-700 mb-4 flex items-center space-x-2 pb-2 border-b border-faso-border">
              <FileText size={18} className="text-faso-statut-attente" />
              <span>Références Marché</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">N° Marché / Contrat</label>
                <input type="text" className="w-full border border-faso-border rounded-md p-2.5 text-sm" placeholder="DAO-2024-054" value={marcheRef.numero} onChange={e => setMarcheRef({...marcheRef, numero: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">Objet du marché</label>
                <input type="text" className="w-full border border-faso-border rounded-md p-2.5 text-sm" placeholder="Fourniture de..." value={marcheRef.objet} onChange={e => setMarcheRef({...marcheRef, objet: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">N° Bon de Commande</label>
                <input type="text" className="w-full border border-faso-border rounded-md p-2.5 text-sm" placeholder="BC-2024-001" value={marcheRef.bonCommande} onChange={e => setMarcheRef({...marcheRef, bonCommande: e.target.value})} />
              </div>
            </div>
          </Card>
          <Card className="border-t-4 border-t-faso-text-secondary">
            <h3 className="font-bold text-faso-text-700 mb-4 flex items-center space-x-2 pb-2 border-b border-faso-border">
              <Settings size={18} className="text-faso-text-secondary" />
              <span>Personnalisation facture</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">
                  Palette de couleurs
                </label>
                <select
                  value={factureTheme.palette}
                  onChange={(e) => setFactureTheme((t) => ({ ...t, palette: e.target.value }))}
                  className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none"
                >
                  <option value="bleu">Bleu professionnel</option>
                  <option value="vert">Vert émeraude</option>
                  <option value="bordeaux">Bordeaux</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">
                  Police
                </label>
                <select
                  value={factureTheme.font}
                  onChange={(e) => setFactureTheme((t) => ({ ...t, font: e.target.value }))}
                  className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none"
                >
                  <option value="sans">Sans serif (Inter / Roboto)</option>
                  <option value="serif">Sérif (Georgia)</option>
                  <option value="mono">Monospace</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-faso-text-500 uppercase tracking-wider mb-1">
                  Taille du logo
                </label>
                <select
                  value={factureTheme.logoSize || 'large'}
                  onChange={(e) => setFactureTheme((t) => ({ ...t, logoSize: e.target.value }))}
                  className="w-full border border-faso-border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-faso-primary/30 outline-none"
                >
                  <option value="small">Petit</option>
                  <option value="medium">Moyen</option>
                  <option value="large">Grand</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={factureTheme.watermark}
                  onChange={(e) => setFactureTheme((t) => ({ ...t, watermark: e.target.checked }))}
                  className="rounded border-faso-border text-faso-primary focus:ring-faso-primary"
                />
                <span className="text-xs text-faso-text-600">Afficher le filigrane (logo en arrière-plan)</span>
              </label>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-faso-text-700">Détails de la facture</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tvaAppliquee} onChange={e => setTvaAppliquee(e.target.checked)} className="rounded border-faso-border text-faso-primary focus:ring-faso-primary" />
                  <span className="text-xs text-faso-text-600">TVA (18%) appliquée</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-faso-text-600">AIRSI (précompte) :</label>
                  <select value={airsiTaux} onChange={e => setAirsiTaux(Number(e.target.value))} className="text-sm border rounded px-2 py-1">
                    <option value={0}>0%</option>
                    <option value={2}>2%</option>
                    <option value={5}>5%</option>
                  </select>
                </div>
              </div>
              <span className="text-xs text-faso-text-400 bg-faso-hover-bg px-2 py-1 rounded">Devise: FCFA (XOF)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]" ref={autocompleteRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faso-text-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un article du mercurial (code ou désignation)..."
                  className="w-full pl-10 pr-4 py-2.5 border border-faso-border rounded-lg focus:ring-2 focus:ring-faso-primary focus:border-transparent outline-none text-sm"
                  value={searchArticle}
                  onChange={(e) => { setSearchArticle(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => searchArticle.trim().length >= 1 && setShowSuggestions(true)}
                />
                {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-faso-border rounded-lg shadow-lg max-h-[320px] overflow-y-auto min-w-[480px]">
                  {suggestions.map((art) => (
                    <li
                      key={art.code + (art.id || '')}
                      className="px-4 py-3 hover:bg-faso-hover-bg border-b border-faso-border last:border-0"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-xs text-faso-text-500 shrink-0">{art.code}</span>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {art.prix_min != null && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleSelectArticle(art, art.prix_min); }} className="px-2 py-0.5 text-xs font-mono rounded bg-faso-statut-valide-bg text-faso-statut-valide hover:bg-faso-statut-valide-bg/80" title="Ajouter au prix min">Min {art.prix_min.toLocaleString('fr-FR')} F</button>
                            )}
                            {art.prix_moyen != null && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleSelectArticle(art, art.prix_moyen); }} className="px-2 py-0.5 text-xs font-mono rounded bg-faso-statut-valide-bg text-faso-primary hover:bg-faso-primary/20 font-medium" title="Ajouter au prix moyen">Moy {art.prix_moyen.toLocaleString('fr-FR')} F</button>
                            )}
                            {art.prix_max != null && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleSelectArticle(art, art.prix_max); }} className="px-2 py-0.5 text-xs font-mono rounded bg-faso-statut-attente-bg text-faso-statut-attente hover:bg-faso-statut-attente-bg/80" title="Ajouter au prix max">Max {art.prix_max.toLocaleString('fr-FR')} F</button>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-faso-text-800 break-words whitespace-normal leading-snug">{art.designation}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              </div>
              <button
                type="button"
                onClick={addEmptyItem}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover text-sm font-medium whitespace-nowrap"
              >
                <Plus size={18} />
                Ajouter un article à la main
              </button>
            </div>
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 bg-faso-hover-bg rounded-lg border-2 border-dashed border-faso-border">
                <ShoppingCart size={48} className="text-faso-text-secondary mb-3" />
                <p className="text-faso-text-secondary font-medium">Votre panier est vide</p>
                <p className="text-sm text-faso-text-secondary text-center max-w-xs mt-1">Recherchez dans la mercuriale ou ajoutez des articles à la main.</p>
                <button type="button" onClick={addEmptyItem} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover text-sm font-medium">
                  <Plus size={18} />
                  Ajouter un article
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="overflow-x-auto">
                  <table className="min-w-[960px] w-full text-left text-xs sm:text-sm">
                    <thead className="bg-faso-statut-brouillon-bg text-faso-text-secondary uppercase text-[10px] sm:text-xs font-bold">
                      <tr>
                        <th className="p-3 min-w-[140px] text-center">Réf</th>
                        <th className="p-3 rounded-l-lg w-2/5">Désignation</th>
                        {modeFacture === 'commande' ? (
                          <>
                            <th className="p-3 w-24 text-center">Quantité min</th>
                            <th className="p-3 w-24 text-center">Quantité max</th>
                          </>
                        ) : (
                          <th className="p-3 w-20 text-center">Quantité</th>
                        )}
                        <th className="p-3 w-20 text-center">Unité</th>
                        <th className="p-3 w-24 text-right">Prix unitaire</th>
                        {modeFacture === 'commande' ? (
                          <>
                            <th className="p-3 w-28 text-right">Total min</th>
                            <th className="p-3 w-28 text-right">Total max</th>
                          </>
                        ) : (
                          <th className="p-3 w-24 text-right">Total</th>
                        )}
                        <th className="p-3 w-10 rounded-r-lg"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 align-top">
                      {items.map(item => {
                        const plafond = item.prix_max ?? item.refPrice;
                        const isOverPriced = plafond != null && item.price > plafond;
                        const qMin = item.qMin ?? item.quantity ?? 1;
                        const qMax = item.qMax ?? item.quantity ?? 1;
                        const totalMin = item.price * qMin;
                        const totalMax = item.price * qMax;
                        const totalSimple = item.price * (item.quantity || 1);
                        return (
                          <tr key={item.id} className="group hover:bg-faso-hover-bg">
                            <td className="p-3 align-top min-w-[140px]">
                              <input
                                type="text"
                                value={item.code || ''}
                                onChange={(e) => updateItem(item.id, 'code', e.target.value || null)}
                                placeholder="Réf"
                                className="w-full min-w-[120px] font-mono text-xs border border-faso-border rounded px-2 py-1 focus:ring-1 focus:ring-faso-primary outline-none"
                                title="Référence mercuriale (ex: 03.1.1.1.1.0.001)"
                              />
                            </td>
                            <td className="p-3 align-top">
                              {modeFacture === 'commande' ? (
                                <textarea
                                  rows={2}
                                  value={item.designation}
                                  onChange={(e) => updateItem(item.id, 'designation', e.target.value)}
                                  className="w-full bg-white border border-faso-border rounded px-2 py-1 text-xs sm:text-sm resize-y focus:ring-1 focus:ring-faso-primary outline-none"
                                  placeholder="Désignation technique détaillée..."
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={item.designation}
                                  onChange={(e) => updateItem(item.id, 'designation', e.target.value)}
                                  className="w-full bg-transparent outline-none border-b border-transparent focus:border-faso-primary transition-colors font-medium text-faso-text-700"
                                  placeholder="Désignation de l'article"
                                />
                              )}
                              {isOverPriced && (
                                <span className="text-xs text-red-600 flex items-center mt-1 gap-1">
                                  <AlertCircle size={12} className="flex-shrink-0" />
                                  Dépassement du prix plafond ({formatNombre(plafond)})
                                </span>
                              )}
                            </td>
                            {modeFacture === 'commande' ? (
                              <>
                                <td className="p-3 align-top">
                                  <input
                                    type="number"
                                    min="1"
                                    value={qMin}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10) || 0;
                                      updateItem(item.id, 'qMin', v);
                                    }}
                                    className="w-full bg-white border border-faso-border rounded px-2 py-1 text-center text-xs sm:text-sm focus:ring-1 focus:ring-faso-primary outline-none"
                                  />
                                </td>
                                <td className="p-3 align-top">
                                  <input
                                    type="number"
                                    min="1"
                                    value={qMax}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10) || 0;
                                      updateItem(item.id, 'qMax', v);
                                      updateItem(item.id, 'quantity', v);
                                    }}
                                    className="w-full bg-white border border-faso-border rounded px-2 py-1 text-center text-xs sm:text-sm focus:ring-1 focus:ring-faso-primary outline-none"
                                  />
                                </td>
                              </>
                            ) : (
                              <td className="p-3 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                                  className="w-full bg-white border border-faso-border rounded px-2 py-1 text-center text-xs sm:text-sm focus:ring-1 focus:ring-faso-primary outline-none"
                                />
                              </td>
                            )}
                            <td className="p-3 align-top">
                              <select
                                value={item.unite || 'U'}
                                onChange={(e) => updateItem(item.id, 'unite', e.target.value)}
                                className="w-full text-xs sm:text-sm border rounded px-2 py-1 bg-white"
                              >
                                <option value="U">U</option>
                                <option value="Lot">Lot</option>
                                <option value="Forfait">Forfait</option>
                              </select>
                            </td>
                            <td className="p-3 text-right align-top">
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => {
                                  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  updateItem(item.id, 'price', v);
                                }}
                                className={`w-full text-right bg-white border border-faso-border rounded px-2 py-1 text-xs sm:text-sm font-mono outline-none ${isOverPriced ? 'text-red-600 font-bold' : 'text-faso-text-700'}`}
                              />
                            </td>
                            {modeFacture === 'commande' ? (
                              <>
                                <td className="p-3 text-right font-bold text-faso-text-800 font-mono">
                                  {formatNombre(totalMin)}
                                </td>
                                <td className="p-3 text-right font-bold text-faso-text-800 font-mono">
                                  {formatNombre(totalMax)}
                                </td>
                              </>
                            ) : (
                              <td className="p-3 text-right font-bold text-faso-text-800 font-mono">
                                {formatNombre(totalSimple)}
                              </td>
                            )}
                            <td className="p-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-auto pt-6 border-t border-faso-border">
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex justify-between w-full md:w-1/2 text-faso-text-600"><span>Total HT</span><span className="font-mono">{formatPrixFCFA(totaux.totalHT)}</span></div>
                    {tvaAppliquee && totaux.tva > 0 && (
                      <>
                        <div className="flex justify-between w-full md:w-1/2 text-faso-text-600"><span>TVA (18%)</span><span className="font-mono">{formatPrixFCFA(totaux.tva)}</span></div>
                        <div className="flex justify-between w-full md:w-1/2 text-faso-text-600"><span>Total TTC</span><span className="font-mono">{formatPrixFCFA(totaux.totalTTC)}</span></div>
                      </>
                    )}
                    {totaux.airsi > 0 && (
                      <div className="flex justify-between w-full md:w-1/2 text-faso-text-600"><span>AIRSI (précompte {totaux.airsiTaux}%)</span><span className="font-mono text-faso-statut-attente">- {formatPrixFCFA(totaux.airsi)}</span></div>
                    )}
                    <div className="flex justify-between w-full md:w-1/2 text-xl font-bold text-indigo-900 pt-3 border-t border-faso-border mt-2">
                      <span>Net à payer</span>
                      <span>{formatPrixFCFA(totaux.netAPayer)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showPreview && items.length > 0 && (
        <div className="mt-8 w-full max-w-full overflow-x-hidden">
          <FacturePreview
            numero={numeroFacture || genererNumeroFacture(1, new Date().getFullYear(), docType)}
            docType={docType}
            modeFacture={modeFacture}
            dateFacture={new Date()}
            emetteur={{
              name: (getCompanyEntete?.(currentUser?.companyId)?.name ?? currentUser?.company?.name) || 'Entreprise',
              ifu: getCompanyEntete?.(currentUser?.companyId)?.ifu ?? currentUser?.company?.ifu,
              rccm: getCompanyEntete?.(currentUser?.companyId)?.rccm ?? currentUser?.company?.rccm,
              regimeFiscal: getCompanyEntete?.(currentUser?.companyId)?.regimeFiscal ?? currentUser?.company?.regimeFiscal,
              address: getCompanyEntete?.(currentUser?.companyId)?.address ?? currentUser?.company?.address,
              contact: getCompanyEntete?.(currentUser?.companyId)?.contact ?? currentUser?.company?.contact ?? currentUser?.company?.phone ?? currentUser?.company?.email,
              gerant: getCompanyEntete?.(currentUser?.companyId)?.gerant ?? currentUser?.company?.gerant,
              logoUrl: getCompanyEntete?.(currentUser?.companyId)?.logoUrl ?? currentUser?.company?.logoUrl,
              signatureUrl: showSignature ? (getCompanyEntete?.(currentUser?.companyId)?.signatureUrl ?? currentUser?.company?.signatureUrl) : undefined,
              cachetUrl: showCachet ? (getCompanyEntete?.(currentUser?.companyId)?.cachetUrl ?? currentUser?.company?.cachetUrl) : undefined,
            }}
            client={{
              name: clientInfo.name,
              direction: clientInfo.direction,
              ifu: clientInfo.ifu,
              rccm: clientInfo.rccm,
              address: clientInfo.address,
            }}
            marche={marcheRef.numero || marcheRef.objet || marcheRef.bonCommande ? marcheRef : undefined}
            items={items.map((i) => ({ ...i, priceUnit: i.price }))}
            airsiTaux={airsiTaux}
            tvaAppliquee={tvaAppliquee}
            theme={factureTheme}
            showDate={showDateOnFacture}
            showCaseTimbre={docType === 'definitive' ? showCaseTimbre : false}
            showCachet={showCachet}
            showSignature={showSignature}
            fec={{ uuid: genererFecUuid() }}
            onExportPdf={async (data) => {
              await exportFacturePdfVector({ ...data, theme: factureTheme, showDate: showDateOnFacture, showCaseTimbre: docType === 'definitive' ? showCaseTimbre : false, showCachet, showSignature });
            }}
          />
        </div>
      )}
    </div>
  );
};

const formatFCFA = (n) => (n != null && !isNaN(n) ? `${Number(n).toLocaleString('fr-FR')} FCFA` : '—');

const STORAGE_SIMULATIONS = 'platform_simulations';

const SimulationView = ({ mercurialeArticles: mercurialeArticlesProp = [] }) => {
  const { apiMode } = useAuth();
  const { getMercuriale } = useMercuriale();
  const [simulations, setSimulations] = useState([]);
  const [loadingSims, setLoadingSims] = useState(false);
  const [selectedSim, setSelectedSim] = useState(null);
  const [factures, setFactures] = useState([]);
  const [form, setForm] = useState({
    reference: '',
    titre: '',
    entite: '',
    budgetEnvelope: '',
    enregistrementPercent: '',
    depenses: [], // [{ libelle, montant }]
    articles: [],
  });
  const [searchArticle, setSearchArticle] = useState('');
  const [saving, setSaving] = useState(false);
  const mercurialeArticles = mercurialeArticlesProp.length > 0
    ? mercurialeArticlesProp
    : (getMercuriale('ouagadougou') || getMercuriale('centre') || []).filter((l) => l.type === 'article');
  const suggestions = searchArticle.trim().length >= 1
    ? mercurialeArticles.filter(
        (a) =>
          (a.designation || '').toLowerCase().includes(searchArticle.toLowerCase()) ||
          (a.code || '').toLowerCase().includes(searchArticle.toLowerCase())
      ).slice(0, 15)
    : [];

  const envelope = Number(form.budgetEnvelope) || 0;
  const enregistrementPct = Number(form.enregistrementPercent) || 0;
  const enregistrementMontant = Math.round(envelope * enregistrementPct / 100);
  const autresDepenses = (form.depenses || []).reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const totalDepenses = enregistrementMontant + autresDepenses;

  const totalAchat = form.articles.reduce((s, a) => s + ((a.prixAchat || 0) * (a.quantity || 1)), 0);
  const totalVente = form.articles.reduce((s, a) => s + ((a.prixVente || 0) * (a.quantity || 1)), 0);
  const margeArticles = totalVente - totalAchat;
  const beneficeNet = margeArticles - totalDepenses;
  const tauxMarge = totalVente > 0 ? ((margeArticles / totalVente) * 100).toFixed(1) : '—';

  const loadSimulations = useCallback(async () => {
    if (!apiMode) {
      try {
        const s = localStorage.getItem(STORAGE_SIMULATIONS);
        setSimulations(s ? JSON.parse(s) : []);
      } catch {
        setSimulations([]);
      }
      return;
    }
    setLoadingSims(true);
    api.getSimulations()
      .then(setSimulations)
      .catch(() => setSimulations([]))
      .finally(() => setLoadingSims(false));
  }, [apiMode]);

  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  useEffect(() => {
    if (apiMode) api.getFactures().then(setFactures).catch(() => setFactures([]));
  }, [apiMode]);

  const findPrixAchatFromMercuriale = (designation) => {
    const d = (designation || '').toLowerCase();
    const match = mercurialeArticles.find(
      (a) => (a.designation || '').toLowerCase().includes(d) || d.includes((a.designation || '').toLowerCase().slice(0, 30))
    );
    return match ? (match.prix_min ?? match.prix_moyen ?? match.prix_max) : null;
  };

  const handleSelectFacture = (e) => {
    const factureId = e.target.value || null;
    if (!factureId) return;
    const facture = factures.find((f) => f.id === factureId);
    if (!facture || !facture.items?.length) return;
    const articles = facture.items.map((it) => {
      const prixVente = it.priceUnit ?? it.price ?? 0;
      const prixAchat = findPrixAchatFromMercuriale(it.designation) ?? Math.round(prixVente * 0.85);
      return {
        designation: it.designation || '',
        quantity: it.quantity || 1,
        prixAchat,
        prixVente,
      };
    });
    setForm((f) => ({ ...f, articles, titre: f.titre || facture.client || 'Simulation' }));
  };

  const handleSelectArticle = (art) => {
    setForm((f) => ({
      ...f,
      articles: [...f.articles, { designation: art.designation || art.code, quantity: 1, prixAchat: art.prix_min ?? art.prix_moyen ?? 0, prixVente: art.prix_moyen ?? art.prix_max ?? 0 }],
    }));
    setSearchArticle('');
  };

  const addArticle = () => {
    setForm((f) => ({ ...f, articles: [...f.articles, { designation: '', quantity: 1, prixAchat: 0, prixVente: 0 }] }));
  };

  const updateArticle = (idx, field, value) => {
    setForm((f) => ({
      ...f,
      articles: f.articles.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    }));
  };

  const removeArticle = (idx) => {
    setForm((f) => ({ ...f, articles: f.articles.filter((_, i) => i !== idx) }));
  };

  const addDepense = () => {
    setForm((f) => ({ ...f, depenses: [...(f.depenses || []), { libelle: '', montant: 0 }] }));
  };
  const updateDepense = (idx, field, value) => {
    setForm((f) => ({
      ...f,
      depenses: (f.depenses || []).map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    }));
  };
  const removeDepense = (idx) => {
    setForm((f) => ({ ...f, depenses: (f.depenses || []).filter((_, i) => i !== idx) }));
  };

  const handleEnregistrer = async () => {
    if (!form.titre.trim()) {
      alert('Titre requis');
      return;
    }
    setSaving(true);
    try {
      if (apiMode) {
        const payload = {
          ...form,
          budgetEnvelope: form.budgetEnvelope ? Number(form.budgetEnvelope) : null,
          enregistrementPercent: form.enregistrementPercent !== '' ? Number(form.enregistrementPercent) : null,
          depenses: (form.depenses || []).map((d) => ({ libelle: d.libelle || 'Dépense', montant: Number(d.montant) || 0 })),
        };
        const sim = await api.postSimulation(payload);
        const enregistree = await api.enregistrerSimulation(sim.id);
        setSimulations((prev) => [enregistree, ...prev]);
        setForm({ reference: '', titre: '', entite: '', budgetEnvelope: '', enregistrementPercent: '', depenses: [], articles: [] });
        setSelectedSim(null);
      } else {
        const sim = { id: `sim-${Date.now()}`, ...form, totalDepenses, status: 'enregistre', marche: null, createdAt: new Date().toISOString() };
        const list = [{ ...sim, articles: form.articles.map((a, i) => ({ ...a, id: `art-${i}` })) }, ...simulations];
        setSimulations(list);
        localStorage.setItem(STORAGE_SIMULATIONS, JSON.stringify(list));
        setForm({ reference: '', titre: '', entite: '', budgetEnvelope: '', enregistrementPercent: '', depenses: [], articles: [] });
      }
    } catch (err) {
      alert(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (selectedSim) {
    const sim = simulations.find((s) => s.id === selectedSim.id) || selectedSim;
    const arts = sim.articles || [];
    const tA = arts.reduce((s, a) => s + ((a.prixAchat || 0) * (a.quantity || 1)), 0);
    const tV = arts.reduce((s, a) => s + ((a.prixVente || 0) * (a.quantity || 1)), 0);
    const m = tV - tA;
    const dep = sim.totalDepenses ?? 0;
    const bn = m - dep;
    const simDepenses = sim.depensesJson ? (() => { try { return JSON.parse(sim.depensesJson); } catch { return []; } })() : (sim.depenses || []);
    const simEnv = Number(sim.budgetEnvelope) || 0;
    const simPct = Number(sim.enregistrementPercent) || 0;
    const simEnreg = Math.round(simEnv * simPct / 100);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedSim(null)} className="p-2 hover:bg-faso-hover-bg rounded-lg">
            <X size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-faso-text-800">{sim.titre}</h2>
            <p className="text-sm text-faso-text-500">{sim.reference || sim.marche?.reference} {sim.entite && `• ${sim.entite}`}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><p className="text-sm text-faso-text-500">Enveloppe</p><p className="font-bold">{formatFCFA(sim.budgetEnvelope)}</p></Card>
          <Card><p className="text-sm text-faso-text-500">Coût achat</p><p className="font-bold text-red-600">{formatFCFA(tA)}</p></Card>
          <Card><p className="text-sm text-faso-text-500">Chiffre d&apos;affaires</p><p className="font-bold text-faso-statut-valide">{formatFCFA(tV)}</p></Card>
          <Card><p className="text-sm text-faso-text-500">Bénéfice net</p><p className={`font-bold ${bn >= 0 ? 'text-faso-statut-valide' : 'text-red-600'}`}>{formatFCFA(bn)}</p></Card>
        </div>
        {dep > 0 && (
          <Card>
            <h3 className="font-bold mb-3">Dépenses</h3>
            <div className="space-y-1 text-sm">
              {simPct > 0 && simEnv > 0 && (
                <div className="flex justify-between"><span>Enregistrement ({simPct}% de l&apos;enveloppe)</span><span className="font-mono">{formatFCFA(simEnreg)}</span></div>
              )}
              {simDepenses.map((d, i) => (
                <div key={i} className="flex justify-between"><span>{d.libelle || 'Dépense'}</span><span className="font-mono">{formatFCFA(d.montant)}</span></div>
              ))}
              <div className="flex justify-between font-medium pt-2 border-t"><span>Total</span><span className="font-mono">{formatFCFA(dep)}</span></div>
            </div>
          </Card>
        )}
        <Card>
          <h3 className="font-bold mb-4">Articles simulés</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="p-2 text-left">Désignation</th><th className="p-2 text-center">Qté</th><th className="p-2 text-right">P.Achat</th><th className="p-2 text-right">P.Vente</th></tr></thead>
            <tbody>
              {arts.map((a, i) => (
                <tr key={i} className="border-b"><td className="p-2">{a.designation}</td><td className="p-2 text-center">{a.quantity}</td><td className="p-2 text-right font-mono">{formatFCFA(a.prixAchat)}</td><td className="p-2 text-right font-mono">{formatFCFA(a.prixVente)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-faso-text-800 flex items-center gap-2">
          <Calculator size={28} className="text-faso-primary" />
          Simulation et estimation de rentabilité
        </h2>
        <p className="text-faso-text-500 text-sm mt-1">
          En fonction de l&apos;enveloppe du marché, saisissez les prix d&apos;achat et de vente de chaque article pour comparer avec la facture soumise et estimer le bénéfice.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-t-4 border-t-blue-500">
          <h3 className="font-bold text-faso-text-800 mb-4">Nouvelle simulation</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-faso-text-600 mb-0.5">Référence</label>
                <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="DAO-2024-054" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-faso-text-600 mb-0.5">Titre *</label>
                <input type="text" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Fourniture matériel" className="w-full border rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-faso-text-600 mb-0.5">Entité</label>
                <input type="text" value={form.entite} onChange={(e) => setForm({ ...form, entite: e.target.value })} placeholder="Ministère..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-faso-text-600 mb-0.5">Enveloppe du marché (FCFA)</label>
                <input type="number" value={form.budgetEnvelope} onChange={(e) => setForm({ ...form, budgetEnvelope: e.target.value })} placeholder="5000000" className="w-full border rounded-lg px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block text-xs text-faso-text-600 mb-0.5">Enregistrement du marché (% de l&apos;enveloppe)</label>
                <input type="number" step="0.1" min="0" max="100" value={form.enregistrementPercent} onChange={(e) => setForm({ ...form, enregistrementPercent: e.target.value })} placeholder="Ex: 2 pour 2%" className="w-full border rounded-lg px-3 py-2 font-mono" />
                {envelope > 0 && enregistrementPct > 0 && (
                  <p className="text-xs text-faso-primary mt-1">= {enregistrementMontant.toLocaleString('fr-FR')} FCFA</p>
                )}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-faso-text-700">Dépenses (à saisir manuellement)</label>
                <button type="button" onClick={addDepense} className="text-blue-600 text-sm font-medium hover:underline">+ Ajouter</button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(form.depenses || []).map((d, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" value={d.libelle} onChange={(e) => updateDepense(idx, 'libelle', e.target.value)} placeholder="Libellé (timbres, papiers...)" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    <input type="number" value={d.montant || ''} onChange={(e) => updateDepense(idx, 'montant', Number(e.target.value) || 0)} placeholder="FCFA" className="w-28 border rounded-lg px-3 py-2 text-sm text-right font-mono" />
                    <button type="button" onClick={() => removeDepense(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                ))}
                {(form.depenses || []).length === 0 && (
                  <p className="text-xs text-faso-text-500">Timbres, papiers administratifs, documents à joindre, etc.</p>
                )}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-faso-text-700">Articles — Prix d&apos;achat vs Prix facturé</label>
                {apiMode && factures.length > 0 && (
                  <select onChange={handleSelectFacture} className="ml-auto border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:ring-2 focus:ring-faso-primary outline-none">
                    <option value="">— Partir d&apos;une facture —</option>
                    {factures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.numero} — {f.client} ({f.items?.length || 0} art.)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faso-text-400" size={18} />
                <input type="text" value={searchArticle} onChange={(e) => setSearchArticle(e.target.value)} placeholder="Rechercher un article du mercurial (code ou désignation)..." className="w-full pl-10 pr-4 py-2 border border-faso-border rounded-lg focus:ring-2 focus:ring-faso-primary outline-none text-sm" />
                {suggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                    {suggestions.map((art) => (
                      <li key={art.code + (art.id || '')} className="px-3 py-2 hover:bg-faso-statut-valide-bg cursor-pointer flex justify-between items-center gap-2" onClick={() => handleSelectArticle(art)}>
                        <span className="truncate flex-1">{art.designation}</span>
                        <span className="text-faso-primary font-mono text-xs shrink-0">
                          Min: {art.prix_min?.toLocaleString() ?? '—'} | Moy: {art.prix_moyen?.toLocaleString() ?? '—'} | Max: {art.prix_max?.toLocaleString() ?? '—'} F
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" onClick={addArticle} className="text-blue-600 text-sm font-medium hover:underline mb-2">+ Ajouter un article à la main</button>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-faso-text-600"><th className="p-2 text-left">Désignation</th><th className="p-2 w-16">Qté</th><th className="p-2 w-24 text-right">P.Achat</th><th className="p-2 w-24 text-right">P.Vente</th></tr></thead>
                  <tbody>
                    {form.articles.map((a, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2"><input type="text" value={a.designation} onChange={(e) => updateArticle(idx, 'designation', e.target.value)} className="w-full border-0 border-b bg-transparent px-1 py-0.5 text-sm" placeholder="Article" /></td>
                        <td className="p-2"><input type="number" min={1} value={a.quantity} onChange={(e) => updateArticle(idx, 'quantity', Number(e.target.value) || 1)} className="w-full border rounded px-2 py-1 text-sm" /></td>
                        <td className="p-2"><input type="number" value={a.prixAchat || ''} onChange={(e) => updateArticle(idx, 'prixAchat', Number(e.target.value) || 0)} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" placeholder="0" /></td>
                        <td className="p-2"><input type="number" value={a.prixVente || ''} onChange={(e) => updateArticle(idx, 'prixVente', Number(e.target.value) || 0)} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" placeholder="0" /></td>
                        <td className="p-2"><button type="button" onClick={() => removeArticle(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-t-4 border-t-emerald-500 bg-gradient-to-br from-emerald-50/50 to-white">
          <h3 className="font-bold text-faso-text-800 mb-6">Résultat de l&apos;estimation</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-faso-text-600">Total coût achat</span><span className="font-bold text-red-700">{formatFCFA(totalAchat)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-faso-text-600">Total chiffre d&apos;affaires (facture)</span><span className="font-bold text-faso-statut-valide">{formatFCFA(totalVente)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-faso-text-600">Marge sur articles</span><span className={`font-bold ${margeArticles >= 0 ? 'text-faso-statut-valide' : 'text-red-600'}`}>{formatFCFA(margeArticles)}</span></div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-faso-text-600">Enregistrement ({enregistrementPct}% de l&apos;enveloppe)</span><span className="font-mono">{formatFCFA(enregistrementMontant)}</span></div>
              <div className="flex justify-between"><span className="text-faso-text-600">Autres dépenses</span><span className="font-mono">{formatFCFA(autresDepenses)}</span></div>
              <div className="flex justify-between font-medium pt-1 border-t"><span className="text-faso-text-600">Total dépenses</span><span className="font-bold text-faso-statut-attente">{formatFCFA(totalDepenses)}</span></div>
            </div>
            <div className="flex justify-between text-lg pt-3 border-t-2 border-emerald-200"><span className="font-medium">Bénéfice net estimé</span><span className={`font-bold ${beneficeNet >= 0 ? 'text-faso-statut-valide' : 'text-red-600'}`}>{formatFCFA(beneficeNet)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-faso-text-600">Taux de marge</span><span className="font-bold">{tauxMarge} %</span></div>
            <button type="button" onClick={handleEnregistrer} disabled={saving || !form.titre.trim()} className="w-full mt-4 py-3 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover disabled:opacity-50 font-medium">
              {saving ? 'Enregistrement…' : 'Enregistrer la simulation → Créer le marché'}
            </button>
          </div>
        </Card>
      </div>

      {simulations.length > 0 && (
        <Card>
          <h3 className="font-bold text-faso-text-800 mb-4">Simulations enregistrées</h3>
          <div className="space-y-2">
            {simulations.map((sim) => (
              <div key={sim.id} onClick={() => setSelectedSim(sim)} className="flex justify-between items-center p-3 border rounded-lg hover:bg-faso-hover-bg cursor-pointer">
                <div>
                  <span className="font-medium">{sim.titre}</span>
                  <span className="ml-2 text-xs text-faso-text-500">{sim.reference || sim.marche?.reference}</span>
                  {sim.marche && <span className="ml-2 text-xs bg-faso-statut-valide-bg text-faso-statut-valide px-2 py-0.5 rounded">Marché créé</span>}
                </div>
                <span className="text-sm font-mono text-faso-statut-valide">
                  {formatFCFA((sim.articles || []).reduce((s, a) => s + (((a.prixVente || 0) - (a.prixAchat || 0)) * (a.quantity || 1)), 0) - (sim.totalDepenses || 0))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const AppelsOffresView = () => {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getAppelsOffres()
      .then((data) => setOffres(data.offres || []))
      .catch((err) => { setError(err.message); setOffres([]); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = offres.filter((o) =>
    !searchTerm || (o.titre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.entite || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const SOURCES = [
    { nom: 'GlobalTenders Burkina Faso', url: 'https://www.globaltenders.com/gov-tenders/fr-appels-doffres-burkina-faso', desc: '670+ avis actifs' },
    { nom: 'BurkinaFasoTenders', url: 'https://www.burkinafasotenders.com/', desc: 'Base complète' },
    { nom: 'DGCMEF (Quotidien officiel)', url: 'https://www.dgcmef.gov.bf/', desc: 'Publication officielle' },
    { nom: 'CCI Burkina Faso', url: 'https://www.cci.bf/', desc: 'Chambre de commerce' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-faso-text-800 flex items-center gap-2">
            <BookOpen size={28} className="text-faso-primary" />
            Appels d&apos;Offres Burkina Faso
          </h2>
          <p className="text-faso-text-500 text-sm mt-1">Tous les avis de marchés publics — Ministères, ONEA, SONABEL, CAMEG, etc.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher (titre, entité...)"
            className="flex-1 md:w-64 border border-faso-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-faso-primary outline-none"
          />
          <a href="https://www.globaltenders.com/gov-tenders/fr-appels-doffres-burkina-faso" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover text-sm font-medium">
            <ExternalLink size={18} />
            Voir tout
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <Card className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-faso-primary" />
            </Card>
          )}
          {error && (
            <Card className="border-faso-statut-attente/30 bg-faso-statut-attente-bg">
              <p className="text-amber-800 text-sm">{error}</p>
              <p className="text-amber-600 text-xs mt-1">Affichage des données de repli.</p>
            </Card>
          )}
          {!loading && filtered.length === 0 && (
            <Card><p className="text-faso-text-500 text-center py-8">Aucun appel d&apos;offres trouvé.</p></Card>
          )}
          {!loading && filtered.map((offre) => (
            <Card key={offre.id} className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-indigo-500 group">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="text-xs font-mono font-bold bg-faso-statut-brouillon-bg text-faso-text-secondary px-2 py-1 rounded border border-faso-border">{offre.id}</span>
                    <Badge status={offre.statut || 'Ouvert'} />
                  </div>
                  <h3 className="text-lg font-bold text-faso-text-800 group-hover:text-faso-primary transition-colors line-clamp-2">{offre.titre}</h3>
                  <p className="text-sm text-faso-text-500 flex items-center mt-2"><Building2 size={16} className="mr-1.5 text-faso-text-400 shrink-0" />{offre.entite}</p>
                  {(offre.datePublication || offre.dateLimite) && (
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-faso-text-500">
                      {offre.datePublication && <span className="flex items-center"><Clock size={14} className="mr-1" />Publié: {offre.datePublication}</span>}
                      {offre.dateLimite && <span className="flex items-center text-rose-600 font-medium">Limite: {offre.dateLimite}</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedOffre(offre)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    Détails
                  </button>
                  <a
                    href={offre.lien || 'https://www.globaltenders.com/gov-tenders/fr-appels-doffres-burkina-faso'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-indigo-200 text-faso-primary rounded-lg text-sm font-medium hover:bg-faso-statut-valide-bg transition-colors"
                  >
                    <ExternalLink size={16} />
                    Ouvrir
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card className="border-t-4 border-t-indigo-500">
            <h3 className="font-bold text-faso-text-800 mb-3">Sources officielles</h3>
            <div className="space-y-2">
              {SOURCES.map((s) => (
                <a key={s.nom} href={s.url} target="_blank" rel="noopener noreferrer" className="block p-3 border border-faso-border rounded-lg hover:bg-faso-statut-valide-bg hover:border-indigo-200 transition-colors group">
                  <span className="font-medium text-faso-text-800 group-hover:text-faso-primary">{s.nom}</span>
                  <p className="text-xs text-faso-text-500 mt-0.5">{s.desc}</p>
                </a>
              ))}
            </div>
          </Card>
          {selectedOffre && (
            <Card className="border-t-4 border-t-faso-statut-attente bg-faso-statut-attente-bg/30">
              <h3 className="font-bold text-faso-text-800 mb-2">Détails sélectionnés</h3>
              <p className="text-sm text-faso-text-700 mb-2">{selectedOffre.titre}</p>
              <p className="text-xs text-faso-text-500 mb-3">{selectedOffre.entite}</p>
              <a href={selectedOffre.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-faso-primary font-medium text-sm hover:underline">
                <ExternalLink size={16} /> Voir la fiche complète
              </a>
              <button onClick={() => setSelectedOffre(null)} className="block mt-2 text-xs text-faso-text-500 hover:text-faso-text-700">Fermer</button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

/** Libellés des statuts de suivi paiement */
const STATUT_SUIVI_LABELS = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  en_cours_daf: 'En cours DAF',
  validee_daf: 'Validée DAF',
  en_cours_tresor: 'En cours Trésor',
  payee: 'Payée',
};

/** Couleurs des badges par statut */
const STATUT_SUIVI_STYLES = {
  brouillon: 'bg-faso-statut-brouillon-bg text-faso-statut-brouillon border-faso-border',
  envoyee: 'bg-faso-statut-valide-bg text-blue-700 border-violet-200',
  en_cours_daf: 'bg-faso-statut-attente-bg text-faso-statut-attente border-faso-statut-attente/30',
  validee_daf: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  en_cours_tresor: 'bg-purple-50 text-purple-700 border-purple-200',
  payee: 'bg-faso-statut-valide-bg text-faso-statut-valide border-emerald-200',
};

const SUIVI_ALERTES_KEY = 'fasomarches_suivi_alertes';

const SuiviPaiementsView = ({ onEditBrouillon, refreshTrigger }) => {
  const navigate = useNavigate();
  const { apiMode } = useAuth();
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [showAlertesModal, setShowAlertesModal] = useState(false);
  const [alertesConfig, setAlertesConfig] = useState(() => {
    try {
      const s = localStorage.getItem(SUIVI_ALERTES_KEY);
      return s ? JSON.parse(s) : { payee: true, tresor: true, daf: false };
    } catch { return { payee: true, tresor: true, daf: false }; }
  });
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (apiMode) {
      setLoading(true);
      api.getFactures()
        .then(setFactures)
        .catch(() => setFactures([]))
        .finally(() => setLoading(false));
    } else {
      setFactures([]);
      setLoading(false);
    }
  }, [apiMode, refreshTrigger]);

  const facturesByStatut = useMemo(() => {
    const map = { brouillon: 0, envoyee: 0, en_cours_daf: 0, validee_daf: 0, en_cours_tresor: 0, payee: 0 };
    factures.forEach((f) => {
      const s = f.statut || 'brouillon';
      map[s] = (map[s] ?? 0) + 1;
    });
    return map;
  }, [factures]);

  const filtered = useMemo(() => {
    let list = factures;
    if (filterStatut) list = list.filter((f) => (f.statut || 'brouillon') === filterStatut);
    const q = (searchClient || '').trim().toLowerCase();
    if (q) list = list.filter((f) => (f.client || '').toLowerCase().includes(q));
    return list;
  }, [factures, filterStatut, searchClient]);

  const handleDeleteFacture = async (f) => {
    if (f.statut === 'payee') return;
    if (!window.confirm(`Supprimer la facture ${f.numero} (${f.client}) ? Cette action est irréversible.`)) return;
    setDeletingId(f.id);
    try {
      await api.deleteFacture(f.id);
      setFactures((prev) => prev.filter((x) => x.id !== f.id));
    } catch (err) {
      alert(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangeStatut = async (factureId, newStatut) => {
    if (!apiMode) return;
    setUpdatingId(factureId);
    try {
      const updated = await api.patchFactureStatut(factureId, newStatut);
      setFactures((prev) => prev.map((f) => (f.id === factureId ? { ...f, statut: updated.statut, quittance: updated.quittance } : f)));
    } catch (err) {
      alert(err.message || 'Erreur lors du changement de statut');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveAlertes = (config) => {
    setAlertesConfig(config);
    try {
      localStorage.setItem(SUIVI_ALERTES_KEY, JSON.stringify(config));
    } catch {}
    setShowAlertesModal(false);
  };

  const formatPrix = (n) => (n != null && !isNaN(n) ? `${Number(n).toLocaleString('fr-FR')} F` : '—');
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

  if (!apiMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="bg-faso-statut-brouillon-bg p-6 rounded-full mb-4"><CheckCircle size={48} className="text-faso-text-secondary" /></div>
        <h3 className="text-xl font-bold text-faso-text-800 mb-2">Suivi des Paiements</h3>
        <p className="text-faso-text-500 max-w-md">Connectez le serveur API pour accéder au suivi de l'état d'avancement de vos dossiers au Trésor Public et DAF ministérielles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-faso-text-900">Suivi des Paiements</h2>
          <p className="text-faso-text-500 text-sm">État d'avancement de vos dossiers au Trésor Public et DAF ministérielles</p>
        </div>
        <button
          onClick={() => setShowAlertesModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-faso-border text-faso-text-700 rounded-lg hover:bg-faso-hover-bg font-medium"
        >
          <Bell size={18} />
          Configurer les alertes
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(STATUT_SUIVI_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterStatut(filterStatut === key ? '' : key)}
            className={`p-4 rounded-xl border text-left transition-all ${
              filterStatut === key ? 'ring-2 ring-blue-500 bg-white shadow' : 'bg-white hover:shadow border-faso-border'
            }`}
          >
            <p className="text-xs font-medium text-faso-text-500">{label}</p>
            <p className="text-2xl font-bold text-faso-text-900 mt-1">{facturesByStatut[key] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-faso-border overflow-hidden">
        <div className="p-4 border-b border-faso-border flex flex-wrap items-center gap-2">
          <span className="text-sm text-faso-text-500">Filtrer :</span>
          <input
            type="text"
            placeholder="Rechercher par client..."
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
            className="border border-faso-border rounded-lg px-3 py-1.5 text-sm w-48"
          />
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="border border-faso-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Toutes les factures</option>
            {Object.entries(STATUT_SUIVI_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          {(filterStatut || searchClient) && (
            <button onClick={() => { setFilterStatut(''); setSearchClient(''); }} className="text-sm text-blue-600 hover:underline">
              Effacer les filtres
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-faso-text-500">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-faso-text-500">
            {filterStatut && searchClient
              ? `Aucune facture pour « ${searchClient} » avec ce statut`
              : filterStatut
                ? `Aucune facture avec le statut « ${STATUT_SUIVI_LABELS[filterStatut]} »`
                : searchClient
                  ? `Aucun client ne correspond à « ${searchClient} »`
                  : 'Aucune facture à afficher'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-faso-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-faso-text-500 uppercase">N° Facture</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-faso-text-500 uppercase">Client / DAF</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-faso-text-500 uppercase">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-faso-text-500 uppercase">Montant TTC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-faso-text-500 uppercase">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-faso-text-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className="border-b border-faso-border hover:bg-faso-hover-bg/50">
                    <td className="px-4 py-3 font-mono text-sm text-faso-text-800">{f.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-faso-text-900">{f.client}</p>
                      {f.clientDirection && <p className="text-xs text-faso-text-500">{f.clientDirection}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-faso-text-600">{formatDate(f.dateFacture)}</td>
                    <td className="px-4 py-3 text-right font-medium text-faso-text-900">{formatPrix(f.totalTTC ?? f.netAPayer)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUT_SUIVI_STYLES[f.statut] || 'bg-faso-hover-bg text-faso-text-600'}`}>
                        {STATUT_SUIVI_LABELS[f.statut] || f.statut || 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {f.statut !== 'payee' && onEditBrouillon && (
                          <button
                            onClick={() => onEditBrouillon(f.id, f)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-faso-statut-valide-bg text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100"
                          >
                            <Edit2 size={14} />
                            Modifier
                          </button>
                        )}
                        {f.statut !== 'payee' && (
                          <button
                            onClick={() => handleDeleteFacture(f)}
                            disabled={deletingId === f.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                            title="Supprimer la facture"
                          >
                            {deletingId === f.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Supprimer
                          </button>
                        )}
                        {f.statut !== 'payee' && (
                          <select
                            value={f.statut}
                            onChange={(e) => handleChangeStatut(f.id, e.target.value)}
                            disabled={updatingId === f.id}
                            className="border border-faso-border rounded-lg px-2 py-1 text-xs"
                          >
                            {Object.entries(STATUT_SUIVI_LABELS)
                              .filter(([k]) => k !== 'payee')
                              .map(([k, l]) => (
                                <option key={k} value={k}>{l}</option>
                              ))}
                          </select>
                        )}
                        {f.statut === 'payee' && f.quittance && (
                          <button
                            onClick={() => navigate('/quittances')}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-faso-statut-valide rounded-lg text-xs font-medium hover:bg-emerald-100"
                          >
                            <FileCheck size={14} />
                            Quittance {f.quittance.numero}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAlertesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-faso-text-900 mb-4">Configurer les alertes</h3>
            <p className="text-sm text-faso-text-500 mb-4">
              Choisissez les événements pour lesquels vous souhaitez être notifié (paramètres sauvegardés localement).
            </p>
            <div className="space-y-3">
              {[
                { key: 'payee', label: 'Facture payée', desc: 'Notification quand une facture est réglée' },
                { key: 'tresor', label: 'Arrivée au Trésor', desc: 'Alertes sur les dossiers transmis au Trésor Public' },
                { key: 'daf', label: 'Validation DAF', desc: 'Alertes sur la validation par la DAF ministérielle' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 rounded-lg border border-faso-border hover:bg-faso-hover-bg/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!alertesConfig[key]}
                    onChange={(e) => setAlertesConfig((c) => ({ ...c, [key]: e.target.checked }))}
                    className="mt-1 rounded border-faso-border"
                  />
                  <div>
                    <p className="font-medium text-faso-text-900">{label}</p>
                    <p className="text-xs text-faso-text-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowAlertesModal(false)} className="flex-1 py-2.5 border border-faso-border rounded-xl text-faso-text-700 font-medium">
                Annuler
              </button>
              <button onClick={() => handleSaveAlertes(alertesConfig)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sites officiels Burkina Faso pour les demandes de documents administratifs
const OFFICIAL_SITES_BF = {
  'attestation-fiscale': { url: 'https://esintax.bf/', name: 'eSintax (DGI)', desc: 'Attestations fiscales, IFU, déclarations' },
  'extrait-rccm': { url: 'https://fichiernationalrccm.bf/', name: 'Fichier national RCCM', desc: 'Extraits RCCM, réservation de noms' },
  'certificat-bonne-execution': { url: 'https://servicepublic.gov.bf/', name: 'Service Public BF', desc: 'Démarches et formulaires officiels' },
  'attestation-non-gage': { url: 'https://servicepublic.gov.bf/', name: 'Service Public BF', desc: 'Démarches administratives' },
  'attestation-employeur': { url: 'https://cnssbf.org/', name: 'CNSS Burkina Faso', desc: 'E-services CNSS, attestations employeur' },
  'autre': { url: 'https://servicepublic.gov.bf/', name: 'Service Public BF', desc: 'Portail des démarches en ligne' },
};

const DOC_TYPES = [
  { id: 'attestation-fiscale', label: 'Attestation fiscale / IFU', desc: 'Attestation de situation au regard de la TVA, impôts' },
  { id: 'extrait-rccm', label: 'Extrait RCCM', desc: 'Extrait du Registre du Commerce et du Crédit Mobilier' },
  { id: 'certificat-bonne-execution', label: 'Certificat de bonne exécution', desc: 'Pour marchés publics en cours ou terminés' },
  { id: 'attestation-non-gage', label: 'Attestation de non gage', desc: 'Attestation qu\'aucun matériel n\'est gagé' },
  { id: 'attestation-employeur', label: 'Attestation employeur / CNSS', desc: 'Situation vis-à-vis de la CNSS' },
  { id: 'autre', label: 'Autre document', desc: 'Demande sur mesure (précisez en commentaire)' },
];

const DocumentsAdminView = () => {
  const [selectedType, setSelectedType] = useState('');
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); setSelectedType(''); setComment(''); }, 800);
  };
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-faso-statut-valide-bg rounded-xl text-faso-primary">
            <FolderSearch size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-faso-text-900">Demande de documents administratifs</h2>
            <p className="text-sm text-faso-text-500">Accédez aux sites officiels du Burkina Faso ou enregistrez une demande sur la plateforme.</p>
          </div>
        </div>
        <div className="mb-6 p-4 bg-faso-hover-bg border border-faso-border rounded-xl">
          <p className="text-sm font-semibold text-faso-text-800 mb-2">Sites officiels Burkina Faso (demandes en ligne)</p>
          <ul className="text-sm text-faso-text-600 space-y-1 mb-3">
            <li>• <strong>RCCM / Extrait :</strong> <a href="https://fichiernationalrccm.bf/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">fichiernationalrccm.bf</a></li>
            <li>• <strong>Fiscal / IFU (eSintax) :</strong> <a href="https://esintax.bf/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">esintax.bf</a></li>
            <li>• <strong>CNSS :</strong> <a href="https://cnssbf.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">cnssbf.org</a></li>
            <li>• <strong>Démarches générales :</strong> <a href="https://servicepublic.gov.bf/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">servicepublic.gov.bf</a></li>
          </ul>
          <p className="text-xs text-faso-text-500">Ouvrez le lien correspondant à votre document pour faire votre demande directement sur le portail officiel.</p>
        </div>
        {sent ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <CheckCircle className="mx-auto text-faso-statut-valide mb-2" size={40} />
            <p className="font-medium text-emerald-800">Demande enregistrée</p>
            <p className="text-sm text-faso-statut-valide mt-1">Votre demande sera traitée par l’équipe. Vous serez notifié par email.</p>
            <button onClick={() => setSent(false)} className="mt-4 text-faso-statut-valide underline font-medium">Faire une autre demande</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-faso-text-700 mb-2">Type de document</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DOC_TYPES.map((doc) => (
                  <label
                    key={doc.id}
                    className={`flex gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedType === doc.id ? 'border-violet-500 bg-faso-statut-valide-bg' : 'border-faso-border hover:border-faso-border'}`}
                  >
                    <input type="radio" name="docType" value={doc.id} checked={selectedType === doc.id} onChange={() => setSelectedType(doc.id)} className="mt-1" />
                    <div>
                      <p className="font-medium text-faso-text-900">{doc.label}</p>
                      <p className="text-xs text-faso-text-500">{doc.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {selectedType && OFFICIAL_SITES_BF[selectedType] && (
              <div className="p-4 bg-faso-statut-valide-bg border border-violet-200 rounded-xl flex flex-wrap items-center gap-3">
                <ExternalLink size={22} className="text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900">Demander ce document sur le site officiel</p>
                  <p className="text-sm text-blue-700">{OFFICIAL_SITES_BF[selectedType].name} — {OFFICIAL_SITES_BF[selectedType].desc}</p>
                </div>
                <a href={OFFICIAL_SITES_BF[selectedType].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  <ExternalLink size={18} />
                  Ouvrir le site officiel
                </a>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-faso-text-700 mb-2">Commentaire (optionnel)</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full border border-faso-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="Précisions, urgence, destinataire..." />
            </div>
            <button type="submit" disabled={!selectedType || loading} className="flex items-center gap-2 px-6 py-3 bg-faso-primary text-white rounded-xl font-medium hover:bg-faso-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              Envoyer la demande
            </button>
          </form>
        )}
      </Card>
    </div>
  );
};

const DAO_SECTIONS = [
  { id: 'admin', label: 'Pièces administratives', items: ['Extrait RCCM', 'Attestation fiscale', 'Certificat de bonne exécution', 'Statuts / PV nomination', 'Liste des dirigeants'] },
  { id: 'technique', label: 'Offre technique', items: ['Lettre de présentation', 'Mémoire technique', 'Organigramme', 'Planning d’exécution', 'Références et réalisations'] },
  { id: 'financier', label: 'Offre financière', items: ['DPGF / Bordereau de prix', 'Devis détaillé', 'Récapitulatif des coûts'] },
];

const EXEMPLAIRES_DAO = [
  { id: 'fourniture', label: 'DAO Fourniture', description: 'Bordereau de prix pour fournitures (quantités × P.U., totaux auto)' },
  { id: 'prestations', label: 'DAO Prestations de services', description: 'Prestations, honoraires, jours/homme (calculs auto)' },
  { id: 'travaux', label: 'DAO Travaux', description: 'Lots et sous-détails, montants calculés automatiquement' },
];

const MontageDaoView = () => {
  const { currentUser, getCompanyEntete } = useAuth();
  const [exemplaire, setExemplaire] = useState(null);
  const [marcheRef, setMarcheRef] = useState({ numero: '', objet: '' });
  const [lignesFinancieres, setLignesFinancieres] = useState([{ designation: '', quantity: 1, unite: 'U', priceUnit: 0 }]);
  const [checks, setChecks] = useState({});
  const [attachments, setAttachments] = useState({});
  const emetteur = useMemo(() => {
    const entete = getCompanyEntete?.(currentUser?.companyId) || {};
    const company = currentUser?.company || {};
    return {
      name: entete.name ?? company.name ?? 'Entreprise',
      ifu: entete.ifu ?? company.ifu ?? '',
      rccm: entete.rccm ?? company.rccm ?? '',
      address: entete.address ?? company.address ?? '',
      contact: entete.contact ?? company.contact ?? company.phone ?? '',
    };
  }, [currentUser, getCompanyEntete]);
  const totauxFinanciers = useMemo(() => {
    let totalHT = 0;
    const lignes = lignesFinancieres.map((l) => {
      const q = Number(l.quantity) || 0;
      const pu = Number(l.priceUnit) || 0;
      const total = q * pu;
      totalHT += total;
      return { ...l, total };
    });
    return { lignes, totalHT };
  }, [lignesFinancieres]);
  const addLigne = () => setLignesFinancieres((l) => [...l, { designation: '', quantity: 1, unite: 'U', priceUnit: 0 }]);
  const updateLigne = (idx, field, value) => setLignesFinancieres((l) => l.map((x, i) => (i === idx ? { ...x, [field]: value } : x)));
  const removeLigne = (idx) => setLignesFinancieres((l) => (l.length > 1 ? l.filter((_, i) => i !== idx) : l));
  const toggle = (sectionId, itemIdx) => {
    setChecks((c) => ({ ...c, [`${sectionId}-${itemIdx}`]: !c[`${sectionId}-${itemIdx}`] }));
  };
  const onFile = (sectionId, itemIdx, e) => {
    const file = e.target.files?.[0];
    const key = `${sectionId}-${itemIdx}`;
    if (file) setAttachments((a) => ({ ...a, [key]: { fileName: file.name, file } }));
    e.target.value = '';
  };
  const removeFile = (sectionId, itemIdx) => {
    const key = `${sectionId}-${itemIdx}`;
    setAttachments((a) => { const next = { ...a }; delete next[key]; return next; });
  };
  const total = DAO_SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
  const done = Object.values(checks).filter(Boolean).length;
  const filesCount = Object.keys(attachments).length;
  const handleExportDao = () => {
    const attMap = {};
    Object.entries(attachments).forEach(([k, v]) => { attMap[k] = { fileName: v.fileName }; });
    exportDaoPdf(DAO_SECTIONS, attMap, {
      emetteur,
      marcheRef,
      lignesFinancieres: totauxFinanciers.lignes,
      totalHT: totauxFinanciers.totalHT,
      exemplaireLabel: exemplaire ? EXEMPLAIRES_DAO.find((e) => e.id === exemplaire)?.label : '',
    });
  };
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-faso-statut-attente-bg rounded-xl text-amber-600">
            <FolderInput size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-faso-text-900">Montage de DAO (Dossier d’Appel d’Offres)</h2>
            <p className="text-sm text-faso-text-500">Choisissez un exemplaire, remplissage auto (entreprise + marché) et calculs automatiques du bordereau.</p>
          </div>
        </div>
        <div className="mb-6">
          <p className="text-sm font-semibold text-faso-text-700 mb-2">Choisir un exemplaire de DAO</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXEMPLAIRES_DAO.map((ex) => (
              <button key={ex.id} type="button" onClick={() => setExemplaire(ex.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${exemplaire === ex.id ? 'border-amber-500 bg-faso-statut-attente-bg' : 'border-faso-border hover:border-amber-300'}`}>
                <p className="font-semibold text-faso-text-900">{ex.label}</p>
                <p className="text-xs text-faso-text-500 mt-1">{ex.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6 p-4 bg-faso-hover-bg rounded-xl">
          <p className="text-sm font-semibold text-faso-text-700 mb-2">Données pré-remplies (votre entreprise)</p>
          <div className="text-sm text-faso-text-600 space-y-1">
            <p><strong>{emetteur.name}</strong></p>
            {emetteur.ifu && <p>IFU : {emetteur.ifu}</p>}
            {emetteur.rccm && <p>RCCM : {emetteur.rccm}</p>}
            {emetteur.address && <p>{emetteur.address}</p>}
            {emetteur.contact && <p>{emetteur.contact}</p>}
            {!emetteur.ifu && !emetteur.rccm && <p className="text-faso-text-500">Renseignez l'entête entreprise dans Administration pour pré-remplir.</p>}
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-faso-text-700 mb-1">Référence marché (optionnel)</label>
            <input type="text" placeholder="N° marché" value={marcheRef.numero} onChange={(e) => setMarcheRef((m) => ({ ...m, numero: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-faso-text-700 mb-1">Objet du marché</label>
            <input type="text" placeholder="Objet" value={marcheRef.objet} onChange={(e) => setMarcheRef((m) => ({ ...m, objet: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-faso-text-700">Bordereau de prix (calculs automatiques)</p>
            <button type="button" onClick={addLigne} className="inline-flex items-center gap-1 text-faso-statut-attente font-medium text-sm hover:underline">
              <Plus size={18} />
              Ajouter une ligne
            </button>
          </div>
          <div className="overflow-x-auto border border-faso-border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-faso-statut-brouillon-bg">
                  <th className="text-left p-2 font-semibold">Désignation</th>
                  <th className="text-right p-2 w-20 font-semibold">Qté</th>
                  <th className="text-center p-2 w-16 font-semibold">Unité</th>
                  <th className="text-right p-2 w-28 font-semibold">P.U. HT</th>
                  <th className="text-right p-2 w-28 font-semibold">Total HT</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {totauxFinanciers.lignes.map((l, idx) => (
                  <tr key={idx} className="border-t border-faso-border">
                    <td className="p-2"><input type="text" value={l.designation} onChange={(e) => updateLigne(idx, 'designation', e.target.value)} placeholder="Désignation" className="w-full border-0 bg-transparent focus:ring-0 p-0 text-faso-text-900" /></td>
                    <td className="p-2 text-right"><input type="number" min={0} step={1} value={l.quantity} onChange={(e) => updateLigne(idx, 'quantity', e.target.value)} className="w-full border border-faso-border rounded px-2 py-1 text-right" /></td>
                    <td className="p-2"><input type="text" value={l.unite} onChange={(e) => updateLigne(idx, 'unite', e.target.value)} className="w-full border border-faso-border rounded px-2 py-1 text-center" placeholder="U" /></td>
                    <td className="p-2 text-right"><input type="number" min={0} step={1} value={l.priceUnit || ''} onChange={(e) => updateLigne(idx, 'priceUnit', e.target.value)} className="w-full border border-faso-border rounded px-2 py-1 text-right" /></td>
                    <td className="p-2 text-right font-medium text-faso-text-900">{Number(l.total || 0).toLocaleString('fr-FR')} F</td>
                    <td className="p-1"><button type="button" onClick={() => removeLigne(idx)} className="text-red-500 hover:text-red-700 p-1" title="Supprimer"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm font-bold text-faso-text-800">Total HT : {totauxFinanciers.totalHT.toLocaleString('fr-FR')} F CFA</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 p-4 bg-faso-hover-bg rounded-xl mb-6">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium text-faso-text-600">Progression du dossier</p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-faso-accent rounded-full transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
          <span className="text-sm font-bold text-faso-text-800">{done} / {total} pièces cochées</span>
          <span className="text-sm text-faso-text-600">{filesCount} fichier(s) joint(s)</span>
        </div>
        <div className="space-y-8">
          {DAO_SECTIONS.map((section) => (
            <div key={section.id}>
              <h3 className="text-lg font-semibold text-faso-text-900 mb-4 flex items-center gap-2">
                <CheckSquare size={20} className="text-amber-600" />
                {section.label}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item, idx) => {
                  const key = `${section.id}-${idx}`;
                  const att = attachments[key];
                  return (
                    <li key={idx} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-faso-border hover:bg-faso-hover-bg">
                      <label className="flex items-center gap-3 cursor-pointer shrink-0">
                        <input type="checkbox" checked={!!checks[key]} onChange={() => toggle(section.id, idx)} className="rounded border-faso-border" />
                        <span className="text-faso-text-800">{item}</span>
                      </label>
                      <div className="flex items-center gap-2 ml-auto">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-faso-statut-attente-bg text-amber-800 rounded-lg text-sm font-medium hover:bg-faso-statut-attente-bg/80">
                          <FileText size={16} />
                          {att ? 'Remplacer' : 'Joindre un fichier'}
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => onFile(section.id, idx, e)} />
                        </label>
                        {att && (
                          <span className="flex items-center gap-1.5 text-sm text-faso-text-600">
                            <span className="max-w-[180px] truncate" title={att.fileName}>{att.fileName}</span>
                            <button type="button" onClick={() => removeFile(section.id, idx)} className="text-red-600 hover:text-red-700 p-0.5" title="Retirer le fichier">
                              <Trash2 size={14} />
                            </button>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={handleExportDao} className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700">
            <Download size={20} />
            Exporter le DAO (PDF)
          </button>
          <p className="text-sm text-faso-text-500">Génère un récapitulatif PDF listant toutes les pièces et les fichiers joints.</p>
        </div>
      </Card>
    </div>
  );
};

function calculPaieBurkina(brut) {
  const b = Number(brut) || 0;
  const cotSalarie = Math.min(b * 0.07, 50000);
  const cotEmployeur = Math.min(b * 0.16, 100000);
  const baseIuts = Math.max(0, b - 25000);
  let iuts = 0;
  if (baseIuts > 0) iuts = baseIuts * 0.121;
  if (baseIuts > 75000) iuts = 9075 + (baseIuts - 75000) * 0.139;
  const net = b - cotSalarie - iuts;
  return { brut: b, cotSalarie, cotEmployeur, iuts, net };
}

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const GestionRHView = () => {
  const { currentUser, getCompanyEntete } = useAuth();
  const [section, setSection] = useState('effectifs');
  const [effectifs, setEffectifs] = useState([]);
  const [formEmp, setFormEmp] = useState({ nom: '', prenom: '', dateEmbauche: '', poste: '', salaireBrut: '', typeContrat: 'CDI' });
  const [formPaie, setFormPaie] = useState({ salaireBrut: 0 });
  const now = new Date();
  const [bulletinSelection, setBulletinSelection] = useState({ effectif: null, mois: now.getMonth() + 1, annee: now.getFullYear() });
  const tabs = [
    { id: 'effectifs', label: 'Effectifs' },
    { id: 'contrats', label: 'Contrats' },
    { id: 'conges', label: 'Congés / Absences' },
    { id: 'paie', label: 'Paie' },
  ];
  const smig = DROIT_TRAVAIL_BURKINA.smig.secteurGeneral;
  const calcPaie = useMemo(() => calculPaieBurkina(formPaie.salaireBrut), [formPaie.salaireBrut]);
  const enteteCompany = useMemo(() => {
    const entete = getCompanyEntete?.(currentUser?.companyId) || {};
    const company = currentUser?.company || {};
    return {
      name: entete.name ?? company.name ?? 'Entreprise',
      address: entete.address ?? company.address ?? '',
      contact: entete.contact ?? company.contact ?? company.phone ?? '',
      ifu: entete.ifu ?? company.ifu ?? '',
      rccm: entete.rccm ?? company.rccm ?? '',
    };
  }, [currentUser, getCompanyEntete]);
  const addEffectif = (e) => {
    e.preventDefault();
    if (!formEmp.nom?.trim()) return;
    setEffectifs((l) => {
      const nextMatricule = String(l.length + 1).padStart(3, '0');
      return [...l, { id: Date.now().toString(), ...formEmp, matricule: nextMatricule, salaireBrut: Number(formEmp.salaireBrut) || 0 }];
    });
    setFormEmp({ nom: '', prenom: '', dateEmbauche: '', poste: '', salaireBrut: '', typeContrat: 'CDI' });
  };
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 rounded-xl text-faso-primary">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-faso-text-900">Gestion RH</h2>
            <p className="text-sm text-faso-text-500">Effectifs, contrats, congés et paie — droit du travail Burkina (Code 2008-28, SMIG {smig.toLocaleString('fr-FR')} F/mois).</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setSection(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium ${section === t.id ? 'bg-faso-primary text-white' : 'bg-faso-hover-bg text-faso-text-700 hover:bg-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {section === 'effectifs' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Liste des effectifs et fiches employés. Référence : Code du travail Burkina Faso (Loi 2008-28).</p>
            <form onSubmit={addEffectif} className="p-4 bg-faso-hover-bg rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="Nom *" value={formEmp.nom} onChange={(e) => setFormEmp((f) => ({ ...f, nom: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" required />
              <input type="text" placeholder="Prénom" value={formEmp.prenom} onChange={(e) => setFormEmp((f) => ({ ...f, prenom: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" />
              <input type="date" placeholder="Date embauche" value={formEmp.dateEmbauche} onChange={(e) => setFormEmp((f) => ({ ...f, dateEmbauche: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" />
              <input type="text" placeholder="Poste" value={formEmp.poste} onChange={(e) => setFormEmp((f) => ({ ...f, poste: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" />
              <input type="number" placeholder="Salaire brut (F)" value={formEmp.salaireBrut} onChange={(e) => setFormEmp((f) => ({ ...f, salaireBrut: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" min={smig} />
              <select value={formEmp.typeContrat} onChange={(e) => setFormEmp((f) => ({ ...f, typeContrat: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2">
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
              </select>
              <button type="submit" className="px-4 py-2 bg-faso-primary text-white rounded-lg font-medium hover:bg-faso-primary-hover">Ajouter</button>
            </form>
            <p className="text-xs text-faso-text-500">Le matricule est attribué automatiquement par ordre d'arrivée (001, 002, …).</p>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead><tr className="bg-faso-statut-brouillon-bg"><th className="text-left p-2">Matricule</th><th className="text-left p-2">Nom</th><th className="text-left p-2">Poste</th><th className="text-right p-2">Salaire brut</th><th className="p-2">Contrat</th></tr></thead>
                <tbody>
                  {effectifs.map((e) => (
                    <tr key={e.id} className="border-t"><td className="p-2 font-mono font-medium">{e.matricule || '—'}</td><td className="p-2">{e.nom} {e.prenom}</td><td className="p-2">{e.poste || '—'}</td><td className="p-2 text-right">{Number(e.salaireBrut || 0).toLocaleString('fr-FR')} F</td><td className="p-2">{e.typeContrat}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {section === 'contrats' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Contrats de travail : CDI, CDD (Code du travail Burkina — Loi 2008-28). Durée max CDD et renouvellements selon textes.</p>
            <div className="p-4 bg-faso-hover-bg rounded-xl text-sm text-faso-text-700 space-y-2">
              <p><strong>CDI</strong> : contrat à durée indéterminée.</p>
              <p><strong>CDD</strong> : contrat à durée déterminée, renouvellement limité.</p>
              <p>Données contrats liées aux effectifs ci-dessus. Pour une gestion complète, liez à une base de données.</p>
            </div>
          </div>
        )}
        {section === 'conges' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Congés annuels : {DROIT_TRAVAIL_BURKINA.conges.annuels} Maladie et maternité selon Code du travail.</p>
            <div className="p-4 bg-faso-hover-bg rounded-xl text-sm text-faso-text-700 space-y-2">
              <p><strong>Congés annuels</strong> : {DROIT_TRAVAIL_BURKINA.conges.annuels}</p>
              <p><strong>Congés maladie</strong> : {DROIT_TRAVAIL_BURKINA.conges.maladie}</p>
              <p><strong>Maternité</strong> : {DROIT_TRAVAIL_BURKINA.conges.maternite}</p>
            </div>
          </div>
        )}
        {section === 'paie' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Simulateur paie Burkina : IUTS (impôt salaires), CNSS (cotisations). SMIG : {smig.toLocaleString('fr-FR')} F/mois. Générez et imprimez les bulletins de paie.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-faso-hover-bg rounded-xl">
                <label className="block text-sm font-medium mb-2">Salaire brut mensuel (F CFA)</label>
                <input type="number" min={smig} value={formPaie.salaireBrut || ''} onChange={(e) => setFormPaie({ salaireBrut: e.target.value })} className="w-full border border-faso-border rounded-lg px-3 py-2" placeholder={String(smig)} />
              </div>
              <div className="p-4 bg-white border rounded-xl space-y-2">
                <p><strong>Salaire brut</strong> : {calcPaie.brut.toLocaleString('fr-FR')} F</p>
                <p>CNSS salarié (≈7 %) : - {calcPaie.cotSalarie.toLocaleString('fr-FR')} F</p>
                <p>IUTS (estim.) : - {calcPaie.iuts.toLocaleString('fr-FR')} F</p>
                <p><strong>Net à payer</strong> : {calcPaie.net.toLocaleString('fr-FR')} F</p>
                <p className="text-xs text-faso-text-500">CNSS employeur (≈16 %) : {calcPaie.cotEmployeur.toLocaleString('fr-FR')} F (charge employeur)</p>
              </div>
            </div>
            <div className="p-4 bg-faso-hover-bg rounded-xl border border-faso-border space-y-4">
              <h3 className="font-semibold text-faso-text-900">Imprimer un bulletin de paie</h3>
              <p className="text-sm text-faso-text-600">Choisissez un effectif et la période (mois / année), puis imprimez le bulletin.</p>
              {effectifs.length === 0 ? (
                <p className="text-faso-statut-attente bg-faso-statut-attente-bg border border-faso-statut-attente/30 rounded-lg px-3 py-2 text-sm">Ajoutez des effectifs dans l'onglet <strong>Effectifs</strong> pour pouvoir imprimer des bulletins de paie.</p>
              ) : (
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-faso-text-500 mb-1">Salarié</label>
                  <select
                    value={bulletinSelection.effectif?.id ?? ''}
                    onChange={(e) => {
                      const eff = effectifs.find((x) => x.id === e.target.value) || null;
                      setBulletinSelection((s) => ({ ...s, effectif: eff }));
                    }}
                    className="border border-faso-border rounded-lg px-3 py-2 min-w-[200px]"
                  >
                    <option value="">— Choisir un effectif —</option>
                    {effectifs.map((eff) => (
                      <option key={eff.id} value={eff.id}>{eff.matricule || '—'} — {eff.nom} {eff.prenom} ({eff.poste || '—'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-faso-text-500 mb-1">Mois</label>
                  <select
                    value={bulletinSelection.mois}
                    onChange={(e) => setBulletinSelection((s) => ({ ...s, mois: Number(e.target.value) }))}
                    className="border border-faso-border rounded-lg px-3 py-2"
                  >
                    {MOIS_NOMS.map((nom, i) => (
                      <option key={i} value={i + 1}>{nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-faso-text-500 mb-1">Année</label>
                  <input
                    type="number"
                    min={2020}
                    max={2030}
                    value={bulletinSelection.annee}
                    onChange={(e) => setBulletinSelection((s) => ({ ...s, annee: Number(e.target.value) || now.getFullYear() }))}
                    className="border border-faso-border rounded-lg px-3 py-2 w-24"
                  />
                </div>
                {bulletinSelection.effectif && (
                  <button
                    type="button"
                    onClick={() => {
                      document.body.classList.add('print-bulletin');
                      window.print();
                      const cleanup = () => {
                        document.body.classList.remove('print-bulletin');
                        window.removeEventListener('afterprint', cleanup);
                      };
                      window.addEventListener('afterprint', cleanup);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg font-medium hover:bg-faso-primary-hover"
                  >
                    <Printer size={18} />
                    Imprimer le bulletin
                  </button>
                )}
              </div>
              )}
            </div>
            {bulletinSelection.effectif && (() => {
              const eff = bulletinSelection.effectif;
              const paie = calculPaieBurkina(eff.salaireBrut);
              const moisLabel = MOIS_NOMS[(bulletinSelection.mois || 1) - 1];
              const anneeLabel = bulletinSelection.annee || now.getFullYear();
              const bulletinContent = (
                <div className="bg-white border border-faso-border rounded-xl p-6 text-sm" id="bulletin-paie-print">
                  <div className="text-center border-b border-faso-border pb-3 mb-4">
                    <p className="font-bold text-lg text-faso-text-900">{enteteCompany.name}</p>
                    {enteteCompany.address && <p className="text-faso-text-600">{enteteCompany.address}</p>}
                    {enteteCompany.ifu && <p className="text-faso-text-500">IFU : {enteteCompany.ifu}</p>}
                    {enteteCompany.rccm && <p className="text-faso-text-500">RCCM : {enteteCompany.rccm}</p>}
                  </div>
                  <p className="font-bold text-center text-faso-text-900 mb-4">BULLETIN DE PAIE</p>
                  <p className="text-center text-faso-text-600 mb-4">Période : {moisLabel} {anneeLabel}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <p><span className="text-faso-text-500">Matricule :</span> {eff.matricule ?? '—'}</p>
                    <p><span className="text-faso-text-500">Nom / Prénom :</span> {eff.nom} {eff.prenom}</p>
                    <p><span className="text-faso-text-500">Poste :</span> {eff.poste || '—'}</p>
                    <p><span className="text-faso-text-500">Contrat :</span> {eff.typeContrat || '—'}</p>
                  </div>
                  <table className="w-full border border-faso-border text-sm">
                    <thead><tr className="bg-faso-statut-brouillon-bg"><th className="text-left p-2">Désignation</th><th className="text-right p-2">Montant (F CFA)</th></tr></thead>
                    <tbody>
                      <tr className="border-t"><td className="p-2">Salaire brut</td><td className="p-2 text-right">{paie.brut.toLocaleString('fr-FR')}</td></tr>
                      <tr className="border-t"><td className="p-2">CNSS salarié (≈7 %)</td><td className="p-2 text-right">- {paie.cotSalarie.toLocaleString('fr-FR')}</td></tr>
                      <tr className="border-t"><td className="p-2">IUTS (impôt sur salaires)</td><td className="p-2 text-right">- {paie.iuts.toLocaleString('fr-FR')}</td></tr>
                      <tr className="border-t font-bold"><td className="p-2">Net à payer</td><td className="p-2 text-right">{paie.net.toLocaleString('fr-FR')}</td></tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-faso-text-500 mt-4">CNSS employeur (≈16 %) : {paie.cotEmployeur.toLocaleString('fr-FR')} F (charge employeur, non déduite du salaire). Barèmes DGI / CNSS Burkina.</p>
                </div>
              );
              return bulletinContent;
            })()}
            <p className="text-xs text-faso-text-500">Barèmes officiels : DGI (IUTS), CNSS. Utilisez eSintax et eservices CNSS pour les déclarations.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const GestionComptabiliteView = () => {
  const [section, setSection] = useState('journal');
  const [ecritures, setEcritures] = useState([]);
  const [formEcriture, setFormEcriture] = useState({ date: new Date().toISOString().slice(0, 10), compte: '', libelle: '', debit: '', credit: '' });
  const tabs = [
    { id: 'journal', label: 'Journal' },
    { id: 'comptes', label: 'Plan comptable' },
    { id: 'balance', label: 'Balance' },
    { id: 'rapports', label: 'Rapports' },
  ];
  const addEcriture = (e) => {
    e.preventDefault();
    const d = Number(formEcriture.debit) || 0;
    const c = Number(formEcriture.credit) || 0;
    if (!formEcriture.compte?.trim() || (!d && !c)) return;
    setEcritures((l) => [...l, { id: Date.now(), ...formEcriture, debit: d, credit: c }]);
    setFormEcriture((f) => ({ ...f, libelle: '', debit: '', credit: '' }));
  };
  const balance = useMemo(() => {
    const byCompte = {};
    ecritures.forEach((e) => {
      const c = e.compte || '?';
      if (!byCompte[c]) byCompte[c] = { debit: 0, credit: 0 };
      byCompte[c].debit += Number(e.debit) || 0;
      byCompte[c].credit += Number(e.credit) || 0;
    });
    return Object.entries(byCompte).map(([compte, v]) => ({ compte, ...v }));
  }, [ecritures]);
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-50 rounded-xl text-faso-statut-valide">
            <Wallet size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-faso-text-900">Gestion Comptabilité</h2>
            <p className="text-sm text-faso-text-500">Plan SYSCOHADA (OHADA), journal, balance et rapports — Burkina Faso.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setSection(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium ${section === t.id ? 'bg-faso-primary text-white' : 'bg-faso-hover-bg text-faso-text-700 hover:bg-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {section === 'journal' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Saisie des écritures (journal général). Comptes selon plan SYSCOHADA (classes 1 à 8).</p>
            <form onSubmit={addEcriture} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <input type="date" value={formEcriture.date} onChange={(e) => setFormEcriture((f) => ({ ...f, date: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" />
              <input type="text" placeholder="Compte (ex. 411)" value={formEcriture.compte} onChange={(e) => setFormEcriture((f) => ({ ...f, compte: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" />
              <input type="text" placeholder="Libellé" value={formEcriture.libelle} onChange={(e) => setFormEcriture((f) => ({ ...f, libelle: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" />
              <input type="number" placeholder="Débit" value={formEcriture.debit} onChange={(e) => setFormEcriture((f) => ({ ...f, debit: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" min={0} />
              <input type="number" placeholder="Crédit" value={formEcriture.credit} onChange={(e) => setFormEcriture((f) => ({ ...f, credit: e.target.value }))} className="border border-faso-border rounded-lg px-3 py-2" min={0} />
              <button type="submit" className="md:col-span-5 px-4 py-2 bg-faso-primary text-white rounded-lg font-medium hover:bg-faso-primary-hover">Ajouter écriture</button>
            </form>
            <div className="overflow-x-auto border rounded-xl text-sm">
              <table className="w-full">
                <thead><tr className="bg-faso-statut-brouillon-bg"><th className="text-left p-2">Date</th><th className="text-left p-2">Compte</th><th className="text-left p-2">Libellé</th><th className="text-right p-2">Débit</th><th className="text-right p-2">Crédit</th></tr></thead>
                <tbody>
                  {ecritures.map((e) => (
                    <tr key={e.id} className="border-t"><td className="p-2">{e.date}</td><td className="p-2">{e.compte}</td><td className="p-2">{e.libelle}</td><td className="p-2 text-right">{Number(e.debit || 0).toLocaleString('fr-FR')}</td><td className="p-2 text-right">{Number(e.credit || 0).toLocaleString('fr-FR')}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {section === 'comptes' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Plan comptable SYSCOHADA (OHADA) — Burkina Faso. Classes 1 à 8.</p>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead><tr className="bg-faso-statut-brouillon-bg"><th className="text-left p-2">Classe</th><th className="text-left p-2">Libellé</th></tr></thead>
                <tbody>
                  {PLAN_COMPTABLE_SYSCOHADA.map((c) => (
                    <tr key={c.classe} className="border-t"><td className="p-2 font-mono">{c.classe}</td><td className="p-2">{c.libelle}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faso-text-500">Détail des comptes à 2 chiffres et auxiliaires : voir référentiel SYSCOHADA complet (OHADA).</p>
          </div>
        )}
        {section === 'balance' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Balance par compte (à partir des écritures saisies).</p>
            <div className="overflow-x-auto border rounded-xl text-sm">
              <table className="w-full">
                <thead><tr className="bg-faso-statut-brouillon-bg"><th className="text-left p-2">Compte</th><th className="text-right p-2">Débit</th><th className="text-right p-2">Crédit</th></tr></thead>
                <tbody>
                  {balance.map((b, i) => (
                    <tr key={i} className="border-t"><td className="p-2">{b.compte}</td><td className="p-2 text-right">{b.debit.toLocaleString('fr-FR')}</td><td className="p-2 text-right">{b.credit.toLocaleString('fr-FR')}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {section === 'rapports' && (
          <div className="space-y-4">
            <p className="text-sm text-faso-text-600">Compte de résultat, bilan, FEC (Facture Électronique Certifiée) — à produire à partir des écritures et du plan comptable.</p>
            <ul className="list-disc list-inside text-sm text-faso-text-700 space-y-1">
              <li>Compte de résultat (charges / produits)</li>
              <li>Bilan (actif / passif)</li>
              <li>Tableau de flux de trésorerie</li>
              <li>Export FEC (DGI) — depuis le module Facturation</li>
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};

const ImpotsDroitsBurkinaView = () => {
  const [onglet, setOnglet] = useState('tva');
  const onglets = [
    { id: 'tva', label: 'TVA' },
    { id: 'iuts', label: 'IUTS / Salaires' },
    { id: 'cnss', label: 'CNSS' },
    { id: 'rts', label: 'Retenue à la source' },
    { id: 'travail', label: 'Droit du travail' },
    { id: 'autres', label: 'Autres impôts' },
    { id: 'liens', label: 'Liens officiels' },
  ];
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-faso-statut-attente-bg rounded-xl text-amber-600">
            <Percent size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-faso-text-900">Impôts et droits — Burkina Faso</h2>
            <p className="text-sm text-faso-text-500">Tous les détails : TVA, IUTS, CNSS, retenues à la source, droit du travail, liens DGI et CNSS.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {onglets.map((t) => (
            <button key={t.id} type="button" onClick={() => setOnglet(t.id)} className={`px-3 py-2 rounded-lg text-sm font-medium ${onglet === t.id ? 'bg-amber-600 text-white' : 'bg-faso-hover-bg text-faso-text-700 hover:bg-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {onglet === 'tva' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-faso-text-900">{TVA_BURKINA.libelle}</h3>
            <p><strong>Taux :</strong> {TVA_BURKINA.taux} % (base {TVA_BURKINA.base})</p>
            <p><strong>Applicabilité :</strong> {TVA_BURKINA.applicabilite}</p>
            <p><strong>Exonérations :</strong> {TVA_BURKINA.exoneration}</p>
            <p><strong>Déclaration :</strong> {TVA_BURKINA.declaration}</p>
            <a href={TVA_BURKINA.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-faso-statut-attente font-medium hover:underline"><ExternalLink size={16} /> DGI</a>
          </div>
        )}
        {onglet === 'iuts' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-faso-text-900">{IUTS_BURKINA.libelle}</h3>
            <p>{IUTS_BURKINA.description}</p>
            <p><strong>Référence :</strong> {IUTS_BURKINA.reference}</p>
            <p className="font-medium mt-2">Barème (tranches mensuelles) :</p>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="bg-faso-statut-brouillon-bg"><th className="text-left p-2">Tranche (F/mois)</th><th className="text-right p-2">Taux %</th></tr></thead>
                <tbody>
                  {IUTS_BURKINA.barème.slice(0, 6).map((t, i) => (
                    <tr key={i} className="border-t"><td className="p-2">{t.tranche}</td><td className="p-2 text-right">{t.taux} %</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faso-text-500">Barème complet : Code Général des Impôts (DGI).</p>
            <a href={IUTS_BURKINA.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-faso-statut-attente font-medium hover:underline"><ExternalLink size={16} /> DGI</a>
          </div>
        )}
        {onglet === 'cnss' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-faso-text-900">{CNSS_BURKINA.libelle}</h3>
            <p><strong>Cotisations par branche :</strong></p>
            <ul className="list-disc list-inside space-y-1">
              {CNSS_BURKINA.branches.map((b, i) => (
                <li key={i}>{b.nom} — Employeur : {b.employeur}, Salarié : {b.salarie}</li>
              ))}
            </ul>
            <p><strong>Plafond :</strong> {CNSS_BURKINA.plafond}</p>
            <p><strong>Déclaration :</strong> {CNSS_BURKINA.declaration}</p>
            <a href={CNSS_BURKINA.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-faso-statut-attente font-medium hover:underline mr-4"><ExternalLink size={16} /> CNSS</a>
            <a href={CNSS_BURKINA.eservices} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-faso-statut-attente font-medium hover:underline"><ExternalLink size={16} /> E-services CNSS</a>
          </div>
        )}
        {onglet === 'rts' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-faso-text-900">{RTS_BURKINA.libelle}</h3>
            <p><strong>Taux général :</strong> {RTS_BURKINA.tauxGeneral} % (bénéficiaire immatriculé IFU)</p>
            <p><strong>Travaux publics / immobiliers :</strong> {RTS_BURKINA.tauxTravauxPublics} %</p>
            <p><strong>Condition :</strong> {RTS_BURKINA.condition}</p>
            <a href={RTS_BURKINA.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-faso-statut-attente font-medium hover:underline"><ExternalLink size={16} /> DGI</a>
          </div>
        )}
        {onglet === 'travail' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-faso-text-900">Droit du travail — {DROIT_TRAVAIL_BURKINA.code}</h3>
            <p><strong>SMIG (secteur général) :</strong> {DROIT_TRAVAIL_BURKINA.smig.secteurGeneral.toLocaleString('fr-FR')} {DROIT_TRAVAIL_BURKINA.smig.unite} ({DROIT_TRAVAIL_BURKINA.smig.horaire} F/heure)</p>
            <p><strong>SMIG agricole :</strong> {DROIT_TRAVAIL_BURKINA.smig.agricole.toLocaleString('fr-FR')} {DROIT_TRAVAIL_BURKINA.smig.uniteAgricole}</p>
            <p><strong>Congés annuels :</strong> {DROIT_TRAVAIL_BURKINA.conges.annuels}</p>
            <p><strong>Congés maladie :</strong> {DROIT_TRAVAIL_BURKINA.conges.maladie}</p>
            <p><strong>Maternité :</strong> {DROIT_TRAVAIL_BURKINA.conges.maternite}</p>
            <p><strong>Durée du travail :</strong> {DROIT_TRAVAIL_BURKINA.dureeTravail}</p>
            <p><strong>Contrats :</strong> {DROIT_TRAVAIL_BURKINA.contrat}</p>
            <a href={DROIT_TRAVAIL_BURKINA.lien} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-faso-statut-attente font-medium hover:underline"><ExternalLink size={16} /> Service Public BF</a>
          </div>
        )}
        {onglet === 'autres' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-faso-text-900">Autres impôts et taxes</h3>
            <ul className="space-y-2">
              {AUTRES_IMPOTS_BURKINA.map((imp, i) => (
                <li key={i}>
                  <strong>{imp.nom}</strong> : {imp.description}
                  <a href={imp.lien} target="_blank" rel="noopener noreferrer" className="ml-1 text-faso-statut-attente hover:underline"><ExternalLink size={14} className="inline" /></a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {onglet === 'liens' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-faso-text-900">Sites officiels</h3>
            <ul className="space-y-2">
              <li><a href={LIENS_OFFICIELS.dgi} target="_blank" rel="noopener noreferrer" className="text-faso-statut-attente hover:underline flex items-center gap-1"><ExternalLink size={14} /> DGI — Direction Générale des Impôts</a></li>
              <li><a href={LIENS_OFFICIELS.esintax} target="_blank" rel="noopener noreferrer" className="text-faso-statut-attente hover:underline flex items-center gap-1"><ExternalLink size={14} /> eSintax — Télédéclaration / Télépaiement</a></li>
              <li><a href={LIENS_OFFICIELS.cnss} target="_blank" rel="noopener noreferrer" className="text-faso-statut-attente hover:underline flex items-center gap-1"><ExternalLink size={14} /> CNSS Burkina Faso</a></li>
              <li><a href={LIENS_OFFICIELS.servicePublic} target="_blank" rel="noopener noreferrer" className="text-faso-statut-attente hover:underline flex items-center gap-1"><ExternalLink size={14} /> Service Public — Démarches administratives</a></li>
              <li><a href={LIENS_OFFICIELS.rccm} target="_blank" rel="noopener noreferrer" className="text-faso-statut-attente hover:underline flex items-center gap-1"><ExternalLink size={14} /> Fichier national RCCM</a></li>
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};

const ArchivesMarchesView = () => {
  const { apiMode } = useAuth();
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reference: '', titre: '', entite: '', dateDebut: '', dateFin: '', montant: '', remarques: '' });
  const [saving, setSaving] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [search, setSearch] = useState('');

  const loadArchives = useCallback(async () => {
    if (!apiMode) { setLoading(false); setArchives([]); return; }
    try {
      const list = await api.getArchivesMarches();
      setArchives(Array.isArray(list) ? list : []);
    } catch (_) {
      setArchives([]);
    } finally {
      setLoading(false);
    }
  }, [apiMode]);

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!apiMode) { alert('Connectez le serveur pour enregistrer.'); return; }
    setSaving(true);
    try {
      await api.postArchiveMarche({
        reference: form.reference.trim(),
        titre: form.titre.trim(),
        entite: form.entite.trim() || undefined,
        dateDebut: form.dateDebut || undefined,
        dateFin: form.dateFin || undefined,
        montant: form.montant ? Number(form.montant) : undefined,
        remarques: form.remarques.trim() || undefined,
      });
      setForm({ reference: '', titre: '', entite: '', dateDebut: '', dateFin: '', montant: '', remarques: '' });
      setShowForm(false);
      await loadArchives();
    } catch (err) {
      alert(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (archiveId, file) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      await api.uploadArchiveDocument(archiveId, file);
      await loadArchives();
      if (selectedArchive?.id === archiveId) {
        const a = await api.getArchiveMarche(archiveId);
        setSelectedArchive(a);
      }
    } catch (err) {
      alert(err.message || 'Erreur upload');
    } finally {
      setUploadingDoc(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return archives;
    const s = search.toLowerCase();
    return archives.filter((a) =>
      (a.reference || '').toLowerCase().includes(s) ||
      (a.titre || '').toLowerCase().includes(s) ||
      (a.entite || '').toLowerCase().includes(s)
    );
  }, [archives, search]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <Archive size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-faso-text-900">Marchés exécutés — Archives en ligne</h2>
            <p className="text-sm text-faso-text-500">Enregistrez chaque marché exécuté, scannez les documents et consultez l'archive à tout moment.</p>
          </div>
        </div>
        {!apiMode && (
          <div className="mb-4 p-4 bg-faso-statut-attente-bg border border-faso-statut-attente/30 rounded-xl text-amber-800 text-sm">
            Connectez le serveur pour enregistrer et archiver les marchés. Les données sont stockées en base et accessibles partout.
          </div>
        )}
        <div className="flex flex-wrap gap-4 mb-6">
          <input type="text" placeholder="Rechercher (référence, titre, entité)..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] border border-faso-border rounded-lg px-4 py-2 text-sm" />
          {apiMode && (
            <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
              <Plus size={20} />
              Nouveau marché exécuté
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 p-4 bg-faso-hover-bg rounded-xl space-y-4">
            <h3 className="font-semibold text-faso-text-900">Enregistrer un marché exécuté</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-faso-text-700 mb-1">Référence *</label>
                <input type="text" required value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2" placeholder="N° marché / contrat" />
              </div>
              <div>
                <label className="block text-sm font-medium text-faso-text-700 mb-1">Titre / Objet *</label>
                <input type="text" required value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2" placeholder="Objet du marché" />
              </div>
              <div>
                <label className="block text-sm font-medium text-faso-text-700 mb-1">Donneur d'ordre</label>
                <input type="text" value={form.entite} onChange={(e) => setForm((f) => ({ ...f, entite: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2" placeholder="Ministère, SONABEL..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-faso-text-700 mb-1">Montant (F CFA)</label>
                <input type="number" min={0} value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2" placeholder="Montant exécuté" />
              </div>
              <div>
                <label className="block text-sm font-medium text-faso-text-700 mb-1">Date début</label>
                <input type="date" value={form.dateDebut} onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-faso-text-700 mb-1">Date fin</label>
                <input type="date" value={form.dateFin} onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))} className="w-full border border-faso-border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-faso-text-700 mb-1">Remarques</label>
              <textarea value={form.remarques} onChange={(e) => setForm((f) => ({ ...f, remarques: e.target.value }))} rows={2} className="w-full border border-faso-border rounded-lg px-3 py-2" placeholder="Notes..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-faso-border rounded-lg text-faso-text-700">Annuler</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <p className="text-faso-text-500 text-center py-8">Aucun marché exécuté archivé. Enregistrez un marché et ajoutez les documents scannés.</p>
            ) : (
              filtered.map((arch) => (
                <div key={arch.id} className="border border-faso-border rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setSelectedArchive(selectedArchive?.id === arch.id ? null : arch)} className="w-full flex flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-faso-hover-bg">
                    <div>
                      <p className="font-semibold text-faso-text-900">{arch.reference} — {arch.titre}</p>
                      <p className="text-sm text-faso-text-500">{arch.entite && `${arch.entite} • `}{arch.montant != null ? `${Number(arch.montant).toLocaleString('fr-FR')} F CFA` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-faso-text-500">{arch.documents?.length || 0} document(s)</span>
                      {selectedArchive?.id === arch.id ? <span className="text-teal-600">▼</span> : <span className="text-faso-text-400">▶</span>}
                    </div>
                  </button>
                  {selectedArchive?.id === arch.id && (
                    <div className="border-t border-faso-border p-4 bg-faso-hover-bg space-y-4">
                      <p className="text-sm text-faso-text-600">{arch.remarques || '—'}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-faso-border rounded-lg cursor-pointer text-sm font-medium hover:bg-faso-hover-bg">
                          <Upload size={18} />
                          Ajouter un document scanné (PDF, image)
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadDoc(arch.id, f); e.target.value = ''; }} disabled={!apiMode || uploadingDoc} />
                        </label>
                        {uploadingDoc && <span className="text-sm text-faso-text-500">Envoi en cours...</span>}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-faso-text-700">Documents archivés</p>
                        {(arch.documents || []).length === 0 ? (
                          <p className="text-sm text-faso-text-500">Aucun document. Scannez et ajoutez des pièces.</p>
                        ) : (
                          (arch.documents || []).map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-faso-border">
                              <span className="text-sm truncate max-w-[280px]" title={doc.fileName}>{doc.fileName}</span>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => api.downloadArchiveDocument(arch.id, doc.id, doc.fileName)} className="text-teal-600 hover:underline text-sm font-medium">Télécharger</button>
                                {apiMode && (
                                  <button type="button" onClick={async () => { if (window.confirm('Supprimer ce document ?')) { await api.deleteArchiveDocument(arch.id, doc.id); const updated = await api.getArchiveMarche(arch.id); setSelectedArchive(updated); loadArchives(); } }} className="text-red-600 hover:underline text-sm">Supprimer</button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default function Facturation() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'mercuriale' ? 'mercuriale' : 'dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedMercurialeItem, setSelectedMercurialeItem] = useState(null);
  const [factureToEditId, setFactureToEditId] = useState(null);
  const [factureToEditData, setFactureToEditData] = useState(null);
  const [suiviRefreshTrigger, setSuiviRefreshTrigger] = useState(0);
  const lastProcessedMercurialeRef = React.useRef(null);
  const mainScrollRef = React.useRef(null);
  const { currentUser, logout, apiMode, getCompanyEntete, openChangePasswordModal } = useAuth();
  const { getMercuriale, loadRegionFromApi } = useMercuriale();
  const { theme, toggleTheme } = useTheme();

  // Préchargement des mercuriales pour la saisie d'articles (facturation, simulation, etc.)
  useEffect(() => {
    if (apiMode && (activeTab === 'facturation' || activeTab === 'simulation')) {
      for (const r of REGIONS_BURKINA) loadRegionFromApi(r.id);
    } else if (apiMode) {
      loadRegionFromApi('ouagadougou');
      loadRegionFromApi('centre');
    }
  }, [apiMode, activeTab]);
  const navigate = useNavigate();
  const companyName = currentUser?.company?.name || 'Mon Entreprise';
  const companyLogoUrl = getCompanyEntete?.(currentUser?.companyId)?.logoUrl ?? currentUser?.company?.logoUrl;

  // Agrégation des articles mercuriale de toutes les régions (dédupliqués par code+conditionnement) pour la recherche
  const mercurialeArticles = useMemo(() => {
    const seen = new Set();
    const out = [];
    const regions = ['ouagadougou', 'centre', ...REGIONS_BURKINA.filter((r) => !['ouagadougou', 'centre'].includes(r.id)).map((r) => r.id)];
    for (const rid of regions) {
      const lines = getMercuriale(rid) || [];
      for (const l of lines) {
        if (l.type !== 'article') continue;
        const key = `${(l.code || '').trim()}|${(l.conditionnement || l.unite || 'Unité').trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...l, regionId: rid });
      }
    }
    return out;
  }, [getMercuriale, activeTab]);

  const handleAddToInvoice = (item) => {
    setSelectedMercurialeItem(item);
    setActiveTab('facturation');
  };

  const NavItem = ({ id, icon: Icon, label }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
        className={`relative flex items-center space-x-3 w-full p-3 rounded-faso-lg transition-all duration-300 ease-out overflow-hidden group ${
          isActive
            ? 'bg-faso-primary text-white shadow-nav-active border-l-4 border-l-faso-accent'
            : 'text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
        }`}
      >
        {isActive && (
          <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
        )}
        <span className={`flex items-center justify-center w-8 h-8 rounded-faso shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </span>
        <span className="font-medium flex-1 text-left">{label}</span>
        {isActive && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-faso-accent rounded-full animate-pulse" />
            <span className="w-1 h-4 bg-faso-accent/80 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] h-screen bg-faso-bg-light dark:bg-faso-bg font-sans text-faso-text-primary dark:text-white overflow-x-hidden">
      <aside className="hidden md:flex flex-col w-72 bg-gradient-to-b from-faso-sidebar-start to-faso-sidebar-end text-white p-4 shadow-xl z-20">
        <div className="shrink-0 px-2 mb-4">
          <BrandingBlock variant="compact" showFooter={false} />
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Tableau de bord" />
          <NavItem id="appels-offres" icon={BookOpen} label="Appels d'Offres BF" />
          <NavItem id="simulation" icon={Calculator} label="Simulation & estimation" />
          <NavItem id="mercuriale" icon={Search} label="Mercuriale Prix" />
          <NavItem id="facturation" icon={FileText} label="Facturation" />
          <NavItem id="suivi" icon={CheckCircle} label="Suivi Paiements" />
          <NavItem id="documents-admin" icon={FolderSearch} label="Documents administratifs" />
          <NavItem id="montage-dao" icon={FolderInput} label="Montage DAO" />
          <NavItem id="rh" icon={Users} label="Gestion RH" />
          <NavItem id="comptabilite" icon={Wallet} label="Gestion Comptabilité" />
          <NavItem id="impots-droits" icon={Percent} label="Impôts & droits Burkina" />
          <NavItem id="archives-marches" icon={Archive} label="Archives marchés exécutés" />
          <Link to="/quittances" className="flex items-center space-x-3 w-full p-3 rounded-faso-lg transition-all duration-300 text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-0.5">
            <FileCheck size={20} />
            <span className="font-medium">Quittances QSL</span>
          </Link>
        </nav>
        <div className="bg-white/10 rounded-faso-lg p-4 mt-4 border border-white/20 shrink-0">
          <div className="flex items-center space-x-3">
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt={companyName} className="w-12 h-12 rounded-faso object-contain bg-white/90 p-1 shadow-md border border-white/30" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.classList.remove('hidden'); }} />
            ) : null}
            <div className={`w-12 h-12 rounded-faso flex items-center justify-center text-xs font-bold text-white shadow-md border-2 border-white/30 bg-faso-primary ${companyLogoUrl ? 'hidden' : ''}`}>
              {companyName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{companyName}</p>
              <p className="text-[10px] text-faso-accent font-medium uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-faso-accent rounded-full shrink-0"></span> Abonnement Actif
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0 mt-4 pt-3 border-t border-white/10">
          <BrandingFooter compact />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {currentUser?.companyId && (
          <CompanyInfoBar company={{ ...currentUser?.company, logoUrl: companyLogoUrl || currentUser?.company?.logoUrl }} />
        )}
        <header className="bg-white backdrop-blur-md border-b border-faso-border h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 gap-2 sticky top-0 z-10 shadow-card safe-area-top">
          <div className="flex items-center min-w-0 flex-1 md:flex-initial">
            <button className="text-faso-text-secondary p-2 -ml-2 hover:bg-faso-hover-bg rounded-faso shrink-0" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
            <span className="ml-1 sm:ml-2 font-bold text-faso-text-primary text-sm sm:text-base truncate flex items-center gap-1.5">
              <img src="/flag-aes.png" alt="" className="w-6 h-4 object-contain rounded-sm shrink-0" />
              A.E.S
            </span>
          </div>
          <h2 className="hidden md:block text-lg medium text-faso-text-secondary flex-1 min-w-0 truncate">
            {activeTab === 'dashboard' && "Vue d'ensemble"}
            {activeTab === 'appels-offres' && "Appels d'Offres Burkina Faso"}
            {activeTab === 'simulation' && 'Simulation et estimation'}
            {activeTab === 'mercuriale' && 'Base de Prix'}
            {activeTab === 'facturation' && 'Gestion Financière'}
            {activeTab === 'suivi' && 'Suivi des Paiements'}
            {activeTab === 'documents-admin' && 'Demande de documents administratifs'}
            {activeTab === 'montage-dao' && 'Montage DAO'}
            {activeTab === 'rh' && 'Gestion RH'}
            {activeTab === 'comptabilite' && 'Gestion Comptabilité'}
            {activeTab === 'impots-droits' && 'Impôts et droits Burkina'}
            {activeTab === 'archives-marches' && 'Archives marchés exécutés'}
          </h2>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={openChangePasswordModal} className="p-2 text-faso-text-secondary hover:bg-faso-hover-bg rounded-faso" title="Changer mot de passe">
              <Key size={18} />
            </button>
            <button onClick={toggleTheme} className="p-2 text-faso-text-secondary hover:bg-faso-hover-bg rounded-faso" title={theme === 'dark' ? 'Mode jour' : 'Mode nuit'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {(currentUser?.role === 'company_admin') && (
              <button onClick={() => navigate('/company')} className="p-2 text-faso-text-secondary hover:bg-faso-hover-bg rounded-faso" title="Administration">
                <Settings size={18} />
              </button>
            )}
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 text-faso-text-secondary hover:bg-faso-hover-bg rounded-faso" title="Déconnexion">
              <LogOut size={18} />
            </button>
            <div className="h-8 w-8 sm:h-9 sm:w-9 bg-faso-bg rounded-full flex items-center justify-center text-white font-bold border-2 border-faso-primary shadow-card shrink-0">
              {(currentUser?.name || currentUser?.email || 'U').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>


        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-gradient-to-b from-faso-sidebar-start to-faso-sidebar-end z-50 p-4 sm:p-6 flex flex-col md:hidden overflow-y-auto overflow-x-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 min-w-0">
                <BrandingBlock variant="compact" showFooter={false} />
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-faso-text-secondary hover:text-white shrink-0 ml-2"><X size={28} /></button>
            </div>
            <nav className="flex-1 space-y-3 min-h-0 overflow-y-auto">
              <NavItem id="dashboard" icon={LayoutDashboard} label="Tableau de bord" />
              <NavItem id="appels-offres" icon={BookOpen} label="Appels d'Offres BF" />
              <NavItem id="simulation" icon={Calculator} label="Simulation & estimation" />
              <NavItem id="mercuriale" icon={Search} label="Mercuriale Prix" />
              <NavItem id="facturation" icon={FileText} label="Facturation" />
              <NavItem id="suivi" icon={CheckCircle} label="Suivi Paiements" />
              <NavItem id="documents-admin" icon={FolderSearch} label="Documents administratifs" />
              <NavItem id="montage-dao" icon={FolderInput} label="Montage DAO" />
              <NavItem id="rh" icon={Users} label="Gestion RH" />
              <NavItem id="comptabilite" icon={Wallet} label="Gestion Comptabilité" />
              <NavItem id="impots-droits" icon={Percent} label="Impôts & droits Burkina" />
              <NavItem id="archives-marches" icon={Archive} label="Archives marchés exécutés" />
              <Link to="/quittances" className="flex items-center space-x-3 w-full p-3 rounded-lg transition-all text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                <FileCheck size={20} />
                <span className="font-medium">Quittances QSL</span>
              </Link>
            </nav>
            <div className="shrink-0 mt-4 pt-3 border-t border-white/10">
              <BrandingFooter compact />
            </div>
          </div>
        )}

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-8 scroll-smooth min-w-0">
          <div key={activeTab} className="max-w-6xl mx-auto tab-content min-w-0 w-full">
            {activeTab === 'dashboard' && <Dashboard onNavigateToTab={setActiveTab} />}
            {activeTab === 'appels-offres' && <AppelsOffresView />}
            {activeTab === 'simulation' && <SimulationView mercurialeArticles={mercurialeArticles} />}
            {activeTab === 'mercuriale' && <MercurialeView onAddToInvoice={handleAddToInvoice} />}
            {activeTab === 'facturation' && (
              <InvoiceBuilder
                selectedMercurialeItem={selectedMercurialeItem}
                clearSelection={() => { setSelectedMercurialeItem(null); lastProcessedMercurialeRef.current = null; }}
                mercurialeArticles={mercurialeArticles}
                lastProcessedMercurialeRef={lastProcessedMercurialeRef}
                editingFactureId={factureToEditId}
                editingFactureData={factureToEditData}
                onClearEdit={() => { setFactureToEditId(null); setFactureToEditData(null); }}
                onFactureSaved={(updated) => {
                  setFactureToEditData(updated);
                  setSuiviRefreshTrigger((t) => t + 1);
                }}
              />
            )}
            {activeTab === 'suivi' && (
              <SuiviPaiementsView
                refreshTrigger={suiviRefreshTrigger}
                onEditBrouillon={(id, factureData) => {
                  setSelectedMercurialeItem(null);
                  lastProcessedMercurialeRef.current = null;
                  setFactureToEditId(id);
                  setFactureToEditData(factureData || null);
                  setActiveTab('facturation');
                  requestAnimationFrame(() => {
                    mainScrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
                  });
                }}
              />
            )}
            {activeTab === 'documents-admin' && <DocumentsAdminView />}
            {activeTab === 'montage-dao' && <MontageDaoView />}
            {activeTab === 'rh' && <GestionRHView />}
            {activeTab === 'comptabilite' && <GestionComptabiliteView />}
            {activeTab === 'impots-droits' && <ImpotsDroitsBurkinaView />}
            {activeTab === 'archives-marches' && <ArchivesMarchesView />}
          </div>
        </main>
      </div>
    </div>
  );
}
