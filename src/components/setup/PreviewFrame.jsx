import React, { useRef, useEffect, useState } from 'react';
import { useSite } from '../../hooks/useSite';
import './PreviewFrame.css';

function PreviewFrame() {
  const { siteData, previewKey } = useSite();
  const iframeRef = useRef(null);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update preview when previewKey changes (debounced by SiteContext)
  useEffect(() => {
    if (iframeRef.current && siteData) {
      setIsRefreshing(true);
      
      // Update iframe content
      updatePreview();
      
      // Hide refresh indicator after animation
      setTimeout(() => setIsRefreshing(false), 300);
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

  return (
    <div className="preview-frame-container">
      <div className="preview-toolbar">
        <div className="device-buttons">
          <button
            className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setDeviceMode('desktop')}
            title="Desktop View"
          >
            💻 Desktop
          </button>
          <button
            className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
            onClick={() => setDeviceMode('tablet')}
            title="Tablet View"
          >
            📱 Tablet
          </button>
          <button
            className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setDeviceMode('mobile')}
            title="Mobile View"
          >
            📱 Mobile
          </button>
        </div>

        {/* Refresh Indicator */}
        {isRefreshing && (
          <div className="refresh-indicator">
            <span className="refresh-spinner"></span>
            Updating...
          </div>
        )}
      </div>
      
      <div className={`preview-content ${getDeviceClass()}`}>
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          title="Site Preview"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

export default PreviewFrame;
