import axios from 'axios';

/** Live API (Railway). Same as `.env.production` — used whenever this is a production build. */
const DEFAULT_PUBLIC_API = 'https://web-production-a692a.up.railway.app';

const runtimeOrigin =
  typeof window !== 'undefined' && window.__BILLING_API_ORIGIN__
    ? String(window.__BILLING_API_ORIGIN__).trim()
    : '';
const envOrigin = (import.meta.env.VITE_API_URL || '').trim();

// `npm run dev` only: relative `/api` + vite.config.js proxy → localhost:5000.
// `npm run build` output: always absolute backend URL (never softbill.bhauu.online/api — wahan server nahi).
const apiOrigin =
  runtimeOrigin ||
  envOrigin ||
  (import.meta.env.DEV ? '' : DEFAULT_PUBLIC_API);

const BASE_URL = apiOrigin ? `${apiOrigin.replace(/\/$/, '')}/api` : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401: expired/invalid session → login. Do NOT redirect on wrong password (login/register return 401 too).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const reqPath = error.config?.url || '';
      if (/auth\/(login|register)/.test(reqPath)) {
        return Promise.reject(error);
      }
      localStorage.removeItem('token');
      const base = import.meta.env.BASE_URL || '/';
      window.location.href = `${base}login`.replace(/\/{2,}/g, '/');
    }
    return Promise.reject(error);
  }
);

export default api;
