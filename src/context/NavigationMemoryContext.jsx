import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import apiCache from '../api/apiCache';

const NavigationMemoryContext = createContext(null);

const STORAGE_KEY_SCROLL = 'softbill_nav_scroll_v3';
const STORAGE_KEY_STATE = 'softbill_nav_state_v3';

/**
 * Centralized Navigation Memory Provider.
 * Stores:
 * 1. Scroll positions keyed by history entry `location.key`, `path:pathname`, and `url:pathname+search`.
 * 2. Route UI states (search, filters, pagination, tabs, sorting).
 * 3. Supports multiple scrollable containers on any page.
 * 4. Intercepts clicks and popstate before component unmount to guarantee scroll position is never lost.
 */
export function NavigationMemoryProvider({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType(); // 'POP', 'PUSH', 'REPLACE'

  // In-memory records
  const scrollMapRef = useRef(new Map());
  const stateMapRef = useRef(new Map());
  const registeredContainersRef = useRef(new Set());
  const isRestoringRef = useRef(false);

  // Restore session storage cache on first mount (for page reload resilience)
  useEffect(() => {
    try {
      try {
        sessionStorage.removeItem('softbill_nav_scroll_v1');
        sessionStorage.removeItem('softbill_nav_state_v1');
        sessionStorage.removeItem('softbill_nav_scroll_v2');
        sessionStorage.removeItem('softbill_nav_state_v2');
      } catch (_) {}

      const savedScroll = sessionStorage.getItem(STORAGE_KEY_SCROLL);
      if (savedScroll) {
        const parsed = JSON.parse(savedScroll);
        Object.entries(parsed).forEach(([k, v]) => scrollMapRef.current.set(k, v));
      }
      const savedState = sessionStorage.getItem(STORAGE_KEY_STATE);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        Object.entries(parsed).forEach(([k, v]) => stateMapRef.current.set(k, v));
      }
    } catch (_) {}
  }, []);

  // Save to sessionStorage before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const scrollObj = Object.fromEntries(scrollMapRef.current);
        const stateObj = Object.fromEntries(stateMapRef.current);
        sessionStorage.setItem(STORAGE_KEY_SCROLL, JSON.stringify(scrollObj));
        sessionStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateObj));
      } catch (_) {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  /** Register an element or selector as a tracked scroll container */
  const registerContainer = useCallback((elementOrSelector) => {
    registeredContainersRef.current.add(elementOrSelector);
    return () => {
      registeredContainersRef.current.delete(elementOrSelector);
    };
  }, []);

  /** Save scroll position for a specific history key, pathname, and container */
  const saveScroll = useCallback((historyKey, containerId, top, left = 0, explicitPathname = null) => {
    if (!historyKey && !explicitPathname) return;

    const pathKey = explicitPathname || location.pathname;
    const urlKey = explicitPathname ? explicitPathname : `${location.pathname}${location.search}`;

    const newTop = Math.max(0, Math.round(top));
    const newLeft = Math.max(0, Math.round(left));

    const entry = { top: newTop, left: newLeft, timestamp: Date.now() };

    if (historyKey) {
      const current = scrollMapRef.current.get(historyKey) || {};
      current[containerId] = entry;
      scrollMapRef.current.set(historyKey, current);
    }

    if (pathKey) {
      const pathCurrent = scrollMapRef.current.get(`path:${pathKey}`) || {};
      pathCurrent[containerId] = entry;
      scrollMapRef.current.set(`path:${pathKey}`, pathCurrent);
    }

    if (urlKey) {
      const urlCurrent = scrollMapRef.current.get(`url:${urlKey}`) || {};
      urlCurrent[containerId] = entry;
      scrollMapRef.current.set(`url:${urlKey}`, urlCurrent);
    }
  }, [location.pathname, location.search]);

  /** Get saved scroll position with intelligent multi-level fallback */
  const getScroll = useCallback((historyKey, containerId = 'main') => {
    // 1. Try by historyKey if provided and has valid scroll
    if (historyKey) {
      const byKey = scrollMapRef.current.get(historyKey);
      if (byKey?.[containerId]?.top > 0) return byKey[containerId];
    }

    // 2. Try by exact URL (pathname + search)
    const urlKey = `${location.pathname}${location.search}`;
    const byUrl = scrollMapRef.current.get(`url:${urlKey}`);
    if (byUrl?.[containerId]?.top > 0) return byUrl[containerId];

    // 3. Try by pathname
    const byPath = scrollMapRef.current.get(`path:${location.pathname}`);
    if (byPath?.[containerId]?.top > 0) return byPath[containerId];

    // 4. Fallback to 0 if exists
    if (historyKey && scrollMapRef.current.has(historyKey)) {
      return scrollMapRef.current.get(historyKey)?.[containerId] || null;
    }

    return null;
  }, [location.pathname, location.search]);

  /** Snapshot all registered containers for the current history entry */
  const snapshotActiveScrolls = useCallback((historyKey = location.key, explicitPathname = location.pathname) => {
    const mainEl = document.getElementById('app-main-content');
    if (mainEl && mainEl.scrollTop > 0) {
      saveScroll(historyKey, 'main', mainEl.scrollTop, mainEl.scrollLeft, explicitPathname);
    }

    if (typeof window !== 'undefined' && (window.scrollY > 0 || window.scrollX > 0)) {
      saveScroll(historyKey, 'window', window.scrollY, window.scrollX, explicitPathname);
    }

    registeredContainersRef.current.forEach((refOrSelector) => {
      let el = null;
      let id = 'custom';
      if (typeof refOrSelector === 'string') {
        el = document.querySelector(refOrSelector);
        id = refOrSelector;
      } else if (refOrSelector?.current) {
        el = refOrSelector.current;
        id = el.id || el.getAttribute('data-scroll-id') || 'custom_ref';
      } else if (refOrSelector instanceof HTMLElement) {
        el = refOrSelector;
        id = el.id || el.getAttribute('data-scroll-id') || 'custom_el';
      }

      if (el && el !== mainEl && el.scrollTop > 0) {
        saveScroll(historyKey, id, el.scrollTop, el.scrollLeft, explicitPathname);
      }
    });
  }, [location.key, location.pathname, saveScroll]);

  // Capture scroll on ANY navigation link click or back/forward popstate BEFORE React unmounts
  useEffect(() => {
    const handleDocumentClick = (e) => {
      const clickTarget = e.target.closest('a, button, [role="button"]');
      if (clickTarget) {
        snapshotActiveScrolls(location.key, location.pathname);
      }
    };

    const handlePopState = () => {
      snapshotActiveScrolls(location.key, location.pathname);
    };

    window.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState, true);

    return () => {
      window.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState, true);
    };
  }, [location.key, location.pathname, snapshotActiveScrolls]);

  /** Save UI state for a page/route */
  const savePageState = useCallback((pageKey, state) => {
    const prev = stateMapRef.current.get(pageKey);
    let nextValue;
    if (typeof state === 'function') {
      nextValue = state(prev);
    } else if (state !== null && typeof state === 'object' && !Array.isArray(state)) {
      nextValue = { ...(prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {}), ...state };
    } else {
      nextValue = state;
    }
    stateMapRef.current.set(pageKey, nextValue);
  }, []);

  /** Get UI state for a page/route */
  const getPageState = useCallback((pageKey, defaultState = undefined) => {
    const existing = stateMapRef.current.get(pageKey);
    if (existing === undefined) return defaultState;
    if (typeof defaultState === 'string' && typeof existing !== 'string') return defaultState;
    if (typeof defaultState === 'number' && typeof existing !== 'number') return defaultState;
    if (typeof defaultState === 'boolean' && typeof existing !== 'boolean') return defaultState;
    return existing;
  }, []);

  /** Clean up on logout or session change */
  const clearMemory = useCallback(() => {
    scrollMapRef.current.clear();
    stateMapRef.current.clear();
    registeredContainersRef.current.clear();
    apiCache.clear();
    try {
      sessionStorage.removeItem(STORAGE_KEY_SCROLL);
      sessionStorage.removeItem(STORAGE_KEY_STATE);
    } catch (_) {}
  }, []);

  const value = {
    location,
    navigationType,
    isRestoringRef,
    registerContainer,
    saveScroll,
    getScroll,
    snapshotActiveScrolls,
    savePageState,
    getPageState,
    clearMemory,
  };

  return (
    <NavigationMemoryContext.Provider value={value}>
      {children}
    </NavigationMemoryContext.Provider>
  );
}

export function useNavigationMemory() {
  const context = useContext(NavigationMemoryContext);
  if (!context) {
    throw new Error('useNavigationMemory must be used within a NavigationMemoryProvider');
  }
  return context;
}
