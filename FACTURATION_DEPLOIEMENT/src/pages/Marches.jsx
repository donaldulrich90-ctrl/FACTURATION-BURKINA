import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Trash2,
  Calculator,
  FileText,
  Receipt,
  ArrowLeft,
  Loader2,
  BarChart3,
  Upload,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { REGIONS_BURKINA } from '../data/mercurialeRegions';

const STORAGE_MARCHES = 'platform_marches';

function loadMarchesFromStorage() {
  try {
    const s = localStorage.getItem(STORAGE_MARCHES);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveMarchesToStorage(marches) {
  try {
    localStorage.setItem(STORAGE_MARCHES, JSON.stringify(marches));
  } catch {}
}

const DEPENSE_TYPES = [
  { id: 'enregistrement', label: 'Enregistrement du marché' },
  { id: 'timbres', label: 'Timbres fiscaux' },
  { id: 'papiers_admin', label: 'Papiers administratifs' },
  { id: 'documents_joindre', label: 'Documents à joindre' },
  { id: 'autre', label: 'Autre dépense' },
];

const STATUT_LABELS = {
  prospective: 'Prospective',
  en_cours: 'En cours',
  execute: 'Exécuté',
  abandonne: 'Abandonné',
};

const formatFCFA = (n) => (n != null && !isNaN(n) ? `${Number(n).toLocaleString('fr-FR')} FCFA` : '—');

/** Simulateur de rentabilité */
const SimulateurMarche = ({ onClose }) => {
  const [budgetEstime, setBudgetEstime] = useState(5000000);
  const [depenses, setDepenses] = useState([
    { type: 'enregistrement', libelle: 'Enregistrement', montant: 50000 },
    { type: 'timbres', libelle: 'Timbres', montant: 25000 },
    { type: 'papiers_admin', libelle: 'Papiers administratifs', montant: 15000 },
    { type: 'documents_joindre', libelle: 'Documents à joindre', montant: 10000 },
  ]);
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const margeEstimee = budgetEstime - totalDepenses;
  const tauxMarge = budgetEstime > 0 ? ((margeEstimee / budgetEstime) * 100).toFixed(1) : 0;

  const addDepense = () => {
    setDepenses([...depenses, { type: 'autre', libelle: 'Nouvelle dépense', montant: 0 }]);
  };
  const removeDepense = (idx) => {
    setDepenses(depenses.filter((_, i) => i !== idx));
  };
  const updateDepense = (idx, field, value) => {
    setDepenses(depenses.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator size={24} className="text-blue-600" />
            Simulateur de rentabilité
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Fermer">
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chiffre d'affaires estimé (FCFA)</label>
            <input
              type="number"
              value={budgetEstime}
              onChange={(e) => setBudgetEstime(Number(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Dépenses prévues</label>
              <button onClick={addDepense} className="text-blue-600 text-sm font-medium hover:underline">
                + Ajouter
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {depenses.map((d, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={d.type}
                    onChange={(e) => updateDepense(idx, 'type', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {DEPENSE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={d.libelle}
                    onChange={(e) => updateDepense(idx, 'libelle', e.target.value)}
                    placeholder="Libellé"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={d.montant || ''}
                    onChange={(e) => updateDepense(idx, 'montant', Number(e.target.value) || 0)}
                    placeholder="Montant"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right font-mono"
                  />
                  <button onClick={() => removeDepense(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Total dépenses</span>
              <span className="font-bold text-red-700">{formatFCFA(totalDepenses)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Marge bénéficiaire estimée</span>
              <span className={`font-bold ${margeEstimee >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatFCFA(margeEstimee)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
              <span className="text-gray-600">Taux de marge</span>
              <span className={`text-2xl font-bold ${Number(tauxMarge) >= 10 ? 'text-emerald-600' : Number(tauxMarge) >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {tauxMarge} %
              </span>
            </div>
            <p className="text-sm text-gray-500 pt-2">
              {Number(tauxMarge) >= 15 && '✅ Rentabilité très satisfaisante'}
              {Number(tauxMarge) >= 10 && Number(tauxMarge) < 15 && '✓ Rentabilité correcte'}
              {Number(tauxMarge) >= 0 && Number(tauxMarge) < 10 && '⚠ Marge faible, à surveiller'}
              {Number(tauxMarge) < 0 && '❌ Marché déficitaire'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Marches() {
  const { currentUser, logout, apiMode } = useAuth();
  const navigate = useNavigate();
  const [marches, setMarches] = useState(loadMarchesFromStorage);
  const [loading, setLoading] = useState(true);
  const [showSimulateur, setShowSimulateur] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedMarche, setSelectedMarche] = useState(null);
  const [form, setForm] = useState({ reference: '', titre: '', entite: '', budgetEstime: '', regionId: '' });
  const [depenseForm, setDepenseForm] = useState({ type: 'enregistrement', libelle: '', montant: '' });
  const [daoUploading, setDaoUploading] = useState(false);

  const loadMarches = useCallback(async () => {
    if (!apiMode) {
      setMarches(loadMarchesFromStorage());
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMarches();
      setMarches(data);
    } catch {
      setMarches(loadMarchesFromStorage());
    } finally {
      setLoading(false);
    }
  }, [apiMode]);

  useEffect(() => {
    loadMarches();
  }, [loadMarches]);

  useEffect(() => {
    if (!apiMode) saveMarchesToStorage(marches);
  }, [apiMode, marches]);

  const handleCreateMarche = async (e) => {
    e.preventDefault();
    if (apiMode) {
      try {
        await api.postMarche({
          reference: form.reference,
          titre: form.titre,
          entite: form.entite || undefined,
          budgetEstime: form.budgetEstime ? Number(form.budgetEstime) : undefined,
          regionId: form.regionId || undefined,
        });
        setForm({ reference: '', titre: '', entite: '', budgetEstime: '', regionId: '' });
        setShowForm(false);
        loadMarches();
      } catch (err) {
        alert(err.message || 'Erreur');
      }
      return;
    }
    const newMarche = {
      id: `local-${Date.now()}`,
      reference: form.reference,
      titre: form.titre,
      entite: form.entite || null,
      budgetEstime: form.budgetEstime ? Number(form.budgetEstime) : null,
      regionId: form.regionId || null,
      statut: 'prospective',
      depenses: [],
      factures: [],
    };
    setMarches((prev) => [...prev, newMarche]);
    setForm({ reference: '', titre: '', entite: '', budgetEstime: '', regionId: '' });
    setShowForm(false);
  };

  const handleAddDepense = (e) => {
    e.preventDefault();
    if (!selectedMarche) return;
    const depense = {
      id: `dep-${Date.now()}`,
      type: depenseForm.type,
      libelle: depenseForm.libelle,
      montant: Number(depenseForm.montant),
    };
    if (apiMode) {
      api.postMarcheDepense(selectedMarche.id, { type: depense.type, libelle: depense.libelle, montant: depense.montant })
        .then(() => api.getMarche(selectedMarche.id))
        .then(setSelectedMarche)
        .catch((err) => alert(err.message || 'Erreur'));
    } else {
      const updated = { ...selectedMarche, depenses: [...(selectedMarche.depenses || []), depense] };
      setSelectedMarche(updated);
      setMarches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }
    setDepenseForm({ type: 'enregistrement', libelle: '', montant: '' });
  };

  const handleDeleteDepense = (depenseId) => {
    if (!selectedMarche || !window.confirm('Supprimer cette dépense ?')) return;
    if (apiMode) {
      api.deleteMarcheDepense(selectedMarche.id, depenseId)
        .then(() => api.getMarche(selectedMarche.id))
        .then(setSelectedMarche)
        .catch((err) => alert(err.message || 'Erreur'));
      return;
    }
    const updated = { ...selectedMarche, depenses: (selectedMarche.depenses || []).filter((d) => d.id !== depenseId) };
    setSelectedMarche(updated);
    setMarches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleUpdateStatut = (marcheId, statut) => {
    if (apiMode) {
      api.patchMarche(marcheId, { statut })
        .then(() => { if (selectedMarche?.id === marcheId) return api.getMarche(marcheId); })
        .then((m) => m && setSelectedMarche(m))
        .then(loadMarches)
        .catch((err) => alert(err.message || 'Erreur'));
      return;
    }
    setMarches((prev) => prev.map((m) => (m.id === marcheId ? { ...m, statut } : m)));
    if (selectedMarche?.id === marcheId) setSelectedMarche({ ...selectedMarche, statut });
  };

  const totalRevenus = (m) => {
    const fromFactures = (m.factures || []).reduce((s, f) => s + (f.totalHT || 0), 0);
    const manuel = m.revenusManuels ?? 0;
    return fromFactures + manuel;
  };
  const totalDepenses = (m) => (m.depenses || []).reduce((s, d) => s + (d.montant || 0), 0);
  const margeMarche = (m) => totalRevenus(m) - totalDepenses(m);

  if (selectedMarche) {
    const revenus = totalRevenus(selectedMarche);
    const depenses = totalDepenses(selectedMarche);
    const marge = margeMarche(selectedMarche);
    const tauxMarge = revenus > 0 ? ((marge / revenus) * 100).toFixed(1) : '—';

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedMarche(null)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{selectedMarche.titre}</h2>
            <p className="text-sm text-gray-500">{selectedMarche.reference} {selectedMarche.entite && `• ${selectedMarche.entite}`}</p>
          </div>
        </div>

        {!apiMode && (
          <div className="bg-white rounded-xl border border-blue-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Revenus saisis (FCFA) — mode local</label>
            <input
              type="number"
              value={selectedMarche.revenusManuels ?? ''}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                const updated = { ...selectedMarche, revenusManuels: v };
                setSelectedMarche(updated);
                setMarches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
              }}
              placeholder="Ex: 5000000"
              className="w-full max-w-xs border border-gray-300 rounded-lg px-4 py-2 font-mono"
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Chiffre d'affaires</p>
            <p className="text-xl font-bold text-emerald-600">{formatFCFA(revenus)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total dépenses</p>
            <p className="text-xl font-bold text-red-600">{formatFCFA(depenses)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Marge bénéficiaire</p>
            <p className={`text-xl font-bold ${marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatFCFA(marge)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Taux de marge</p>
            <p className="text-xl font-bold text-blue-600">{tauxMarge} %</p>
          </div>
        </div>

        {selectedMarche.simulation && selectedMarche.simulation.articles?.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <Calculator size={18} />
              Comparaison simulation vs réalisé
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {(() => {
                const simArts = selectedMarche.simulation.articles;
                const simCA = simArts.reduce((s, a) => s + ((a.prixVente || 0) * (a.quantity || 1)), 0);
                const simAchat = simArts.reduce((s, a) => s + ((a.prixAchat || 0) * (a.quantity || 1)), 0);
                const simMarge = simCA - simAchat - (selectedMarche.simulation.totalDepenses || 0);
                return (
                  <>
                    <div>
                      <p className="text-gray-600">CA simulé</p>
                      <p className="font-bold text-indigo-700">{formatFCFA(simCA)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">CA réalisé</p>
                      <p className="font-bold text-emerald-700">{formatFCFA(revenus)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Bénéfice simulé</p>
                      <p className="font-bold">{formatFCFA(simMarge)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Bénéfice réalisé</p>
                      <p className={`font-bold ${marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatFCFA(marge)}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            <p className="text-xs text-indigo-700 mt-2">Gain de cause : comparer le bénéfice réalisé aux prévisions de la simulation.</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} /> DAO (Dossier d&apos;Appel d&apos;Offres)</h3>
          </div>
          <div className="p-4">
            {!apiMode ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">Connectez le serveur pour téléverser votre DAO directement sur la plateforme.</p>
            ) : selectedMarche.daoFileName ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText size={20} className="text-indigo-500" />
                  <span className="font-medium">{selectedMarche.daoFileName}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => api.downloadMarcheDao(selectedMarche.id, selectedMarche.daoFileName).catch((e) => alert(e.message))}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    <Download size={18} />
                    Télécharger
                  </button>
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium">
                    <Upload size={18} />
                    Remplacer
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                      className="hidden"
                      disabled={daoUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setDaoUploading(true);
                        try {
                          const updated = await api.uploadMarcheDao(selectedMarche.id, file);
                          setSelectedMarche(updated);
                          setMarches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
                        } catch (err) {
                          alert(err.message || 'Erreur lors du téléversement');
                        } finally {
                          setDaoUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer font-medium">
                <Upload size={20} />
                {daoUploading ? 'Téléversement…' : 'Téléverser le DAO (PDF, DOC, DOCX ou ZIP)'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                  className="hidden"
                  disabled={daoUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setDaoUploading(true);
                    try {
                      const updated = await api.uploadMarcheDao(selectedMarche.id, file);
                      setSelectedMarche(updated);
                      setMarches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
                    } catch (err) {
                      alert(err.message || 'Erreur lors du téléversement');
                    } finally {
                      setDaoUploading(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Receipt size={18} /> Dépenses du marché</h3>
            </div>
            <div className="p-4">
              <form onSubmit={handleAddDepense} className="flex gap-2 mb-4 flex-wrap">
                <select
                  value={depenseForm.type}
                  onChange={(e) => setDepenseForm({ ...depenseForm, type: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {DEPENSE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Libellé"
                  value={depenseForm.libelle}
                  onChange={(e) => setDepenseForm({ ...depenseForm, libelle: e.target.value })}
                  className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  placeholder="Montant"
                  value={depenseForm.montant}
                  onChange={(e) => setDepenseForm({ ...depenseForm, montant: e.target.value })}
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right"
                  required
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Ajouter
                </button>
              </form>
              <ul className="space-y-2">
                {(selectedMarche.depenses || []).map((d) => (
                  <li key={d.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-800">{d.libelle}</span>
                      <span className="ml-2 text-xs text-gray-500">({DEPENSE_TYPES.find(t => t.id === d.type)?.label || d.type})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-red-600">{formatFCFA(d.montant)}</span>
                      <button onClick={() => handleDeleteDepense(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
                {(!selectedMarche.depenses || selectedMarche.depenses.length === 0) && (
                  <li className="text-gray-500 text-sm py-4">Aucune dépense enregistrée.</li>
                )}
              </ul>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} /> Factures liées</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {(selectedMarche.factures || []).map((f) => (
                  <li key={f.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <div>
                      <span className="font-medium">{f.numero}</span>
                      <span className="ml-2 text-xs text-gray-500">{f.statut}</span>
                    </div>
                    <span className="font-mono text-emerald-600">{formatFCFA(f.totalHT)}</span>
                  </li>
                ))}
                {(!selectedMarche.factures || selectedMarche.factures.length === 0) && (
                  <li className="text-gray-500 text-sm py-4">Aucune facture liée. Associez des factures à ce marché depuis la facturation.</li>
                )}
              </ul>
              <Link to="/app" className="mt-4 inline-flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline">
                <Plus size={16} /> Créer une facture
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <span className="text-sm text-gray-600">Statut :</span>
            {['prospective', 'en_cours', 'execute', 'abandonne'].map((s) => (
            <button
              key={s}
              onClick={() => handleUpdateStatut(selectedMarche.id, s)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${selectedMarche.statut === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {STATUT_LABELS[s]}
            </button>
          ))}
          </div>
          {!apiMode && selectedMarche?.id?.startsWith('local-') && (
            <button
              onClick={() => {
                if (window.confirm('Supprimer ce marché ?')) {
                  setMarches((prev) => prev.filter((m) => m.id !== selectedMarche.id));
                  setSelectedMarche(null);
                }
              }}
              className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
            >
              Supprimer le marché
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Marchés & Dépenses</h1>
              <p className="text-sm text-gray-500">Chaque marché exécuté a ses propres dépenses pour calculer la marge bénéficiaire</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSimulateur(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
            >
              <BarChart3 size={18} />
              Simulateur
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus size={18} />
              Nouveau marché
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!apiMode && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            Mode local : vos marchés et dépenses sont enregistrés dans le navigateur. Connectez le serveur pour synchroniser avec la base.
          </div>
        )}

        {showSimulateur && <SimulateurMarche onClose={() => setShowSimulateur(false)} />}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-bold mb-4">Nouveau marché</h2>
              <form onSubmit={handleCreateMarche} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Référence *</label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="DAO-2024-054"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={form.titre}
                    onChange={(e) => setForm({ ...form, titre: e.target.value })}
                    placeholder="Fourniture de matériel informatique"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entité (donneur d'ordre)</label>
                  <input
                    type="text"
                    value={form.entite}
                    onChange={(e) => setForm({ ...form, entite: e.target.value })}
                    placeholder="Ministère, SONABEL..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget estimé (FCFA)</label>
                  <input
                    type="number"
                    value={form.budgetEstime}
                    onChange={(e) => setForm({ ...form, budgetEstime: e.target.value })}
                    placeholder="5000000"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
                  <select
                    value={form.regionId}
                    onChange={(e) => setForm({ ...form, regionId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">—</option>
                    {REGIONS_BURKINA.map((r) => (
                      <option key={r.id} value={r.id}>{r.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    Annuler
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Créer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={48} className="animate-spin text-blue-500" />
          </div>
        ) : marches.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <Building2 size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">Aucun marché</h3>
            <p className="text-gray-500 mb-6">Créez un marché pour suivre dépenses et marge bénéficiaire.</p>
            <button onClick={() => setShowForm(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Créer un marché
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {marches.map((m) => {
              const marge = margeMarche(m);
              const revenus = totalRevenus(m);
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMarche(m)}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">{m.reference}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${m.statut === 'execute' ? 'bg-emerald-100 text-emerald-700' : m.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {STATUT_LABELS[m.statut]}
                        </span>
                        {m.daoFileName && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
                            <FileText size={10} /> DAO
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800">{m.titre}</h3>
                      {m.entite && <p className="text-sm text-gray-500">{m.entite}</p>}
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">CA :</span>
                        <span className="ml-1 font-mono text-emerald-600">{formatFCFA(revenus)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Dépenses :</span>
                        <span className="ml-1 font-mono text-red-600">{formatFCFA(totalDepenses(m))}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Marge :</span>
                        <span className={`ml-1 font-mono font-bold ${marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatFCFA(marge)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
