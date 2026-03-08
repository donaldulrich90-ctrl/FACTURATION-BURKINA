import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { api } from '../api/client';

const SUGGESTIONS = [
  'Qu\'est-ce que FasoMarchés ?',
  'Quelles sont les fonctionnalités ?',
  'Comment créer une facture ?',
  'Pour qui est cette plateforme ?',
];

export default function AssistantWidgetPublic() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const { reply } = await api.postAssistantMessage(text, history, true);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || 'Erreur de connexion.');
      if (err?.fallback) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'L\'assistant n\'est pas encore configuré. Consultez le Guide utilisateur (GUIDE_ENTREPRISES.html) pour découvrir la plateforme.',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const [showHint, setShowHint] = useState(() => {
    try { return !localStorage.getItem('fasomarches_assistant_public_hint_seen'); } catch { return true; }
  });

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        {showHint && !open && (
          <div className="bg-white dark:bg-faso-card shadow-lg border border-faso-border rounded-faso-lg px-3 py-2 text-sm text-faso-text-primary">
            <span className="font-medium text-faso-primary">Découvrez la plateforme</span>
            <span className="text-faso-text-secondary ml-1">— Posez vos questions à l'IA</span>
          </div>
        )}
        <button
          onClick={() => {
            setOpen(!open);
            if (!open && showHint) {
              setShowHint(false);
              try { localStorage.setItem('fasomarches_assistant_public_hint_seen', '1'); } catch {}
            }
          }}
          className="w-14 h-14 rounded-full bg-faso-primary text-white shadow-lg hover:bg-faso-primary-hover flex items-center justify-center transition-all hover:scale-105 shrink-0"
          title="Posez vos questions sur FasoMarchés"
        >
          {open ? <X size={24} /> : <Bot size={24} />}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-48px)] h-[480px] max-h-[65vh] bg-white dark:bg-faso-card rounded-faso-lg shadow-xl border border-faso-border flex flex-col overflow-hidden">
          <div className="bg-faso-primary text-white px-4 py-3 flex items-center gap-2">
            <Bot size={22} />
            <div>
              <h3 className="font-bold text-sm">Découvrir FasoMarchés</h3>
              <p className="text-xs text-white/90">Posez vos questions sur la plateforme</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-faso-text-secondary">
                  Bonjour ! Je peux vous présenter FasoMarchés, la plateforme de gestion pour les entreprises au Burkina Faso. Connectez-vous pour un accompagnement personnalisé.
                </p>
                <p className="text-xs font-medium text-faso-text-500">Suggestions :</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="text-xs px-3 py-1.5 bg-faso-hover-bg hover:bg-faso-primary/10 rounded-faso text-faso-text-secondary hover:text-faso-primary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-faso-primary/20 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-faso-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-faso text-sm ${
                    m.role === 'user' ? 'bg-faso-primary text-white' : 'bg-faso-hover-bg text-faso-text-primary'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-faso-primary/20 flex items-center justify-center shrink-0">
                  <Loader2 size={16} className="text-faso-primary animate-spin" />
                </div>
                <div className="px-3 py-2 bg-faso-hover-bg rounded-faso">
                  <p className="text-sm text-faso-text-secondary">Réflexion en cours...</p>
                </div>
              </div>
            )}

            {error && !loading && <p className="text-xs text-faso-statut-rejete">{error}</p>}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t border-faso-border">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question..."
                className="flex-1 px-3 py-2 border border-faso-border rounded-faso text-sm focus:outline-none focus:ring-2 focus:ring-faso-primary/50"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()} className="p-2 bg-faso-primary text-white rounded-faso hover:bg-faso-primary-hover disabled:opacity-50">
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
