import axios from 'axios';
import apiCache from './apiCache';

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

// Automatically invalidate cache on mutating methods (POST, PUT, DELETE, PATCH)
api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    if (['post', 'put', 'delete', 'patch'].includes(method)) {
      const url = response.config.url || '';
      // Extract root resource (e.g. '/parties/123' -> 'parties')
      const match = url.replace(/^\//, '').split(/[/?]/)[0];
      if (match) {
        apiCache.invalidate(match);
      }
    }
    return response;
  },
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
        apiCache.clear();
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

/**
 * Fetch with SWR-style in-memory caching.
 * Resolves cached data instantly if valid, preventing blank loading states on Back navigation.
 */
api.getCached = async (url, config = {}) => {
  const cacheKey = apiCache.generateKey(url, config.params);
  const cached = apiCache.get(cacheKey);

  if (cached) {
    // Return cached immediately; optionally revalidate in background if desired
    return { data: cached, fromCache: true };
  }

  const response = await api.get(url, config);
  if (response.data?.success) {
    apiCache.set(cacheKey, response.data);
  }
  return response;
};

export { apiCache };
export default api;
