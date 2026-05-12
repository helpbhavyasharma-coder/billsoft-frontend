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
    return 'API server tak connect nahi ho raha — internet, firewall, ya backend URL check karein.';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Request time out — thodi der baad dubara try karein.';
  }
  return fallback;
}
