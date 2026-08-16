import React, { createContext, useState, useCallback, useEffect } from 'react';

export const TipsContext = createContext(null);

export function TipsProvider({ children }) {
  const [dismissedTips, setDismissedTips] = useState(() => {
    const stored = localStorage.getItem('dismissedTips');
    return stored ? JSON.parse(stored) : [];
  });

  const [activeTips, setActiveTips] = useState({});

  useEffect(() => {
    localStorage.setItem('dismissedTips', JSON.stringify(dismissedTips));
  }, [dismissedTips]);

  const showTip = useCallback((tipId, content, options = {}) => {
    if (dismissedTips.includes(tipId)) return;

    setActiveTips(prev => ({
      ...prev,
      [tipId]: {
        content,
        position: options.position || 'top',
        autoHide: options.autoHide !== false,
        duration: options.duration || 5000
      }
    }));

    if (options.autoHide !== false) {
      setTimeout(() => {
        dismissTip(tipId);
      }, options.duration || 5000);
    }
  }, [dismissedTips]);

  const dismissTip = useCallback((tipId, permanent = false) => {
    setActiveTips(prev => {
      const next = { ...prev };
      delete next[tipId];
      return next;
    });

    if (permanent) {
      setDismissedTips(prev => {
        if (!prev.includes(tipId)) {
          return [...prev, tipId];
        }
        return prev;
      });
    }
  }, []);

  const resetTips = useCallback(() => {
    setDismissedTips([]);
    setActiveTips({});
  }, []);

  return (
    <TipsContext.Provider value={{
      showTip,
      dismissTip,
      activeTips,
      dismissedTips,
      resetTips
    }}>
      {children}
    </TipsContext.Provider>
  );
}



