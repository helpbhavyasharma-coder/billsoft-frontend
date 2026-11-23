import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigationMemory } from '../context/NavigationMemoryContext';

/**
 * Hook to persist UI state (search queries, filters, pagination, sort, tabs)
 * across page navigation and browser back/forward buttons.
 *
 * Usage:
 *   const [search, setSearch] = usePageMemory('parties_search', '');
 *   const [filters, setFilters] = usePageMemory('invoices_filters', { status: '', page: 1 });
 */
export function usePageMemory(key, defaultValue) {
  const { getPageState, savePageState } = useNavigationMemory();

  // Initialize with saved state if available, else defaultValue
  const [state, setStateInternal] = useState(() => {
    return getPageState(key, defaultValue);
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const setState = useCallback((updater) => {
    setStateInternal((prev) => {
      const nextValue = typeof updater === 'function' ? updater(prev) : updater;
      savePageState(key, nextValue);
      return nextValue;
    });
  }, [key, savePageState]);

  // Keep context in sync if initialized from external source
  useEffect(() => {
    savePageState(key, stateRef.current);
  }, [key, savePageState]);

  return [state, setState];
}

export default usePageMemory;
