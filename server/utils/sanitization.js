/**
 * Sanitization Utilities
 * 
 * Functions for sanitizing user input to prevent XSS, injection attacks,
 * and ensure data integrity.
 */

import validator from 'validator';

/**
 * Sanitize a general string
 * @param {*} str - Input string (or anything that can be converted)
 * @param {number} maxLength - Maximum allowed length (default: 500)
 * @returns {string} Sanitized string
 */
export function sanitizeString(str, maxLength = 500) {
  // Handle null/undefined
  if (str === null || str === undefined) {
    return '';
  }
  
  // Convert non-strings to strings
  if (typeof str !== 'string') {
    return '';
  }
  
  // Trim whitespace
  str = str.trim();
  
  // Enforce max length
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  
  return str;
}

/**
 * Sanitize an email address
 * @param {string} email - Email address
 * @returns {string} Sanitized and normalized email
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  // Trim and lowercase
  email = email.trim().toLowerCase();
  
  // Normalize email (optional - can use validator.normalizeEmail)
  // For now, just basic normalization
  return email;
}

/**
 * Sanitize a subdomain
 * @param {string} subdomain - Subdomain string
 * @returns {string} Sanitized subdomain (lowercase, alphanumeric + hyphens only)
 */
export function sanitizeSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== 'string') {
    return '';
  }
  
  // Lowercase
  subdomain = subdomain.toLowerCase();
  
  // Remove all characters except alphanumeric and hyphens
  subdomain = subdomain.replace(/[^a-z0-9-]/g, '');
  
  // Remove leading/trailing hyphens
  subdomain = subdomain.replace(/^-+|-+$/g, '');
  
  return subdomain;
}

/**
 * Sanitize a phone number
 * @param {string} phone - Phone number
 * @returns {string} Sanitized phone (digits and + only)
 */
export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  // Remove all characters except digits and +
  phone = phone.replace(/[^0-9+]/g, '');
  
  // Ensure + is only at the beginning
  if (phone.includes('+')) {
    const firstPlus = phone.indexOf('+');
    phone = '+' + phone.replace(/\+/g, '');
    if (firstPlus !== 0) {
      phone = phone.substring(1); // Remove + if not at start
    }
  }
  
  return phone;
}

/**
 * Strip HTML tags from a string
 * @param {string} str - String with potential HTML
 * @returns {string} Plain text with HTML tags removed
 */
export function stripHTML(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  // Remove script tags and their content (for security)
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, (match) => {
    // Extract just the text content from script tags (not the script itself)
    return match.replace(/<\/?script[^>]*>/gi, '');
  });
  
  // Remove all other HTML tags but keep their content
  str = str.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  str = str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Remove extra whitespace
  str = str.replace(/\s+/g, ' ').trim();
  
  return str;
}

/**
 * Sanitize a filename
 * @param {string} filename - Filename to sanitize
 * @returns {string} Safe filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }
  
  // Replace spaces with underscores
  filename = filename.replace(/\s+/g, '_');
  
  // Replace path separators and .. with _ (this handles ../../../etc/passwd → .._.._.._etc_passwd)
  filename = filename.replace(/\.\.\//g, '.._');  // Replace ../ first
  filename = filename.replace(/\.\.\\/g, '.._');  // Replace ..\ on Windows
  filename = filename.replace(/[\/\\]/g, '_');   // Replace remaining / and \
  
  // Remove any other potentially dangerous characters
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (filename.length > 255) {
    const ext = filename.substring(filename.lastIndexOf('.'));
    const name = filename.substring(0, 255 - ext.length);
    filename = name + ext;
  }
  
  return filename;
}

/**
 * Sanitize HTML using validator library
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML (safe for display)
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Use validator to escape HTML
  return validator.escape(html);
}

/**
 * Sanitize a URL
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or empty string if invalid
 */
export function sanitizeURL(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  url = url.trim();
  
  // Check if it's a valid URL
  if (!validator.isURL(url, { require_protocol: false })) {
    return '';
  }
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
}

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizeSubdomain,
  sanitizePhone,
  stripHTML,
  sanitizeFilename,
  sanitizeHTML,
  sanitizeURL,
};

