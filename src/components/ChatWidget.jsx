import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, X, Send, Phone, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function getSocketUrl() {
  if (import.meta.env.DEV) return undefined; // use same origin (proxy)
  return window.location.origin;
}

export default function ChatWidget() {
  const { currentUser, apiMode } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const companyId = currentUser?.companyId;
  const canChat = apiMode && companyId && currentUser?.role !== 'super_admin';

  useEffect(() => {
    if (!canChat) return;
    const token = localStorage.getItem('fasomarches_token');
    if (!token) return;
    const s = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
    });
    setSocket(s);
    return () => s.disconnect();
  }, [canChat]);

  useEffect(() => {
    if (!socket || !canChat) return;
    socket.on('chat:new', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off('chat:new');
  }, [socket, canChat]);

  useEffect(() => {
    if (!canChat) return;
    setLoading(true);
    Promise.all([api.getChatMessages(), api.getChatUsers()])
      .then(([msgs, us]) => {
        setMessages(Array.isArray(msgs) ? msgs : []);
        setUsers(Array.isArray(us) ? us : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canChat, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (socket?.connected) {
      socket.emit('chat:message', { content: text });
    } else {
      try {
        const msg = await api.postChatMessage({ content: text });
        setMessages((prev) => [...prev, msg]);
      } catch (_) {}
    }
  };

  const handleCall = (user) => {
    const phone = user?.phone;
    if (phone) {
      window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');
    } else {
      alert('Aucun numéro de téléphone enregistré pour ce collaborateur. Demandez-lui de l\'ajouter dans Administration.');
    }
  };

  if (!canChat) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-faso-primary hover:bg-faso-primary-hover text-white rounded-full shadow-card flex items-center justify-center z-40 transition-colors"
        title="Chat équipe"
      >
        <MessageCircle size={24} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[480px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle size={20} className="text-faso-primary" />
              Chat équipe
            </h3>
            <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-gray-500 text-center py-8">Chargement…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">Aucun message. Envoyez le premier !</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender?.id === currentUser?.id ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-xs text-gray-500 mb-0.5">{m.sender?.name || 'Anonyme'}</span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                          m.sender?.id === currentUser?.id
                            ? 'bg-faso-primary text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Écrire un message…"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-faso-primary outline-none bg-white dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="px-4 py-2 bg-faso-primary text-white rounded-lg hover:bg-faso-primary-hover disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
            <div className="w-36 border-l border-gray-200 dark:border-slate-700 p-2 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                <Users size={14} /> Équipe
              </p>
              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-1 py-1.5">
                    <span className="text-xs truncate" title={u.name}>
                      {u.name}
                    </span>
                    <button
                      onClick={() => handleCall(u)}
                      className="p-1 text-faso-primary hover:bg-violet-100 rounded"
                      title="Appeler"
                    >
                      <Phone size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
