import axios from 'axios';

/** PHP/MySQL API. Override with VITE_API_URL when deploying to another domain. */
const DEFAULT_PUBLIC_API = '/BhaviSoft/billing-software/php-backend';

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

const normalizedOrigin = apiOrigin.replace(/\/$/, '');
const BASE_URL = normalizedOrigin
  ? (normalizedOrigin.endsWith('/api') ? normalizedOrigin : `${normalizedOrigin}/api`)
  : '/api';
export const API_BASE_URL = BASE_URL;

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
