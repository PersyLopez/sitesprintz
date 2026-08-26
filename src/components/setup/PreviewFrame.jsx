/**
 * PreviewFrame — live preview using the layout system.
 *
 * Uses composePage() + sectionHtmlBridge for token-aware rendering.
 * Falls back to legacy inline HTML if composePage() throws.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSite } from '../../hooks/useSite';
import { composePage } from '../../utils/layoutRenderer';
import { renderSectionToHtml, withNativeBookingTokens } from '../../utils/sectionHtmlBridge';
import './PreviewFrame.css';

function PreviewFrame() {
  const { siteData, previewKey } = useSite();
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  const updatePreview = useCallback(() => {
    if (!iframeRef.current) return;

    let content;

    try {
      content = buildPreviewFromLayout(siteData);
    } catch {
      content = buildLegacyPreview(siteData);
    }

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(content);
    doc.close();
  }, [siteData]);

  useEffect(() => {
    if (!iframeRef.current) return;
    setIsLoading(true);
    updatePreview();
    setIsLoading(false);
  }, [previewKey, updatePreview]);

  function buildPreviewFromLayout(data) {
    if (!data || Object.keys(data).length === 0) {
      return buildEmptyPreview();
    }

    const page = composePage({ siteData: data });
    const { sections = [], tokens } = page;
    const t = tokens?.theme || {};

    const bg = t.bg || data.colors?.bg || '#0c0c0e';
    const text = t.text || data.colors?.text || '#f4f2ee';
    const accent = t.accent || data.colors?.accent || '#c2683a';
    const muted = t.muted || data.colors?.muted || '#8a8a8f';

    const enabledSections = sections.filter((s) => s && s.enabled !== false);
    const renderTokens = withNativeBookingTokens(tokens, enabledSections);
    const sectionsHtml = enabledSections
      .map((section) => renderSectionToHtml(section, renderTokens))
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
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${sectionsHtml || `<div style="padding:80px 24px;text-align:center;"><h1 style="color:${accent};">Preview</h1><p style="color:${muted};">No sections configured.</p></div>`}
</body>
</html>`;
  }

  function buildLegacyPreview(data) {
    const colors = data?.colors || {};
    const primaryColor = colors.primary || '#06b6d4';
    const accentColor = colors.accent || colors.secondary || '#0891b2';
    const bgColor = colors.background || colors.bg || '#0f172a';
    const surfaceColor = colors.surface || '#1e293b';
    const textColor = colors.text || '#f8fafc';
    const textMutedColor = colors.textMuted || colors.muted || '#94a3b8';

    const heroTitle = data?.heroTitle || data?.businessName || 'Your Business';
    const heroSubtitle = data?.heroSubtitle || '';

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
    .item-card { background: ${surfaceColor}; padding: 24px; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>${heroTitle}</h1>
      ${heroSubtitle ? `<p>${heroSubtitle}</p>` : ''}
    </div>
    ${(data?.services || []).map((s) => `
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

  function buildEmptyPreview() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #030712; color: #f0f9ff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  </style>
</head>
<body>
  <div style="text-align:center;padding:48px;">
    <h1 style="color:#4a6d82;font-size:2rem;">Site Preview</h1>
    <p style="color:#94a3b8;margin-top:1rem;">Start building to see your preview here.</p>
  </div>
</body>
</html>`;
  }

  return (
    <div data-testid="preview-frame" className="preview-frame-container">
      <div className="preview-viewport">
        {isLoading && (
          <div className="preview-loading" data-testid="preview-loading">
            <div className="loading-spinner"></div>
            <p>Loading preview...</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          src="about:blank"
          sandbox="allow-same-origin"
          title="Site Preview"
        />
      </div>
    </div>
  );
}

export default PreviewFrame;
