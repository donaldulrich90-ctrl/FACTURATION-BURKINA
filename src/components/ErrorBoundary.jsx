import React from 'react';

/**
 * Error Boundary pour capturer les erreurs React et afficher un message
 * au lieu d'une page blanche (ex: après connexion).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erreur capturée:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-faso-bg-light">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-faso-border p-6">
            <h1 className="text-lg font-bold text-faso-statut-rejete mb-2">Erreur de chargement</h1>
            <p className="text-sm text-faso-text-secondary mb-4">
              Une erreur s'est produite après la connexion. Détails :
            </p>
            <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-32 mb-4">
              {error?.message || String(error)}
            </pre>
            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              className="w-full py-2 px-4 bg-faso-primary text-white rounded-lg font-medium hover:bg-faso-primary-hover"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
