/**
 * Optimized Image Component
 * 
 * Features:
 * - Responsive srcset for different screen sizes
 * - Lazy loading for off-screen images
 * - Explicit dimensions to prevent CLS
 * - WebP/AVIF format support (via Unsplash CDN)
 * - Aspect ratio preservation
 * - Fallback handling
 * 
 * Usage:
 * <OptimizedImage
 *   src="https://images.unsplash.com/photo-123"
 *   alt="Description"
 *   width={1200}
 *   height={675}
 *   priority={false} // true for LCP images
 * />
 */

import React, { useState } from 'react';
import './OptimizedImage.css';

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  aspectRatio,
  sizes = '(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  ...props
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Generate responsive srcset from Unsplash URL
  const generateSrcSet = (imageUrl) => {
    // If it's an Unsplash URL, add size parameters
    if (imageUrl?.includes('unsplash.com')) {
      // Extract base URL without existing params
      const baseUrl = imageUrl.split('?')[0];
      
      return `
        ${baseUrl}?w=400&q=75&auto=format&fit=crop 400w,
        ${baseUrl}?w=800&q=80&auto=format&fit=crop 800w,
        ${baseUrl}?w=1200&q=85&auto=format&fit=crop 1200w,
        ${baseUrl}?w=1600&q=85&auto=format&fit=crop 1600w
      `.trim();
    }
    
    // For other URLs, return as-is (can be enhanced later)
    return undefined;
  };

  // Generate optimized src URL
  const getOptimizedSrc = (imageUrl) => {
    if (imageUrl?.includes('unsplash.com')) {
      const baseUrl = imageUrl.split('?')[0];
      // Use 1200px as default, with quality 85
      return `${baseUrl}?w=1200&q=85&auto=format&fit=crop`;
    }
    return imageUrl;
  };

  // Calculate aspect ratio
  const calculatedAspectRatio = aspectRatio || (width && height ? `${width}/${height}` : '16/9');

  const handleError = () => {
    setError(true);
  };

  const handleLoad = () => {
    setLoaded(true);
  };

  if (error) {
    return (
      <div 
        className={`optimized-image-error ${className}`}
        style={{ aspectRatio: calculatedAspectRatio }}
        role="img"
        aria-label={alt || 'Image failed to load'}
      >
        <span className="error-icon">📷</span>
        <span className="error-text">Image unavailable</span>
      </div>
    );
  }

  const srcSet = generateSrcSet(src);
  const optimizedSrc = getOptimizedSrc(src);

  return (
    <div 
      className={`optimized-image-wrapper ${className}`}
      style={{ aspectRatio: calculatedAspectRatio }}
    >
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt || ''}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`optimized-image ${loaded ? 'loaded' : ''}`}
        style={{ objectFit }}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
      {!loaded && !error && (
        <div className="optimized-image-placeholder">
          <div className="image-skeleton"></div>
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;

