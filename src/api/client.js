/**
 * Client API FasoMarchés QSL
 */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('fasomarches_token');
}

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function handleResponse(r) {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || data.message || `Erreur ${r.status}`);
  return data;
}

export const api = {
  async healthCheck() {
    const r = await fetch(`${API_BASE}/health`);
    return r.ok;
  },
  async login(email, password) {
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(r);
    if (data.token) localStorage.setItem('fasomarches_token', data.token);
    return data;
  },
  logout() {
    localStorage.removeItem('fasomarches_token');
  },
  async changePassword(currentPassword, newPassword) {
    const r = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse(r);
  },
  async getMe() {
    const r = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getCompanies() {
    const r = await fetch(`${API_BASE}/companies`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postCompany(data) {
    const r = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async getCompany(id) {
    const r = await fetch(`${API_BASE}/companies/${id}`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async patchCompany(id, data) {
    const r = await fetch(`${API_BASE}/companies/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async deleteCompany(id) {
    const r = await fetch(`${API_BASE}/companies/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (r.status === 204) return;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
  },
  async postCompanyUser(companyId, data) {
    const r = await fetch(`${API_BASE}/companies/${companyId}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async patchCompanyUser(companyId, userId, data) {
    const r = await fetch(`${API_BASE}/companies/${companyId}/users/${userId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async deleteCompanyUser(companyId, userId) {
    const r = await fetch(`${API_BASE}/companies/${companyId}/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (r.status === 204) return;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
  },
  async getMercurialeRegions() {
    const r = await fetch(`${API_BASE}/mercuriale/regions`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getMercuriale(regionId) {
    const r = await fetch(`${API_BASE}/mercuriale/${regionId}`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async importMercuriale(regionId, lines) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 600000);
    const r = await fetch(`${API_BASE}/mercuriale/${regionId}/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ lines }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return handleResponse(r);
  },
  async replaceMercuriale(regionId, lines) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 600000);
    const r = await fetch(`${API_BASE}/mercuriale/${regionId}/replace`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ lines }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return handleResponse(r);
  },
  async copyMercurialeFromTemplate() {
    const r = await fetch(`${API_BASE}/mercuriale/copy-from-template`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(r);
  },
  async extractMercurialeDocx(regionId, file) {
    const form = new FormData();
    form.append('file', file);
    const h = {};
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 300000);
    const r = await fetch(`${API_BASE}/mercuriale/${regionId}/extract-docx`, {
      method: 'POST',
      headers: h,
      body: form,
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return handleResponse(r);
  },
  async getAppelsOffres() {
    const r = await fetch(`${API_BASE}/appels-offres`);
    return handleResponse(r);
  },
  async getFactures() {
    const r = await fetch(`${API_BASE}/factures`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getFacture(id) {
    const r = await fetch(`${API_BASE}/factures/${id}`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getProformas() {
    const r = await fetch(`${API_BASE}/factures/proformas`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getDefinitives() {
    const r = await fetch(`${API_BASE}/factures/definitives`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getClients() {
    const r = await fetch(`${API_BASE}/clients`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postFacture(data) {
    const r = await fetch(`${API_BASE}/factures`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async patchFacture(id, data) {
    const r = await fetch(`${API_BASE}/factures/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async patchFactureStatut(id, statut) {
    const r = await fetch(`${API_BASE}/factures/${id}/statut`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ statut }),
    });
    return handleResponse(r);
  },
  async deleteFacture(id) {
    const r = await fetch(`${API_BASE}/factures/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(r);
  },
  async getQuittances() {
    const r = await fetch(`${API_BASE}/quittances`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getQuittance(id) {
    const r = await fetch(`${API_BASE}/quittances/${id}`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postQuittance(data) {
    const r = await fetch(`${API_BASE}/quittances`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async getMarches() {
    const r = await fetch(`${API_BASE}/marches`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getMarche(id) {
    const r = await fetch(`${API_BASE}/marches/${id}`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postMarche(data) {
    const r = await fetch(`${API_BASE}/marches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async patchMarche(id, data) {
    const r = await fetch(`${API_BASE}/marches/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async deleteMarche(id) {
    const r = await fetch(`${API_BASE}/marches/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (r.status !== 204) await handleResponse(r);
  },
  async postMarcheDepense(marcheId, data) {
    const r = await fetch(`${API_BASE}/marches/${marcheId}/depenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async deleteMarcheDepense(marcheId, depenseId) {
    const r = await fetch(`${API_BASE}/marches/${marcheId}/depenses/${depenseId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (r.status !== 204) await handleResponse(r);
  },
  async uploadMarcheDao(marcheId, file) {
    const formData = new FormData();
    formData.append('dao', file);
    const h = {};
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
    const r = await fetch(`${API_BASE}/marches/${marcheId}/dao`, {
      method: 'POST',
      headers: h,
      body: formData,
    });
    return handleResponse(r);
  },
  async downloadMarcheDao(marcheId, fileName = 'DAO.pdf') {
    const r = await fetch(`${API_BASE}/marches/${marcheId}/dao`, { headers: getHeaders() });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${r.status}`);
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
  async getArchivesMarches() {
    const r = await fetch(`${API_BASE}/archives-marches`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getArchiveMarche(id) {
    const r = await fetch(`${API_BASE}/archives-marches/${id}`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postArchiveMarche(data) {
    const r = await fetch(`${API_BASE}/archives-marches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async patchArchiveMarche(id, data) {
    const r = await fetch(`${API_BASE}/archives-marches/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async deleteArchiveMarche(id) {
    const r = await fetch(`${API_BASE}/archives-marches/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (r.status !== 204) await handleResponse(r);
  },
  async uploadArchiveDocument(archiveId, file) {
    const formData = new FormData();
    formData.append('document', file);
    const h = {};
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
    const r = await fetch(`${API_BASE}/archives-marches/${archiveId}/documents`, {
      method: 'POST',
      headers: h,
      body: formData,
    });
    return handleResponse(r);
  },
  getArchiveDocumentDownloadUrl(archiveId, docId) {
    const t = getToken();
    return `${API_BASE}/archives-marches/${archiveId}/documents/${docId}?token=${t || ''}`;
  },
  async downloadArchiveDocument(archiveId, docId, fileName = 'document') {
    const r = await fetch(`${API_BASE}/archives-marches/${archiveId}/documents/${docId}`, { headers: getHeaders() });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${r.status}`);
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
  async deleteArchiveDocument(archiveId, docId) {
    const r = await fetch(`${API_BASE}/archives-marches/${archiveId}/documents/${docId}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(r);
  },
  async getSubscriptions() {
    const r = await fetch(`${API_BASE}/subscriptions`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getPlans() {
    const r = await fetch(`${API_BASE}/plans`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postPlan(data) {
    const r = await fetch(`${API_BASE}/plans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async patchPlan(id, data) {
    const r = await fetch(`${API_BASE}/plans/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async deletePlan(id) {
    const r = await fetch(`${API_BASE}/plans/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (r.status === 204) return;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
  },
  async getSimulations() {
    const r = await fetch(`${API_BASE}/simulations`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getSimulation(id) {
    const r = await fetch(`${API_BASE}/simulations/${id}`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postSimulation(data) {
    const r = await fetch(`${API_BASE}/simulations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async patchSimulation(id, data) {
    const r = await fetch(`${API_BASE}/simulations/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async enregistrerSimulation(id) {
    const r = await fetch(`${API_BASE}/simulations/${id}/enregistrer`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(r);
  },
  async deleteSimulation(id) {
    const r = await fetch(`${API_BASE}/simulations/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (r.status !== 204) await handleResponse(r);
  },
  async getChatMessages() {
    const r = await fetch(`${API_BASE}/chat`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postChatMessage(data) {
    const r = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async getChatUsers() {
    const r = await fetch(`${API_BASE}/chat/users`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async getAnnouncements() {
    const r = await fetch(`${API_BASE}/announcements`, { headers: getHeaders() });
    return handleResponse(r);
  },
  async postAnnouncement(data) {
    const r = await fetch(`${API_BASE}/announcements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
  async deleteAnnouncement(id) {
    const r = await fetch(`${API_BASE}/announcements/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (r.status === 204) return;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
  },
  async patchSubscription(id, data) {
    const r = await fetch(`${API_BASE}/subscriptions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(r);
  },
};
