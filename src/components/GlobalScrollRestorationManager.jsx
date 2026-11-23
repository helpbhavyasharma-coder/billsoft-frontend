import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationMemory } from '../context/NavigationMemoryContext';

/**
 * Global Scroll Restoration Manager.
 * Operates application-wide across all routes without individual page hacks.
 * Features:
 * - Layout's primary `<main id="app-main-content">` scroll container
 * - Browser window scrolling
 * - MutationObserver-backed dynamic content height watcher
 * - Continuous scroll tracking with debounced memory persistence
 * - Zero jumping or jitter on asynchronous content loads
 */
export default function GlobalScrollRestorationManager() {
  const location = useLocation();
  const navigationType = useNavigationType(); // 'POP', 'PUSH', 'REPLACE'
  const { saveScroll, getScroll, isRestoringRef } = useNavigationMemory();

  const prevLocationKeyRef = useRef(location.key);
  const activeCleanupRef = useRef(null);

  // 1. Continuous scroll listener on primary container
  useEffect(() => {
    const mainEl = document.getElementById('app-main-content');
    if (!mainEl) return;

    let rafId = null;
    const handleScroll = () => {
      // While actively restoring a target position, ignore scroll events
      if (isRestoringRef.current) return;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (mainEl.scrollTop > 0) {
          saveScroll(location.key, 'main', mainEl.scrollTop, mainEl.scrollLeft, location.pathname);
        } else {
          // Genuine scroll to top (only when not in transition)
          saveScroll(location.key, 'main', 0, mainEl.scrollLeft, location.pathname);
        }

        if (typeof window !== 'undefined' && window.scrollY > 0) {
          saveScroll(location.key, 'window', window.scrollY, window.scrollX, location.pathname);
        }
      });
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      mainEl.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.key, location.pathname, saveScroll, isRestoringRef]);

  // 2. On navigation transition: Restore or Reset
  useEffect(() => {
    // Clean up any ongoing observer or timer from previous route
    if (activeCleanupRef.current) {
      activeCleanupRef.current();
      activeCleanupRef.current = null;
    }

    prevLocationKeyRef.current = location.key;

    const mainEl = document.getElementById('app-main-content');
    const isPop = navigationType === 'POP';

    // Retrieve saved scroll position
    const savedMain = getScroll(location.key, 'main');
    const savedWindow = getScroll(location.key, 'window');

    const hasSavedMain = savedMain && savedMain.top > 0;
    const hasSavedWindow = savedWindow && savedWindow.top > 0;

    // If fresh PUSH/REPLACE navigation and no saved scroll, reset to top
    if (!isPop && !hasSavedMain) {
      if (mainEl) mainEl.scrollTop = 0;
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
      return;
    }

    // If POP or we have a saved scroll position, restore it
    if (!hasSavedMain && !hasSavedWindow) {
      return;
    }

    const targetTop = savedMain?.top || 0;
    const targetLeft = savedMain?.left || 0;

    // Helper to attempt restoration
    const tryApplyScroll = () => {
      if (!mainEl) return false;

      const currentScrollHeight = mainEl.scrollHeight;
      const clientHeight = mainEl.clientHeight;
      const maxScrollable = currentScrollHeight - clientHeight;

      // Check if container height can accommodate the target
      if (maxScrollable >= targetTop - 30 || currentScrollHeight >= targetTop) {
        mainEl.scrollTo({ top: targetTop, left: targetLeft, behavior: 'instant' });

        if (hasSavedWindow) {
          window.scrollTo({ top: savedWindow.top, left: savedWindow.left || 0, behavior: 'instant' });
        }

        // Check if scroll actually took effect
        if (Math.abs(mainEl.scrollTop - targetTop) <= 50 || mainEl.scrollTop > 0) {
          return true;
        }
      }

      return false;
    };

    // Attempt 1: Immediate instant restore (if content is already rendered e.g. from cache)
    if (tryApplyScroll()) {
      isRestoringRef.current = false;
      return;
    }

    // Attempt 2: Asynchronous content is loading.
    // Lock scroll saving and observe DOM mutations and frame ticks.
    isRestoringRef.current = true;

    let isDone = false;
    let observer = null;
    let intervalId = null;
    let timeoutId = null;

    const finish = () => {
      if (isDone) return;
      isDone = true;
      isRestoringRef.current = false;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      activeCleanupRef.current = null;
    };

    activeCleanupRef.current = finish;

    // MutationObserver watches for rows/elements being inserted into the scroll container
    if (typeof MutationObserver !== 'undefined' && mainEl) {
      observer = new MutationObserver(() => {
        if (tryApplyScroll()) {
          finish();
        }
      });
      observer.observe(mainEl, { childList: true, subtree: true, attributes: false });
    }

    // Polling fallback loop to check dimensions on every tick (up to 3 seconds)
    let elapsed = 0;
    intervalId = setInterval(() => {
      elapsed += 50;
      if (tryApplyScroll() || elapsed >= 3000) {
        if (elapsed >= 3000 && mainEl && targetTop > 0) {
          // Best effort scroll to maximum available height
          mainEl.scrollTo({ top: Math.min(targetTop, mainEl.scrollHeight - mainEl.clientHeight), left: targetLeft, behavior: 'instant' });
        }
        finish();
      }
    }, 50);

    return () => {
      finish();
    };
  }, [location.key, location.pathname, navigationType, getScroll, isRestoringRef]);

  return null;
}
