import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, LogIn, Loader2, CheckCircle, XCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import BrandingBlock, { BrandingFooter } from '../components/BrandingBlock';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [checkingServer, setCheckingServer] = useState(true);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const checkServer = useCallback(() => {
    setCheckingServer(true);
    return api.healthCheck()
      .then((ok) => {
        setServerReady(ok);
        return ok;
      })
      .catch(() => {
        setServerReady(false);
        return false;
      })
      .finally(() => setCheckingServer(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    const run = () => {
      if (cancelled) return;
      checkServer().then((ok) => {
        if (cancelled) return;
        const delay = ok ? 3000 : 10000;
        timeoutId = setTimeout(run, delay);
      });
    };
    run();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkServer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result?.ok && result.redirect) navigate(result.redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Connexion impossible. Vérifiez que le serveur est démarré.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-faso-sidebar-start to-faso-sidebar-end flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-x-hidden">
      <button onClick={toggleTheme} className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors" title={theme === 'dark' ? 'Mode jour' : 'Mode nuit'}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        {theme === 'dark' ? 'Jour' : 'Nuit'}
      </button>

      <div className="flex flex-col items-center w-full max-w-md flex-1 justify-center">
        <BrandingBlock variant="full" showFooter={false} />
        <div className="w-full mt-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 sm:p-6 md:p-8">
            {!checkingServer && !serverReady && (
              <div className="mb-5 p-4 bg-faso-statut-attente-bg border border-faso-statut-attente/50 rounded-faso-lg">
                <div className="flex items-start gap-3">
                  <XCircle className="text-faso-statut-attente shrink-0 mt-0.5" size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-faso-statut-attente">Serveur non démarré</p>
                    <p className="text-sm text-faso-text-secondary mt-1">1. Double-cliquez sur <strong>LANCER.bat</strong> dans le dossier du projet</p>
                    <p className="text-sm text-faso-text-secondary mt-0.5">2. Attendez 10 secondes que la fenêtre « FasoMarches - API + Frontend » s’ouvre</p>
                    <p className="text-sm text-faso-text-secondary mt-0.5">3. Le navigateur s’ouvrira automatiquement sur la plateforme</p>
                    <p className="text-xs text-faso-text-secondary mt-2">Connexion 4G : utilisez le même ordinateur où LANCER.bat tourne. Depuis un téléphone en 4G, la plateforme locale n’est pas accessible.</p>
                    <button
                      type="button"
                      onClick={() => checkServer()}
                      disabled={checkingServer}
                      className="mt-3 px-4 py-2 bg-faso-statut-attente/20 hover:bg-faso-statut-attente/30 text-faso-statut-attente text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {checkingServer ? 'Vérification…' : 'Réessayer la connexion'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          {!checkingServer && serverReady && (
              <div className="mb-5 p-3 bg-faso-statut-valide-bg border border-faso-statut-valide/50 rounded-faso-lg flex items-center gap-2">
                <CheckCircle className="text-faso-statut-valide" size={20} />
                <span className="text-faso-statut-valide text-sm font-medium">Serveur prêt — Connexion possible</span>
              </div>
            )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-faso-statut-rejete-bg border border-faso-statut-rejete/50 text-faso-statut-rejete text-sm rounded-faso px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-faso-primary focus:border-transparent outline-none"
                  placeholder="vous@entreprise.bf"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-faso-primary focus:border-transparent outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-faso-primary hover:bg-faso-primary-hover disabled:opacity-70 text-white font-semibold rounded-faso-lg shadow-card transition-all"
            >
              {submitting ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
              {submitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-6 text-center text-white/60 text-xs">
            Lancez LANCER.bat avant de vous connecter.
          </p>
          </div>
        </div>
        <div className="w-full mt-10">
          <BrandingFooter />
        </div>
      </div>
    </div>
  );
}
