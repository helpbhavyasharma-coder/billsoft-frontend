/**
 * Intelligent back navigation helper.
 * Triggers a browser POP navigation so NavigationMemory restores
 * the exact previous scroll position and UI filters/search/pagination.
 * If there is no previous in-app history entry, cleanly navigates to fallback.
 */
export function smartBack(navigate, fallbackPath = '/') {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    navigate(-1);
  } else {
    navigate(fallbackPath);
  }
}

export default smartBack;
