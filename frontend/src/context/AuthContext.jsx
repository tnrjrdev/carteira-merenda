import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('merenda.user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((token, userObj) => {
    localStorage.setItem('merenda.token', token);
    localStorage.setItem('merenda.user', JSON.stringify(userObj));
    setUser(userObj);
  }, []);

  const login = useCallback(async (email, senha) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      persist(data.token, {
        id: data.userId,
        nome: data.nome,
        email: data.email,
        role: data.role,
        cantinaId: data.cantinaId,
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      persist(data.token, {
        id: data.userId,
        nome: data.nome,
        email: data.email,
        role: data.role,
        cantinaId: data.cantinaId,
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem('merenda.token');
    localStorage.removeItem('merenda.user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('merenda.token');
    if (token && !user) {
      api.get('/me').then(({ data }) => {
        const u = {
          id: data.id,
          nome: data.nome,
          email: data.email,
          role: data.role,
          cantinaId: data.cantinaId,
        };
        localStorage.setItem('merenda.user', JSON.stringify(u));
        setUser(u);
      }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ user, login, register, logout, loading }), [user, login, register, logout, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
