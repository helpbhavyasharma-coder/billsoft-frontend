import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import apiCache from '../api/apiCache';

const NavigationMemoryContext = createContext(null);

const STORAGE_KEY_SCROLL = 'softbill_nav_scroll_v2';
const STORAGE_KEY_STATE = 'softbill_nav_state_v2';

/**
 * Centralized Navigation Memory Provider.
 * Stores:
 * 1. Scroll positions keyed by history entry `location.key`.
 * 2. Route UI states (search, filters, pagination, tabs, sorting).
 * 3. Supports multiple scrollable containers on any page.
 */
export function NavigationMemoryProvider({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType(); // 'POP' (back/forward), 'PUSH' (new link), 'REPLACE'

  // In-memory records
  const scrollMapRef = useRef(new Map());
  const stateMapRef = useRef(new Map());
  const registeredContainersRef = useRef(new Set());

  // Restore session storage cache on first mount (for page reload resilience)
  useEffect(() => {
    try {
      try { sessionStorage.removeItem('softbill_nav_scroll_v1'); sessionStorage.removeItem('softbill_nav_state_v1'); } catch (_) {}
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

  /** Save scroll position for a specific history key and container */
  const saveScroll = useCallback((historyKey, containerId, top, left = 0) => {
    if (!historyKey) return;
    const current = scrollMapRef.current.get(historyKey) || {};
    current[containerId] = { top: Math.max(0, top), left: Math.max(0, left), timestamp: Date.now() };
    scrollMapRef.current.set(historyKey, current);

    // Also associate with pathname as secondary fallback if key isn't matched
    scrollMapRef.current.set(`path:${location.pathname}`, current);
  }, [location.pathname]);

  /** Get saved scroll position */
  const getScroll = useCallback((historyKey, containerId) => {
    if (!historyKey) return null;
    const byKey = scrollMapRef.current.get(historyKey);
    if (byKey && byKey[containerId]) return byKey[containerId];

    // Fallback by pathname
    const byPath = scrollMapRef.current.get(`path:${location.pathname}`);
    if (byPath && byPath[containerId]) return byPath[containerId];

    return null;
  }, [location.pathname]);

  /** Snapshot all registered containers for the current history entry */
  const snapshotActiveScrolls = useCallback((historyKey = location.key) => {
    if (!historyKey) return;

    // 1. Primary Layout Scroll Container
    const mainEl = document.getElementById('app-main-content');
    if (mainEl) {
      saveScroll(historyKey, 'main', mainEl.scrollTop, mainEl.scrollLeft);
    }

    // 2. Window Scroll (if applicable)
    if (typeof window !== 'undefined' && (window.scrollY > 0 || window.scrollX > 0)) {
      saveScroll(historyKey, 'window', window.scrollY, window.scrollX);
    }

    // 3. Any additional registered containers
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

      if (el && el !== mainEl) {
        saveScroll(historyKey, id, el.scrollTop, el.scrollLeft);
      }
    });
  }, [location.key, saveScroll]);

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
