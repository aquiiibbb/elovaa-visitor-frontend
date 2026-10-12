import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const KEY = 'elovaa_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(KEY) || '');

  useEffect(() => {
    if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete axios.defaults.headers.common.Authorization;
  }, [token]);

  // Auto logout on 401 response (session expired)
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) logout();
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem(KEY, data.token);
    axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setToken('');
  };

  return <AuthCtx.Provider value={{ token, login, logout }}>{children}</AuthCtx.Provider>;
}
