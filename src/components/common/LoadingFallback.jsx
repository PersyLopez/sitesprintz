/**
 * Loading Fallback Component
 * Used for Suspense boundaries during code splitting
 */

import React from 'react';
import './LoadingFallback.css';

export function LoadingFallback({ message = 'Loading...' }) {
  return (
    <div className="loading-fallback" role="status" aria-live="polite">
      <div className="loading-spinner"></div>
      <p className="loading-text">{message}</p>
    </div>
  );
}

export default LoadingFallback;

