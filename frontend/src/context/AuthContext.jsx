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

  const fromAuth = (data) => ({
    id: data.userId,
    nome: data.nome,
    email: data.email,
    role: data.role,
    cantinaId: data.cantinaId,
  });

  const login = useCallback(async (email, senha) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      persist(data.token, fromAuth(data));
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const googleLogin = useCallback(async (idToken) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/google-login', { idToken });
      persist(data.token, fromAuth(data));
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const googleRegister = useCallback(async (idToken, extras = {}) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/google-register', { idToken, ...extras });
      persist(data.token, fromAuth(data));
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      persist(data.token, fromAuth(data));
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem('merenda.token');
    localStorage.removeItem('merenda.user');
    localStorage.removeItem('merenda.pushToken');
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/me');
      const u = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        role: data.role,
        cantinaId: data.cantinaId,
      };
      localStorage.setItem('merenda.user', JSON.stringify(u));
      setUser(u);
      return data;
    } catch (_) {
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('merenda.token');
    if (token && !user) {
      refreshMe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({
    user, login, googleLogin, googleRegister, register, logout, refreshMe, loading,
  }), [user, login, googleLogin, googleRegister, register, logout, refreshMe, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
