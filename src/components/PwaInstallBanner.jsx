import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'fasomarches_pwa_dismiss';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
    || document.referrer.includes('android-app://');
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function wasDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { until } = JSON.parse(raw);
    return until && Date.now() < until;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ until }));
  } catch (_) {}
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS : pas de beforeinstallprompt, on propose le hint manuel après 2 s
    if (isIOS()) {
      const t = setTimeout(() => setShowIOSHint(true), 2000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (showIOSHint && !visible) setVisible(true);
  }, [showIOSHint, visible]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
        setDeferredPrompt(null);
      }
    } catch (_) {}
    setInstalling(false);
  };

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  const isIOSBanner = showIOSHint && !deferredPrompt;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-gradient-to-r from-faso-sidebar-start to-faso-sidebar-end text-white shadow-lg">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <Download size={20} />
          </div>
          <div>
            <p className="font-semibold">Installer FasoMarchés</p>
            <p className="text-sm text-white/90">
              {isIOSBanner
                ? "Appuyez sur Partager puis « Sur l'écran d'accueil » pour installer l'app."
                : "Utilisez l'app comme une application sur votre téléphone ou ordinateur."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isIOSBanner && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-4 py-2 bg-white text-faso-primary font-medium rounded-faso hover:bg-white/90 transition-colors disabled:opacity-70"
            >
              {installing ? 'Installation…' : 'Installer'}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
