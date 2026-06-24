import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth token on every request
api.interceptors.request.use(config => {
  const stored = localStorage.getItem('slotforge_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
    } catch { /* ignore */ }
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('slotforge_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
