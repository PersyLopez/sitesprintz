import React from 'react';
import './SkeletonLoader.css';

/**
 * SkeletonLoader - Loading placeholder that matches content layout
 * 
 * @param {string} variant - Variant: 'text', 'card', 'image', 'circle', 'table'
 * @param {number} lines - Number of lines (for text variant)
 * @param {string} width - Width (e.g., '100%', '200px')
 * @param {string} height - Height (e.g., '100%', '200px')
 */
function SkeletonLoader({ 
  variant = 'text', 
  lines = 1,
  width = '100%',
  height = 'auto',
  className = ''
}) {
  if (variant === 'text') {
    return (
      <div className={`skeleton-loader skeleton-text ${className}`} style={{ width }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className="skeleton-line"
            style={{ 
              width: i === lines - 1 && lines > 1 ? '75%' : '100%',
              height: height !== 'auto' ? height : '1rem'
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div 
        className={`skeleton-loader skeleton-card ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="Loading content"
      >
        <div className="skeleton-card-header" />
        <div className="skeleton-card-body">
          <div className="skeleton-line" style={{ width: '100%', height: '1rem' }} />
          <div className="skeleton-line" style={{ width: '80%', height: '1rem' }} />
          <div className="skeleton-line" style={{ width: '60%', height: '1rem' }} />
        </div>
      </div>
    );
  }

  if (variant === 'image') {
    return (
      <div 
        className={`skeleton-loader skeleton-image ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="Loading image"
      />
    );
  }

  if (variant === 'circle') {
    return (
      <div 
        className={`skeleton-loader skeleton-circle ${className}`}
        style={{ width, height }}
        role="status"
        aria-label="Loading"
      />
    );
  }

  if (variant === 'table') {
    return (
      <div className={`skeleton-loader skeleton-table ${className}`} style={{ width }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <div className="skeleton-line" style={{ width: '30%', height: '1rem' }} />
            <div className="skeleton-line" style={{ width: '40%', height: '1rem' }} />
            <div className="skeleton-line" style={{ width: '20%', height: '1rem' }} />
            <div className="skeleton-line" style={{ width: '10%', height: '1rem' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`skeleton-loader ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Loading"
    />
  );
}

export default SkeletonLoader;



