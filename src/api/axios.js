import axios from 'axios';

/** PHP/MySQL API. Override with VITE_API_URL when deploying to another domain. */
const DEFAULT_PUBLIC_API = '/BhaviSoft/billing-software/php-backend';

const runtimeOrigin =
  typeof window !== 'undefined' && window.__BILLING_API_ORIGIN__ !== undefined
    ? String(window.__BILLING_API_ORIGIN__).trim()
    : null;
const envOrigin = (import.meta.env.VITE_API_URL || '').trim();

// Production default is same-origin `/api` (or configured via window.__BILLING_API_ORIGIN__).
const apiOrigin =
  runtimeOrigin !== null
    ? runtimeOrigin
    : (envOrigin || (import.meta.env.DEV ? '' : '/api'));

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

// Handle 401: expired/invalid session. Notify React AuthContext gracefully instead of hard browser reload.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const reqPath = error.config?.url || '';
      if (/auth\/(login|register|bhauu\/exchange)/.test(reqPath)) {
        return Promise.reject(error);
      }
      const errorCode = error.response?.data?.error_code || 'SESSION_EXPIRED';
      const canRenew = Boolean(error.response?.data?.can_renew);
      if (errorCode === 'SESSION_REVOKED') {
        localStorage.removeItem('token');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('billsoft:session-expired', {
            detail: {
              path: reqPath,
              status: 401,
              message: error.response?.data?.message || 'Session expired. Please login again.',
              errorCode,
              canRenew,
            },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;
