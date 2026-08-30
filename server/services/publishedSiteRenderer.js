/**
 * Published Site Renderer (SSR)
 * 
 * Generates complete, SEO-optimized HTML for published sites
 * Includes meta tags, schema markup, and visible sections without JS dependency
 */

import SEOService from './seoService.js';
import { buildLiveSiteMarkup } from '../../src/utils/publishedSiteDocument.js';

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
    // server.js passes siteIdentifier (live subdomain); tests pass siteId
    const resolvedSubdomain = siteData.subdomain || siteId || options.siteIdentifier || '';

    // Generate meta tags and schema (pass subdomain for OG share card image)
    const metaTags = this.seoService.generateMetaTags({
      ...siteData,
      subdomain: resolvedSubdomain
    });
    const schema = this.seoService.generateSchemaMarkup(siteData.category || 'service', siteData);
    const canonicalUrl = this.seoService.getCanonicalUrl(resolvedSubdomain, '/', { customDomain });
    const markup = buildLiveSiteMarkup(siteData, { locale: options.locale || 'en' });

    return this._buildHtmlDocument({
      metaTags,
      schema,
      canonicalUrl,
      liveCss: markup.css,
      liveHtml: markup.html,
      siteData,
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
      liveCss = '',
      liveHtml = '',
      siteData,
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
  ${metaTags['og:image:width'] ? `<meta property="og:image:width" content="${this._escapeHtml(metaTags['og:image:width'])}">` : ''}
  ${metaTags['og:image:height'] ? `<meta property="og:image:height" content="${this._escapeHtml(metaTags['og:image:height'])}">` : ''}
  
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
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    ${liveCss}
  </style>
</head>
<body>
  <div class="ss-live">
    ${liveHtml}
  </div>
</body>
</html>`;
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
