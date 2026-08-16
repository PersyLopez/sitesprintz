import React, { createContext, useState, useCallback } from 'react';
import './ToastContext.css';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const duration = options.duration || 3000;
    const action = options.action || null;
    
    setToasts(prev => [...prev, { id, message, type, action }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }
  }, []);

  const showSuccess = useCallback((message, options) => showToast(message, 'success', options), [showToast]);
  const showError = useCallback((message, options) => showToast(message, 'error', options), [showToast]);
  const showInfo = useCallback((message, options) => showToast(message, 'info', options), [showToast]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, dismissToast }}>
      {children}
      <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            data-testid={`toast-${toast.type}`}
            role="alert"
          >
            <div className="toast-message">{toast.message}</div>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  if (toast.action.onClick) {
                    toast.action.onClick();
                  } else if (toast.action.type === 'navigate' && toast.action.path) {
                    window.location.href = toast.action.path;
                  } else if (toast.action.type === 'retry' && toast.action.onRetry) {
                    toast.action.onRetry();
                  }
                  dismissToast(toast.id);
                }}
                aria-label={toast.action.label || 'Action'}
              >
                {toast.action.label}
              </button>
            )}
            <button
              className="toast-dismiss"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

