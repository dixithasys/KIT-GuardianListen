import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('visitor');
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('kit_token');
      if (savedToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      }
      const res = await api.get('/auth/me');
      if (res.data.authenticated && res.data.user) {
        setUser(res.data.user);
        setRole(res.data.user.role);
      } else {
        localStorage.removeItem('kit_token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setRole('visitor');
      }
    } catch {
      localStorage.removeItem('kit_token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setRole('visitor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (login_id, password) => {
    const res = await api.post('/auth/login', { login_id, password });
    if (res.data.success && res.data.user) {
      if (res.data.access_token) {
        localStorage.setItem('kit_token', res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
      }
      setUser(res.data.user);
      setRole(res.data.user.role);
      return res.data.user;
    }
    throw new Error('Login failed.');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('kit_token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setRole('visitor');
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
