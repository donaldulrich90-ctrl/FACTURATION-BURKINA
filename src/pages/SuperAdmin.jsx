import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Users,
  Calendar,
  CreditCard,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  MapPin,
  History,
  FileSpreadsheet,
  Download,
  Pencil,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMercuriale } from '../context/MercurialeContext';
import { api } from '../api/client';
import { REGIONS_BURKINA } from '../data/mercurialeRegions';
import { parseMercurialeCsv, CSV_TEMPLATE } from '../utils/importMercurialeCsv';
import { extractAndParseDocx } from '../utils/docxExtract';
import AuditLogView from '../components/AuditLogView';

const statusStyles = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  expired: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function SuperAdmin() {
  const { currentUser, logout, apiMode, companies: contextCompanies, openChangePasswordModal } = useAuth();
  const { getPdf, setMercurialeDocx, removeMercurialeDocx, appendMercurialeLines, replaceMercurialeLines, mergeMercurialeLines, clearMercurialeLines, countDuplicateCodes, extractDocxToLines, byRegion } = useMercuriale();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [activeTab, setActiveTab] = useState('entreprises');
  const [subscriptions, setSubscriptions] = useState([]);
  const [totalGains, setTotalGains] = useState(0);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [editSubModal, setEditSubModal] = useState(null); // { sub, company }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { company }
  const [addUserModal, setAddUserModal] = useState(null); // { company }
  const [addingUser, setAddingUser] = useState(false);
  const [serverStatus, setServerStatus] = useState(null); // null | 'ok' | 'down'
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    adminName: '', adminEmail: '', adminPassword: '',
    planType: 'standard',
  });
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planModal, setPlanModal] = useState(null); // null | { plan } pour édition | {} pour création
  const [planForm, setPlanForm] = useState({ planType: '', planName: '', price: '', priceAmount: 0, features: [] });
  const [savingPlan, setSavingPlan] = useState(false);
  const SUBSCRIPTION_PLANS_FALLBACK = [
    { planType: 'gratuit', planName: 'Gratuit (Démo)', price: '0 FCFA', priceAmount: 0 },
    { planType: 'standard', planName: 'Standard Annuel', price: '250 000 FCFA/an', priceAmount: 250000 },
    { planType: 'simulation', planName: 'Simulation & Marchés', price: '450 000 FCFA/an', priceAmount: 450000 },
    { planType: 'pro', planName: 'Pro Complet', price: '750 000 FCFA/an', priceAmount: 750000 },
    { planType: 'entreprise', planName: 'Entreprise Illimité', price: '1 500 000 FCFA/an', priceAmount: 1500000 },
  ];
  const FEATURE_LABELS = [
    { id: 'facturation', label: 'Facturation' },
    { id: 'mercuriale', label: 'Mercuriale / Prix' },
    { id: 'appels-offres', label: 'Appels d\'offres BF' },
    { id: 'marches', label: 'Simulation & Marchés' },
    { id: 'suivi', label: 'Suivi Paiements' },
    { id: 'documents-admin', label: 'Documents administratifs' },
    { id: 'montage-dao', label: 'Montage DAO' },
    { id: 'rh', label: 'Gestion RH' },
    { id: 'comptabilite', label: 'Comptabilité' },
    { id: 'impots', label: 'Impôts & droits Burkina' },
    { id: 'archives', label: 'Archives marchés' },
  ];
  const subscriptionPlansForSelect = apiMode && plans.length > 0 ? plans : SUBSCRIPTION_PLANS_FALLBACK;

  useEffect(() => {
    if (activeTab === 'entreprises') {
      if (apiMode === false || apiMode === null) {
        setCompanies(contextCompanies || []);
        setLoadingCompanies(false);
        return;
      }
      api.getCompanies()
        .then(setCompanies)
        .catch(() => setCompanies(contextCompanies || []))
        .finally(() => setLoadingCompanies(false));
    }
    if (activeTab === 'abonnements' && apiMode) {
      setLoadingSubscriptions(true);
      api.getSubscriptions()
        .then(({ subscriptions: s, totalGains: g }) => {
          setSubscriptions(s || []);
          setTotalGains(g ?? 0);
        })
        .catch(() => { setSubscriptions([]); setTotalGains(0); })
        .finally(() => setLoadingSubscriptions(false));
    }
    if ((activeTab === 'forfaits' || activeTab === 'entreprises') && apiMode) {
      setLoadingPlans(true);
      api.getPlans()
        .then(setPlans)
        .catch(() => setPlans([]))
        .finally(() => setLoadingPlans(false));
    }
  }, [activeTab, apiMode, contextCompanies]);
  const [uploadingRegion, setUploadingRegion] = useState(null);
  const [extractingRegion, setExtractingRegion] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [docxUploadError, setDocxUploadError] = useState(null);
  /** Prévisualisation avant import : { regionId, regionName, lines, fileName?, meta } */
  const [previewImport, setPreviewImport] = useState(null);
  const [importMode, setImportMode] = useState('add'); // 'add' | 'replace' | 'merge'
  const [clearingRegion, setClearingRegion] = useState(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [importingConfirm, setImportingConfirm] = useState(false);

  const MAX_DOCX_SIZE_MB = 50;
  const MAX_DOCX_BYTES = MAX_DOCX_SIZE_MB * 1024 * 1024;

  const handleDocxUpload = (regionId, e) => {
    const file = e?.target?.files?.[0];
    e.target.value = '';
    setDocxUploadError(null);
    setImportResult(null);
    if (!file) return;
    const isDocx = file.name.toLowerCase().endsWith('.docx') || (file.type && file.type.includes('wordprocessingml'));
    if (!isDocx) {
      setDocxUploadError('Veuillez sélectionner un fichier Word (.docx). Types acceptés : Word uniquement.');
      return;
    }
    if (file.size === 0) {
      setDocxUploadError('Le fichier est vide. Choisissez un fichier Word valide.');
      return;
    }
    if (file.size > MAX_DOCX_BYTES) {
      setDocxUploadError(`Fichier trop volumineux. Taille max : ${MAX_DOCX_SIZE_MB} Mo (sécurité et performance).`);
      return;
    }
    setUploadingRegion(regionId);
    setExtractingRegion(regionId);
    const doExtract = () => {
      if (apiMode) {
        return api.extractMercurialeDocx(regionId, file).then((r) => ({ lines: r.lines, errors: r.error ? [r.error] : [], meta: r.meta }));
      }
      return setMercurialeDocx(regionId, file, file.name).then(() => extractAndParseDocx(file));
    };
    doExtract()
      .then((result) => {
        if (!result) return;
        const { lines, errors, meta } = result;
        if (errors?.length) {
          setImportResult({ ok: false, message: errors.join(' ') });
          setExtractingRegion(null);
          return;
        }
        if (!lines?.length) {
          setImportResult({
            ok: false,
            message: 'Aucune ligne reconnue dans le Word. Vérifiez le format ou importez via un fichier CSV.',
          });
          setExtractingRegion(null);
          return;
        }
        const region = REGIONS_BURKINA.find((r) => r.id === regionId);
        setPreviewImport({ regionId, regionName: region?.nom || regionId, lines, fileName: file.name, meta });
        setImportResult(null);
      })
      .catch((err) => {
        let msg = err?.message || 'Erreur lors de l\'enregistrement ou de la lecture du Word.';
        if (/Failed to fetch|network/i.test(msg)) msg = 'Serveur indisponible. Vérifiez que le serveur est démarré.';
        if (/abort|timeout/i.test(msg)) msg = 'Délai dépassé. Le fichier est peut-être trop volumineux. Essayez un CSV.';
        setDocxUploadError(msg);
        setImportResult({ ok: false, message: msg });
      })
      .finally(() => {
        setUploadingRegion(null);
        setExtractingRegion(null);
      });
  };

  const handleConfirmImport = async () => {
    if (!previewImport || importingConfirm) return;
    const { regionId, lines } = previewImport;
    setImportResult(null);
    setImportingConfirm(true);
    try {
      let message = '';
      if (importMode === 'replace') {
        const count = await replaceMercurialeLines(regionId, lines);
        message = `Mercuriale remplacée : ${count} ligne(s) importée(s).`;
      } else if (importMode === 'merge') {
        const { added, updated } = await mergeMercurialeLines(regionId, lines);
        message = `Fusion effectuée : ${added} nouveau(x) article(s), ${updated} mis à jour.`;
      } else {
        const added = await appendMercurialeLines(regionId, lines);
        const dup = countDuplicateCodes(regionId, lines);
        message = dup > 0
          ? `${added} ligne(s) ajoutée(s). ${dup} doublon(s) ignoré(s) (code déjà présent).`
          : `${added} ligne(s) ajoutée(s) à la mercuriale.`;
      }
      setImportResult({ ok: true, message, regionId: regionId });
      setPreviewImport(null);
    } catch (err) {
      setImportResult({ ok: false, message: err?.message || 'Erreur lors de l\'import.' });
    } finally {
      setImportingConfirm(false);
    }
  };

  const handleImportArticles = (regionId, e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    if (!isCsv) {
      setImportResult({ ok: false, message: 'Le fichier doit être un CSV (.csv).' });
      e.target.value = '';
      return;
    }
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const { lines, errors } = parseMercurialeCsv(reader.result);
      if (errors.length) {
        setImportResult({ ok: false, message: errors.join(' ') });
        e.target.value = '';
        return;
      }
      if (lines.length === 0) {
        setImportResult({ ok: false, message: 'Aucune ligne valide dans le fichier.' });
        e.target.value = '';
        return;
      }
      try {
        const added = await appendMercurialeLines(regionId, lines);
        setImportResult({ ok: true, message: `${added} article(s) ajouté(s) pour cette région.`, regionId });
      } catch (err) {
        setImportResult({ ok: false, message: err?.message || 'Erreur lors de l\'import.' });
      }
      e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExtractDocx = (regionId) => {
    setDocxUploadError(null);
    setImportResult(null);
    setExtractingRegion(regionId);
    extractDocxToLines(regionId)
      .then((result) => {
        const { lines, errors, meta } = result || {};
        if (errors?.length) {
          setImportResult({ ok: false, message: errors.join(' ') });
          setExtractingRegion(null);
          return;
        }
        if (!lines?.length) {
          setImportResult({ ok: false, message: 'Aucune ligne reconnue dans le Word. Vérifiez le format ou téléversez un fichier Word valide.' });
          setExtractingRegion(null);
          return;
        }
        const region = REGIONS_BURKINA.find((r) => r.id === regionId);
        setPreviewImport({ regionId, regionName: region?.nom || regionId, lines, meta });
      })
      .catch((err) => {
        const msg = err?.message || 'Erreur lors de la lecture du Word.';
        setImportResult({ ok: false, message: msg });
      })
      .finally(() => {
        setExtractingRegion(null);
      });
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modele_mercuriale_import.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleClearRegion = async (regionId) => {
    setClearingRegion(regionId);
    try {
      await clearMercurialeLines(regionId);
      setImportResult({ ok: true, message: 'Mercuriale vidée pour cette région.', regionId });
    } catch (err) {
      setImportResult({ ok: false, message: err?.message || 'Erreur lors du vidage.' });
    } finally {
      setClearingRegion(null);
    }
  };

  const handleClearAllMercuriale = async () => {
    setClearAllConfirm(false);
    setClearingRegion('all');
    try {
      for (const region of REGIONS_BURKINA) {
        await clearMercurialeLines(region.id);
      }
      setImportResult({ ok: true, message: 'Toute la mercuriale a été vidée. Vous pouvez réimporter.' });
    } catch (err) {
      setImportResult({ ok: false, message: err?.message || 'Erreur lors du vidage.' });
    } finally {
      setClearingRegion(null);
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    if (apiMode === false || apiMode === null) {
      setShowReconnectModal(true);
      return;
    }
    try {
      await api.postCompany({
        name: form.name, email: form.email, phone: form.phone,
        adminName: form.adminName || undefined,
        adminEmail: form.adminEmail || form.email,
        adminPassword: form.adminPassword || undefined,
        planType: form.planType || 'standard',
      });
      setForm({ name: '', email: '', phone: '', adminName: '', adminEmail: '', adminPassword: '', planType: 'standard' });
      setShowModal(false);
      const list = await api.getCompanies();
      setCompanies(list);
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteConfirm || !apiMode) return;
    try {
      await api.deleteCompany(deleteConfirm.id);
      setDeleteConfirm(null);
      const list = await api.getCompanies();
      setCompanies(list);
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const payload = {
        planType: planForm.planType.trim().toLowerCase().replace(/\s+/g, '-'),
        planName: planForm.planName.trim(),
        price: planForm.price.trim(),
        priceAmount: Number(planForm.priceAmount) || 0,
        features: Array.isArray(planForm.features) ? planForm.features : [],
      };
      if (planModal?.plan?.id) {
        await api.patchPlan(planModal.plan.id, payload);
        setPlans((prev) => prev.map((p) => (p.id === planModal.plan.id ? { ...p, ...payload } : p)));
      } else {
        const created = await api.postPlan(payload);
        setPlans((prev) => [...prev, created].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      }
      setPlanModal(null);
    } catch (err) {
      alert(err.message || 'Erreur');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!editSubModal?.sub) return;
    const form = e.target;
    const planType = form.planType?.value || editSubModal.sub.planType;
    const endDate = form.endDate?.value;
    const status = form.status?.value || editSubModal.sub.status;
    const plan = subscriptionPlansForSelect.find((p) => p.planType === planType) || subscriptionPlansForSelect[1];
    try {
      await api.patchSubscription(editSubModal.sub.id, {
        planType,
        planName: plan.planName,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        status,
        price: plan.price,
        priceAmount: plan.priceAmount ?? 0,
      });
      setEditSubModal(null);
      const list = await api.getCompanies();
      setCompanies(list);
      if (activeTab === 'abonnements') {
        const { subscriptions: s, totalGains: g } = await api.getSubscriptions();
        setSubscriptions(s || []);
        setTotalGains(g ?? 0);
      }
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!addUserModal || !apiMode) return;
    const form = e.target;
    const name = (form.elements?.userName?.value || form.userName?.value || '').trim();
    const email = (form.elements?.userEmail?.value || form.userEmail?.value || '').trim();
    const password = form.elements?.userPassword?.value || form.userPassword?.value || '';
    const role = form.elements?.userRole?.value || form.userRole?.value || 'company_user';
    if (!name || !email) {
      alert('Nom et email requis.');
      return;
    }
    if (!password || password.length < 4) {
      alert('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }
    setAddingUser(true);
    try {
      await api.postCompanyUser(addUserModal.id, { name, email, password, role });
      setAddUserModal(null);
      const list = await api.getCompanies();
      setCompanies(list);
    } catch (err) {
      alert(err.message || 'Erreur lors de la création du compte.');
    } finally {
      setAddingUser(false);
    }
  };

  const getCompanySubscription = (companyId) => companies.find((c) => c.id === companyId)?.subscriptions?.[0];
  const getCompanyUsers = (companyId) => companies.find((c) => c.id === companyId)?.users || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-faso-primary rounded-xl flex items-center justify-center">
              <Building2 className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">FasoMarchés Plateforme</h1>
              <p className="text-xs text-gray-500">Super administration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {(apiMode === false || apiMode === null) && (
              <button
                onClick={async () => {
                  setServerStatus(null);
                  try {
                    const ok = await api.healthCheck();
                    setServerStatus(ok ? 'ok' : 'down');
                  } catch {
                    setServerStatus('down');
                  }
                  setTimeout(() => setServerStatus(null), 4000);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 text-sm font-medium"
              >
                <AlertCircle size={16} />
                Mode démo — Vérifier le serveur
              </button>
            )}
            {serverStatus === 'ok' && (
              <span className="text-sm text-emerald-600 font-medium animate-pulse">✓ Serveur disponible — Reconnectez-vous</span>
            )}
            {serverStatus === 'down' && (
              <span className="text-sm text-red-600 font-medium">✗ Serveur inaccessible. Lancez LANCER.bat</span>
            )}
            <span className="text-sm text-gray-500">{currentUser?.email}</span>
            <button
              onClick={openChangePasswordModal}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Changer mot de passe"
            >
              <Key size={18} />
              Mot de passe
            </button>
            <button
              onClick={() => navigate('/app?tab=mercuriale')}
              className="flex items-center gap-2 px-4 py-2 text-faso-primary hover:bg-faso-hover-bg rounded-lg transition-colors"
            >
              <FileText size={18} />
              Mercuriale & Facturation
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(apiMode === false || apiMode === null) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <p className="text-amber-800 text-sm">
              <strong>Mode démo</strong> — Déconnectez-vous puis reconnectez-vous (admin@plateforme.com) pour créer des entreprises.
              Vérifiez que LANCER.bat a bien démarré les deux fenêtres.
            </p>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shrink-0"
            >
              Se reconnecter
            </button>
          </div>
        )}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('entreprises')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'entreprises' ? 'bg-white border border-b-0 border-gray-200 text-faso-primary -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Entreprises
          </button>
          <button
            onClick={() => setActiveTab('abonnements')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'abonnements' ? 'bg-white border border-b-0 border-gray-200 text-faso-primary -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Abonnements & gains
          </button>
          <button
            onClick={() => setActiveTab('forfaits')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'forfaits' ? 'bg-white border border-b-0 border-gray-200 text-faso-primary -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Types d'abonnement
          </button>
          <button
            onClick={() => setActiveTab('mercuriales')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'mercuriales' ? 'bg-white border border-b-0 border-gray-200 text-faso-primary -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mercuriales par région
          </button>
          {apiMode && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'audit' ? 'bg-white border border-b-0 border-gray-200 text-faso-primary -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History size={16} className="inline mr-1 -mt-0.5" />
              Journal d'audit
            </button>
          )}
        </div>

        {activeTab === 'forfaits' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Types d'abonnement (forfaits)</h2>
              {apiMode ? (
                <button
                  onClick={() => {
                    setPlanModal({});
                    setPlanForm({ planType: '', planName: '', price: '', priceAmount: 0, features: [] });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-faso-primary text-white rounded-xl hover:bg-faso-primary-hover font-medium"
                >
                  <Plus size={20} />
                  Ajouter un forfait
                </button>
              ) : (
                <p className="text-amber-600 text-sm">Connectez le serveur pour paramétrer les forfaits.</p>
              )}
            </div>
            <p className="text-sm text-gray-600">Définissez les formules d'abonnement proposées aux entreprises (libellé, tarif, fonctionnalités). Ces forfaits sont utilisés à la création d'une entreprise.</p>
            {loadingPlans && <p className="text-gray-500">Chargement…</p>}
            {!loadingPlans && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-gray-600 font-semibold">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Libellé</th>
                      <th className="p-3">Prix affiché</th>
                      <th className="p-3 text-right">Montant (FCFA)</th>
                      <th className="p-3">Fonctionnalités</th>
                      {apiMode && <th className="p-3 w-28">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(apiMode ? plans : SUBSCRIPTION_PLANS_FALLBACK).map((p) => (
                      <tr key={p.id || p.planType} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono text-gray-700">{p.planType}</td>
                        <td className="p-3 font-medium text-gray-900">{p.planName}</td>
                        <td className="p-3 text-gray-600">{p.price || '—'}</td>
                        <td className="p-3 text-right">{(p.priceAmount ?? 0).toLocaleString('fr-FR')}</td>
                        <td className="p-3 text-gray-600">
                          {Array.isArray(p.features) ? p.features.length + ' module(s)' : '—'}
                        </td>
                        {apiMode && p.id && (
                          <td className="p-3">
                            <button type="button" onClick={() => { setPlanModal({ plan: p }); setPlanForm({ planType: p.planType, planName: p.planName, price: p.price || '', priceAmount: p.priceAmount ?? 0, features: Array.isArray(p.features) ? p.features : [] }); }} className="text-faso-primary hover:underline mr-2">Modifier</button>
                            <button type="button" onClick={async () => { if (!window.confirm('Supprimer ce forfait ?')) return; try { await api.deletePlan(p.id); setPlans((prev) => prev.filter((x) => x.id !== p.id)); } catch (e) { alert(e.message); } }} className="text-red-600 hover:underline">Supprimer</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {plans.length === 0 && apiMode && !loadingPlans && (
                  <p className="p-6 text-center text-gray-500">Aucun forfait. Cliquez sur « Ajouter un forfait » pour créer les types d'abonnement.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'entreprises' && (
          <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {loadingCompanies && <p className="text-gray-500">Chargement…</p>}
          <h2 className="text-2xl font-bold text-gray-900">Entreprises & abonnements</h2>
          <button
            onClick={() => {
              if (apiMode === false || apiMode === null) {
                setShowReconnectModal(true);
              } else {
                setShowModal(true);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-faso-primary text-white rounded-xl hover:bg-faso-primary-hover shadow-md transition-colors font-medium"
          >
            <Plus size={20} />
            Nouvelle entreprise
          </button>
        </div>

        <div className="grid gap-6">
          {companies.map((company) => {
            const sub = getCompanySubscription(company.id);
            const userCount = getCompanyUsers(company.id).length;
            const status = sub?.status || 'Aucun abonnement';
            return (
              <div
                key={company.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="text-slate-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{company.name}</h3>
                      <p className="text-sm text-gray-500">{company.email}</p>
                      {company.phone && <p className="text-xs text-gray-400 mt-0.5">{company.phone}</p>}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {userCount} compte(s)
                        </span>
                        {company.id !== 'template' && !apiMode && (
                          <span className="text-xs text-amber-600" title="Connectez-vous au serveur pour ajouter des comptes">
                            (Connexion serveur requise)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 md:items-end">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || 'bg-gray-100 text-gray-600'}`}>
                        {status === 'active' && <CheckCircle size={12} />}
                        {status === 'expired' && <XCircle size={12} />}
                        {status === 'cancelled' && <AlertCircle size={12} />}
                        {status === 'active' ? 'Abonnement actif' : status === 'expired' ? 'Expiré' : status === 'cancelled' ? 'Annulé' : status}
                      </span>
                      {sub && (
                        <>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={12} />
                            Jusqu'au {sub.endDate}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <CreditCard size={12} />
                            {sub.price}
                          </span>
                          {apiMode && (
                            <button
                              onClick={() => setEditSubModal({ sub, company })}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-faso-primary bg-faso-statut-valide-bg hover:bg-faso-statut-valide-bg/80 rounded-lg"
                              title="Modifier l'abonnement"
                            >
                              <Pencil size={12} />
                              Modifier
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {apiMode && company.id !== 'template' && (
                      <>
                        <button
                          onClick={() => setAddUserModal(company)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-faso-primary bg-faso-statut-valide-bg hover:bg-faso-statut-valide-bg/80 rounded-lg border border-faso-border"
                          title="Ajouter un compte"
                        >
                          <Plus size={14} />
                          Ajouter un compte
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(company)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                          title="Supprimer l'entreprise"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {companies.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Aucune entreprise</p>
            <p className="text-sm text-gray-400 mt-1">Ajoutez une entreprise pour lui attribuer un compte et un abonnement annuel.</p>
            <button
              onClick={() => {
                if (apiMode === false || apiMode === null) setShowReconnectModal(true);
                else setShowModal(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover"
            >
              <Plus size={18} />
              Nouvelle entreprise
            </button>
          </div>
        )}
          </>
        )}

        {activeTab === 'abonnements' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Abonnements & gains</h2>
            {(apiMode === false || apiMode === null) ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                Connectez-vous au serveur pour voir les abonnements et les gains. Lancez LANCER.bat puis reconnectez-vous.
              </div>
            ) : loadingSubscriptions ? (
              <p className="text-gray-500">Chargement…</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                    <p className="text-sm font-medium text-emerald-700">Total des gains (FCFA)</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">
                      {(totalGains ?? 0).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="bg-faso-statut-valide-bg border border-faso-border rounded-xl p-6">
                    <p className="text-sm font-medium text-faso-text-primary">Abonnés actifs</p>
                    <p className="text-2xl font-bold text-faso-text-primary mt-1">
                      {subscriptions.filter((s) => s.status === 'active').length}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <p className="text-sm font-medium text-slate-700">Total abonnements</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{subscriptions.length}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="p-4 font-semibold text-gray-700">Entreprise</th>
                          <th className="p-4 font-semibold text-gray-700">Plan</th>
                          <th className="p-4 font-semibold text-gray-700">Statut</th>
                          <th className="p-4 font-semibold text-gray-700 text-right">Montant</th>
                          <th className="p-4 font-semibold text-gray-700">Fin</th>
                          <th className="p-4 font-semibold text-gray-700 w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.map((sub) => {
                          const company = sub.company || {};
                          return (
                            <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-4">
                                <div>
                                  <p className="font-medium text-gray-900">{company.name}</p>
                                  <p className="text-xs text-gray-500">{company.email}</p>
                                </div>
                              </td>
                              <td className="p-4">{sub.planName}</td>
                              <td className="p-4">
                                <select
                                  value={sub.status}
                                  onChange={async (e) => {
                                    const s = e.target.value;
                                    if (!['active', 'expired', 'cancelled'].includes(s)) return;
                                    try {
                                      await api.patchSubscription(sub.id, { status: s });
                                      const { subscriptions: s2, totalGains: g } = await api.getSubscriptions();
                                      setSubscriptions(s2 || []);
                                      setTotalGains(g ?? 0);
                                    } catch (err) {
                                      alert(err.message || 'Erreur');
                                    }
                                  }}
                                  className={`text-sm border rounded-lg px-2 py-1 bg-white font-medium ${sub.status === 'active' ? 'border-emerald-300 text-emerald-700' : sub.status === 'expired' ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-600'}`}
                                >
                                  <option value="active">Actif</option>
                                  <option value="expired">Expiré</option>
                                  <option value="cancelled">Annulé</option>
                                </select>
                              </td>
                              <td className="p-4 text-right font-mono">{(sub.priceAmount ?? 0).toLocaleString()} FCFA</td>
                              <td className="p-4 text-gray-600">
                                {sub.endDate ? new Date(sub.endDate).toLocaleDateString('fr-FR') : '—'}
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => setEditSubModal({ sub, company })}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-faso-primary bg-faso-statut-valide-bg hover:bg-faso-statut-valide-bg/80 rounded-lg"
                                  title="Modifier l'abonnement"
                                >
                                  <Pencil size={12} />
                                  Modifier
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {subscriptions.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                      Aucun abonnement enregistré.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'mercuriales' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mercuriales par région</h2>
              <p className="text-gray-500 text-sm mt-1">Ajoutez un fichier Word de mercuriale et/ou des articles (via import CSV ou extraction du Word). Utilisez « Extraire les articles du Word » pour que le système lise le document, sépare les types (catégories / articles) et les classe automatiquement.</p>
              <p className="text-emerald-600 text-sm mt-2 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-block">
                Le contenu chargé ici est la mercuriale commune à toutes les entreprises. Disponible immédiatement pour tous les utilisateurs.
              </p>
              <p className="text-gray-500 text-sm mt-1">Word : taille max <strong>{MAX_DOCX_SIZE_MB} Mo</strong> par fichier (stockage IndexedDB).</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-faso-border text-faso-text-primary rounded-lg hover:bg-faso-hover-bg text-sm font-medium"
                >
                  <Download size={18} />
                  Télécharger un modèle CSV
                </button>
                <button
                  type="button"
                  onClick={() => setClearAllConfirm(true)}
                  disabled={clearingRegion === 'all'}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium"
                  title="Efface tous les articles de la mercuriale dans toutes les régions (préparation à un ré-import)"
                >
                  <Trash2 size={18} />
                  {clearingRegion === 'all' ? 'Vidage...' : 'Vider toute la mercuriale'}
                </button>
              </div>
              <span className="block mt-2 text-xs text-gray-500">Colonnes CSV : Code ; Désignation/Caractéristiques ; Conditionnement ; Minimum ; Moyen ; Maximum ; Catégorie (séparateur ; ou ,)</span>
              {docxUploadError && (
                <div className="mt-4 p-4 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>{docxUploadError}</span>
                  <button type="button" onClick={() => setDocxUploadError(null)} className="ml-auto text-red-500 hover:text-red-700" aria-label="Fermer">×</button>
                </div>
              )}
            </div>
            <div className="grid gap-4">
              {REGIONS_BURKINA.map((region) => {
                const docxFile = getPdf(region.id);
                const hasDocx = !!byRegion[region.id]?.pdfBase64 || byRegion[region.id]?.pdfStorage === 'indexeddb';
                return (
                  <div
                    key={region.id}
                    className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-faso-statut-valide-bg rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="text-faso-primary" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{region.nom}</h3>
                        <p className="text-sm text-gray-500">Chef-lieu : {region.chefLieu}</p>
                        {region.docxExemple && (
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">Ex. {region.docxExemple}</p>
                        )}
                        {hasDocx && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <FileText size={12} />
                            {docxFile?.fileName || 'Word enregistré'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {hasDocx && (
                        <button
                          type="button"
                          onClick={() => handleExtractDocx(region.id)}
                          disabled={extractingRegion === region.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                          title="Lire le Word et extraire les articles (catégories et articles classés automatiquement)"
                        >
                          <FileText size={18} />
                          {extractingRegion === region.id ? 'Extraction en cours (1-2 min)...' : 'Extraire les articles du Word'}
                        </button>
                      )}
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 cursor-pointer text-sm font-medium" title="Importer des articles depuis un fichier CSV">
                        <FileSpreadsheet size={18} />
                        Importer des articles
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={(e) => handleImportArticles(region.id, e)}
                        />
                      </label>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover cursor-pointer text-sm font-medium">
                        <Upload size={18} />
                        {hasDocx ? 'Remplacer le Word' : 'Téléverser un Word'}
                        <input
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={(e) => handleDocxUpload(region.id, e)}
                          disabled={uploadingRegion === region.id}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleClearRegion(region.id)}
                        disabled={clearingRegion === region.id}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50 text-sm font-medium"
                        title="Vider les articles de cette région (réimporter ensuite)"
                      >
                        <Trash2 size={18} />
                        {clearingRegion === region.id ? 'Vidage...' : 'Vider articles'}
                      </button>
                      {hasDocx && (
                        <button
                          type="button"
                          onClick={() => removeMercurialeDocx(region.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                        >
                          <Trash2 size={18} />
                          Supprimer Word
                        </button>
                      )}
                      {uploadingRegion === region.id && (
                        <span className="text-sm text-gray-500">Envoi en cours...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {importResult && (
              <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${importResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {importResult.ok ? <CheckCircle size={18} className="inline mr-2 align-middle" /> : <AlertCircle size={18} className="inline mr-2 align-middle" />}
                {importResult.message}
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && apiMode && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Journal d'audit</h2>
              <p className="text-gray-500 text-sm mt-1">Trace de toutes les actions effectuées sur la plateforme (créations, modifications, suppressions, connexions).</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <AuditLogView showCompany />
            </div>
          </div>
        )}
      </main>

      {previewImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Prévisualisation avant import</h3>
              <p className="text-sm text-gray-500 mt-1">Région : <strong>{previewImport.regionName}</strong>{previewImport.fileName && ` — Fichier : ${previewImport.fileName}`}</p>
              {previewImport.meta && (
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="text-gray-600">{previewImport.lines.length} ligne(s) extraite(s)</span>
                  <span className="text-gray-600">{previewImport.meta.categoriesCount ?? 0} catégorie(s)</span>
                  <span className="text-gray-600">{previewImport.meta.articlesCount ?? 0} article(s)</span>
                  {previewImport.regionId && (
                    <span className="text-amber-600">{countDuplicateCodes(previewImport.regionId, previewImport.lines)} doublon(s) (code déjà présent)</span>
                  )}
                </div>
              )}
              {previewImport.meta?.validationWarnings?.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  {previewImport.meta.validationWarnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Mode d'import :</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="importMode" value="add" checked={importMode === 'add'} onChange={() => setImportMode('add')} className="text-faso-primary" />
                    <span className="text-sm">Ajouter uniquement les nouveaux (doublons ignorés)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="text-faso-primary" />
                    <span className="text-sm">Remplacer toute la mercuriale</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="importMode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="text-faso-primary" />
                    <span className="text-sm">Fusionner (mettre à jour les prix des articles existants)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-amber-100 text-amber-900 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2 border border-amber-200">Code</th>
                    <th className="p-2 border border-amber-200">Désignation</th>
                    <th className="p-2 border border-amber-200">Conditionnement</th>
                    <th className="p-2 border border-amber-200 text-right">Min (FCFA)</th>
                    <th className="p-2 border border-amber-200 text-right">Moyen (FCFA)</th>
                    <th className="p-2 border border-amber-200 text-right">Max (FCFA)</th>
                    <th className="p-2 border border-amber-200">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {previewImport.lines.slice(0, 200).map((item, i) => (
                    <tr key={i} className={item.type === 'category' ? 'bg-emerald-50' : ''}>
                      <td className="p-2 border border-gray-100 font-mono text-xs">{item.code}</td>
                      <td className="p-2 border border-gray-100 max-w-xs truncate">{item.designation}</td>
                      <td className="p-2 border border-gray-100">{item.conditionnement || '—'}</td>
                      <td className="p-2 border border-gray-100 text-right font-mono">{item.prix_min != null ? Number(item.prix_min).toLocaleString() : '—'}</td>
                      <td className="p-2 border border-gray-100 text-right font-mono">{item.prix_moyen != null ? Number(item.prix_moyen).toLocaleString() : '—'}</td>
                      <td className="p-2 border border-gray-100 text-right font-mono">{item.prix_max != null ? Number(item.prix_max).toLocaleString() : '—'}</td>
                      <td className="p-2 border border-gray-100">{item.type === 'category' ? 'Catégorie' : 'Article'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewImport.lines.length > 200 && (
                <p className="text-sm text-gray-500 mt-2">… et {previewImport.lines.length - 200} autre(s) ligne(s). Le tableau ci-dessus reproduit le format du mercuriale.</p>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              {importResult && !importResult.ok && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  <span>{importResult.message}</span>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setPreviewImport(null)} disabled={importingConfirm} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50">
                  Annuler
                </button>
                <button type="button" onClick={handleConfirmImport} disabled={importingConfirm} className="px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium disabled:opacity-50 min-w-[120px]">
                  {importingConfirm ? 'Import en cours (peut prendre 1-2 min)…' : 'Importer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Mode démo</h3>
                <p className="text-sm text-gray-500">Le serveur n'était pas connecté lors de votre connexion.</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Pour créer des entreprises, déconnectez-vous puis reconnectez-vous avec <strong>admin@plateforme.com</strong> / <strong>admin123</strong>.
              Assurez-vous que LANCER.bat a bien démarré les deux fenêtres (API + frontend).
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReconnectModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => { setShowReconnectModal(false); logout(); navigate('/login'); }}
                className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium"
              >
                Se reconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nouvelle entreprise</h3>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="Ex: Ma Société SARL"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email entreprise</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="contact@entreprise.bf"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="+226 70 00 00 00"
                />
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">Compte admin (optionnel)</h4>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">Nom admin</label>
                  <input
                    type="text"
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-faso-primary outline-none"
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">Email admin (connexion)</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-faso-primary outline-none"
                    placeholder="admin@entreprise.bf"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">Mot de passe admin (min. 4 caractères)</label>
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-faso-primary outline-none"
                    placeholder="••••••••"
                    minLength={4}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'abonnement</label>
                <select
                  value={form.planType}
                  onChange={(e) => setForm({ ...form, planType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                >
                  {subscriptionPlansForSelect.map((p) => (
                    <option key={p.planType || p.id} value={p.planType}>{p.planName} — {p.price}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium">
                  Créer l'entreprise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ajouter un compte</h3>
            <p className="text-sm text-gray-500 mb-4">Entreprise : <strong>{addUserModal.name}</strong></p>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  name="userName"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (connexion)</label>
                <input
                  name="userEmail"
                  type="email"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="utilisateur@entreprise.bf"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe (min. 4 caractères)</label>
                <input
                  name="userPassword"
                  type="password"
                  required
                  minLength={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  name="userRole"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                >
                  <option value="company_admin">Administrateur</option>
                  <option value="company_user">Utilisateur</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddUserModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={addingUser} className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {addingUser ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer l'entreprise ?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Vous allez supprimer <strong>{deleteConfirm.name}</strong> et toutes ses données (utilisateurs, factures, mercuriales, etc.). Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteCompany}
                className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {clearAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Vider toute la mercuriale ?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Tous les articles seront supprimés dans les 17 régions. Les fichiers Word enregistrés resteront. Vous pourrez ensuite réimporter via CSV ou extraction Word.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setClearAllConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleClearAllMercuriale}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                Vider tout
              </button>
            </div>
          </div>
        </div>
      )}

      {planModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{planModal.plan ? 'Modifier le forfait' : 'Nouveau forfait'}</h3>
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code du forfait</label>
                <input
                  type="text"
                  value={planForm.planType}
                  onChange={(e) => setPlanForm((f) => ({ ...f, planType: e.target.value }))}
                  placeholder="ex: standard, pro"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  required
                  readOnly={!!planModal.plan}
                />
                {planModal.plan && <p className="text-xs text-gray-500 mt-1">Le code ne peut pas être modifié.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
                <input
                  type="text"
                  value={planForm.planName}
                  onChange={(e) => setPlanForm((f) => ({ ...f, planName: e.target.value }))}
                  placeholder="ex: Standard Annuel"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix affiché</label>
                  <input
                    type="text"
                    value={planForm.price}
                    onChange={(e) => setPlanForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="ex: 250 000 FCFA/an"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.priceAmount || ''}
                    onChange={(e) => setPlanForm((f) => ({ ...f, priceAmount: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonctionnalités incluses</label>
                <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {FEATURE_LABELS.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.features.includes(f.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...planForm.features, f.id] : planForm.features.filter((id) => id !== f.id);
                          setPlanForm((prev) => ({ ...prev, features: next }));
                        }}
                        className="rounded border-gray-300 text-faso-primary"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPlanModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={savingPlan} className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium disabled:opacity-50">
                  {savingPlan ? 'Enregistrement…' : planModal.plan ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editSubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Modifier l'abonnement</h3>
            <p className="text-sm text-gray-500 mb-4">{editSubModal.company?.name}</p>
            <form onSubmit={handleUpdateSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'abonnement</label>
                <select
                  name="planType"
                  defaultValue={editSubModal.sub?.planType || 'standard'}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                >
                  {subscriptionPlansForSelect.map((p) => (
                    <option key={p.planType || p.id} value={p.planType}>{p.planName} — {p.price}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={editSubModal.sub?.endDate ? new Date(editSubModal.sub.endDate).toISOString().slice(0, 10) : ''}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  name="status"
                  defaultValue={editSubModal.sub?.status || 'active'}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                >
                  <option value="active">Actif</option>
                  <option value="expired">Expiré</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditSubModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
