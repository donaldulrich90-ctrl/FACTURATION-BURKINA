import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  LogOut,
  Calendar,
  CreditCard,
  UserPlus,
  LayoutDashboard,
  FileText,
  FileCheck,
  Save,
  Moon,
  Sun,
  Edit2,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CompanyInfoBar from '../components/CompanyInfoBar';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { compressImageForStorage } from '../utils/imageCompress';
import AuditLogView from '../components/AuditLogView';

export default function CompanyAdmin() {
  const { currentUser, logout, refreshUser, apiMode, getCompanyUsers, getCompanySubscription, updateCompanyLocal, getCompanyEntete, openChangePasswordModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'company_user', assignedTasks: [] });
  const [enteteForm, setEnteteForm] = useState({
    name: '', ifu: '', rccm: '', regimeFiscal: '', address: '', contact: '', gerant: '', logoUrl: '', signatureUrl: '', cachetUrl: '', website: '',
  });

  // IDs alignés avec les onglets de l'app (Facturation.jsx NavItem id)
  const TASKS = [
    { id: 'facturation', label: 'Facturation' },
    { id: 'mercuriale', label: 'Mercuriale / Prix' },
    { id: 'appels-offres', label: 'Appels d\'offres BF' },
    { id: 'simulation', label: 'Simulation & Marchés' },
    { id: 'suivi', label: 'Suivi Paiements' },
    { id: 'documents-admin', label: 'Documents administratifs' },
    { id: 'montage-dao', label: 'Montage DAO' },
    { id: 'rh', label: 'Gestion RH' },
    { id: 'comptabilite', label: 'Comptabilité' },
    { id: 'impots-droits', label: 'Impôts & droits Burkina' },
    { id: 'archives-marches', label: 'Archives marchés exécutés' },
  ];
  const [savingEntete, setSavingEntete] = useState(false);

  useEffect(() => {
    if (!currentUser?.companyId) {
      setLoading(false);
      return;
    }
    if (apiMode === false || apiMode === null) {
      const c = currentUser.company || { id: currentUser.companyId, name: 'Entreprise', subscriptions: [getCompanySubscription(currentUser.companyId)], users: getCompanyUsers(currentUser.companyId) };
      setCompany(c);
      const entete = getCompanyEntete?.(currentUser.companyId) || {};
      setEnteteForm({
        name: c.name || entete.name || '',
        ifu: c.ifu || entete.ifu || '',
        rccm: c.rccm || entete.rccm || '',
        regimeFiscal: c.regimeFiscal || entete.regimeFiscal || '',
        address: c.address || entete.address || '',
        contact: c.contact || c.phone || entete.contact || '',
        gerant: c.gerant || entete.gerant || '',
        logoUrl: c.logoUrl || entete.logoUrl || '',
        signatureUrl: c.signatureUrl || entete.signatureUrl || '',
        cachetUrl: c.cachetUrl || entete.cachetUrl || '',
        website: c.website || entete.website || '',
      });
      setLoading(false);
      return;
    }
    api.getCompany(currentUser.companyId)
      .then((c) => {
        setCompany(c);
        setEnteteForm({
          name: c.name || '',
          ifu: c.ifu || '',
          rccm: c.rccm || '',
          regimeFiscal: c.regimeFiscal || '',
          address: c.address || '',
          contact: c.contact || c.phone || '',
          gerant: c.gerant || '',
          logoUrl: c.logoUrl || '',
          signatureUrl: c.signatureUrl || '',
          cachetUrl: c.cachetUrl || '',
          website: c.website || '',
        });
      })
      .catch(() => {
        const c = currentUser.company || { id: currentUser.companyId, name: 'Entreprise', subscriptions: [], users: [] };
        setCompany(c);
      })
      .finally(() => setLoading(false));
  }, [currentUser?.companyId, apiMode, getCompanyEntete]);

  const subscription = company?.subscriptions?.[0] || (Array.isArray(company?.subscriptions) ? company.subscriptions[0] : getCompanySubscription?.(currentUser?.companyId)) || currentUser?.subscription;
  const companyUsers = company?.users || getCompanyUsers?.(currentUser?.companyId) || [];

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (apiMode === false || apiMode === null) {
      alert('Mode démo : connectez le serveur pour ajouter des utilisateurs.');
      return;
    }
    try {
      await api.postCompanyUser(currentUser.companyId, {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role: form.role,
        assignedTasks: Array.isArray(form.assignedTasks) ? form.assignedTasks : [],
      });
      setForm({ name: '', email: '', password: '', phone: '', role: 'company_user', assignedTasks: [] });
      setShowModal(false);
      const c = await api.getCompany(currentUser.companyId);
      setCompany(c);
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const handleSaveEntete = async (e) => {
    e.preventDefault();
    setSavingEntete(true);
    try {
      let dataToSave = { ...enteteForm };
      const maxKb = 500;
      for (const field of ['logoUrl', 'signatureUrl', 'cachetUrl']) {
        const val = dataToSave[field];
        if (val && val.startsWith('data:image/') && val.length > maxKb * 1024 * (4 / 3)) {
          try {
            dataToSave[field] = await compressImageForStorage(val, field === 'logoUrl' ? { maxWidth: 1200, maxHeight: 800, quality: 0.85, maxKb } : { maxWidth: 440, maxHeight: 440, quality: 0.85, maxKb });
          } catch (_) { /* garder l'original */ }
        }
      }
      if (apiMode) {
        await api.patchCompany(currentUser.companyId, dataToSave);
        const c = await api.getCompany(currentUser.companyId);
        setCompany(c);
        await updateCompanyLocal(currentUser.companyId, dataToSave);
        await refreshUser();
      } else {
        await updateCompanyLocal(currentUser.companyId, dataToSave);
        setEnteteForm(dataToSave);
      }
    } catch (err) {
      alert(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSavingEntete(false);
    }
  };

  const handleImageFile = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (PNG, JPG, etc.).');
      return;
    }
    try {
      const opts = field === 'logoUrl'
        ? { maxWidth: 1200, maxHeight: 800, quality: 0.9, maxKb: 400 }
        : field === 'signatureUrl'
          ? { maxWidth: 600, maxHeight: 240, quality: 0.9, maxKb: 200 }
          : { maxWidth: 440, maxHeight: 440, quality: 0.9, maxKb: 200 };
      const dataUrl = await compressImageForStorage(file, opts);
      setEnteteForm((f) => ({ ...f, [field]: dataUrl }));
    } catch (err) {
      alert(err.message || 'Erreur lors du chargement de l\'image.');
    }
    e.target.value = '';
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    if (apiMode === false || apiMode === null) {
      alert('Mode démo : connectez le serveur pour gérer les utilisateurs.');
      return;
    }
    try {
      await api.deleteCompanyUser(currentUser.companyId, userId);
      const c = await api.getCompany(currentUser.companyId);
      setCompany(c);
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const handleOpenEdit = (u) => {
    const tasks = (typeof u.assignedTasks === 'string' ? (() => { try { return JSON.parse(u.assignedTasks); } catch { return []; } })() : u.assignedTasks) || [];
    setEditUser(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      phone: u.phone || '',
      role: u.role || 'company_user',
      assignedTasks: Array.isArray(tasks) ? tasks : [],
    });
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editUser || apiMode === false || apiMode === null) return;
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone?.trim() || null,
        role: form.role,
        assignedTasks: Array.isArray(form.assignedTasks) ? form.assignedTasks : [],
      };
      if (form.password?.trim().length >= 6) payload.password = form.password.trim();
      await api.patchCompanyUser(currentUser.companyId, editUser.id, payload);
      setEditUser(null);
      setForm({ name: '', email: '', password: '', phone: '', role: 'company_user', assignedTasks: [] });
      const c = await api.getCompany(currentUser.companyId);
      setCompany(c);
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const isExpired = currentUser?.isExpired || (subscription && subscription.status === 'expired');
  const endDate = subscription?.endDate;

  if (loading) return <div className="min-h-screen bg-faso-bg-light dark:bg-faso-bg flex items-center justify-center"><div className="animate-spin w-10 h-10 border-2 border-faso-primary border-t-transparent rounded-full" /></div>;
  if (!company) return <div className="min-h-screen bg-faso-bg-light dark:bg-faso-bg flex items-center justify-center"><p className="text-gray-500 dark:text-gray-400">Entreprise introuvable.</p></div>;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-faso-bg-light dark:bg-faso-bg overflow-x-hidden">
      {company && <CompanyInfoBar company={company} />}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <img src="/logo-burkina-marches.png" alt="Logo" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold text-faso-text-primary dark:text-white text-sm sm:text-base truncate">{company.name}</h1>
              <p className="text-xs text-faso-text-secondary hidden sm:block">Administration du compte</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={openChangePasswordModal} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg" title="Changer mot de passe">
              <Key size={18} />
            </button>
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg" title={theme === 'dark' ? 'Mode jour' : 'Mode nuit'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => navigate('/app')} className="p-2 sm:px-4 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Application">
              <LayoutDashboard size={18} />
              <span className="hidden md:inline ml-2">Application</span>
            </button>
            <button onClick={() => navigate('/quittances')} className="p-2 sm:px-4 sm:py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Quittances QSL">
              <FileCheck size={18} />
              <span className="hidden md:inline ml-2">Quittances</span>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 sm:px-4 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Déconnexion">
              <LogOut size={18} />
              <span className="hidden md:inline ml-2">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>


      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {isExpired && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <strong>Abonnement expiré.</strong> Contactez la plateforme pour renouveler votre abonnement annuel.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <CreditCard size={20} className="text-faso-primary" />
              Abonnement annuel
            </h3>
            {subscription ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500 dark:text-gray-400">Formule :</span> {subscription.planName}</p>
                <p><span className="text-gray-500 dark:text-gray-400">Période :</span> {subscription.startDate} → {subscription.endDate}</p>
                <p><span className="text-gray-500 dark:text-gray-400">Tarif :</span> {subscription.price}</p>
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Statut :</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                    {subscription.status === 'active' ? 'Actif' : subscription.status === 'expired' ? 'Expiré' : subscription.status}
                  </span>
                </p>
                {subscription.features && (() => {
                  const list = typeof subscription.features === 'string' ? (() => { try { return JSON.parse(subscription.features); } catch { return []; } })() : subscription.features;
                  if (!Array.isArray(list) || list.length === 0) return null;
                  const labels = list.map((id) => TASKS.find((t) => t.id === id)?.label || id);
                  return (
                    <p className="pt-1"><span className="text-gray-500 dark:text-gray-400">Fonctionnalités :</span> <span className="text-gray-700 dark:text-gray-300">{labels.slice(0, 5).join(', ')}{labels.length > 5 ? ` +${labels.length - 5}` : ''}</span></p>
                  );
                })()}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucun abonnement enregistré.</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-faso-primary" />
              Informations entreprise
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>{company.email}</p>
              {company.phone && <p>{company.phone}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <FileText size={20} className="text-faso-primary" />
            Entête entreprise pour facturation
          </h3>
          <p className="text-sm text-gray-500 mb-4">Ces informations apparaissent sur vos factures (nom, IFU, RCCM, logo, etc.).</p>
          <form onSubmit={handleSaveEntete} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                <input type="text" value={enteteForm.name} onChange={e => setEnteteForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="Nom de l'entreprise" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFU (10 chiffres)</label>
                <input type="text" value={enteteForm.ifu} onChange={e => setEnteteForm(f => ({ ...f, ifu: e.target.value }))} maxLength={10} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none font-mono" placeholder="00012345X" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RCCM</label>
                <input type="text" value={enteteForm.rccm} onChange={e => setEnteteForm(f => ({ ...f, rccm: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="BF-OUA-2024-XXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Régime fiscal</label>
                <input type="text" value={enteteForm.regimeFiscal} onChange={e => setEnteteForm(f => ({ ...f, regimeFiscal: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="RS, RSI, etc." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea value={enteteForm.address} onChange={e => setEnteteForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="Adresse postale complète" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact (tél / email)</label>
                <input type="text" value={enteteForm.contact} onChange={e => setEnteteForm(f => ({ ...f, contact: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="Téléphone ou email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du gérant</label>
                <input type="text" value={enteteForm.gerant} onChange={e => setEnteteForm(f => ({ ...f, gerant: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="Nom du responsable / gérant" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                <input type="url" value={enteteForm.website} onChange={e => setEnteteForm(f => ({ ...f, website: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="https://www.entreprise.bf" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo (URL ou import fichier)</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="url" value={enteteForm.logoUrl} onChange={e => setEnteteForm(f => ({ ...f, logoUrl: e.target.value }))} className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none" placeholder="https://... ou importer ci-dessous" />
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-sm font-medium text-gray-700">
                    <input type="file" accept="image/*" onChange={handleImageFile('logoUrl')} className="sr-only" />
                    Importer une image
                  </label>
                </div>
                {enteteForm.logoUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                      <img src={enteteForm.logoUrl} alt="Aperçu logo" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <span className="text-xs text-gray-500">Aperçu — enregistrez l'entête pour l’appliquer aux factures.</span>
                  </div>
                )}
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signature (image)</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input type="url" value={enteteForm.signatureUrl || ''} onChange={e => setEnteteForm(f => ({ ...f, signatureUrl: e.target.value }))} className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none text-sm" placeholder="URL ou importer" />
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-sm font-medium text-gray-700">
                      <input type="file" accept="image/*" onChange={handleImageFile('signatureUrl')} className="sr-only" />
                      Importer
                    </label>
                  </div>
                  {enteteForm.signatureUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-16 h-10 rounded border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                        <img src={enteteForm.signatureUrl} alt="Signature" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                      <span className="text-xs text-gray-500">Aperçu signature</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cachet (image)</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input type="url" value={enteteForm.cachetUrl || ''} onChange={e => setEnteteForm(f => ({ ...f, cachetUrl: e.target.value }))} className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none text-sm" placeholder="URL ou importer" />
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-sm font-medium text-gray-700">
                      <input type="file" accept="image/*" onChange={handleImageFile('cachetUrl')} className="sr-only" />
                      Importer
                    </label>
                  </div>
                  {enteteForm.cachetUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-16 h-16 rounded border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                        <img src={enteteForm.cachetUrl} alt="Cachet" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                      <span className="text-xs text-gray-500">Aperçu cachet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={savingEntete} className="inline-flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium disabled:opacity-50">
                <Save size={18} />
                {savingEntete ? 'Enregistrement…' : 'Enregistrer l\'entête'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-faso-primary" />
              Comptes utilisateurs
            </h3>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium"
            >
              <UserPlus size={18} />
              Ajouter un utilisateur
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Nom</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Tél.</th>
                  <th className="p-4">Rôle</th>
                  <th className="p-4">Tâches assignées</th>
                  <th className="p-4 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companyUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-medium text-gray-900">{u.name || u.email}</td>
                    <td className="p-4 text-gray-600">{u.email}</td>
                    <td className="p-4 text-gray-600">{u.phone || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'company_admin' ? 'bg-faso-statut-valide-bg text-faso-primary' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role === 'company_admin' ? 'Administrateur' : 'Utilisateur'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {(() => {
                        const tasks = (typeof u.assignedTasks === 'string' ? (() => { try { return JSON.parse(u.assignedTasks); } catch { return []; } })() : u.assignedTasks) || [];
                        if (tasks.length === 0) return <span className="text-gray-400">—</span>;
                        return (
                          <span className="flex flex-wrap gap-1">
                            {tasks.slice(0, 3).map((id) => {
                              const t = TASKS.find((x) => x.id === id);
                              const label = t?.label || id;
                              return <span key={id} className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">{label}</span>;
                            })}
                            {tasks.length > 3 && <span className="text-xs text-gray-500">+{tasks.length - 3}</span>}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="text-faso-primary hover:text-faso-primary-hover text-sm flex items-center gap-1"
                          >
                            <Edit2 size={14} />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleRemoveUser(u.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {companyUsers.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              Aucun utilisateur. Ajoutez des comptes pour votre équipe.
            </div>
          )}
        </div>

        {apiMode && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FileText size={20} className="text-faso-primary" />
              Journal d'audit
            </h3>
            <p className="text-sm text-gray-500 mb-4">Trace des actions effectuées par les utilisateurs de votre entreprise.</p>
            <AuditLogView showCompany={false} />
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ajouter un utilisateur</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="jean@entreprise.bf"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (pour appels)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="+226 70 00 00 00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                >
                  <option value="company_user">Utilisateur</option>
                  <option value="company_admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tâches / modules assignés</label>
                <p className="text-xs text-gray-500 mb-2">Cochez les modules auxquels cet utilisateur a accès (IDs alignés avec les onglets de l'app).</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {TASKS.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedTasks.includes(t.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...form.assignedTasks, t.id] : form.assignedTasks.filter((id) => id !== t.id);
                          setForm({ ...form, assignedTasks: next });
                        }}
                        className="rounded border-gray-300 text-faso-primary focus:ring-faso-primary"
                      />
                      <span className="text-gray-700">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium">
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Modifier l'utilisateur</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="text"
                  value={form.email}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-0.5">L'email ne peut pas être modifié.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (pour appels)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="+226 70 00 00 00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe (optionnel)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                  placeholder="Laisser vide pour conserver l'actuel"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-faso-primary outline-none"
                >
                  <option value="company_user">Utilisateur</option>
                  <option value="company_admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tâches / modules assignés</label>
                <p className="text-xs text-gray-500 mb-2">Cochez les modules auxquels cet utilisateur a accès.</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {TASKS.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedTasks.includes(t.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...form.assignedTasks, t.id] : form.assignedTasks.filter((id) => id !== t.id);
                          setForm({ ...form, assignedTasks: next });
                        }}
                        className="rounded border-gray-300 text-faso-primary focus:ring-faso-primary"
                      />
                      <span className="text-gray-700">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditUser(null); setForm({ name: '', email: '', password: '', phone: '', role: 'company_user', assignedTasks: [] }); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
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
