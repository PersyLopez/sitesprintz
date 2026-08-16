/**
 * Loading Fallback Component
 * Used for Suspense boundaries during code splitting
 */

import React from 'react';
import './LoadingFallback.css';

export function LoadingFallback({ message = 'Loading...', title }) {
  return (
    <div className="loading-fallback" role="status" aria-live="polite">
      <div className="loading-spinner"></div>
      {title ? (
        <h1 className="loading-text loading-title">{title}</h1>
      ) : (
        <p className="loading-text">{message}</p>
      )}
      {title && message && message !== title ? (
        <p className="loading-text loading-sub">{message}</p>
      ) : null}
    </div>
  );
}

export default LoadingFallback;
