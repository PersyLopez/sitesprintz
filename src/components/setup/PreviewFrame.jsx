/**
 * PreviewFrame — live preview using the layout system.
 *
 * Uses composePage() + sectionHtmlBridge for token-aware rendering.
 * Falls back to legacy inline HTML if composePage() throws.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSite } from '../../hooks/useSite';
import { composePage } from '../../utils/layoutRenderer';
import { renderSectionToHtml } from '../../utils/sectionHtmlBridge';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, siteData]);

  const updatePreview = useCallback(() => {
    if (!iframeRef.current) return;

    let content;

    try {
      content = buildPreviewFromLayout(siteData);
    } catch (e) {
      // CRITICAL: fall back to legacy rendering if composePage() throws
      content = buildLegacyPreview(siteData);
    }

    const doc = iframeRef.current.contentDocument;
    doc.open();
    doc.write(content);
    doc.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteData]);

  // -------------------------------------------------------------------------
  // Layout-system preview (primary path)
  // -------------------------------------------------------------------------

  function buildPreviewFromLayout(siteData) {
    if (!siteData || Object.keys(siteData).length === 0) {
      return buildEmptyPreview();
    }

    const page = composePage({ siteData });
    const { sections = [], tokens } = page;
    const t = tokens?.theme || {};

    const bg = t.bg || siteData.colors?.bg || '#0c0c0e';
    const text = t.text || siteData.colors?.text || '#f4f2ee';
    const accent = t.accent || siteData.colors?.accent || '#c2683a';
    const muted = t.muted || siteData.colors?.muted || '#8a8a8f';

    const enabledSections = sections.filter(s => s && s.enabled !== false);
    const sectionsHtml = enabledSections
      .map(section => renderSectionToHtml(section, tokens))
      .filter(Boolean)
      .join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: ${bg};
      color: ${text};
      line-height: 1.6;
    }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
    .hero { padding: 80px 24px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; color: ${accent}; }
    .hero p { font-size: 1.1rem; color: ${muted}; max-width: 700px; margin: 0 auto; }
    .section { padding: 48px 24px; }
    .section h2 { font-size: 2rem; margin-bottom: 24px; color: ${accent}; text-align: center; }
    .section p { color: ${muted}; text-align: center; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${sectionsHtml || `<div style="padding:80px 24px;text-align:center;"><h1 style="color:${accent};">Preview</h1><p style="color:${muted};">No sections configured.</p></div>`}
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // Legacy fallback (safety net — keeps old inline HTML rendering)
  // -------------------------------------------------------------------------

  function buildLegacyPreview(siteData) {
    const colors = siteData?.colors || {};
    const primaryColor = colors.primary || '#06b6d4';
    const accentColor = colors.accent || colors.secondary || '#0891b2';
    const bgColor = colors.background || colors.bg || '#0f172a';
    const surfaceColor = colors.surface || '#1e293b';
    const textColor = colors.text || '#f8fafc';
    const textMutedColor = colors.textMuted || colors.muted || '#94a3b8';

    const heroTitle = siteData?.heroTitle || siteData?.businessName || 'Your Business';
    const heroSubtitle = siteData?.heroSubtitle || '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: ${bgColor}; color: ${textColor}; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .hero { background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); padding: 80px 20px; text-align: center; border-radius: 20px; margin-bottom: 60px; }
    .hero h1 { font-size: 3rem; margin-bottom: 16px; color: white; }
    .hero p { font-size: 1.15rem; color: rgba(255,255,255,0.95); max-width: 700px; margin: 0 auto; }
    .section { margin-bottom: 60px; }
    .section h2 { font-size: 2.5rem; margin-bottom: 12px; color: ${primaryColor}; text-align: center; }
    .section p.subtitle { font-size: 1.1rem; color: ${textMutedColor}; text-align: center; }
    .items-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .item-card { background: ${surfaceColor}; padding: 24px; border-radius: 12px; }
    .item-card h3 { color: ${primaryColor}; margin-bottom: 8px; }
    .item-card p { color: ${textMutedColor}; }
    .item-card .price { font-size: 1.25rem; font-weight: 700; color: ${primaryColor}; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>${heroTitle}</h1>
      ${heroSubtitle ? `<p>${heroSubtitle}</p>` : ''}
    </div>
    ${(siteData?.services || []).map(s => `
      <div class="section">
        <h2>${s.name || 'Service'}</h2>
        <p class="subtitle">${s.description || ''}</p>
        ${s.price ? `<p class="price">${s.price}</p>` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // Empty preview
  // -------------------------------------------------------------------------

  function buildEmptyPreview() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0c0c0e; color: #f4f2ee; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  </style>
</head>
<body>
  <div style="text-align:center;padding:48px;">
    <h1 style="color:#c2683a;font-size:2rem;">Site Preview</h1>
    <p style="color:#8a8a8f;margin-top:1rem;">Start building to see your preview here.</p>
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------------------
  // Device frame dimensions
  // -------------------------------------------------------------------------

  const deviceFrames = {
    desktop: { width: '100%', height: '100%', icon: '🖥️', label: 'Desktop' },
    tablet: { width: '768px', height: '100%', icon: '📱', label: 'Tablet' },
    mobile: { width: '375px', height: '100%', icon: '📱', label: 'Mobile' },
  };

  return (
    <div data-testid="preview-frame" className="preview-frame-wrapper">
      {/* Device Mode Toggle */}
      <div className="preview-controls">
        <div className="device-toggle">
          {Object.entries(deviceFrames).map(([mode, config]) => (
            <button
              key={mode}
              className={`device-btn ${deviceMode === mode ? 'active' : ''}`}
              onClick={() => setDeviceMode(mode)}
              title={config.label}
              data-testid={`device-${mode}`}
            >
              {config.icon} {config.label}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
            title="Zoom Out"
            data-testid="zoom-out"
          >
            −
          </button>
          <span className="zoom-level" data-testid="zoom-level">{zoomLevel}%</span>
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
            title="Zoom In"
            data-testid="zoom-in"
          >
            +
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="preview-container" style={{ maxWidth: deviceFrames[deviceMode]?.width || '100%' }}>
        {isLoading && (
          <div className="preview-loading" data-testid="preview-loading">
            <div className="spinner"></div>
            <p>Loading preview...</p>
          </div>
        )}
        <div className={`iframe-wrapper ${isRefreshing ? 'refreshing' : ''}`}>
          <iframe
            ref={iframeRef}
            src="about:blank"
            style={{
              width: '100%',
              height: '700px',
              border: 'none',
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.3s ease',
            }}
            sandbox="allow-same-origin"
            title="Site Preview"
          />
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
