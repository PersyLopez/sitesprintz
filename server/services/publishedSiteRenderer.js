/**
 * Published Site Renderer (SSR)
 * 
 * Generates complete, SEO-optimized HTML for published sites
 * Includes meta tags, schema markup, and visible sections without JS dependency
 */

import SEOService from './seoService.js';
import { sectionHtmlBuilder } from '../rendering/sectionHtml.js';
import { renderSectionToHtml } from '../../src/utils/sectionHtmlBridge.js';

class PublishedSiteRenderer {
  constructor() {
    this.seoService = new SEOService();
  }

  /**
   * Main render method
   * @param {Object} siteData - Complete site data (from DB or JSON)
   * @param {Object} options - Render options { baseUrl, siteId, customDomain }
   * @returns {string} Complete HTML document
   */
  async render(siteData, options = {}) {
    const {
      baseUrl = 'localhost:3000',
      siteId = '',
      customDomain = null
    } = options;

    // Generate meta tags and schema
    const metaTags = this.seoService.generateMetaTags(siteData);
    const schema = this.seoService.generateSchemaMarkup(siteData.category || 'service', siteData);
    const canonicalUrl = this.seoService.getCanonicalUrl(siteId, '/', { customDomain });

    // Build visible sections HTML — prefer bridge (token-aware), fallback to builder
    let sectionsHtml;
    try {
      const { composePage } = await import('../../src/utils/layoutRenderer.js');
      const page = composePage({ siteData });
      const tokens = page.tokens;
      const enabledSections = (page.sections || []).filter(s => s && s.enabled !== false);
      sectionsHtml = enabledSections
        .map(section => renderSectionToHtml(section, tokens))
        .filter(Boolean)
        .join('\n');
    } catch (e) {
      // Fallback: legacy builder (no token awareness)
      sectionsHtml = await sectionHtmlBuilder.buildSectionsHtml(siteData);
    }

    // Build theme variables if custom theme is configured
    const themeVars = this._buildThemeVariables(siteData);

    // Assemble complete HTML document
    return this._buildHtmlDocument({
      metaTags,
      schema,
      canonicalUrl,
      themeVars,
      sectionsHtml,
      siteData,
      baseUrl
    });
  }

  /**
   * Build complete HTML document
   * @private
   */
  _buildHtmlDocument(components) {
    const {
      metaTags,
      schema,
      canonicalUrl,
      themeVars,
      sectionsHtml,
      siteData,
      baseUrl
    } = components;

    const title = metaTags.title || siteData.businessName || siteData.brand?.name || 'Business Website';
    const description = metaTags.description || 'Professional business website';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${this._escapeHtml(title)}</title>
  <meta name="title" content="${this._escapeHtml(title)}">
  <meta name="description" content="${this._escapeHtml(description)}">
  <meta name="keywords" content="${this._escapeHtml(metaTags.keywords || '')}">
  <meta name="author" content="${this._escapeHtml(siteData.businessName || siteData.brand?.name || '')}">
  
  <!-- Canonical -->
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${this._escapeHtml(metaTags['og:title'] || title)}">
  <meta property="og:description" content="${this._escapeHtml(metaTags['og:description'] || description)}">
  ${metaTags['og:image'] ? `<meta property="og:image" content="${this._escapeHtml(metaTags['og:image'])}">` : ''}
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${canonicalUrl}">
  <meta property="twitter:title" content="${this._escapeHtml(metaTags['twitter:title'] || title)}">
  <meta property="twitter:description" content="${this._escapeHtml(metaTags['twitter:description'] || description)}">
  ${metaTags['twitter:image'] ? `<meta property="twitter:image" content="${this._escapeHtml(metaTags['twitter:image'])}">` : ''}
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}
  </script>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- Critical Inline Styles -->
  <style>
    ${this._getCriticalCss()}
    
    /* Theme Variables */
    :root {
      ${themeVars}
    }
  </style>
</head>
<body>
  <!-- Main Content -->
  <main id="app">
    ${sectionsHtml}
  </main>
  
  <!-- Minimal Hydration Script -->
  <script src="/sites/site-hydrate.js" defer></script>
</body>
</html>`;
  }

  /**
   * Build CSS custom properties from theme
   * @private
   */
  _buildThemeVariables(siteData) {
    const theme = siteData.theme || {};
    
    return `
      --color-bg: ${theme.backgroundColor || '#0a0a0f'};
      --color-text: ${theme.textColor || '#f8fafc'};
      --color-primary: ${theme.primaryColor || '#6366f1'};
      --color-primary-light: ${theme.primaryLightColor || '#818cf8'};
      --color-accent: ${theme.accentColor || '#ec4899'};
      --font-display: ${theme.fontDisplay || "'Inter', -apple-system, sans-serif"};
      --font-body: ${theme.fontBody || "'Inter', -apple-system, sans-serif"};
      --radius: ${theme.borderRadius || '20px'};
    `;
  }

  /**
   * Get critical CSS for above-the-fold rendering
   * Inlined for fastest FCP
   * @private
   */
  _getCriticalCss() {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      html, body {
        width: 100%;
        height: 100%;
      }
      
      body {
        font-family: var(--font-body);
        background: var(--color-bg);
        color: var(--color-text);
        line-height: 1.6;
        font-size: 16px;
        overflow-x: hidden;
      }
      
      .container {
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 24px;
      }
      
      /* Hero section - critical for FCP */
      .hero {
        padding: 96px 0;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
      }
      
      .hero-content {
        text-align: center;
        z-index: 10;
      }
      
      .hero-content h1 {
        font-size: 3.5rem;
        font-weight: 900;
        margin-bottom: 1rem;
        line-height: 1.2;
        letter-spacing: -0.02em;
      }
      
      .hero-content p {
        font-size: 1.25rem;
        color: rgba(248, 250, 252, 0.7);
        margin-bottom: 2rem;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }
      
      .cta-button {
        display: inline-block;
        padding: 12px 32px;
        background: var(--color-primary);
        color: white;
        text-decoration: none;
        border-radius: var(--radius);
        font-weight: 600;
        transition: all 0.2s;
      }
      
      .cta-button:hover {
        background: var(--color-primary-light);
        transform: translateY(-2px);
      }
      
      /* Section styles */
      section {
        padding: 96px 0;
      }
      
      section h2 {
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 3rem;
        text-align: center;
      }
      
      section h3 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
      }
      
      /* Image optimization */
      img {
        max-width: 100%;
        height: auto;
        display: block;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .hero-content h1 {
          font-size: 2rem;
        }
        
        .hero-content p {
          font-size: 1rem;
        }
        
        section h2 {
          font-size: 1.75rem;
        }
      }
    `;
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  _escapeHtml(text) {
    if (!text) return '';
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Singleton instance
const publishedSiteRenderer = new PublishedSiteRenderer();

export default publishedSiteRenderer;
export { PublishedSiteRenderer };
