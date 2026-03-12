import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, X, Send, Phone, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function getSocketUrl() {
  if (import.meta.env.DEV) return undefined;
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
  const [socketError, setSocketError] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null); // null = tout le monde, userId = conversation privée
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const companyId = currentUser?.companyId;
  const canChat = apiMode && companyId && currentUser?.role !== 'super_admin';

  useEffect(() => {
    if (!canChat) return;
    const token = localStorage.getItem('fasomarches_token');
    if (!token) return;
    setSocketError(null);
    const s = io(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
    });
    s.on('connect', () => setSocketError(null));
    s.on('connect_error', () => setSocketError('Connexion temps réel indisponible. Les messages seront enregistrés.'));
    setSocket(s);
    return () => {
      s.off('connect');
      s.off('connect_error');
      s.disconnect();
    };
  }, [canChat]);

  useEffect(() => {
    if (!socket || !canChat) return;
    const handler = (msg) => {
      const isGroup = !msg.receiverId;
      const isPrivateWithMe = msg.receiverId && (msg.senderId === selectedChannel || msg.receiverId === selectedChannel);
      const isGroupChannel = selectedChannel === null;
      if (isGroup && isGroupChannel) {
        setMessages((prev) => [...prev, msg]);
      } else if (!isGroup && isPrivateWithMe) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on('chat:new', handler);
    return () => socket.off('chat:new', handler);
  }, [socket, canChat, selectedChannel]);

  useEffect(() => {
    if (!canChat) return;
    setLoading(true);
    const receiverId = selectedChannel === null ? null : selectedChannel;
    api.getChatMessages(receiverId)
      .then((msgs) => {
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [canChat, open, selectedChannel]);

  useEffect(() => {
    if (!canChat) return;
    api.getChatUsers()
      .then((us) => setUsers(Array.isArray(us) ? us : []))
      .catch(() => setUsers([]));
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
    const receiverId = selectedChannel === null ? null : selectedChannel;
    if (socket?.connected) {
      socket.emit('chat:message', { content: text, receiverId });
    } else {
      try {
        const msg = await api.postChatMessage({ content: text, receiverId });
        setMessages((prev) => [...prev, msg]);
      } catch (err) {
        setInput(text);
        setSocketError(err?.message || 'Erreur envoi. Vérifiez que le serveur est démarré.');
      }
    }
  };

  const handleCall = (user) => {
    const phone = user?.phone;
    if (phone) {
      window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');
    } else {
      alert('Aucun numéro de téléphone enregistré pour ce collaborateur.');
    }
  };

  const channelLabel = selectedChannel === null
    ? 'Tout le monde'
    : users.find((u) => u.id === selectedChannel)?.name || 'Conversation';

  if (!canChat) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
        title="Chat équipe — Discutez avec vos collègues"
      >
        <MessageCircle size={24} />
      </button>

      {open && (
        <div className="fixed bottom-24 left-6 w-[420px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[70vh] bg-white dark:bg-faso-card rounded-faso-lg shadow-xl border border-faso-border flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-faso-border bg-faso-primary/5">
            <h3 className="font-bold text-faso-text-primary flex items-center gap-2">
              <MessageCircle size={20} className="text-emerald-600" />
              Chat équipe
            </h3>
            <button onClick={() => setOpen(false)} className="p-2 hover:bg-faso-hover-bg rounded-faso">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex min-h-0">
            <div className="w-36 border-r border-faso-border p-2 overflow-y-auto shrink-0">
              <p className="text-xs font-semibold text-faso-text-500 mb-2 flex items-center gap-1">
                <Users size={14} /> Avec qui ?
              </p>
              <button
                onClick={() => setSelectedChannel(null)}
                className={`w-full text-left px-2 py-2 rounded-faso text-sm mb-1 transition-colors ${
                  selectedChannel === null ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium' : 'hover:bg-faso-hover-bg text-faso-text-primary'
                }`}
              >
                Tout le monde
              </button>
              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-1 py-1.5 group">
                    <button
                      onClick={() => setSelectedChannel(u.id)}
                      className={`flex-1 truncate text-left px-2 py-1 text-sm rounded-faso transition-colors ${
                        selectedChannel === u.id ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium' : 'hover:bg-faso-hover-bg text-faso-text-primary'
                      }`}
                      title={u.name}
                    >
                      {u.name}
                    </button>
                    <button
                      onClick={() => handleCall(u)}
                      className="p-1 text-faso-primary hover:bg-faso-primary/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Appeler"
                    >
                      <Phone size={14} />
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-3 py-2 border-b border-faso-border bg-faso-hover-bg/50">
                <p className="text-xs font-medium text-faso-text-500">
                  Conversation : <span className="text-faso-text-primary">{channelLabel}</span>
                </p>
                {socketError && (
                  <p className="text-xs text-amber-600 mt-1">{socketError}</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-faso-text-500 text-center py-8">Chargement…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-faso-text-500 text-center py-8">
                    Aucun message. Envoyez le premier !
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender?.id === currentUser?.id ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-xs text-faso-text-500 mb-0.5">
                        {m.sender?.name || 'Anonyme'}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-faso text-sm ${
                          m.sender?.id === currentUser?.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-faso-hover-bg text-faso-text-primary'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-faso-border">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Écrire à ${channelLabel}…`}
                    className="flex-1 px-3 py-2 border border-faso-border rounded-faso text-sm focus:ring-2 focus:ring-faso-primary/50 outline-none bg-white dark:bg-faso-card"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-faso hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
