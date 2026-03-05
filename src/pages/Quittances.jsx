import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Plus,
  Search,
  LogOut,
  Building2,
  LayoutDashboard,
  Calendar,
  Banknote,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CompanyInfoBar from '../components/CompanyInfoBar';
import ChatWidget from '../components/ChatWidget';
import { api } from '../api/client';

const formatPrix = (n) => (n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—');

export default function Quittances() {
  const [quittances, setQuittances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [facturesSansQuittance, setFacturesSansQuittance] = useState([]);
  const [form, setForm] = useState({
    factureId: '',
    datePaiement: new Date().toISOString().slice(0, 10),
    montant: '',
    modePaiement: 'virement',
    referenceBancaire: '',
    remarques: '',
  });
  const { currentUser, logout, apiMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (apiMode === false || apiMode === null) {
      setQuittances([]);
      setLoading(false);
      return;
    }
    api.getQuittances()
      .then(setQuittances)
      .catch(() => setQuittances([]))
      .finally(() => setLoading(false));
  }, [apiMode]);

  const openEmitModal = async () => {
    const [factures, qList] = await Promise.all([api.getFactures(), api.getQuittances()]);
    const payees = new Set(qList.map((q) => q.factureId));
    const sansQ = factures.filter((f) => f.statut !== 'payee' && !payees.has(f.id));
    setFacturesSansQuittance(sansQ);
    setShowModal(true);
    if (sansQ.length > 0) {
      setForm((p) => ({ ...p, factureId: sansQ[0].id, montant: String(sansQ[0].totalTTC ?? 0) }));
    }
  };

  const handleEmit = async (e) => {
    e.preventDefault();
    try {
      await api.postQuittance({
        factureId: form.factureId,
        datePaiement: form.datePaiement,
        montant: Number(form.montant),
        modePaiement: form.modePaiement,
        referenceBancaire: form.referenceBancaire || undefined,
        remarques: form.remarques || undefined,
      });
      setShowModal(false);
      const list = await api.getQuittances();
      setQuittances(list);
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  const companyName = currentUser?.company?.name || 'Mon Entreprise';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-faso-bg-light overflow-x-hidden">
      {currentUser?.company && <CompanyInfoBar company={currentUser.company} />}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src="/logo-burkina-marches.png" alt="Logo" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold text-faso-text-primary text-sm sm:text-base truncate">Quittances QSL</h1>
              <p className="text-xs text-faso-text-secondary hidden sm:block">Preuve de paiement — module central</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={() => navigate('/app')} className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Tableau de bord">
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Tableau de bord</span>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Déconnexion">
              <LogOut size={18} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <ChatWidget />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quittances émises</h2>
            <p className="text-gray-500 text-sm">Preuves de paiement liées aux factures. Émettez une quittance lorsqu'une facture est réglée.</p>
          </div>
          {(apiMode === false || apiMode === null) && (
            <p className="text-amber-600 text-sm">Mode démo — connectez le serveur pour les quittances QSL</p>
          )}
          <button
            onClick={openEmitModal}
            disabled={apiMode === false || apiMode === null}
            className="flex items-center gap-2 px-5 py-2.5 bg-faso-primary text-white rounded-xl hover:bg-faso-primary-hover font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Émettre une quittance
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Chargement…</div>
        ) : quittances.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileCheck className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Aucune quittance</p>
            <p className="text-sm text-gray-400 mt-1">Émettez une quittance lorsqu'un client règle une facture.</p>
            <button onClick={openEmitModal} className="mt-4 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover">
              Émettre une quittance
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {quittances.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <FileCheck className="text-emerald-600" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{q.numero}</p>
                    <p className="text-sm text-gray-500">Facture {q.facture?.numero} — {q.facture?.client}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(q.datePaiement).toLocaleDateString('fr-FR')}</span>
                      <span className="flex items-center gap-1"><Banknote size={12} />{q.modePaiement}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-emerald-700">{formatPrix(q.montant)}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{q.statut}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Émettre une quittance (QSL)</h3>
            <form onSubmit={handleEmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facture</label>
                <select
                  value={form.factureId}
                  onChange={(e) => {
                    const f = facturesSansQuittance.find((x) => x.id === e.target.value);
                    setForm((p) => ({ ...p, factureId: e.target.value, montant: f ? String(f.totalTTC) : p.montant }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Sélectionner une facture</option>
                  {facturesSansQuittance.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.numero} — {f.client} — {formatPrix(f.totalTTC)}
                    </option>
                  ))}
                </select>
                {facturesSansQuittance.length === 0 && <p className="text-sm text-amber-600 mt-1">Aucune facture éligible (toutes déjà avec quittance ou payées)</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date paiement</label>
                <input
                  type="date"
                  value={form.datePaiement}
                  onChange={(e) => setForm((p) => ({ ...p, datePaiement: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
                <input
                  type="number"
                  value={form.montant}
                  onChange={(e) => setForm((p) => ({ ...p, montant: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode paiement</label>
                <select
                  value={form.modePaiement}
                  onChange={(e) => setForm((p) => ({ ...p, modePaiement: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="virement">Virement</option>
                  <option value="especes">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence bancaire (optionnel)</label>
                <input
                  type="text"
                  value={form.referenceBancaire}
                  onChange={(e) => setForm((p) => ({ ...p, referenceBancaire: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Ex: VIR-2024-123456"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700">
                  Annuler
                </button>
                <button type="submit" disabled={facturesSansQuittance.length === 0} className="flex-1 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover font-medium disabled:opacity-50">
                  Émettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
