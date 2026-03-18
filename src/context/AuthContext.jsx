import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { getEntete, setEntete } from '../utils/enteteStorage';
import ChangePasswordModal from '../components/ChangePasswordModal';

const STORAGE_USER = 'platform_current_user';

const defaultCompanies = [];
const defaultUsers = [];
const defaultSubscriptions = [];

function loadJson(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

function loginLocal(email, password, companies, users, subscriptions) {
  email = (email || '').trim().toLowerCase();
  if (email === 'admin@plateforme.com' && password === 'admin123') {
    return { user: { id: 'super', email: 'admin@plateforme.com', name: 'Super Admin', role: 'super_admin', companyId: null } };
  }
  const user = users.find((u) => u.email.toLowerCase() === email && u.password === password);
  if (!user) return null;
  const company = companies.find((c) => c.id === user.companyId);
  const sub = subscriptions.find((s) => s.companyId === user.companyId);
  const endDate = sub ? new Date(sub.endDate) : null;
  const isExpired = endDate && endDate < new Date();
  return {
    user: { ...user, company, subscription: sub || null, isExpired },
  };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiMode, setApiMode] = useState(null);
  const [enteteCache, setEnteteCache] = useState({});
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const companies = loadJson('platform_companies', defaultCompanies);
  const users = loadJson('platform_users', defaultUsers);
  const subscriptions = loadJson('platform_subscriptions', defaultSubscriptions);

  useEffect(() => {
    const token = localStorage.getItem('fasomarches_token');
    if (!token) {
      const saved = loadJson(STORAGE_USER, null);
      if (saved?.email === 'admin@plateforme.com') {
        localStorage.removeItem(STORAGE_USER);
        setLoading(false);
        return;
      }
      if (saved) {
        setCurrentUser(saved);
        setApiMode(false);
      }
      setLoading(false);
      return;
    }
    api.getMe()
      .then((user) => {
        setApiMode(true);
        const sub = user.company?.subscriptions?.[0];
        const endDate = sub ? new Date(sub.endDate) : null;
        const isExpired = endDate && endDate < new Date();
        setCurrentUser({ ...user, isExpired: !!isExpired, subscription: sub || null });
      })
      .catch(() => {
        api.logout();
        const saved = loadJson(STORAGE_USER, null);
        setCurrentUser(saved);
        setApiMode(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const emailTrim = (email || '').trim().toLowerCase();
    const passwordTrim = (password || '').trim();
    const isSuperAdmin = emailTrim === 'admin@plateforme.com';
    try {
      const data = await api.login(emailTrim, passwordTrim);
      const user = data.user;
      setApiMode(true);
      setCurrentUser(user);
      const path = user.role === 'super_admin' ? '/admin' : user.role === 'company_admin' ? '/company' : '/app';
      return { ok: true, user, redirect: path };
    } catch (err) {
      if (isSuperAdmin) {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('trop de tentatives') || msg.includes('trop de requêtes')) {
          throw err;
        }
        if (msg.includes('email') || msg.includes('mot de passe') || msg.includes('incorrect')) {
          throw err;
        }
        const h = (typeof window !== 'undefined' && window.location?.hostname || '').toLowerCase();
        const isProd = /duckdns|onrender|railway|\.com|\.org|\.net|\.bf/.test(h);
        const fallback = isProd
          ? 'Serveur inaccessible. Vérifiez https://' + (window?.location?.hostname || '') + '/api/health'
          : 'Serveur inaccessible. Lancez LANCER.bat, attendez 10 secondes puis réessayez.';
        throw new Error(fallback);
      }
      const local = loginLocal(emailTrim, passwordTrim, companies, users, subscriptions);
      if (local) {
        setApiMode(false);
        setCurrentUser(local.user);
        localStorage.setItem(STORAGE_USER, JSON.stringify(local.user));
        const path = local.user.role === 'super_admin' ? '/admin' : local.user.role === 'company_admin' ? '/company' : '/app';
        return { ok: true, user: local.user, redirect: path };
      }
      throw err;
    }
  };

  const logout = () => {
    api.logout();
    localStorage.removeItem(STORAGE_USER);
    setCurrentUser(null);
  };

  useEffect(() => {
    const cid = currentUser?.companyId;
    if (!cid) return;
    getEntete(cid).then((data) => {
      setEnteteCache((prev) => ({ ...prev, [cid]: data || {} }));
    });
  }, [currentUser?.companyId]);

  const refreshUser = async () => {
    if (apiMode) {
      try {
        const user = await api.getMe();
        const sub = user.company?.subscriptions?.[0];
        const endDate = sub ? new Date(sub.endDate) : null;
        const isExpired = endDate && endDate < new Date();
        setCurrentUser({ ...user, isExpired: !!isExpired, subscription: sub || null });
      } catch {}
    }
  };

  const updateCompanyLocal = async (companyId, data) => {
    const merged = { ...(enteteCache[companyId] || {}), ...data };
    await setEntete(companyId, merged);
    setEnteteCache((prev) => ({ ...prev, [companyId]: merged }));
    if (currentUser?.companyId === companyId) {
      const updatedCompany = { ...(currentUser.company || {}), ...data };
      setCurrentUser({ ...currentUser, company: updatedCompany });
    }
  };

  const getCompanyEntete = useCallback((companyId) => {
    return enteteCache[companyId] || {};
  }, [enteteCache]);

  const getCompanyUsers = (companyId) => users.filter((u) => u.companyId === companyId);
  const getCompanySubscription = (companyId) => subscriptions.find((s) => s.companyId === companyId);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    refreshUser,
    apiMode,
    companies,
    users,
    subscriptions,
    getCompanyUsers,
    getCompanySubscription,
    updateCompanyLocal,
    getCompanyEntete,
    openChangePasswordModal: () => setShowChangePasswordModal(true),
    closeChangePasswordModal: () => setShowChangePasswordModal(false),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {currentUser && showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => setShowChangePasswordModal(false)}
          apiMode={apiMode}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
