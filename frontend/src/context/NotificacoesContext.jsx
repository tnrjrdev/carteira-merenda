import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { registrarPushTokenMock } from '../services/push.js';

const NotificacoesContext = createContext(null);

export function NotificacoesProvider({ children }) {
  const { user } = useAuth();
  const [lista, setLista] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const eventSourceRef = useRef(null);

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const [l, c] = await Promise.all([
        api.get('/notificacoes'),
        api.get('/notificacoes/nao-lidas'),
      ]);
      setLista(l.data || []);
      setNaoLidas(c.data?.naoLidas ?? 0);
    } catch (_) { /* silencioso */ }
  }, [user]);

  const marcarLida = useCallback(async (id) => {
    await api.post(`/notificacoes/${id}/lida`);
    setLista((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    setNaoLidas((n) => Math.max(0, n - 1));
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    await api.post('/notificacoes/lidas');
    setLista((prev) => prev.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);
  }, []);

  useEffect(() => {
    if (!user) {
      setLista([]); setNaoLidas(0);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }
    carregar();
    registrarPushTokenMock().catch(() => {});

    // SSE: o EventSource padrão não suporta header Authorization,
    // então passamos o token como query param (interceptado pelo JwtAuthFilter).
    const token = localStorage.getItem('merenda.token');
    const base = import.meta.env.VITE_API_URL || '/api';
    const url = `${base}/notificacoes/stream?access_token=${encodeURIComponent(token || '')}`;
    try {
      const es = new EventSource(url, { withCredentials: false });
      eventSourceRef.current = es;
      es.addEventListener('notificacao', (ev) => {
        try {
          const n = JSON.parse(ev.data);
          setLista((prev) => [{ ...n, lida: false }, ...prev].slice(0, 50));
          setNaoLidas((c) => c + 1);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(n.titulo || 'Merenda', { body: n.mensagem, icon: '/icons/icon-192.svg' });
          }
        } catch (_) { /* ignora */ }
      });
      es.onerror = () => {
        // EventSource reabre sozinho. Em caso de falha definitiva (401), fecha.
        if (es.readyState === EventSource.CLOSED) {
          eventSourceRef.current = null;
        }
      };
    } catch (_) { /* SSE indisponível em alguns navegadores antigos */ }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user, carregar]);

  const value = useMemo(() => ({ lista, naoLidas, carregar, marcarLida, marcarTodasLidas }),
      [lista, naoLidas, carregar, marcarLida, marcarTodasLidas]);
  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes() {
  return useContext(NotificacoesContext);
}
