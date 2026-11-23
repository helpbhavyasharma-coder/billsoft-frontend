import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationMemory } from '../context/NavigationMemoryContext';

/**
 * Global Scroll Restoration Manager.
 * Operates across the application without hardcoded per-page hacks.
 * Supports:
 * - Layout's primary `<main id="app-main-content">` scroll container
 * - Browser window scrolling
 * - Nested scrollable containers ([data-scroll-container])
 * - Asynchronous content loading & dynamic table height restoration
 */
export default function GlobalScrollRestorationManager() {
  const location = useLocation();
  const navigationType = useNavigationType(); // 'POP', 'PUSH', 'REPLACE'
  const { saveScroll, getScroll, snapshotActiveScrolls } = useNavigationMemory();

  const prevLocationKeyRef = useRef(location.key);
  const activeObserverRef = useRef(null);

  // 1. Continuous scroll listener on primary container
  useEffect(() => {
    const mainEl = document.getElementById('app-main-content');
    if (!mainEl) return;

    let rafId = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        saveScroll(location.key, 'main', mainEl.scrollTop, mainEl.scrollLeft);
        if (typeof window !== 'undefined' && window.scrollY > 0) {
          saveScroll(location.key, 'window', window.scrollY, window.scrollX);
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
  }, [location.key, saveScroll]);

  // 2. On navigation transition: Snapshot old position, then restore or reset
  useEffect(() => {
    // Snapshot previous entry before moving forward
    if (prevLocationKeyRef.current && prevLocationKeyRef.current !== location.key) {
      snapshotActiveScrolls(prevLocationKeyRef.current);
    }
    prevLocationKeyRef.current = location.key;

    // Disconnect any ongoing observer from previous route
    if (activeObserverRef.current) {
      activeObserverRef.current.disconnect();
      activeObserverRef.current = null;
    }

    const mainEl = document.getElementById('app-main-content');
    const isPop = navigationType === 'POP';

    if (!isPop) {
      // PUSH / REPLACE navigation -> User clicked a new route or link. Reset to top cleanly.
      if (mainEl) mainEl.scrollTop = 0;
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
      return;
    }

    // POP navigation -> User pressed Back or Forward!
    const savedMain = getScroll(location.key, 'main');
    const savedWindow = getScroll(location.key, 'window');

    if (!savedMain && !savedWindow) return;

    const targetTop = savedMain?.top || 0;
    const targetLeft = savedMain?.left || 0;

    // Helper to attempt restoration
    const applyScroll = () => {
      let restored = false;

      if (mainEl && targetTop > 0) {
        // Can container accommodate targetTop right now?
        if (mainEl.scrollHeight >= targetTop + (mainEl.clientHeight * 0.5) || mainEl.scrollHeight >= targetTop) {
          mainEl.scrollTo({ top: targetTop, left: targetLeft, behavior: 'instant' });
          restored = true;
        }
      }

      if (savedWindow?.top > 0) {
        window.scrollTo({ top: savedWindow.top, left: savedWindow.left || 0, behavior: 'instant' });
      }

      return restored;
    };

    // Immediate attempt
    if (applyScroll()) return;

    // If DOM is still empty or loading (e.g. table not yet populated by API),
    // use a ResizeObserver to restore scroll as soon as content renders
    if (mainEl && targetTop > 0) {
      let attempts = 0;
      const maxAttempts = 50; // max ~2.5 seconds (at 50ms intervals)

      const observer = new ResizeObserver(() => {
        attempts++;
        if (applyScroll() || attempts >= maxAttempts) {
          observer.disconnect();
          activeObserverRef.current = null;
        }
      });

      observer.observe(mainEl);
      activeObserverRef.current = observer;

      // Fallback timer loop in case ResizeObserver doesn't fire on internal DOM mutation
      const intervalId = setInterval(() => {
        attempts++;
        if (applyScroll() || attempts >= maxAttempts) {
          clearInterval(intervalId);
          if (activeObserverRef.current === observer) {
            observer.disconnect();
            activeObserverRef.current = null;
          }
        }
      }, 50);

      return () => {
        clearInterval(intervalId);
        observer.disconnect();
      };
    }
  }, [location.key, navigationType, getScroll, snapshotActiveScrolls]);

  return null;
}
