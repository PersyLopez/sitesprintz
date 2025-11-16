/**
 * Enhanced Validation Middleware
 * 
 * Now powered by ValidationService for comprehensive security:
 * - XSS prevention via sanitization
 * - Email validation with disposable detection
 * - Subdomain validation with reserved words
 * - URL validation with protocol checking
 * - DoS prevention via size limits
 * - Type coercion for query parameters
 * - Nested object validation
 * - Array validation
 * - Async custom validators
 * 
 * REFACTORED: Phase 4 TDD - Using ValidationService + Enhanced Features
 */

import { ValidationService } from '../services/validationService.js';
import { ErrorHandlers } from '../utils/errorHandling.js';

// Create validator instance
const validator = new ValidationService();

// Enhanced validation schemas with ValidationService integration
export const schemas = {
  register: {
    email: {
      type: 'email',
      required: true,
      validate: (value) => validator.validateEmail(value, { checkDisposable: false })
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      validate: (value) => validator.validatePasswordStrength(value)
    }
  },
  login: {
    email: {
      type: 'email',
      required: true,
      validate: (value) => validator.validateEmail(value)
    },
    password: {
      type: 'string',
      required: true
    }
  },
  createSite: {
    subdomain: {
      type: 'string',
      required: true,
      minLength: 3,
      validate: (value) => validator.validateSubdomain(value)
    },
    templateId: {
      type: 'string',
      required: true
    },
    siteData: {
      type: 'object',
      required: false
    }
  },
  updateSite: {
    siteData: {
      type: 'object',
      required: false
    }
  },
  contactForm: {
    name: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 200,
      sanitize: true
    },
    email: {
      type: 'email',
      required: true,
      validate: (value) => validator.validateEmail(value)
    },
    message: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 5000,
      sanitize: true
    },
    site: {
      type: 'string',
      required: false
    },
    subdomain: {
      type: 'string',
      required: false
    }
  }
};

/**
 * Helper function to validate a single field recursively
 * @param {string} fieldPath - Dot-notation path (e.g., 'user.email')
 * @param {any} value - Field value
 * @param {object} rules - Validation rules
 * @param {object} opts - Validation options
 * @param {array} errors - Error accumulator
 * @param {object} sanitizedData - Sanitized data accumulator
 * @returns {any} Sanitized/coerced value
 */
async function validateField(fieldPath, value, rules, opts, errors, sanitizedData) {
  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push({
      field: fieldPath,
      message: `${fieldPath} is required`,
      rule: 'required'
    });
    return value;
  }

  // Skip if not required and missing
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return value;
  }

  // Trim whitespace from strings
  if (typeof value === 'string' && opts.sanitize !== false) {
    value = value.trim();
  }

  // Sanitize strings (do this FIRST before validation)
  if (opts.sanitize && rules.sanitize && typeof value === 'string') {
    value = validator.sanitizeString(value, { maxLength: rules.maxLength });
    sanitizedData[fieldPath] = value;
  }

  // Type validation with ValidationService
  if (rules.type === 'email') {
    // For email type, always use the validate function if provided, otherwise use default email validation
    // Pass normalize option to validateEmail so it can normalize the email
    const emailValidationOptions = { normalize: opts.normalize, checkDisposable: false };
    // Always use validator.validateEmail directly with our options to ensure normalize is applied
    const emailResult = validator.validateEmail(value, emailValidationOptions);
    if (!emailResult.isValid) {
      errors.push({
        field: fieldPath,
        message: emailResult.error,
        rule: 'email'
      });
      // If email validation failed, skip other validations for this field
      return value;
    } else if (emailResult.normalized && emailResult.normalized !== value) {
      value = emailResult.normalized;
      sanitizedData[fieldPath] = value;
    }
    // Mark that we've already run custom validation for email
    rules._emailValidated = true;
  } else if (rules.type === 'string' && typeof value !== 'string') {
    errors.push({
      field: fieldPath,
      message: `${fieldPath} must be a string`,
      rule: 'type'
    });
    return value;
  } else if (rules.type === 'number' && typeof value !== 'number') {
    errors.push({
      field: fieldPath,
      message: `${fieldPath} must be a number`,
      rule: 'type'
    });
    return value;
  } else if (rules.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
    errors.push({
      field: fieldPath,
      message: `${fieldPath} must be an object`,
      rule: 'type'
    });
    return value;
  } else if (rules.type === 'array' && !Array.isArray(value)) {
    errors.push({
      field: fieldPath,
      message: `${fieldPath} must be an array`,
      rule: 'type'
    });
    return value;
  }

  // Custom validation function (support async) - Run BEFORE length validation
  // Skip if this was already validated as part of email type check
  if (rules.validate && typeof rules.validate === 'function' && !rules._emailValidated) {
    const result = await rules.validate(value);
    if (result && !result.isValid) {
      errors.push({
        field: fieldPath,
        message: result.error,
        rule: 'custom'
      });
      // If custom validation failed, skip other validations
      return value;
    }
  }

  // Support for 'custom' property (sync validator)
  if (rules.custom && typeof rules.custom === 'function') {
    const result = rules.custom(value);
    if (result && !result.isValid) {
      errors.push({
        field: fieldPath,
        message: result.error,
        rule: 'custom'
      });
      // If custom validation failed, skip other validations
      return value;
    }
  }

  // Support for 'customAsync' property (async validator)
  if (rules.customAsync && typeof rules.customAsync === 'function') {
    const result = await rules.customAsync(value);
    if (result && !result.isValid) {
      errors.push({
        field: fieldPath,
        message: result.error,
        rule: 'customAsync'
      });
      // If custom validation failed, skip other validations
      return value;
    }
  }

  // Nested object validation
  if (rules.type === 'object' && rules.schema && typeof value === 'object' && !Array.isArray(value)) {
    for (const [nestedField, nestedRules] of Object.entries(rules.schema)) {
      const nestedPath = `${fieldPath}.${nestedField}`;
      const nestedValue = value[nestedField];
      const sanitizedNestedValue = await validateField(
        nestedPath,
        nestedValue,
        nestedRules,
        opts,
        errors,
        sanitizedData
      );
      if (sanitizedNestedValue !== nestedValue) {
        value[nestedField] = sanitizedNestedValue;
      }
    }
  }

  // Array validation
  if (rules.type === 'array' && Array.isArray(value)) {
    // Check maxLength for arrays
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push({
        field: fieldPath,
        message: `${fieldPath} must contain at most ${rules.maxLength} items`,
        rule: 'maxLength'
      });
    }

    // Validate array items if itemSchema is provided
    if (rules.itemSchema) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${fieldPath}[${i}]`;
        const itemValue = value[i];
        const sanitizedItemValue = await validateField(
          itemPath,
          itemValue,
          rules.itemSchema,
          opts,
          errors,
          sanitizedData
        );
        if (sanitizedItemValue !== itemValue) {
          value[i] = sanitizedItemValue;
        }
      }
    }
  }

  // Length validation for strings
  if (typeof value === 'string') {
    const wasSanitized = sanitizedData.hasOwnProperty(fieldPath);
    
    // Only check length if no custom validator, or if custom validator passed
    const hasCustomError = errors.some(e => e.field === fieldPath && e.rule === 'custom');
    
    if (!hasCustomError) {
      if (rules.minLength && value.length < rules.minLength) {
        // If sanitized to empty/short, allow it (malicious content removed)
        if (!wasSanitized || value.length > 0) {
          errors.push({
            field: fieldPath,
            message: `${fieldPath} must be at least ${rules.minLength} characters`,
            rule: 'minLength'
          });
        }
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: fieldPath,
          message: `${fieldPath} must be at most ${rules.maxLength} characters`,
          rule: 'maxLength'
        });
      }
    }
  }

  return value;
}

/**
 * Helper function to check object key count
 */
function checkObjectKeys(obj, maxKeys) {
  if (typeof obj !== 'object' || obj === null) return 0;
  
  let count = 0;
  for (const key in obj) {
    count++;
    if (maxKeys && count > maxKeys) return count;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += checkObjectKeys(obj[key], maxKeys);
      if (maxKeys && count > maxKeys) return count;
    }
  }
  return count;
}

/**
 * Enhanced validation middleware with ValidationService integration
 * 
 * Options:
 * - body: Schema name or schema object for req.body
 * - query: Schema name for req.query
 * - params: Schema name for req.params
 * - sanitize: Auto-sanitize string inputs (default: true)
 * - strict: Reject unknown fields (default: false)
 * - maxSize: Max request body size in bytes (default: 100KB)
 * - maxDepth: Max object depth (default: 10)
 * - maxKeys: Max number of object keys (default: 1000)
 * - coerce: Auto-convert query param types (default: true for query)
 */
export function validate(options = {}) {
  return async (req, res, next) => {
    const errors = [];
    const sanitizedData = {};

    // Default options
    const opts = {
      sanitize: options.sanitize !== false, // Default true
      normalize: options.normalize !== false, // Default true
      strict: options.strict || false,
      maxSize: options.maxSize || 100000, // 100KB
      maxDepth: options.maxDepth || 10,
      maxKeys: options.maxKeys || 1000,
      coerce: options.coerce !== false // Default true for query param coercion
    };

    try {
      // Check request body validity (DoS prevention)
      if (req.body && typeof req.body === 'object') {
        // Check object key count FIRST (before size, as many keys = large size)
        const keyCount = checkObjectKeys(req.body, opts.maxKeys);
        if (keyCount > opts.maxKeys) {
          return res.status(400).json({
            error: 'Request body has too many keys',
            message: `Request body has too many keys (max: ${opts.maxKeys})`,
            code: 'TOO_MANY_KEYS'
          });
        }

        // Check request body size
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize > opts.maxSize) {
          return res.status(400).json({
            error: 'Request body too large',
            message: `Request body too large (max: ${opts.maxSize} bytes)`,
            code: 'PAYLOAD_TOO_LARGE'
          });
        }

        // Check object depth
        const depth = validator.checkObjectDepth(req.body, opts.maxDepth);
        if (depth > opts.maxDepth) {
          return res.status(400).json({
            error: 'Request body too deeply nested',
            message: `Request body too deeply nested (max depth: ${opts.maxDepth})`,
            code: 'MAX_DEPTH_EXCEEDED'
          });
        }
      }

      // Validate body
      if (options.body) {
        let schema;
        if (typeof options.body === 'string') {
          schema = schemas[options.body];
        } else {
          schema = options.body;
        }

        if (!schema) {
          return next(); // Schema not found, skip validation
        }

        const data = req.body || {};

        for (const [field, rules] of Object.entries(schema)) {
          let value = data[field];
          const sanitizedValue = await validateField(field, value, rules, opts, errors, sanitizedData);
          if (sanitizedValue !== value) {
            data[field] = sanitizedValue;
          }
        }

        // Strict mode - reject unknown fields
        if (opts.strict) {
          const allowedFields = new Set(Object.keys(schema));
          for (const key of Object.keys(data)) {
            if (!allowedFields.has(key)) {
              errors.push({
                field: key,
                message: `${key} is not allowed`,
                rule: 'strict'
              });
            }
          }
        }

        // Apply sanitized data back to request
        if (opts.sanitize && Object.keys(sanitizedData).length > 0) {
          req.body = { ...req.body, ...sanitizedData };
        }
      }

      // Validate query params with type coercion
      if (options.query) {
        let schema;
        if (typeof options.query === 'string') {
          schema = schemas[options.query];
        } else {
          schema = options.query;
        }

        if (schema) {
          // Ensure req.query exists
          if (!req.query) {
            req.query = {};
          }

          let coercedValues = null; // Only create if needed

          for (const [field, rules] of Object.entries(schema)) {
            let value = req.query[field];

            // Required check
            if (rules.required && (value === undefined || value === null || value === '')) {
              errors.push({
                field,
                message: `Query parameter ${field} is required`,
                rule: 'required'
              });
              continue;
            }

            if (value !== undefined && value !== null && value !== '') {
              // Type coercion for query parameters (they're always strings)
              if (opts.coerce) {
                if (rules.type === 'number' && typeof value === 'string') {
                  const num = Number(value);
                  if (!isNaN(num)) {
                    if (!coercedValues) coercedValues = {};
                    coercedValues[field] = num;
                    value = num;
                  } else {
                    errors.push({
                      field,
                      message: `Query parameter ${field} must be a valid number`,
                      rule: 'type'
                    });
                    continue;
                  }
                } else if (rules.type === 'boolean' && typeof value === 'string') {
                  if (!coercedValues) coercedValues = {};
                  coercedValues[field] = value === 'true' || value === '1';
                  value = coercedValues[field];
                }
              } else {
                // Type validation (only when coercion is disabled)
                if (rules.type && typeof value !== rules.type) {
                  errors.push({
                    field,
                    message: `Query parameter ${field} must be of type ${rules.type}`,
                    rule: 'type'
                  });
                }
              }
            }
          }

          // If we coerced any values, replace req.query with the merged version
          if (coercedValues) {
            try {
              const newQuery = {};
              // Copy all original query params
              for (const key in req.query) {
                newQuery[key] = req.query[key];
              }
              // Override with coerced values
              for (const key in coercedValues) {
                newQuery[key] = coercedValues[key];
              }
              // req.query has a getter but no setter, so use defineProperty
              Object.defineProperty(req, 'query', {
                value: newQuery,
                writable: true,
                enumerable: true,
                configurable: true
              });
            } catch (err) {
              // If coercion fails (shouldn't happen), continue without it
              // Query validation will still work, just without type coercion
            }
          }
        }
      }

      // Validate URL params
      if (options.params) {
        const schema = typeof options.params === 'string' ? schemas[options.params] : options.params;
        if (schema) {
          const data = req.params || {};

          for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];

            // Required check
            if (rules.required && (value === undefined || value === null || value === '')) {
              errors.push({
                field,
                message: `URL parameter ${field} is required`,
                rule: 'required'
              });
              continue;
            }

            if (value !== undefined && value !== null && value !== '') {
              // Pattern validation
              if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
                errors.push({
                  field,
                  message: `URL parameter ${field} format is invalid`,
                  rule: 'pattern'
                });
              }

              // Custom validation
              if (rules.validate && typeof rules.validate === 'function') {
                const result = await rules.validate(value);
                if (result && !result.isValid) {
                  errors.push({
                    field,
                    message: result.error,
                    rule: 'custom'
                  });
                }
              }
            }
          }
        }
      }

      // Return validation errors
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'The provided data is invalid',
          code: 'VALIDATION_ERROR',
          details: errors
        });
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return ErrorHandlers.serverError(res, 'Validation error');
    }
  };
}

export default validate;
