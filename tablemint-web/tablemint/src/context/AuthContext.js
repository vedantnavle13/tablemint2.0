import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_URL;
axios.defaults.timeout = 60000; // 60s — handles Render free-tier cold start

// ─── Pick storage key based on current URL path ───────────────────────────────
// Customer portal → token_customer
// Owner/admin portal → token_owner
// Super admin portal → token_super
// This way both portals can be logged in simultaneously in the same browser.
function getStorageKey() {
  const path = window.location.pathname;
  if (path.startsWith('/owner') || path.startsWith('/captain') || path.startsWith('/admin')) {
    return { token: 'token_owner', user: 'user_owner' };
  }
  if (path.startsWith('/superadmin')) {
    return { token: 'token_super', user: 'user_super' };
  }
  return { token: 'token_customer', user: 'user_customer' };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const keys = getStorageKey();
    const storedToken = localStorage.getItem(keys.token);
    const storedUser = localStorage.getItem(keys.user);

    if (storedToken && storedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      setToken(storedToken);
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser) parsedUser._id = parsedUser._id || parsedUser.id;
      setUser(parsedUser);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  // Re-set the axios header whenever we change routes (so customer routes don't
  // accidentally use owner token if both are logged in)
  useEffect(() => {
    const onRouteChange = () => {
      const keys = getStorageKey();
      const t = localStorage.getItem(keys.token);
      if (t) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      } else {
        delete axios.defaults.headers.common['Authorization'];
      }
    };
    window.addEventListener('popstate', onRouteChange);
    return () => window.removeEventListener('popstate', onRouteChange);
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const response = await axios.post('/auth/login', { email, password });
    const { token: newToken, data } = response.data;
    const userData = data.user;
    if (userData) userData._id = userData._id || userData.id;

    const keys = getStorageKey();
    localStorage.setItem(keys.token, newToken);
    localStorage.setItem(keys.user, JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(userData);
    setIsLoggedIn(true);
    return userData;
  };

  const logout = async () => {
    try { await axios.post('/auth/logout'); } catch { }
    const keys = getStorageKey();
    localStorage.removeItem(keys.token);
    localStorage.removeItem(keys.user);
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  };

  // ── register ─────────────────────────────────────────────────────────────
  const register = async (userData) => {
    const response = await axios.post('/auth/register', userData, { timeout: 70000 });
    return response.data.data;
  };

  // ── verifyOtp ─────────────────────────────────────────────────────────────
  const verifyOtp = async (email, otp) => {
    const response = await axios.post('/auth/verify-otp', { email, otp });
    const { token: newToken, data } = response.data;
    const userData = data.user;
    if (userData) userData._id = userData._id || userData.id;

    const keys = getStorageKey();
    localStorage.setItem(keys.token, newToken);
    localStorage.setItem(keys.user, JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(userData);
    setIsLoggedIn(true);
    return userData;
  };

  const resendOtp = async (email) => {
    const response = await axios.post('/auth/send-otp', { email });
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, isLoggedIn, login, logout, register, verifyOtp, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};
