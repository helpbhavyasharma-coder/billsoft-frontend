/**
 * Turns axios errors into a user-visible string (network vs HTTP body).
 */
export function getApiErrorMessage(err, fallback) {
  const data = err.response?.data;
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((e) => e.msg || e.message || String(e)).join(' ');
  }
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    const apiUrl = err.config?.baseURL || 'API URL';
    return `API server tak connect nahi ho raha — ${apiUrl} check karein. Cache clear karke dubara try karein.`;
  }
  if (err.code === 'ECONNABORTED') {
    return 'Request time out — thodi der baad dubara try karein.';
  }
  return fallback;
}
