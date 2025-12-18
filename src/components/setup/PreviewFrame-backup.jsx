import React, { useRef, useEffect, useState } from 'react';
import { useSite } from '../../hooks/useSite';
import './PreviewFrame.css';

function PreviewFrame() {
  const { siteData, previewKey } = useSite();
  const iframeRef = useRef(null);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  // Update preview when previewKey changes (debounced by SiteContext)
  useEffect(() => {
    if (iframeRef.current && siteData) {
      setIsRefreshing(true);
      setIsLoading(true);
      
      // Update iframe content
      updatePreview();
      
      // Hide refresh indicator after animation
      setTimeout(() => {
        setIsRefreshing(false);
        setIsLoading(false);
      }, 400);
    }
  }, [previewKey, siteData]);

  const updatePreview = () => {
    if (!iframeRef.current) return;
    
    // Generate preview HTML
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background: #0f172a;
              color: #f8fafc;
              line-height: 1.6;
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .hero {
              background: linear-gradient(135deg, ${siteData.colors?.primary || '#06b6d4'}, ${siteData.colors?.secondary || '#14b8a6'});
              padding: 60px 20px;
              text-align: center;
              border-radius: 20px;
              margin-bottom: 40px;
            }
            .hero h1 {
              font-size: 3rem;
              margin-bottom: 16px;
              color: white;
            }
            .hero p {
              font-size: 1.25rem;
              color: rgba(255,255,255,0.95);
              max-width: 600px;
              margin: 0 auto;
            }
            .section {
              margin-bottom: 40px;
            }
            .section h2 {
              font-size: 2rem;
              margin-bottom: 20px;
              color: ${siteData.colors?.primary || '#06b6d4'};
            }
            .services {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
            }
            .service-card {
              background: #1e293b;
              padding: 24px;
              border-radius: 12px;
              border: 1px solid #334155;
            }
            .service-card h3 {
              margin-bottom: 8px;
              color: ${siteData.colors?.primary || '#06b6d4'};
            }
            .service-card p {
              color: #94a3b8;
              margin-bottom: 12px;
            }
            .price {
              font-size: 1.5rem;
              font-weight: bold;
              color: white;
            }
            .contact {
              background: #1e293b;
              padding: 40px;
              border-radius: 12px;
              border: 1px solid #334155;
            }
            .contact-info {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
            }
            .contact-item {
              color: #cbd5e1;
            }
            .contact-item strong {
              display: block;
              color: white;
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="hero">
              <h1>${siteData.businessName || 'Your Business Name'}</h1>
              <p>${siteData.heroSubtitle || 'Your business description goes here'}</p>
            </div>
            
            ${siteData.services && siteData.services.length > 0 ? `
              <div class="section">
                <h2>Our Services</h2>
                <div class="services">
                  ${siteData.services.map(service => `
                    <div class="service-card">
                      <h3>${service.name || service.title || 'Service Name'}</h3>
                      <p>${service.description || 'Service description'}</p>
                      ${service.price ? `<div class="price">${service.price}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <div class="section">
              <h2>Contact Us</h2>
              <div class="contact">
                <div class="contact-info">
                  ${siteData.contactEmail ? `
                    <div class="contact-item">
                      <strong>Email</strong>
                      ${siteData.contactEmail}
                    </div>
                  ` : ''}
                  ${siteData.contactPhone ? `
                    <div class="contact-item">
                      <strong>Phone</strong>
                      ${siteData.contactPhone}
                    </div>
                  ` : ''}
                  ${siteData.contactAddress ? `
                    <div class="contact-item">
                      <strong>Address</strong>
                      ${siteData.contactAddress}
                    </div>
                  ` : ''}
                  ${siteData.businessHours ? `
                    <div class="contact-item">
                      <strong>Hours</strong>
                      ${siteData.businessHours}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();
  };

  const getDeviceClass = () => {
    switch (deviceMode) {
      case 'tablet': return 'device-tablet';
      case 'mobile': return 'device-mobile';
      default: return 'device-desktop';
    }
  };

  const getDeviceLabel = () => {
    switch (deviceMode) {
      case 'tablet': return 'iPad (768×1024)';
      case 'mobile': return 'iPhone (375×667)';
      default: return 'Desktop (1920×1080)';
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const handleZoomReset = () => {
    setZoomLevel(100);
  };

  return (
    <div className="preview-frame-container">
      <div className="preview-toolbar">
        <div className="toolbar-section">
          <div className="device-buttons">
            <button
              className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceMode('desktop')}
              title="Desktop View (1920×1080)"
            >
              <span className="device-icon">💻</span>
              <span className="device-label">Desktop</span>
            </button>
            <button
              className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setDeviceMode('tablet')}
              title="Tablet View (768×1024)"
            >
              <span className="device-icon">📱</span>
              <span className="device-label">Tablet</span>
            </button>
            <button
              className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
              title="Mobile View (375×667)"
            >
              <span className="device-icon">📱</span>
              <span className="device-label">Mobile</span>
            </button>
          </div>
        </div>

        <div className="toolbar-center">
          <div className="device-info">
            {getDeviceLabel()}
          </div>
        </div>

        <div className="toolbar-section">
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={handleZoomOut}
              title="Zoom Out"
              disabled={zoomLevel <= 50}
            >
              −
            </button>
            <span className="zoom-level">{zoomLevel}%</span>
            <button
              className="zoom-btn"
              onClick={handleZoomIn}
              title="Zoom In"
              disabled={zoomLevel >= 150}
            >
              +
            </button>
            <button
              className="zoom-btn reset"
              onClick={handleZoomReset}
              title="Reset Zoom"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Refresh Indicator */}
        {isRefreshing && (
          <div className="refresh-indicator">
            <span className="refresh-spinner"></span>
            <span>Updating preview...</span>
          </div>
        )}
      </div>
      
      <div className="preview-viewport">
        <div className={`preview-device-wrapper ${getDeviceClass()}`}>
          {/* Device Frame */}
          <div className="device-frame">
            {/* URL Bar (for realism) */}
            {deviceMode !== 'mobile' && (
              <div className="device-url-bar">
                <div className="url-controls">
                  <span className="url-dot"></span>
                  <span className="url-dot"></span>
                  <span className="url-dot"></span>
                </div>
                <div className="url-address">
                  <span className="url-icon">🔒</span>
                  <span className="url-text">
                    {siteData.subdomain || 'preview'}.sitesprintz.com
                  </span>
                </div>
                <div className="url-actions">
                  <span className="url-icon-btn">↻</span>
                </div>
              </div>
            )}
            
            {/* Mobile Notch (for mobile view) */}
            {deviceMode === 'mobile' && (
              <div className="mobile-notch">
                <div className="notch-camera"></div>
                <div className="notch-speaker"></div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="preview-loading">
                <div className="loading-spinner"></div>
                <p>Loading preview...</p>
              </div>
            )}
            
            {/* Preview Content */}
            <div 
              className="preview-content" 
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <iframe
                ref={iframeRef}
                className="preview-iframe"
                title="Site Preview"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Mobile Home Indicator */}
            {deviceMode === 'mobile' && (
              <div className="mobile-home-indicator"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
