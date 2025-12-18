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
  
  // Reserved subdomains
  const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store', 'help', 'support', 'status'];
  if (reserved.includes(trimmed)) {
    return { valid: false, error: 'This subdomain is reserved' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Template ID validation
 */
export function validateTemplateId(templateId) {
  if (!templateId || typeof templateId !== 'string') {
    return { valid: false, error: 'Template ID is required' };
  }
  
  const trimmed = templateId.trim().toLowerCase();
  
  // Alphanumeric with hyphens, 1-100 characters
  const templateRegex = /^[a-z0-9-]{1,100}$/;
  
  if (!templateRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid template ID format' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Plan validation
 */
export function validatePlan(plan) {
  if (!plan || typeof plan !== 'string') {
    return { valid: false, error: 'Plan is required' };
  }
  
  const validPlans = ['free', 'starter', 'pro', 'premium', 'business'];
  const normalized = plan.trim().toLowerCase();
  
  if (!validPlans.includes(normalized)) {
    return { valid: false, error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` };
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
  return str.trim().substring(0, maxLength);
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
  validateTemplateId,
  validatePlan,
  sanitizeString,
  sanitizeBusinessData,
  generateSecureId,
  generateSecurePassword,
  validateRequired
};





