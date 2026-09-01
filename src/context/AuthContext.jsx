import { createContext, useContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) {
        flushSync(() => {
          setUser(data.user);
          setCompany(data.company ?? null);
        });
      }
    } catch {
      localStorage.removeItem('token');
      flushSync(() => {
        setUser(null);
        setCompany(null);
      });
    } finally {
      flushSync(() => setLoading(false));
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('token', data.token);
      await fetchMe();
    }
    return data;
  };

  const register = async (email, password) => {
    const { data } = await api.post('/auth/register', { email, password });
    if (data.success) {
      localStorage.setItem('token', data.token);
      await fetchMe();
    }
    return data;
  };

  const completeBhauuLogin = async (code, state) => {
    const { data } = await api.post('/auth/bhauu/exchange', { code, state });
    if (data.success) {
      localStorage.setItem('token', data.token);
      await fetchMe();
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCompany(null);
  };

  const refreshCompany = async () => {
    try {
      const { data } = await api.get('/company');
      if (data.success) setCompany(data.company);
    } catch (err) {
      console.error('Failed to refresh company:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, completeBhauuLogin, logout, refreshCompany }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
