/**
 * Foundation Preview Component
 * 
 * Live preview iframe for Foundation feature configuration
 * Shows real-time updates as user configures trust signals, contact form, etc.
 */

import React, { useRef, useEffect, useState } from 'react';
import './FoundationPreview.css';

export default function FoundationPreview({ site, config }) {
  const iframeRef = useRef(null);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Generate preview URL
  useEffect(() => {
    if (site?.subdomain) {
      // Use published site URL or preview URL
      const url = site.status === 'published' 
        ? `https://${site.subdomain}.sitesprintz.com`
        : `/preview/${site.subdomain}`;
      setPreviewUrl(url);
    }
  }, [site]);

  // Inject foundation config into preview
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !config) return;

    try {
      // Send config update to iframe via postMessage
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_FOUNDATION_CONFIG',
        config: config
      }, '*');
    } catch (error) {
      console.error('Failed to update preview:', error);
    }
  }, [config]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    
    // Send initial config
    if (iframeRef.current?.contentWindow && config) {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_FOUNDATION_CONFIG',
        config: config
      }, '*');
    }
  };

  const getDeviceClass = () => {
    switch (deviceMode) {
      case 'tablet': return 'device-tablet';
      case 'mobile': return 'device-mobile';
      default: return 'device-desktop';
    }
  };

  const getDeviceSize = () => {
    switch (deviceMode) {
      case 'mobile': return { width: '375px', height: '667px' };
      case 'tablet': return { width: '768px', height: '1024px' };
      default: return { width: '100%', height: '100%' };
    }
  };

  if (!previewUrl) {
    return (
      <div className="foundation-preview">
        <div className="preview-empty">
          <p>No site selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="foundation-preview">
      {/* Preview Toolbar */}
      <div className="preview-toolbar">
        <div className="preview-title">Live Preview</div>
        
        <div className="device-buttons">
          <button
            className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setDeviceMode('desktop')}
            title="Desktop View"
            aria-label="Desktop View"
          >
            💻
          </button>
          <button
            className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
            onClick={() => setDeviceMode('tablet')}
            title="Tablet View"
            aria-label="Tablet View"
          >
            📱
          </button>
          <button
            className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setDeviceMode('mobile')}
            title="Mobile View"
            aria-label="Mobile View"
          >
            📱
          </button>
        </div>

        <div className="preview-actions">
          <button
            className="refresh-btn"
            onClick={() => {
              setIsLoading(true);
              if (iframeRef.current) {
                iframeRef.current.src = iframeRef.current.src;
              }
            }}
            title="Refresh Preview"
            aria-label="Refresh Preview"
          >
            🔄
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="open-btn"
            title="Open in New Tab"
            aria-label="Open in New Tab"
          >
            ↗
          </a>
        </div>
      </div>

      {/* Preview Viewport */}
      <div className={`preview-viewport ${getDeviceClass()}`}>
        {isLoading && (
          <div className="preview-loading">
            <div className="loading-spinner"></div>
            <p>Loading preview...</p>
          </div>
        )}
        
        <div 
          className="preview-iframe-wrapper"
          style={{
            width: getDeviceSize().width,
            height: getDeviceSize().height
          }}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="preview-iframe"
            title="Foundation Preview"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>

      {/* Device Info Badge */}
      {deviceMode !== 'desktop' && (
        <div className="device-badge">
          {deviceMode === 'tablet' ? '768 × 1024' : '375 × 667'}
        </div>
      )}
    </div>
  );
}

