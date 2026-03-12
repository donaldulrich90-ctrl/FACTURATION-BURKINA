import React, { useState } from 'react';
import { Key, X, Loader2 } from 'lucide-react';
import { api } from '../api/client';

export default function ChangePasswordModal({ onClose, onSuccess, apiMode = true }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-faso-card rounded-faso-lg shadow-xl max-w-md w-full border border-faso-border">
        <div className="flex items-center justify-between p-4 border-b border-faso-border">
          <h3 className="font-bold text-faso-text-primary flex items-center gap-2">
            <Key size={20} />
            Changer mon mot de passe
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-faso-text-secondary hover:bg-faso-hover-bg rounded-faso"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {apiMode === false && (
            <div className="p-3 bg-faso-statut-attente-bg text-faso-statut-attente rounded-faso text-sm">
              Connectez le serveur (LANCER.bat) pour pouvoir changer votre mot de passe.
            </div>
          )}
          {error && (
            <div className="p-3 bg-faso-statut-rejete-bg text-faso-statut-rejete rounded-faso text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-faso-text-secondary mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-faso-border rounded-faso px-3 py-2"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-faso-text-secondary mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-faso-border rounded-faso px-3 py-2"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-faso-text-secondary mb-1">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-faso-border rounded-faso px-3 py-2"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-faso-border rounded-faso text-faso-text-secondary hover:bg-faso-hover-bg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !currentPassword || !newPassword || !confirmPassword || apiMode === false}
              className="flex-1 px-4 py-2 bg-faso-primary text-white rounded-faso hover:bg-faso-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {submitting ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
