/**
 * Lightweight, high-performance in-memory cache for GET requests.
 * Enables instant back-navigation rendering with zero loading-flash,
 * allowing instant DOM height restoration for pixel-perfect scroll position.
 */

class ApiCache {
  constructor(ttlMs = 1000 * 60 * 5) { // 5 minutes default TTL
    this.cache = new Map();
    this.defaultTtl = ttlMs;
  }

  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, k) => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          acc[k] = params[k];
        }
        return acc;
      }, {});
    const queryString = new URLSearchParams(sortedParams).toString();
    return `${url}${queryString ? '?' + queryString : ''}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key, data, ttlMs = this.defaultTtl) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
      savedAt: Date.now(),
    });
  }

  /** Invalidate by endpoint or prefix (e.g. '/parties', '/invoices') */
  invalidate(urlPrefix) {
    const cleanPrefix = urlPrefix.replace(/^\//, '');
    for (const key of this.cache.keys()) {
      const cleanKey = key.replace(/^\//, '');
      if (cleanKey.startsWith(cleanPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();
export default apiCache;
