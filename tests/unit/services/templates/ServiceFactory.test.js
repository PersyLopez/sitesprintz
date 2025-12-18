/**
 * Service Factory Unit Tests
 * 
 * Tests the template service factory functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  getTemplateService,
  getAvailableTemplateIds,
  hasTemplateService,
} from '../../../../server/services/templates/index.js';
import { RestaurantService } from '../../../../server/services/templates/RestaurantService.js';
import { AutoRepairService } from '../../../../server/services/templates/AutoRepairService.js';
import { BaseTemplateService } from '../../../../server/services/templates/BaseTemplateService.js';

describe('Service Factory', () => {
  describe('getTemplateService', () => {
    it('should return RestaurantService for restaurant template', () => {
      const service = getTemplateService('restaurant');
      expect(service).toBeInstanceOf(RestaurantService);
      expect(service.templateId).toBe('restaurant');
    });

    it('should handle layout variations', () => {
      const service1 = getTemplateService('restaurant-fine-dining');
      const service2 = getTemplateService('restaurant-casual');
      expect(service1).toBeInstanceOf(RestaurantService);
      expect(service2).toBeInstanceOf(RestaurantService);
    });

    it('should return AutoRepairService for auto-repair template', () => {
      const service = getTemplateService('auto-repair');
      expect(service).toBeInstanceOf(AutoRepairService);
    });

    it('should return base service for unknown template', () => {
      const service = getTemplateService('unknown-template');
      expect(service).toBeInstanceOf(BaseTemplateService);
      expect(service.templateId).toBe('unknown-template');
    });

    it('should throw error for invalid input', () => {
      expect(() => getTemplateService(null)).toThrow('Template ID is required');
      expect(() => getTemplateService('')).toThrow('Template ID is required');
    });
  });

  describe('getAvailableTemplateIds', () => {
    it('should return array of available template IDs', () => {
      const ids = getAvailableTemplateIds();
      expect(ids).toBeInstanceOf(Array);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain('restaurant');
      expect(ids).toContain('auto-repair');
    });
  });

  describe('hasTemplateService', () => {
    it('should return true for known templates', () => {
      expect(hasTemplateService('restaurant')).toBe(true);
      expect(hasTemplateService('auto-repair')).toBe(true);
      expect(hasTemplateService('salon')).toBe(true);
    });

    it('should handle layout variations', () => {
      expect(hasTemplateService('restaurant-fine-dining')).toBe(true);
      expect(hasTemplateService('auto-repair-full-service')).toBe(true);
    });

    it('should return false for unknown templates', () => {
      expect(hasTemplateService('unknown-template')).toBe(false);
    });
  });
});

