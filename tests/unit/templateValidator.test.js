/**
 * Template Validation Tests - TDD
 * Ensuring all Starter templates are structurally sound
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateTemplate, TEMPLATE_SCHEMA } from '../../server/utils/templateValidator.js';

describe('Template Validator - TDD RED Phase', () => {
  describe('Required Fields Validation', () => {
    it('should validate template with all required fields', () => {
      const validTemplate = {
        brand: {
          name: "Test Business",
          tagline: "Test Tagline"
        },
        themeVars: {
          "color-primary": "#3b82f6"
        },
        nav: [
          { label: "Home", href: "#top" }
        ],
        hero: {
          title: "Test Title",
          subtitle: "Test Subtitle",
          cta: [{ label: "Contact", href: "#contact" }]
        },
        contact: {
          title: "Contact Us",
          email: "test@example.com"
        },
        settings: {
          allowCheckout: false
        }
      };

      const result = validateTemplate(validTemplate);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail if brand is missing', () => {
      const invalid = {
        themeVars: {},
        nav: [],
        hero: {},
        contact: {},
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: brand');
    });

    it('should fail if hero is missing', () => {
      const invalid = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        contact: {},
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: hero');
    });

    it('should fail if contact is missing', () => {
      const invalid = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: contact');
    });

    it('should fail if settings is missing', () => {
      const invalid = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" }
      };

      const result = validateTemplate(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: settings');
    });
  });

  describe('Starter Template Specific Validation', () => {
    it('should require allowCheckout to be false for Starter templates', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: {
          allowCheckout: true  // ❌ Should be false for Starter
        }
      };

      const result = validateTemplate(template, 'Starter');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Starter templates must have allowCheckout: false');
    });

    it('should allow allowCheckout true for Pro templates', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: {
          allowCheckout: true  // ✅ OK for Pro
        }
      };

      const result = validateTemplate(template, 'Pro');
      
      expect(result.valid).toBe(true);
    });

    it('should require productCta for Starter templates with products', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        products: [{ name: "Product", price: 100 }],
        contact: { email: "test@test.com" },
        settings: {
          allowCheckout: false
          // ❌ Missing productCta
        }
      };

      const result = validateTemplate(template, 'Starter');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Starter templates with products must have productCta');
    });
  });

  describe('Navigation Validation', () => {
    it('should validate navigation structure', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [
          { label: "Home", href: "#top" },
          { label: "Services", href: "#services" }
        ],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it('should fail if nav items missing label', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [
          { href: "#top" }  // ❌ Missing label
        ],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nav item missing label at index 0');
    });

    it('should fail if nav items missing href', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [
          { label: "Home" }  // ❌ Missing href
        ],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nav item missing href at index 0');
    });
  });

  describe('Image URL Validation', () => {
    it('should allow valid image URLs', () => {
      const template = {
        brand: {
          name: "Test",
          logo: "https://images.unsplash.com/photo-123?w=200"
        },
        themeVars: {},
        nav: [],
        hero: {
          title: "Test",
          image: "https://via.placeholder.com/600x400"
        },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it('should fail on invalid local image paths', () => {
      const template = {
        brand: {
          name: "Test",
          logo: "assets/logo.svg"  // ❌ Local path
        },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('brand.logo must be a valid URL or empty string');
    });

    it('should allow empty logo (user will upload)', () => {
      const template = {
        brand: {
          name: "Test",
          logo: ""  // ✅ Empty is OK
        },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Services vs Products Structure', () => {
    it('should allow services.items structure', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        services: {
          title: "Services",
          items: [
            { title: "Service 1", description: "Description" }
          ]
        },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it('should allow products array structure', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        products: [
          { name: "Product 1", price: 100, description: "Description" }
        ],
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false, productCta: "Contact" }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it('should document both as valid', () => {
      // Both structures should be documented as valid patterns
      expect(TEMPLATE_SCHEMA.notes).toContain('Both services.items and products[] are valid');
    });
  });

  describe('Email Validation', () => {
    it('should validate contact email format', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: {
          email: "test@example.com"  // ✅ Valid
        },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it('should fail on invalid email', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: {
          email: "not-an-email"  // ❌ Invalid
        },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('contact.email must be a valid email address');
    });
  });

  describe('Color Theme Validation', () => {
    it('should validate hex color format', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {
          "color-primary": "#3b82f6",  // ✅ Valid hex
          "color-accent": "#10b981"
        },
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it('should fail on invalid color format', () => {
      const template = {
        brand: { name: "Test" },
        themeVars: {
          "color-primary": "blue"  // ❌ Invalid, should be hex
        },
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('themeVars.color-primary must be a valid hex color');
    });
  });

  describe('Optional Sections', () => {
    it('should allow templates without optional sections', () => {
      const minimalTemplate = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
        // No testimonials, about, faq, etc. - all optional
      };

      const result = validateTemplate(minimalTemplate);
      
      expect(result.valid).toBe(true);
    });

    it('should validate optional sections when present', () => {
      const enhancedTemplate = {
        brand: { name: "Test" },
        themeVars: {},
        nav: [],
        hero: { title: "Test" },
        testimonials: {
          title: "Testimonials",
          items: [
            { text: "Great service!", author: "John", rating: 5 }
          ]
        },
        faq: {
          title: "FAQ",
          items: [
            { question: "Question?", answer: "Answer" }
          ]
        },
        contact: { email: "test@test.com" },
        settings: { allowCheckout: false }
      };

      const result = validateTemplate(enhancedTemplate);
      
      expect(result.valid).toBe(true);
    });
  });
});

