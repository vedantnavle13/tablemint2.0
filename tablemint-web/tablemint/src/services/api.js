// API Service for TableMint Backend
// Base URL - Change this to your backend URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to make API calls.
// Supports two call styles:
//   apiCall('/endpoint')                        → GET
//   apiCall('/endpoint', { method:'POST', body: JSON.stringify({}) })  → options object
//   apiCall('/endpoint', 'POST', { key: val })  → shorthand (method, plain body object)
//   apiCall('/endpoint', 'DELETE')              → no body
export const apiCall = async (endpoint, methodOrOptions = {}, bodyObj) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Detect shorthand (second arg is a string method name)
  let options;
  if (typeof methodOrOptions === 'string') {
    options = {
      method: methodOrOptions,
      ...(bodyObj !== undefined ? { body: JSON.stringify(bodyObj) } : {}),
    };
  } else {
    options = methodOrOptions;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      // Preserve the full response for callers that read err.response.data
      const err = new Error(data.message || 'Something went wrong');
      err.response = { data, status: response.status };
      throw err;
    }
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// AUTHENTICATION APIs
export const authAPI = {
  login: async (credentials) => {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  },

  logout: async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getMe: async () => {
    return apiCall('/auth/me');
  },
};

export const getStoredUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const getUserRole = () => {
  const user = getStoredUser();
  return user?.role || null;
};
