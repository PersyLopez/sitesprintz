import { describe, it, expect } from 'vitest';
import { 
  TEMPLATE_LAYOUTS,
  getLayoutsForTemplate,
  getLayoutKey,
  getLayoutName,
  hasLayoutVariations,
  getAllLayouts
} from '../../src/config/templateLayouts';

describe('Template Layouts Configuration', () => {
  // Configuration Structure (3 tests)
  describe('Configuration Structure', () => {
    it('should have template layouts defined', () => {
      expect(TEMPLATE_LAYOUTS).toBeDefined();
      expect(typeof TEMPLATE_LAYOUTS).toBe('object');
    });

    it('should include common template types', () => {
      expect(TEMPLATE_LAYOUTS).toHaveProperty('restaurant');
      expect(TEMPLATE_LAYOUTS).toHaveProperty('salon');
      expect(TEMPLATE_LAYOUTS).toHaveProperty('gym');
      expect(TEMPLATE_LAYOUTS).toHaveProperty('consultant');
    });

    it('should have required properties for each template', () => {
      const restaurant = TEMPLATE_LAYOUTS.restaurant;
      
      expect(restaurant).toHaveProperty('base');
      expect(restaurant).toHaveProperty('category');
      expect(restaurant).toHaveProperty('color');
      expect(restaurant).toHaveProperty('defaultLayout');
      expect(restaurant).toHaveProperty('layouts');
    });
  });

  // Get Layouts For Template (4 tests)
  describe('getLayoutsForTemplate', () => {
    it('should return layouts for valid template', () => {
      const layouts = getLayoutsForTemplate('restaurant');
      
      expect(layouts).toBeDefined();
      expect(layouts.layouts).toBeDefined();
      expect(Object.keys(layouts.layouts).length).toBeGreaterThan(0);
    });

    it('should return null for invalid template', () => {
      const layouts = getLayoutsForTemplate('nonexistent');
      
      expect(layouts).toBeNull();
    });

    it('should include default layout', () => {
      const layouts = getLayoutsForTemplate('restaurant');
      
      expect(layouts.defaultLayout).toBeDefined();
      expect(typeof layouts.defaultLayout).toBe('string');
    });

    it('should have layout details', () => {
      const layouts = getLayoutsForTemplate('salon');
      const firstLayout = Object.values(layouts.layouts)[0];
      
      expect(firstLayout).toHaveProperty('name');
      expect(firstLayout).toHaveProperty('emoji');
      expect(firstLayout).toHaveProperty('description');
      expect(firstLayout).toHaveProperty('features');
    });
  });

  // Get Layout Key (3 tests)
  describe('getLayoutKey', () => {
    it('should return layout key for valid template and layout', () => {
      const key = getLayoutKey('restaurant', 'casual');
      
      expect(key).toBe('restaurant-casual');
    });

    it('should handle templates without layout variations', () => {
      const key = getLayoutKey('simple-template', null);
      
      expect(key).toBe('simple-template');
    });

    it('should return base template if layout not specified', () => {
      const key = getLayoutKey('restaurant');
      
      expect(typeof key).toBe('string');
      expect(key).toContain('restaurant');
    });
  });

  // Get Layout Name (3 tests)
  describe('getLayoutName', () => {
    it('should return display name for layout', () => {
      const name = getLayoutName('restaurant', 'casual');
      
      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
      expect(name).toContain('Casual');
    });

    it('should return template name if no layout specified', () => {
      const name = getLayoutName('restaurant');
      
      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
    });

    it('should handle invalid template gracefully', () => {
      const name = getLayoutName('invalid', 'invalid');
      
      expect(name).toBeDefined();
    });
  });

  // Has Layout Variations (2 tests)
  describe('hasLayoutVariations', () => {
    it('should return true for templates with variations', () => {
      expect(hasLayoutVariations('restaurant')).toBe(true);
      expect(hasLayoutVariations('salon')).toBe(true);
      expect(hasLayoutVariations('gym')).toBe(true);
    });

    it('should return false for templates without variations', () => {
      expect(hasLayoutVariations('nonexistent')).toBe(false);
      expect(hasLayoutVariations('simple')).toBe(false);
    });
  });

  // Get All Layouts (2 tests)
  describe('getAllLayouts', () => {
    it('should return all available layouts', () => {
      const allLayouts = getAllLayouts();
      
      expect(Array.isArray(allLayouts)).toBe(true);
      expect(allLayouts.length).toBeGreaterThan(0);
    });

    it('should include layout metadata', () => {
      const allLayouts = getAllLayouts();
      const first = allLayouts[0];
      
      expect(first).toHaveProperty('template');
      expect(first).toHaveProperty('layoutKey');
      expect(first).toHaveProperty('name');
    });
  });
});

