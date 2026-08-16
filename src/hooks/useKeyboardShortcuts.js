import { useEffect } from 'react';

/**
 * useKeyboardShortcuts - Hook for managing keyboard shortcuts
 * 
 * @param {Object} shortcuts - Object mapping key combinations to callbacks
 * @param {Array} deps - Dependencies array (optional)
 * 
 * @example
 * useKeyboardShortcuts({
 *   'Meta+s': (e) => { e.preventDefault(); save(); },
 *   'Meta+p': (e) => { e.preventDefault(); preview(); }
 * });
 */
export function useKeyboardShortcuts(shortcuts, deps = []) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Build key string (e.g., "Meta+s", "Ctrl+Shift+p")
      const parts = [];
      
      if (event.metaKey) parts.push('Meta');
      if (event.ctrlKey) parts.push('Ctrl');
      if (event.altKey) parts.push('Alt');
      if (event.shiftKey) parts.push('Shift');
      
      const key = event.key.length === 1 
        ? event.key.toLowerCase() 
        : event.key;
      
      parts.push(key);
      const keyString = parts.join('+');

      // Check if we have a handler for this combination
      if (shortcuts[keyString]) {
        event.preventDefault();
        shortcuts[keyString](event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, ...deps]);
}

export default useKeyboardShortcuts;



