/**
 * SEO Service
 * Handles meta tag generation, Schema.org markup, sitemaps, and robots.txt
 * Following TDD: Implementation written to pass tests
 */

import { getPublicSiteHost, normalizeHostname } from '../../src/utils/customDomainHost.js';
import { livePublishedPath } from '../../src/utils/visitorExperience.js';
import { tMarketing } from '../../src/i18n/marketing/index.js';
import { DEFAULT_LOCALE, parseLocale } from '../../src/i18n/locale.js';

const MARKETING_APEX_HOSTS = new Set(['rightsitelight.com', 'sitesprintz.com', 'localhost', '127.0.0.1']);

const SPA_EXACT_PATHS = new Set([
  '/login',
  '/about',
  '/contact',
  '/build',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/oauth/callback',
  '/showcase',
  '/payment-success',
  '/payment-cancel',
  '/track',
  '/dashboard',
  '/dashboard/orders',
  '/dashboard/analytics',
  '/dashboard/payment-settings',
  '/dashboard/settings/payments',
  '/dashboard/stripe',
  '/setup',
  '/orders',
  '/analytics',
  '/products',
  '/booking-dashboard',
  '/staff/dashboard',
  '/admin',
  '/admin/analytics',
  '/admin/users',
  '/admin/sites',
  '/admin/candidates',
  '/admin/build-intakes',
  '/admin/pricing',
  '/admin/plan-features',
  '/admin/coupons',
  '/admin/templates',
]);

const SPA_PATH_PATTERNS = [
  /^\/showcase\/[^/]+$/,
  /^\/view\/[^/]+$/,
  /^\/sites\/[^/]+$/,
  /^\/sites\/[^/]+\/foundation$/,
  /^\/booking\/user\/[^/]+$/,
  /^\/booking\/appointment\/[^/]+$/,
  /^\/track\/order\/[^/]+$/,
  /^\/track\/appointment\/[^/]+$/,
  /^\/staff\/accept\/[^/]+$/,
  /^\/staff\/(?:appointments|schedule|orders)\/[^/]+$/,
  /^\/claim\/[^/]+$/,
  /^\/dashboard\/sites\/[^/]+(?:\/(?:orders|messages|appointments|products|settings|analytics))?$/,
  /^\/analytics\/[^/]+$/,
  /^\/settings(?:\/.*)?$/,
  /^\/admin\/templates\/[^/]+$/,
];

class SEOService {
  constructor() {
    this.publicHost = getPublicSiteHost();
    this.baseUrl = process.env.BASE_URL || this.publicHost;
    this.protocol = 'https';
  }

  /**
   * Base origin for platform-hosted sites (not custom domains).
   * @param {string} subdomain
   * @returns {string}
   */
  _platformSiteOrigin(subdomain) {
    return `${this.protocol}://${this.publicHost}${livePublishedPath(subdomain)}`;
  }

  /**
   * Marketing apex only (not tenant hosts like testsite.sitesprintz.com).
   * www. is stripped by normalizeHostname.
   * @param {string} hostname
   * @returns {boolean}
   */
  isMarketingApexHost(hostname) {
    const host = normalizeHostname(hostname);
    if (!host) return false;
    if (MARKETING_APEX_HOSTS.has(host)) return true;
    return host === getPublicSiteHost();
  }

  /**
   * Public host used in platform sitemap/robots URLs.
   * @param {string} hostname
   * @returns {string}
   */
  platformSitemapHost(hostname) {
    const host = normalizeHostname(hostname);
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return getPublicSiteHost();
    }
    return host;
  }

  /**
   * robots.txt for the marketing site (not a tenant shop).
   * @param {string} hostname
   * @returns {string}
   */
  generatePlatformRobotsTxt(hostname) {
    const host = this.platformSitemapHost(hostname);
    return [
      '# IAB Tech Lab content signals',
      '# search=yes,ai-train=no',
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: https://${host}/sitemap.xml`,
      '',
    ].join('\n');
  }

  /**
   * Marketing SPA head for a path (unknown routes keep homepage head).
   * @param {string} pathname
   * @param {string} [search]
   * @returns {{ title: string, description: string, canonical: string, robots: string } | null}
   */
  resolveMarketingPageMeta(pathname, search = '') {
    const path = this._normalizeMarketingPath(pathname);
    const origin = `${this.protocol}://${getPublicSiteHost()}`;
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    const locale = params.has('lang') ? parseLocale(params.get('lang')) : DEFAULT_LOCALE;
    const t = (key) => tMarketing(locale, key);
    const brand = t('brand.name');
    const bare = path === '/' ? `${origin}/` : `${origin}${path}`;
    const canonical = locale === 'es' ? `${bare}?lang=es` : bare;
    const alternates = { en: bare, es: `${bare}?lang=es`, xDefault: bare };
    const home = {
      title: `${brand} — ${t('footer.tagline')}`,
      description: t('landing.hero.subtitle'),
      canonical,
      alternates,
      robots: 'index',
      lang: locale,
    };
    const noIndexPaths = new Set([
      '/login',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/oauth/callback',
      '/build',
    ]);

    if (path === '/') return home;

    if (path === '/about') {
      return {
        title: t('about.title'),
        description: t('about.p2'),
        canonical,
        alternates,
        robots: 'index',
        lang: locale,
      };
    }

    if (path === '/contact') {
      return {
        title: `${t('contact.title')} — ${brand}`,
        description: t('contact.p'),
        canonical,
        alternates,
        robots: 'index',
        lang: locale,
      };
    }

    if (path === '/showcase') {
      return {
        title: t('showcase.title'),
        description: t('showcase.meta'),
        canonical,
        alternates,
        robots: 'index',
        lang: locale,
      };
    }

    if (path === '/register') {
      return {
        title: `${t('nav.getStarted')} — ${brand}`,
        description: t('auth.register.p'),
        canonical,
        alternates,
        robots: params.has('template') ? 'noindex,nofollow' : 'index',
        lang: locale,
      };
    }

    if (noIndexPaths.has(path)) {
      const titled = {
        '/login': `${t('nav.login')} — ${brand}`,
        '/build': `${t('nav.getStarted')} — ${brand}`,
      };
      return {
        title: titled[path] || home.title,
        description: path === '/login' ? t('auth.login.p') : home.description,
        canonical,
        alternates,
        robots: 'noindex,nofollow',
        lang: locale,
      };
    }

    return null;
  }

  /**
   * Replace homepage head tags in index.html with marketing meta for this path.
   * @param {string} html
   * @param {string} pathname
   * @param {string} [search]
   * @returns {string}
   */
  injectMarketingPageMeta(html, pathname, search = '') {
    const meta = this.resolveMarketingPageMeta(pathname, search);
    if (!meta || typeof html !== 'string') return html;
    return this._applyMarketingHead(html, meta);
  }

  /**
   * Subdomain for `/showcase/:subdomain`. The gallery index is not a detail page.
   * @param {string} pathname
   * @returns {string|null}
   */
  showcaseDocumentSubdomain(pathname) {
    const path = this._normalizeMarketingPath(pathname);
    const match = path.match(/^\/showcase\/([^/]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Same title and description the example page sets after it loads, so a
   * crawler sees the shop name instead of the homepage head.
   * @param {string} html
   * @param {{ name?: string, subdomain?: string, data?: object, site_data?: object }} showcase
   * @returns {string}
   */
  /**
   * The live /view document otherwise keeps the marketing homepage title,
   * description, and canonical. Link previews and the tab then name every
   * shop Right Site Light.
   * @param {string} html
   * @param {{ name?: string, subdomain?: string, data?: object, site_data?: object }} showcase
   * @returns {string}
   */
  injectPublishedViewDocumentMeta(html, showcase) {
    if (!showcase || typeof html !== 'string') return html;
    const payload = showcase.data || showcase.site_data || {};
    const subdomain = showcase.subdomain || payload.subdomain || '';
    const businessName = showcase.name
      || payload.businessName
      || payload.brand?.name
      || subdomain;
    const businessDescription = payload.businessDescription
      || payload.about?.description
      || payload.hero?.subtitle
      || '';
    const identity = {
      ...payload,
      businessName,
      businessDescription,
      subdomain,
      businessPhone: payload.businessPhone || payload.contactPhone || payload.contact?.phone || '',
      businessEmail: payload.businessEmail || payload.contact?.email || '',
      businessAddress: payload.businessAddress || payload.contact?.address || '',
    };
    const tags = this.generateMetaTags(identity);
    const withHead = this._applyMarketingHead(html, {
      title: tags.title,
      description: tags.description,
      canonical: this.getCanonicalUrl(subdomain, '/'),
      robots: 'index',
    });
    const category = payload.category || showcase.category || payload.niche || 'service';
    return this._replaceJsonLd(
      this._replaceShareImages(withHead, tags),
      this.generateSchemaMarkup(category, identity),
    );
  }

  _replaceShareImages(html, tags) {
    let out = html;
    if (tags['og:image']) out = this._replaceMetaContent(out, 'property', 'og:image', tags['og:image']);
    if (tags['twitter:image']) out = this._replaceMetaContent(out, 'name', 'twitter:image', tags['twitter:image']);
    return out;
  }

  _replaceJsonLd(html, schema) {
    const json = JSON.stringify(schema).replace(/</g, '\\u003c');
    const block = `<script type="application/ld+json">${json}</script>`;
    const existing = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i;
    if (existing.test(html)) return html.replace(existing, block);
    return html.replace(/<\/head>/i, `${block}</head>`);
  }

  injectShowcaseDocumentMeta(html, showcase) {
    if (!showcase || typeof html !== 'string') return html;
    const payload = showcase.data || showcase.site_data || {};
    const siteTitle = showcase.name
      || payload.brand?.name
      || payload.hero?.title
      || showcase.subdomain
      || 'Untitled Site';
    const description = payload.about?.description
      || payload.hero?.subtitle
      || `${siteTitle} - A beautiful website made with Right Site Light`;
    const origin = `${this.protocol}://${getPublicSiteHost()}`;
    const subdomain = showcase.subdomain || '';
    return this._applyMarketingHead(html, {
      title: `${siteTitle} - Made with Right Site Light`,
      description,
      canonical: `${origin}/showcase/${encodeURIComponent(subdomain)}`,
      robots: 'index',
    });
  }

  _applyMarketingHead(html, meta) {
    let out = html;
    if (meta.lang) {
      out = out.replace(/<html\b([^>]*)>/i, (full, attrs) => (
        /\blang=/.test(attrs)
          ? full.replace(/\blang="[^"]*"/, `lang="${meta.lang}"`)
          : `<html lang="${meta.lang}"${attrs}>`
      ));
    }
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${this._escapeHtml(meta.title)}</title>`);
    out = this._replaceMetaContent(out, 'name', 'description', meta.description);
    out = this._replaceCanonicalHref(out, meta.canonical);
    out = this._replaceHreflang(out, meta);
    out = this._replaceMetaContent(out, 'property', 'og:url', meta.canonical);
    out = this._replaceMetaContent(out, 'property', 'og:title', meta.title);
    out = this._replaceMetaContent(out, 'property', 'og:description', meta.description);
    out = this._replaceMetaContent(out, 'name', 'twitter:title', meta.title);
    out = this._replaceMetaContent(out, 'name', 'twitter:description', meta.description);
    return this._replaceOrInsertRobots(out, meta.robots);
  }

  _normalizeMarketingPath(pathname) {
    if (!pathname || pathname === '/') return '/';
    const raw = String(pathname).split('?')[0];
    const trimmed = raw.replace(/\/+$/, '') || '/';
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  /**
   * A static file that reached the SPA fallback was not on disk.
   * @param {string} pathname
   * @returns {boolean}
   */
  isMissingAssetPath(pathname) {
    const path = String(pathname || '').split('?')[0];
    return /\.(?:js|mjs|css|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|mp4|webm|pdf|webmanifest)$/i.test(path);
  }

  /**
   * HTTP status for the marketing document. Unknown pages are real 404s.
   * Published /view and /showcase details are decided by the lookup.
   * @param {string} pathname
   * @returns {200|404}
   */
  spaDocumentStatus(pathname) {
    if (this.isMissingAssetPath(pathname)) return 404;
    const path = this._normalizeMarketingPath(pathname);
    if (path === '/' || SPA_EXACT_PATHS.has(path) || SPA_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
      return 200;
    }
    return 404;
  }

  _escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _replaceMetaContent(html, attrKey, attrVal, content) {
    const escaped = this._escapeHtml(content);
    const re = new RegExp(
      `<meta(\\s+)${attrKey}="${attrVal}"(\\s+)content="[^"]*"(\\s*)(/?)>`,
      'i'
    );
    if (!re.test(html)) return html;
    return html.replace(re, `<meta$1${attrKey}="${attrVal}"$2content="${escaped}"$3$4>`);
  }

  _replaceCanonicalHref(html, href) {
    const escaped = this._escapeHtml(href);
    const re = /<link(\s+)rel="canonical"(\s+)href="[^"]*"(\s*)(\/?)>/i;
    if (!re.test(html)) return html;
    return html.replace(re, `<link$1rel="canonical"$2href="${escaped}"$3$4>`);
  }

  _replaceHreflang(html, meta) {
    const stripped = html.replace(
      /\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]*"\s*\/?>/gi,
      ''
    );
    if (meta.robots !== 'index' || !meta.alternates) return stripped;
    const block = [
      ['en', meta.alternates.en],
      ['es', meta.alternates.es],
      ['x-default', meta.alternates.xDefault],
    ].map(([lang, href]) => (
      `<link rel="alternate" hreflang="${lang}" href="${this._escapeHtml(href)}" />`
    )).join('\n    ');
    if (/<link\s+rel="canonical"[^>]*>/i.test(stripped)) {
      return stripped.replace(/(<link\s+rel="canonical"[^>]*>)/i, `$1\n    ${block}`);
    }
    return stripped.replace(/<\/head>/i, `    ${block}\n  </head>`);
  }

  _replaceOrInsertRobots(html, robots) {
    const escaped = this._escapeHtml(robots);
    if (/<meta\s+name="robots"/i.test(html)) {
      return this._replaceMetaContent(html, 'name', 'robots', robots);
    }
    const tag = `<meta name="robots" content="${escaped}" />`;
    if (/<meta\s+name="description"[^>]*>/i.test(html)) {
      return html.replace(/(<meta\s+name="description"[^>]*>)/i, `$1\n    ${tag}`);
    }
    return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
  }

  /**
   * Canonical base URL for a site (custom domain or /view/:subdomain).
   * @param {string} subdomain
   * @param {Object} options
   * @returns {string}
   */
  _resolveSiteBaseUrl(subdomain, options = {}) {
    if (options.customDomain) {
      return `${this.protocol}://${options.customDomain}`;
    }
    return this._platformSiteOrigin(subdomain);
  }

  /**
   * Generate meta tags for a site
   * @param {Object} siteData - Site information
   * @returns {Object} Meta tags object
   */
  generateMetaTags(siteData) {
    const resolved = this._withResolvedIdentity(siteData);
    const {
      businessName,
      businessDescription = '',
      businessPhone,
      businessEmail,
      businessAddress,
      category,
      logo
    } = resolved;

    // Generate optimized title (max 60 chars)
    let title = businessName || 'My Business';
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    // Generate optimized description (50-160 chars)
    let description = businessDescription || (businessName ? `Welcome to ${businessName}` : 'Professional business website');
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    } else if (description.length < 50 && businessDescription) {
      // Pad with category info if too short
      const categoryText = this._getCategoryText(category);
      description = `${description}. ${categoryText}`.substring(0, 160);
    }

    // Generate keywords
    const keywords = this._generateKeywords(businessName, category, businessDescription);

    // Build meta tags object
    const metaTags = {
      title,
      description,
      keywords,
      viewport: 'width=device-width, initial-scale=1.0',
      charset: 'UTF-8',
      
      // Open Graph tags
      'og:title': title,
      'og:description': description,
      'og:type': 'website',
      
      // Twitter Card tags
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description
    };

    // og:image — share card highlight when subdomain known, else hero, else logo
    const subdomain = siteData.subdomain || siteData.siteId;
    const heroImage = siteData.hero?.image || siteData.meta?.heroImage;

    if (subdomain) {
      const shareCardUrl = this._getShareCardImageUrl(subdomain);
      metaTags['og:image'] = shareCardUrl;
      metaTags['twitter:image'] = shareCardUrl;
      metaTags['og:image:width'] = '1200';
      metaTags['og:image:height'] = '630';
    } else if (heroImage) {
      metaTags['og:image'] = heroImage;
      metaTags['twitter:image'] = heroImage;
    } else if (logo) {
      metaTags['og:image'] = logo;
      metaTags['twitter:image'] = logo;
    }

    return metaTags;
  }

  /**
   * Absolute URL for the social OG share card PNG
   * @param {string} subdomain
   * @returns {string}
   */
  _getShareCardImageUrl(subdomain) {
    const host = String(this.baseUrl).replace(/^https?:\/\//, '');
    return `${this.protocol}://${host}/api/share/${subdomain}/social`;
  }

  /**
   * Generate Schema.org JSON-LD markup
   * @param {string} type - Type of schema (restaurant, product, service, etc.)
   * @param {Object} data - Business/product data
   * @returns {Object} Schema.org markup object
   */
  generateSchemaMarkup(type, data) {
    const resolved = this._withResolvedIdentity(data);
    const schema = {
      '@context': 'https://schema.org'
    };

    switch (type) {
      case 'restaurant':
        return this._generateRestaurantSchema(resolved);
      
      case 'salon':
      case 'gym':
      case 'plumbing':
      case 'electrician':
      case 'auto-repair':
      case 'tech-repair':
      case 'cleaning':
      case 'pet-care':
        return this._generateLocalBusinessSchema(resolved, type);
      
      case 'consultant':
      case 'freelancer':
        return this._generateProfessionalServiceSchema(resolved);
      
      case 'product':
        return this._generateProductSchema(resolved);
      
      case 'service':
        return this._generateServiceSchema(resolved);
      
      default:
        return this._generateLocalBusinessSchema(resolved, 'LocalBusiness');
    }
  }

  _withResolvedIdentity(siteData = {}) {
    const fromBrand = typeof siteData.brand?.name === 'string' ? siteData.brand.name.trim() : '';
    const fromName = typeof siteData.businessName === 'string' ? siteData.businessName.trim() : '';
    const businessName = fromName || fromBrand;
    return { ...siteData, businessName };
  }

  /**
   * Generate XML sitemap
   * @param {string} subdomain - Site subdomain
   * @param {Array} pages - Array of page objects with path, priority, changefreq
   * @param {Object} options - Options (customDomain)
   * @returns {string} XML sitemap
   */
  async generateSitemap(subdomain, pages = [], options = {}) {
    const baseUrl = this._resolveSiteBaseUrl(subdomain, options);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of pages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      
      if (page.lastmod) {
        xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
      }
      
      if (page.changefreq) {
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      }
      
      if (page.priority !== undefined && page.priority !== null) {
        // Ensure priority is formatted as decimal (e.g., 1.0 not 1)
        const priority = typeof page.priority === 'number' 
          ? page.priority.toFixed(1)
          : parseFloat(page.priority).toFixed(1);
        xml += `    <priority>${priority}</priority>\n`;
      }
      
      xml += '  </url>\n';
    }

    xml += '</urlset>';
    return xml;
  }

  /**
   * Generate robots.txt
   * @param {string} subdomain - Site subdomain
   * @param {Object} options - Options (customDomain, disallow, noindex)
   * @returns {string} robots.txt content
   */
  generateRobotsTxt(subdomain, options = {}) {
    const { customDomain, disallow = [], noindex = false } = options;
    
    const baseUrl = this._resolveSiteBaseUrl(subdomain, { customDomain });

    let txt = 'User-agent: *\n';
    
    if (noindex) {
      txt += 'Disallow: /\n';
    } else {
      txt += 'Allow: /\n';
      
      // Add specific disallows
      for (const path of disallow) {
        txt += `Disallow: ${path}\n`;
      }
    }
    
    txt += '\n';
    txt += `Sitemap: ${baseUrl}/sitemap.xml\n`;
    
    return txt;
  }

  /**
   * Get canonical URL
   * @param {string} subdomain - Site subdomain
   * @param {string} path - Page path
   * @param {Object} options - Options (customDomain)
   * @returns {string} Canonical URL
   */
  getCanonicalUrl(subdomain, path, options = {}) {
    const baseUrl = this._resolveSiteBaseUrl(subdomain, options);

    // Remove query parameters
    const cleanPath = path.split('?')[0];
    
    // Remove trailing slash (except for root)
    const normalizedPath = cleanPath === '/' ? '/' : cleanPath.replace(/\/$/, '');
    
    return `${baseUrl}${normalizedPath}`;
  }

  /**
   * Parse address string into components
   * @param {string} addressString - Full address string
   * @returns {Object|null} Parsed address object
   */
  parseAddress(addressString) {
    if (!addressString || typeof addressString !== 'string') {
      return null;
    }

    // Simple address parsing: "Street, City, State Zip"
    const parts = addressString.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      return null;
    }

    const streetAddress = parts[0];
    const addressLocality = parts[1];
    
    // Try to parse state and zip from last part
    let addressRegion = '';
    let postalCode = '';
    
    if (parts[2]) {
      const lastPart = parts[2].trim();
      const match = lastPart.match(/^([A-Z]{2})\s*(\d{5})?$/);
      if (match) {
        addressRegion = match[1];
        postalCode = match[2] || '';
      } else {
        addressRegion = lastPart;
      }
    }

    return {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality,
      addressRegion,
      postalCode,
      addressCountry: 'US'
    };
  }

  /**
   * Suggest alt tags for images based on filename
   * @param {Array} images - Array of image objects
   * @returns {Array} Suggestions for missing alt tags
   */
  suggestAltTags(images) {
    return images
      .filter(img => !img.alt || img.alt.trim() === '')
      .map(img => {
        const filename = img.src.split('/').pop().split('.')[0];
        // Keep lowercase and convert hyphens/underscores to spaces
        const suggestedAlt = filename.split(/[-_]/).join(' ');
        
        return {
          src: img.src,
          suggestedAlt
        };
      });
  }

  /**
   * Validate meta tags
   * @param {Object} metaTags - Meta tags object
   * @returns {Object} Validation result
   */
  validateMetaTags(metaTags) {
    const errors = [];
    const warnings = [];

    // Title validation
    if (!metaTags.title) {
      errors.push('Title is required');
    } else if (metaTags.title.length > 60) {
      errors.push('Title is too long');
    } else if (metaTags.title.length < 10) {
      warnings.push('Title is too short');
    }

    // Description validation
    if (!metaTags.description) {
      errors.push('Description is required');
    } else if (metaTags.description.length > 160) {
      warnings.push('Description is too long');
    } else if (metaTags.description.length < 50) {
      warnings.push('Description is too short');
    }

    // Keywords validation
    if (!metaTags.keywords || metaTags.keywords.trim() === '') {
      warnings.push('Keywords are missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Private helper methods

  _applyPublicPlace(schema, data) {
    const contact = data?.contact && typeof data.contact === 'object' ? data.contact : {};
    if (contact.addressDisplay === 'area') {
      const label = String(contact.serviceAreaLabel || '').trim();
      const miles = Number(contact.serviceRadiusMiles);
      const geo = contact.publicGeo;
      if (label) {
        schema.address = {
          '@type': 'PostalAddress',
          addressLocality: label,
        };
      }
      if (geo && Number.isFinite(Number(geo.lat)) && Number.isFinite(Number(geo.lng)) && Number.isFinite(miles) && miles > 0) {
        schema.areaServed = {
          '@type': 'GeoCircle',
          geoMidpoint: {
            '@type': 'GeoCoordinates',
            latitude: Number(geo.lat),
            longitude: Number(geo.lng),
          },
          geoRadius: String(Math.round(miles * 1609.344)),
        };
      }
      return;
    }
    if (data.businessAddress) {
      schema.address = this.parseAddress(data.businessAddress);
    }
  }

  _generateRestaurantSchema(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: data.businessName,
      description: data.businessDescription
    };

    this._applyPublicPlace(schema, data);

    if (data.businessPhone) {
      schema.telephone = data.businessPhone;
    }

    if (data.businessEmail) {
      schema.email = data.businessEmail;
    }

    if (data.averageRating && data.reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: data.averageRating,
        reviewCount: data.reviewCount
      };
    }

    return schema;
  }

  _generateLocalBusinessSchema(data, businessType) {
    const typeMap = {
      'salon': 'BeautySalon',
      'gym': 'HealthClub',
      'plumbing': 'Plumber',
      'electrician': 'Electrician',
      'auto-repair': 'AutoRepair',
      'tech-repair': 'ComputerRepair',
      'cleaning': 'HousePainter', // Closest match
      'pet-care': 'VeterinaryCare'
    };

    const schema = {
      '@context': 'https://schema.org',
      '@type': typeMap[businessType] || 'LocalBusiness',
      name: data.businessName,
      description: data.businessDescription
    };

    this._applyPublicPlace(schema, data);

    if (data.businessPhone) {
      schema.telephone = data.businessPhone;
    }

    if (data.businessEmail) {
      schema.email = data.businessEmail;
    }

    if (data.averageRating && data.reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: data.averageRating,
        reviewCount: data.reviewCount
      };
    }

    return schema;
  }

  _generateProfessionalServiceSchema(data) {
    return {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: data.businessName,
      description: data.businessDescription,
      telephone: data.businessPhone,
      email: data.businessEmail
    };
  }

  _generateProductSchema(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.name,
      description: data.description
    };

    if (data.image) {
      schema.image = data.image;
    }

    if (data.price !== undefined) {
      schema.offers = {
        '@type': 'Offer',
        price: data.price,
        priceCurrency: data.currency || 'USD'
      };
    }

    return schema;
  }

  _generateServiceSchema(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: data.serviceName,
      description: data.serviceDescription
    };

    if (data.businessName) {
      schema.provider = {
        '@type': 'Organization',
        name: data.businessName
      };
    }

    return schema;
  }

  _generateKeywords(businessName, category, description) {
    const keywords = new Set();

    // Add business name words
    if (businessName) {
      businessName.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    }

    // Add category keywords
    const categoryKeywords = this._getCategoryKeywords(category);
    categoryKeywords.forEach(kw => keywords.add(kw));

    // Extract key words from description
    if (description) {
      const words = description.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      words.slice(0, 5).forEach(word => keywords.add(word));
    }

    return Array.from(keywords).join(', ');
  }

  _getCategoryKeywords(category) {
    const keywordMap = {
      'restaurant': ['restaurant', 'food', 'dining', 'menu', 'cuisine'],
      'salon': ['salon', 'beauty', 'hair', 'styling', 'spa'],
      'gym': ['gym', 'fitness', 'workout', 'training', 'exercise'],
      'consultant': ['consultant', 'consulting', 'business', 'advisory', 'expert'],
      'freelancer': ['freelancer', 'professional', 'services', 'expertise'],
      'cleaning': ['cleaning', 'maid', 'housekeeping', 'janitorial'],
      'pet-care': ['pet care', 'veterinary', 'grooming', 'pets', 'animals'],
      'tech-repair': ['repair', 'technology', 'computer', 'electronics', 'tech support'],
      'electrician': ['electrician', 'electrical', 'wiring', 'electrical services'],
      'auto-repair': ['auto repair', 'mechanic', 'car service', 'automotive'],
      'plumbing': ['plumber', 'plumbing', 'pipes', 'drainage', 'plumbing services'],
      'product-showcase': ['products', 'shop', 'store', 'buy', 'shopping']
    };

    return keywordMap[category] || ['business', 'services', 'professional'];
  }

  _getCategoryText(category) {
    const textMap = {
      'restaurant': 'Quality dining and delicious food.',
      'salon': 'Professional beauty and hair services.',
      'gym': 'Fitness training and wellness programs.',
      'consultant': 'Expert business consulting services.',
      'freelancer': 'Professional freelance services.',
      'cleaning': 'Professional cleaning services.',
      'pet-care': 'Quality pet care services.',
      'tech-repair': 'Expert technology repair services.',
      'electrician': 'Professional electrical services.',
      'auto-repair': 'Reliable auto repair services.',
      'plumbing': 'Professional plumbing services.',
      'product-showcase': 'Browse our quality products.'
    };

    return textMap[category] || 'Professional business services.';
  }
}

export default SEOService;

