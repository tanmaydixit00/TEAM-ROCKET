const API_BASE_URL = 'http://localhost:5000/api';

// Retrieve JWT token from localStorage
const getToken = () => localStorage.getItem('token');

// Generic API request helper
const apiRequest = async (endpoint, method = 'GET', data = null) => {
  const headers = { 'Content-Type': 'application/json' };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'API request failed');
  }

  return result;
};

// Authentication API calls
const authAPI = {
  register: (name, email, password) =>
    apiRequest('/auth/register', 'POST', { name, email, password }),
  login: (email, password) =>
    apiRequest('/auth/login', 'POST', { email, password }),
  logout: () => apiRequest('/auth/logout', 'POST'),
  getMe: () => apiRequest('/auth/me'),
};

// User profile API calls
const userAPI = {
  getProfile: (userId) => apiRequest(`/users/${userId}`),
  updateProfile: (userId, data) => apiRequest(`/users/${userId}`, 'PUT', data),
  deleteAccount: (userId) => apiRequest(`/users/${userId}`, 'DELETE'),
};

export { authAPI, userAPI, getToken };
