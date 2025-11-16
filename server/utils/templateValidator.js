/**
 * Template Validator - TDD GREEN Phase
 * Validates template JSON structure for Starter and Pro templates
 */

// Template Schema Documentation
export const TEMPLATE_SCHEMA = {
  required: ['brand', 'hero', 'contact', 'settings'],
  optional: ['themeVars', 'nav', 'services', 'products', 'testimonials', 'about', 'faq', 'stats', 'gallery', 'booking', 'footer', 'pages'],
  notes: [
    'Both services.items and products[] are valid',
    'Starter templates must have allowCheckout: false',
    'Images should be URLs or empty strings',
    'Colors should be hex format (#RRGGBB)',
    'Emails should be valid format'
  ]
};

/**
 * Validate a template object
 * @param {Object} template - Template JSON to validate
 * @param {string} tier - Template tier ('Starter', 'Pro', 'Premium')
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTemplate(template, tier = 'Starter') {
  const errors = [];

  if (!template || typeof template !== 'object') {
    return { valid: false, errors: ['Template must be an object'] };
  }

  // Check required fields
  const requiredFields = ['brand', 'hero', 'contact', 'settings'];
  for (const field of requiredFields) {
    if (!template[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // If missing required fields, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate brand
  if (template.brand) {
    if (!template.brand.name || typeof template.brand.name !== 'string') {
      errors.push('brand.name is required and must be a string');
    }

    if (template.brand.logo !== undefined && template.brand.logo !== '') {
      if (!isValidUrl(template.brand.logo)) {
        errors.push('brand.logo must be a valid URL or empty string');
      }
    }
  }

  // Validate hero
  if (template.hero) {
    if (!template.hero.title) {
      errors.push('hero.title is required');
    }

    if (template.hero.image && template.hero.image !== '' && !isValidUrl(template.hero.image)) {
      errors.push('hero.image must be a valid URL or empty string');
    }
  }

  // Validate navigation
  if (template.nav && Array.isArray(template.nav)) {
    template.nav.forEach((item, index) => {
      if (!item.label) {
        errors.push(`Nav item missing label at index ${index}`);
      }
      if (!item.href) {
        errors.push(`Nav item missing href at index ${index}`);
      }
    });
  }

  // Validate contact
  if (template.contact) {
    if (template.contact.email && !isValidEmail(template.contact.email)) {
      errors.push('contact.email must be a valid email address');
    }
  }

  // Validate settings
  if (template.settings) {
    // Starter templates must have allowCheckout: false
    if (tier === 'Starter' && template.settings.allowCheckout === true) {
      errors.push('Starter templates must have allowCheckout: false');
    }

    // Starter templates with products must have productCta
    if (tier === 'Starter' && template.products && !template.settings.productCta) {
      errors.push('Starter templates with products must have productCta');
    }
  }

  // Validate theme colors
  if (template.themeVars) {
    for (const [key, value] of Object.entries(template.themeVars)) {
      if (value && typeof value === 'string' && !isValidHexColor(value)) {
        errors.push(`themeVars.${key} must be a valid hex color`);
      }
    }
  }

  // Validate services structure (if present)
  if (template.services) {
    if (!template.services.items || !Array.isArray(template.services.items)) {
      errors.push('services must have an items array');
    } else {
      template.services.items.forEach((item, index) => {
        if (!item.title) {
          errors.push(`services.items[${index}] missing title`);
        }
      });
    }
  }

  // Validate products structure (if present)
  if (template.products) {
    if (!Array.isArray(template.products)) {
      errors.push('products must be an array');
    } else {
      template.products.forEach((item, index) => {
        if (!item.name) {
          errors.push(`products[${index}] missing name`);
        }
        if (item.price !== undefined && typeof item.price !== 'number') {
          errors.push(`products[${index}].price must be a number`);
        }
      });
    }
  }

  // Validate testimonials (if present)
  if (template.testimonials && template.testimonials.items) {
    if (!Array.isArray(template.testimonials.items)) {
      errors.push('testimonials.items must be an array');
    } else {
      template.testimonials.items.forEach((item, index) => {
        if (!item.text) {
          errors.push(`testimonials.items[${index}] missing text`);
        }
        if (!item.author) {
          errors.push(`testimonials.items[${index}] missing author`);
        }
        if (item.rating && (item.rating < 1 || item.rating > 5)) {
          errors.push(`testimonials.items[${index}].rating must be 1-5`);
        }
      });
    }
  }

  // Validate FAQ (if present)
  if (template.faq && template.faq.items) {
    if (!Array.isArray(template.faq.items)) {
      errors.push('faq.items must be an array');
    } else {
      template.faq.items.forEach((item, index) => {
        if (!item.question) {
          errors.push(`faq.items[${index}] missing question`);
        }
        if (!item.answer) {
          errors.push(`faq.items[${index}] missing answer`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if string is a valid URL
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if string is a valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is a valid hex color
 */
function isValidHexColor(color) {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Validate template file before saving
 * @param {Object} template - Template to validate
 * @param {string} tier - Template tier
 * @returns {Promise<Object>} Validation result
 */
export async function validateTemplateFile(template, tier = 'Starter') {
  const result = validateTemplate(template, tier);
  
  if (!result.valid) {
    console.error('Template validation failed:', result.errors);
  }
  
  return result;
}

/**
 * Get validation schema documentation
 */
export function getSchemaDocumentation() {
  return {
    ...TEMPLATE_SCHEMA,
    examples: {
      minimal: {
        brand: { name: "Business Name" },
        themeVars: { "color-primary": "#3b82f6" },
        nav: [{ label: "Home", href: "#top" }],
        hero: { title: "Welcome", subtitle: "Subtitle" },
        contact: { email: "test@example.com" },
        settings: { allowCheckout: false }
      },
      enhanced: {
        brand: { name: "Business Name", logo: "https://example.com/logo.png" },
        themeVars: { "color-primary": "#3b82f6", "color-accent": "#10b981" },
        nav: [
          { label: "Home", href: "#top" },
          { label: "Services", href: "#services" },
          { label: "Contact", href: "#contact" }
        ],
        hero: {
          title: "Welcome",
          subtitle: "Subtitle",
          image: "https://images.unsplash.com/photo-123",
          cta: [{ label: "Get Started", href: "#contact" }]
        },
        services: {
          title: "Our Services",
          items: [
            { title: "Service 1", description: "Description" }
          ]
        },
        testimonials: {
          title: "What Clients Say",
          items: [
            { text: "Great!", author: "John Doe", rating: 5 }
          ]
        },
        contact: {
          title: "Contact Us",
          email: "test@example.com",
          phone: "(555) 123-4567"
        },
        settings: {
          allowCheckout: false,
          productCta: "Contact Us",
          productCtaHref: "tel:+15551234567"
        }
      }
    }
  };
}

export default {
  validateTemplate,
  validateTemplateFile,
  getSchemaDocumentation,
  TEMPLATE_SCHEMA
};
