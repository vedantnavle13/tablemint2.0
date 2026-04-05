import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Configure axios defaults
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });

      const { token, data } = response.data;
      const userData = data.user;

      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userData);
      setIsLoggedIn(true);

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear axios header
      delete axios.defaults.headers.common['Authorization'];

      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);

      const { token, data } = response.data;
      const user = data.user;

      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(user);
      setIsLoggedIn(true);

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isLoggedIn,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};