import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { FileText, RefreshCw } from 'lucide-react';

const ACTION_LABELS = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  login: 'Connexion',
  login_failed: 'Échec connexion',
};

const ENTITY_LABELS = {
  facture: 'Facture',
  user: 'Utilisateur',
  company: 'Entreprise',
  client: 'Client',
  marche: 'Marché',
  quittance: 'Quittance',
  simulation: 'Simulation',
  archive_marche: 'Archive marché',
  archive_document: 'Document archive',
  announcement: 'Annonce',
  mercuriale: 'Mercuriale',
  marche_depense: 'Dépense marché',
  auth: 'Authentification',
};

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AuditLogView({ showCompany = false }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (entity) params.entity = entity;
      if (action) params.action = action;
      const { logs: data, total: t } = await api.getAuditLogs(params);
      setLogs(data || []);
      setTotal(t || 0);
    } catch (err) {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [entity, action]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-faso-primary outline-none"
        >
          <option value="">Toutes les entités</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-faso-primary outline-none"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary/90 disabled:opacity-60 text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
        <span className="text-sm text-gray-500">{total} trace(s)</span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block w-8 h-8 border-2 border-faso-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText size={40} className="mx-auto mb-2 opacity-50" />
            <p>Aucune trace enregistrée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Utilisateur</th>
                  {showCompany && (
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Entreprise</th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Entité</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let details = '-';
                  try {
                    const d = log.details ? JSON.parse(log.details) : null;
                    if (d && typeof d === 'object') {
                      details = Object.entries(d)
                        .filter(([, v]) => v != null && v !== '')
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ') || '-';
                    } else if (typeof d === 'string') details = d;
                  } catch {}
                  return (
                    <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-2">
                        {log.user ? (
                          <span title={log.user.email}>{log.user.name || log.user.email}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {showCompany && (
                        <td className="px-4 py-2">{log.company?.name || '-'}</td>
                      )}
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.action === 'delete' ? 'bg-rose-100 text-rose-700' :
                          log.action === 'create' ? 'bg-emerald-100 text-emerald-700' :
                          log.action === 'login_failed' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2">{ENTITY_LABELS[log.entity] || log.entity}</td>
                      <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={details}>{details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
