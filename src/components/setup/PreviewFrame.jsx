// This is the enhanced preview that will replace PreviewFrame.jsx
// Copy this content into PreviewFrame.jsx to see full Pro template content

import React, { useRef, useEffect, useState } from 'react';
import { useSite } from '../../hooks/useSite';
import './PreviewFrame.css';

function PreviewFrame() {
  const { siteData, previewKey } = useSite();
  const iframeRef = useRef(null);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (iframeRef.current && siteData) {
      setIsRefreshing(true);
      setIsLoading(true);
      
      updatePreview();
      
      setTimeout(() => {
        setIsRefreshing(false);
        setIsLoading(false);
      }, 400);
    }
  }, [previewKey, siteData]);

  const updatePreview = () => {
    if (!iframeRef.current) return;
    
    const primaryColor = siteData.colors?.primary || '#06b6d4';
    const accentColor = siteData.colors?.accent || siteData.colors?.secondary || '#14b8a6';
    const bgColor = siteData.colors?.background || '#0f172a';
    
    // FULL PRO TEMPLATE PREVIEW WITH ALL SECTIONS
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
              background: ${bgColor};
              color: #f8fafc;
              line-height: 1.6;
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            
            /* Hero */
            .hero {
              background: linear-gradient(135deg, ${primaryColor}, ${accentColor});
              padding: 80px 20px;
              text-align: center;
              border-radius: 20px;
              margin-bottom: 60px;
            }
            .hero .tagline { font-size: 0.95rem; opacity: 0.9; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
            .hero h1 { font-size: 3rem; margin-bottom: 16px; color: white; }
            .hero p { font-size: 1.15rem; color: rgba(255,255,255,0.95); max-width: 700px; margin: 0 auto; }
            
            /* Sections */
            .section { margin-bottom: 60px; }
            .section-header { text-align: center; margin-bottom: 40px; }
            .section h2 { font-size: 2.5rem; margin-bottom: 12px; color: ${primaryColor}; }
            .section p.subtitle { font-size: 1.1rem; color: #94a3b8; }
            
            /* Menu/Services Grid */
            .menu-tabs {
              display: flex;
              gap: 12px;
              margin-bottom: 32px;
              flex-wrap: wrap;
              justify-content: center;
            }
            .menu-tab {
              padding: 12px 24px;
              background: #1e293b;
              border: 2px solid #334155;
              border-radius: 8px;
              color: #cbd5e1;
              font-weight: 600;
            }
            .menu-tab.active { background: ${primaryColor}; border-color: ${primaryColor}; color: white; }
            
            .items-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 24px;
            }
            .item-card {
              background: #1e293b;
              padding: 24px;
              border-radius: 12px;
              border: 1px solid #334155;
              transition: all 0.2s;
            }
            .item-card:hover { transform: translateY(-4px); border-color: ${primaryColor}; }
            .item-card img {
              width: 100%;
              height: 200px;
              object-fit: cover;
              border-radius: 8px;
              margin-bottom: 16px;
            }
            .item-card h3 { margin-bottom: 8px; color: ${primaryColor}; font-size: 1.3rem; }
            .item-card p { color: #94a3b8; margin-bottom: 12px; font-size: 0.95rem; }
            .price { font-size: 1.25rem; font-weight: 700; color: ${primaryColor}; }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              background: ${primaryColor}33;
              color: ${primaryColor};
              border-radius: 4px;
              font-size: 0.75rem;
              margin: 4px 4px 0 0;
              font-weight: 600;
            }
            
            /* Features/About */
            .features-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 16px;
              margin-top: 32px;
            }
            .feature-item {
              background: #1e293b;
              padding: 20px;
              border-radius: 8px;
              font-size: 1.05rem;
              color: #cbd5e1;
              border-left: 4px solid ${primaryColor};
            }
            .about-text {
              color: #cbd5e1;
              font-size: 1.1rem;
              text-align: center;
              max-width: 800px;
              margin: 0 auto 32px;
              line-height: 1.8;
            }
            
            /* Gallery */
            .gallery-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 16px;
            }
            .gallery-item img {
              width: 100%;
              height: 300px;
              object-fit: cover;
              border-radius: 12px;
              transition: transform 0.2s;
            }
            .gallery-item img:hover { transform: scale(1.05); }
            
            /* Team */
            .team-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 32px;
            }
            .team-member {
              text-align: center;
              background: #1e293b;
              padding: 32px;
              border-radius: 12px;
            }
            .team-member img {
              width: 150px;
              height: 150px;
              border-radius: 50%;
              object-fit: cover;
              margin-bottom: 16px;
              border: 4px solid ${primaryColor};
            }
            .team-member h3 { color: ${primaryColor}; margin-bottom: 4px; }
            .team-member .title { color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px; }
            .team-member .bio { color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; }
            .credentials {
              margin-top: 12px;
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              justify-content: center;
            }
            .credential-badge {
              background: ${primaryColor}22;
              color: ${primaryColor};
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 0.75rem;
            }
            
            /* Testimonials */
            .testimonials-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 24px;
            }
            .testimonial {
              background: #1e293b;
              padding: 24px;
              border-radius: 12px;
              border-left: 4px solid ${primaryColor};
            }
            .testimonial-rating { color: #fbbf24; margin-bottom: 12px; font-size: 1.2rem; }
            .testimonial-text { color: #cbd5e1; font-style: italic; margin-bottom: 16px; line-height: 1.6; }
            .testimonial-author { color: ${primaryColor}; font-weight: 600; }
            .testimonial-location { color: #64748b; font-size: 0.9rem; }
            
            /* Stats */
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 24px;
              text-align: center;
            }
            .stat {
              background: #1e293b;
              padding: 32px;
              border-radius: 12px;
            }
            .stat-number { font-size: 3rem; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px; }
            .stat-label { color: #94a3b8; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; }
            
            /* FAQ */
            .faq-list { max-width: 800px; margin: 0 auto; }
            .faq-item {
              background: #1e293b;
              padding: 24px;
              border-radius: 12px;
              margin-bottom: 16px;
              border: 1px solid #334155;
            }
            .faq-question { color: ${primaryColor}; font-weight: 600; font-size: 1.1rem; margin-bottom: 12px; }
            .faq-answer { color: #cbd5e1; line-height: 1.6; }
            
            /* Contact */
            .contact {
              background: #1e293b;
              padding: 40px;
              border-radius: 12px;
              border: 1px solid #334155;
            }
            .contact-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 24px;
            }
            .contact-item { color: #cbd5e1; }
            .contact-item strong {
              display: block;
              margin-bottom: 8px;
              color: ${primaryColor};
              font-size: 1.1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Hero -->
            <div class="hero">
              ${siteData.tagline ? `<div class="tagline">${siteData.tagline}</div>` : ''}
              <h1>${siteData.heroTitle || siteData.businessName || 'Your Business'}</h1>
              <p>${siteData.heroSubtitle || 'Your business description'}</p>
            </div>
            
            <!-- Menu/Services -->
            ${siteData.menu && siteData.menu.sections ? `
              <div class="section">
                <div class="section-header">
                  <h2>Our Menu</h2>
                </div>
                <div class="menu-tabs">
                  ${siteData.menu.sections.map((s, i) => `<div class="menu-tab ${i === 0 ? 'active' : ''}">${s.name}</div>`).join('')}
                </div>
                <div class="items-grid">
                  ${siteData.menu.sections[0].items.map(item => `
                    <div class="item-card">
                      ${item.image ? `<img src="${item.image}" alt="${item.name}"/>` : ''}
                      <h3>${item.name}</h3>
                      <p>${item.description || ''}</p>
                      <div>
                        ${item.popular ? '<span class="badge">Popular</span>' : ''}
                        ${item.chefRecommended ? '<span class="badge">Chef Recommended</span>' : ''}
                      </div>
                      ${item.price ? `<div class="price">$${item.price}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : siteData.services?.length > 0 ? `
              <div class="section">
                <div class="section-header">
                  <h2>Our Services</h2>
                </div>
                <div class="items-grid">
                  ${siteData.services.map(s => `
                    <div class="item-card">
                      ${s.image ? `<img src="${s.image}" alt="${s.name}"/>` : ''}
                      <h3>${s.name || s.title}</h3>
                      <p>${s.description || ''}</p>
                      ${s.price ? `<div class="price">${s.price}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- About -->
            ${siteData.about ? `
              <div class="section">
                <div class="section-header">
                  <h2>${siteData.about.title || 'About Us'}</h2>
                  ${siteData.about.subtitle ? `<p class="subtitle">${siteData.about.subtitle}</p>` : ''}
                </div>
                ${siteData.about.body ? `<p class="about-text">${siteData.about.body}</p>` : ''}
                ${siteData.about.features ? `
                  <div class="features-grid">
                    ${siteData.about.features.map(f => `<div class="feature-item">${f}</div>`).join('')}
                  </div>
                ` : ''}
              </div>
            ` : ''}
            
            <!-- Gallery -->
            ${siteData.gallery?.categories ? `
              <div class="section">
                <div class="section-header">
                  <h2>${siteData.gallery.title || 'Gallery'}</h2>
                  ${siteData.gallery.subtitle ? `<p class="subtitle">${siteData.gallery.subtitle}</p>` : ''}
                </div>
                <div class="gallery-grid">
                  ${siteData.gallery.categories.flatMap(c => c.images || []).map(img => `
                    <div class="gallery-item">
                      <img src="${img.url}" alt="${img.alt || ''}"/>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Team -->
            ${siteData.team?.members ? `
              <div class="section">
                <div class="section-header">
                  <h2>${siteData.team.title || 'Our Team'}</h2>
                  ${siteData.team.subtitle ? `<p class="subtitle">${siteData.team.subtitle}</p>` : ''}
                </div>
                <div class="team-grid">
                  ${siteData.team.members.map(m => `
                    <div class="team-member">
                      ${m.image ? `<img src="${m.image}" alt="${m.name}"/>` : ''}
                      <h3>${m.name}</h3>
                      <div class="title">${m.title || m.role || ''}</div>
                      <p class="bio">${m.bio || ''}</p>
                      ${m.credentials ? `
                        <div class="credentials">
                          ${m.credentials.map(c => `<span class="credential-badge">${c}</span>`).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Testimonials -->
            ${siteData.testimonials?.items ? `
              <div class="section">
                <div class="section-header">
                  <h2>${siteData.testimonials.title || 'Testimonials'}</h2>
                  ${siteData.testimonials.subtitle ? `<p class="subtitle">${siteData.testimonials.subtitle}</p>` : ''}
                </div>
                <div class="testimonials-grid">
                  ${siteData.testimonials.items.map(t => `
                    <div class="testimonial">
                      <div class="testimonial-rating">${'⭐'.repeat(t.rating || 5)}</div>
                      <p class="testimonial-text">"${t.text}"</p>
                      <div class="testimonial-author">${t.author}</div>
                      <div class="testimonial-location">${t.location || ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Stats -->
            ${siteData.stats?.items ? `
              <div class="section">
                <div class="stats-grid">
                  ${siteData.stats.items.map(s => `
                    <div class="stat">
                      <div class="stat-number">${s.number}</div>
                      <div class="stat-label">${s.label}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- FAQ -->
            ${siteData.faq?.items ? `
              <div class="section">
                <div class="section-header">
                  <h2>${siteData.faq.title || 'FAQ'}</h2>
                </div>
                <div class="faq-list">
                  ${siteData.faq.items.map(q => `
                    <div class="faq-item">
                      <div class="faq-question">${q.question}</div>
                      <div class="faq-answer">${q.answer}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Contact -->
            <div class="section">
              <div class="section-header">
                <h2>${siteData.contact?.title || 'Contact Us'}</h2>
                ${siteData.contact?.subtitle ? `<p class="subtitle">${siteData.contact.subtitle}</p>` : ''}
              </div>
              <div class="contact">
                <div class="contact-grid">
                  ${siteData.contact?.email || siteData.contactEmail ? `
                    <div class="contact-item">
                      <strong>📧 Email</strong>
                      ${siteData.contact?.email || siteData.contactEmail}
                    </div>
                  ` : ''}
                  ${siteData.contact?.phone || siteData.contactPhone ? `
                    <div class="contact-item">
                      <strong>📞 Phone</strong>
                      ${siteData.contact?.phone || siteData.contactPhone}
                    </div>
                  ` : ''}
                  ${siteData.contact?.address || siteData.contactAddress ? `
                    <div class="contact-item">
                      <strong>📍 Address</strong>
                      ${siteData.contact?.address || siteData.contactAddress}
                    </div>
                  ` : ''}
                  ${siteData.contact?.hours || siteData.businessHours ? `
                    <div class="contact-item">
                      <strong>🕒 Hours</strong>
                      ${siteData.contact?.hours || siteData.businessHours}
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

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoomLevel(100);

  return (
    <div className="preview-frame-container">
      <div className="preview-toolbar">
        <div className="toolbar-section">
          <div className="device-buttons">
            <button
              className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceMode('desktop')}
              title="Desktop View"
            >
              <span className="device-icon">💻</span>
              <span className="device-label">Desktop</span>
            </button>
            <button
              className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setDeviceMode('tablet')}
              title="Tablet View"
            >
              <span className="device-icon">📱</span>
              <span className="device-label">Tablet</span>
            </button>
            <button
              className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
              title="Mobile View"
            >
              <span className="device-icon">📱</span>
              <span className="device-label">Mobile</span>
            </button>
          </div>
        </div>

        <div className="toolbar-center">
          <div className="device-info">{getDeviceLabel()}</div>
        </div>

        <div className="toolbar-section">
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={handleZoomOut} disabled={zoomLevel <= 50}>−</button>
            <span className="zoom-level">{zoomLevel}%</span>
            <button className="zoom-btn" onClick={handleZoomIn} disabled={zoomLevel >= 150}>+</button>
            <button className="zoom-btn reset" onClick={handleZoomReset}>↻</button>
          </div>
        </div>

        {isRefreshing && (
          <div className="refresh-indicator">
            <span className="refresh-spinner"></span>
            <span>Updating preview...</span>
          </div>
        )}
      </div>
      
      <div className="preview-viewport">
        <div className={`preview-device-wrapper ${getDeviceClass()}`}>
          <div className="device-frame">
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
              </div>
            )}
            
            {deviceMode === 'mobile' && (
              <div className="mobile-notch">
                <div className="notch-camera"></div>
                <div className="notch-speaker"></div>
              </div>
            )}

            {isLoading && (
              <div className="preview-loading">
                <div className="loading-spinner"></div>
                <p>Loading preview...</p>
              </div>
            )}
            
            <div className="preview-content" style={{ transform: `scale(${zoomLevel / 100})` }}>
              <iframe
                ref={iframeRef}
                className="preview-iframe"
                title="Site Preview"
                sandbox="allow-same-origin"
              />
            </div>

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

