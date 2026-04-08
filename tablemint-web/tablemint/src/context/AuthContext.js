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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // ← expose raw token for socket
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

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

  const login = async (email, password) => {
    const response = await axios.post('/auth/login', { email, password });
    const { token: newToken, data } = response.data;
    const userData = data.user;
    if (userData) userData._id = userData._id || userData.id;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(userData);
    setIsLoggedIn(true);
    return userData;
  };

  const logout = async () => {
    try { await axios.post('/auth/logout'); } catch { }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  };

  const register = async (userData) => {
    const response = await axios.post('/auth/register', userData);
    const { token: newToken, data } = response.data;
    const newUser = data.user;
    if (newUser) newUser._id = newUser._id || newUser.id;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    setToken(newToken);
    setUser(newUser);
    setIsLoggedIn(true);
    return newUser;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isLoggedIn, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};