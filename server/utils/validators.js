/**
 * Common Validation Utilities
 * 
 * Provides consistent validation across all API endpoints.
 * All validators return { valid: boolean, error?: string }
 */

import crypto from 'crypto';

/**
 * Email validation
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (trimmed.length > 255) {
    return { valid: false, error: 'Email is too long' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Phone validation (flexible international format)
 */
export function validatePhone(phone) {
  if (!phone) {
    return { valid: true, value: null }; // Phone is often optional
  }
  
  if (typeof phone !== 'string') {
    return { valid: false, error: 'Phone must be a string' };
  }
  
  const trimmed = phone.trim();
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,20}$/;
  
  if (!phoneRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * UUID validation
 */
export function validateUUID(id, fieldName = 'ID') {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return { valid: false, error: `Invalid ${fieldName} format` };
  }
  
  return { valid: true, value: id };
}

/**
 * Subdomain validation
 */
export function validateSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== 'string') {
    return { valid: false, error: 'Subdomain is required' };
  }
  
  const trimmed = subdomain.trim().toLowerCase();
  
  // 3-63 characters, alphanumeric and hyphens, can't start/end with hyphen
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
  
  if (!subdomainRegex.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Subdomain must be 3-63 characters, alphanumeric and hyphens only, cannot start or end with hyphen' 
    };
  }
  
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) {
    return { valid: false, error: 'Invalid subdomain format' };
  }

  // Reserved subdomains (platform routes + isolation-sensitive names)
  const reserved = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
    'help', 'support', 'status', 'sites', 'drafts', 'preview', 'uploads',
    'static', 'assets', 'cdn', 'auth', 'login', 'register', 'dashboard',
    'setup', 'showcase', 'view', 'legal', 'pricing', 'account', 'templates',
    'data', 'users', 'health', 'metrics'
  ];
  if (reserved.includes(trimmed)) {
    return { valid: false, error: 'This subdomain is reserved' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Draft ID validation — must match generateSecureId('draft')
 * (draft-{base36-timestamp}-{16-hex}) and never contain path characters.
 */
export function validateDraftId(draftId) {
  if (!draftId || typeof draftId !== 'string') {
    return { valid: false, error: 'Draft ID is required' };
  }

  if (draftId.includes('..') || draftId.includes('/') || draftId.includes('\\') || draftId.includes('\0')) {
    return { valid: false, error: 'Invalid draft ID format' };
  }

  if (!/^draft-[a-z0-9]+-[a-f0-9]{16}$/i.test(draftId)) {
    return { valid: false, error: 'Invalid draft ID format' };
  }

  return { valid: true, value: draftId };
}

/**
 * Template ID validation
 */
export function validateTemplateId(templateId) {
  if (!templateId || typeof templateId !== 'string') {
    return { valid: false, error: 'Template ID is required' };
  }
  
  const trimmed = templateId.trim().toLowerCase();

  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) {
    return { valid: false, error: 'Invalid template ID format' };
  }
  
  // Alphanumeric with hyphens, 1-100 characters
  const templateRegex = /^[a-z0-9-]{1,100}$/;
  
  if (!templateRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid template ID format' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Plan validation — official: trial, starter, growth
 * Legacy names normalize to growth/trial.
 */
export function validatePlan(plan) {
  if (!plan || typeof plan !== 'string') {
    return { valid: false, error: 'Plan is required' };
  }

  const aliases = {
    free: 'trial',
    trial: 'trial',
    starter: 'starter',
    growth: 'growth',
    pro: 'growth',
    premium: 'growth',
    business: 'growth',
    enterprise: 'growth',
    checkout: 'growth'
  };

  const normalized = aliases[plan.trim().toLowerCase()];
  if (!normalized) {
    return {
      valid: false,
      error: 'Invalid plan. Must be one of: trial, starter, growth'
    };
  }

  return { valid: true, value: normalized };
}

/**
 * Sanitize string (trim and limit length)
 */
export function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  // Strip HTML tags + control chars for plain-text storage (XSS defense)
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize arbitrary custom form fields (whitelist size + strip HTML)
 */
export function sanitizeCustomFields(fields, { maxKeys = 20, maxValueLength = 500 } = {}) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return {};
  }

  const out = {};
  const keys = Object.keys(fields).filter((k) => !['__proto__', 'constructor', 'prototype'].includes(k));
  for (const key of keys.slice(0, maxKeys)) {
    const safeKey = sanitizeString(key, 50);
    if (!safeKey) continue;
    const value = fields[key];
    if (typeof value === 'string') {
      out[safeKey] = sanitizeString(value, maxValueLength);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[safeKey] = value;
    } else if (typeof value === 'boolean') {
      out[safeKey] = value;
    } else if (value == null) {
      out[safeKey] = null;
    } else {
      out[safeKey] = sanitizeString(JSON.stringify(value), maxValueLength);
    }
  }
  return out;
}

/**
 * Sanitize business data object
 */
export function sanitizeBusinessData(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  // String fields with max lengths
  const stringFields = {
    businessName: 200,
    heroTitle: 200,
    heroSubtitle: 500,
    address: 300,
    businessHours: 200,
    websiteUrl: 500,
    facebookUrl: 500,
    instagramUrl: 500,
    googleMapsUrl: 500
  };
  
  for (const [field, maxLength] of Object.entries(stringFields)) {
    if (data[field]) {
      sanitized[field] = sanitizeString(data[field], maxLength);
    }
  }
  
  // Email validation
  if (data.email) {
    const emailResult = validateEmail(data.email);
    if (emailResult.valid) {
      sanitized.email = emailResult.value;
    }
  }
  
  // Phone validation
  if (data.phone) {
    const phoneResult = validatePhone(data.phone);
    if (phoneResult.valid && phoneResult.value) {
      sanitized.phone = phoneResult.value;
    }
  }
  
  // Services array (if present)
  if (Array.isArray(data.services)) {
    sanitized.services = data.services
      .filter(s => s && typeof s === 'object')
      .slice(0, 50) // Max 50 services
      .map(s => ({
        name: sanitizeString(s.name, 100),
        description: sanitizeString(s.description, 500),
        price: typeof s.price === 'number' ? s.price : parseFloat(s.price) || 0,
        image: sanitizeString(s.image, 500)
      }));
  }

  // Preserve structured editor content (Starter/Growth features)
  const passThroughKeys = [
    'sections',
    'gallery',
    'faq',
    'team',
    'booking',
    'menu',
    'products',
    'testimonials',
    'contact',
    'brand',
    'colors',
    'theme',
    'hero',
    'features',
    'settings',
    'templateSpecific',
    'beforeAfter',
    'hours',
    'social'
  ];

  for (const key of passThroughKeys) {
    if (data[key] !== undefined) {
      // Deep-clone via JSON to drop prototypes; size-cap nested payload
      try {
        const raw = JSON.stringify(data[key]);
        if (raw && raw.length > 200_000) {
          continue; // drop oversized nested blobs
        }
        sanitized[key] = raw ? JSON.parse(raw) : data[key];
      } catch {
        // skip non-serializable values
      }
    }
  }

  return sanitized;
}

/**
 * Generate secure random ID
 */
export function generateSecureId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(randomBytes[i] % charset.length);
  }
  
  return password;
}

/**
 * Validate required fields in an object
 */
export function validateRequired(obj, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `Missing required fields: ${missing.join(', ')}`,
      missingFields: missing
    };
  }
  
  return { valid: true };
}

export default {
  validateEmail,
  validatePhone,
  validateUUID,
  validateSubdomain,
  validateDraftId,
  validateTemplateId,
  validatePlan,
  sanitizeString,
  sanitizeCustomFields,
  sanitizeBusinessData,
  generateSecureId,
  generateSecurePassword,
  validateRequired
};









