/**
 * Site Data HTML Sanitization Utility
 * 
 * Sanitizes HTML content in site data to prevent XSS attacks.
 * Uses sanitize-html library for robust HTML sanitization.
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Allowed HTML tags for site content (safe subset)
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'
];

/**
 * Allowed HTML attributes per tag
 */
const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
  'div': ['class', 'id'],
  'span': ['class', 'id'],
  'table': ['class', 'border', 'cellpadding', 'cellspacing'],
  'th': ['scope', 'colspan', 'rowspan'],
  'td': ['colspan', 'rowspan']
};

/**
 * Sanitize HTML content in a string
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTMLContent(html) {
  if (!html || typeof html !== 'string') {
    return html || '';
  }

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      'a': ['http', 'https', 'mailto', 'tel'],
      'img': ['http', 'https', 'data']
    },
    // Remove script tags and event handlers
    disallowedTagsMode: 'discard',
    // Remove dangerous attributes
    allowedStyles: {},
    // Preserve text content even if tags are removed
    textFilter: (text) => text,
    // Add rel="noopener noreferrer" to external links
    transformTags: {
      'a': (tagName, attribs) => {
        if (attribs.href && attribs.href.startsWith('http')) {
          attribs.rel = 'noopener noreferrer';
          attribs.target = attribs.target || '_blank';
        }
        return { tagName, attribs };
      }
    }
  });
}

/**
 * Recursively sanitize site data object
 * @param {any} data - Site data (object, array, or primitive)
 * @returns {any} Sanitized site data
 */
export function sanitizeSiteData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  // If it's a string, check if it contains HTML and sanitize
  if (typeof data === 'string') {
    // Only sanitize if it looks like HTML (contains tags)
    if (/<[^>]+>/.test(data)) {
      return sanitizeHTMLContent(data);
    }
    return data;
  }

  // If it's an array, sanitize each element
  if (Array.isArray(data)) {
    return data.map(item => sanitizeSiteData(item));
  }

  // If it's an object, sanitize each property
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip certain fields that shouldn't be sanitized (like IDs, timestamps, etc.)
      if (key === 'id' || key === '_id' || key === 'createdAt' || key === 'updatedAt' || 
          key === 'created_at' || key === 'updated_at' || key === 'published_at' ||
          key === 'expires_at' || key === 'draftId' || key === 'templateId' ||
          key === 'subdomain' || key === 'status' || key === 'plan' ||
          key === 'json_file_path' || key === 'user_id') {
        sanitized[key] = value;
      } else {
        // Recursively sanitize nested objects/arrays
        sanitized[key] = sanitizeSiteData(value);
      }
    }
    return sanitized;
  }

  // For primitives (numbers, booleans), return as-is
  return data;
}

/**
 * Sanitize site data before saving to database
 * This is the main function to use when saving site data
 * @param {object} siteData - Site data object
 * @returns {object} Sanitized site data ready for database storage
 */
export function sanitizeSiteDataForStorage(siteData) {
  if (!siteData || typeof siteData !== 'object') {
    return siteData;
  }

  // Create a deep copy to avoid mutating the original
  const copy = JSON.parse(JSON.stringify(siteData));
  
  // Recursively sanitize
  return sanitizeSiteData(copy);
}

export default {
  sanitizeHTMLContent,
  sanitizeSiteData,
  sanitizeSiteDataForStorage
};





