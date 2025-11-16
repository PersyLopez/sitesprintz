/**
 * Starter Template Loading Tests
 * Verify all base Starter templates can be loaded and rendered
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../../public/data/templates');

describe('Starter Template Loading', () => {
  let allTemplates = [];
  
  beforeAll(() => {
    // Load all template files
    const files = readdirSync(TEMPLATES_DIR)
      .filter(f => f.endsWith('.json') && f !== 'index.json' && !f.includes('-premium'));
    
    allTemplates = files.map(file => {
      const content = readFileSync(join(TEMPLATES_DIR, file), 'utf8');
      return {
        filename: file,
        data: JSON.parse(content)
      };
    });
  });

  describe('All templates load successfully', () => {
    it('should load all Starter and Pro templates without errors', () => {
      expect(allTemplates.length).toBeGreaterThan(0);
      
      allTemplates.forEach(({ filename, data }) => {
        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
      });
    });

    it('should have valid JSON structure for all templates', () => {
      allTemplates.forEach(({ filename, data }) => {
        // All templates should have these required fields
        expect(data.brand, `${filename} missing brand`).toBeDefined();
        expect(data.hero, `${filename} missing hero`).toBeDefined();
        expect(data.contact, `${filename} missing contact`).toBeDefined();
        expect(data.settings, `${filename} missing settings`).toBeDefined();
      });
    });
  });

  describe('Base Starter Templates', () => {
    const BASE_TEMPLATES = [
      'starter.json',
      'starter-basic.json',
      'starter-enhanced.json',
      'restaurant',
      'salon',
      'gym',
      'consultant',
      'freelancer',
      'cleaning',
      'pet-care',
      'tech-repair',
      'electrician',
      'auto-repair',
      'plumbing',
      'product-showcase'
    ];

    BASE_TEMPLATES.forEach(baseId => {
      it(`should have at least one template for ${baseId}`, () => {
        const found = allTemplates.some(({ filename }) => 
          filename.startsWith(baseId) || filename === baseId
        );
        expect(found, `No template found for ${baseId}`).toBe(true);
      });
    });
  });

  describe('Template Content Quality', () => {
    it('should have valid image URLs (no local assets/ paths)', () => {
      allTemplates.forEach(({ filename, data }) => {
        const jsonStr = JSON.stringify(data);
        expect(jsonStr, `${filename} has local assets/ path`).not.toContain('"assets/');
      });
    });

    it('should have valid email addresses in contact sections', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      allTemplates.forEach(({ filename, data }) => {
        if (data.contact?.email) {
          expect(
            emailRegex.test(data.contact.email),
            `${filename} has invalid email: ${data.contact.email}`
          ).toBe(true);
        }
      });
    });

    it('should have valid hex colors in themeVars', () => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      allTemplates.forEach(({ filename, data }) => {
        if (data.themeVars) {
          Object.entries(data.themeVars).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('#')) {
              expect(
                hexRegex.test(value),
                `${filename} has invalid color ${key}: ${value}`
              ).toBe(true);
            }
          });
        }
      });
    });

    it('should have navigation items with href', () => {
      allTemplates.forEach(({ filename, data }) => {
        if (data.nav && Array.isArray(data.nav)) {
          data.nav.forEach((item, index) => {
            expect(
              item.href,
              `${filename} nav[${index}] missing href`
            ).toBeDefined();
            expect(
              item.label,
              `${filename} nav[${index}] missing label`
            ).toBeDefined();
          });
        }
      });
    });
  });

  describe('Tier-Specific Requirements', () => {
    it('should have allowCheckout: false for all Starter templates', () => {
      const starterTemplates = allTemplates.filter(({ filename, data }) => 
        !filename.includes('-pro') && data.plan !== 'Pro'
      );

      starterTemplates.forEach(({ filename, data }) => {
        expect(
          data.settings.allowCheckout,
          `${filename} should have allowCheckout: false`
        ).toBe(false);
      });
    });

    it('should have productCta for Starter templates with products', () => {
      const starterWithProducts = allTemplates.filter(({ filename, data }) => 
        !filename.includes('-pro') && 
        data.plan !== 'Pro' && 
        (data.products || filename.includes('product'))
      );

      starterWithProducts.forEach(({ filename, data }) => {
        if (data.products) {
          expect(
            data.settings.productCta,
            `${filename} with products should have productCta`
          ).toBeDefined();
        }
      });
    });
  });

  describe('Layout Variations', () => {
    const EXPECTED_LAYOUTS = {
      'restaurant': ['casual', 'fine-dining', 'fast-casual'],
      'salon': ['luxury-spa', 'modern-studio', 'neighborhood'],
      'gym': ['boutique', 'strength', 'family'],
      'consultant': ['corporate', 'small-business', 'executive-coach'],
      'freelancer': ['designer', 'developer', 'writer'],
      'cleaning': ['residential', 'commercial', 'eco-friendly'],
      'pet-care': ['dog-grooming', 'full-service', 'mobile'],
      'tech-repair': ['phone-repair', 'computer', 'gaming'],
      'electrician': ['residential', 'commercial', 'smart-home'],
      'auto-repair': ['quick-service', 'full-service', 'performance'],
      'plumbing': ['emergency', 'renovation', 'commercial'],
      'product-showcase': ['fashion', 'home-goods', 'artisan']
    };

    Object.entries(EXPECTED_LAYOUTS).forEach(([base, layouts]) => {
      it(`should have all layout variations for ${base}`, () => {
        layouts.forEach(layout => {
          const filename = `${base}-${layout}.json`;
          const found = allTemplates.some(t => t.filename === filename);
          expect(found, `Missing layout: ${filename}`).toBe(true);
        });
      });
    });
  });
});

