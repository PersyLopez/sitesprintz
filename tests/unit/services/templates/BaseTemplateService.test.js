/**
 * BaseTemplateService Unit Tests
 * 
 * Tests the shared functionality of the base template service class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseTemplateService } from '../../../../server/services/templates/BaseTemplateService.js';
import { prisma } from '../../../../database/db.js';

// Mock dependencies
vi.mock('../../../../database/db.js', () => ({
  prisma: {
    sites: {
      findUnique: vi.fn(),
    },
    submissions: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../../server/utils/email-service-wrapper.js', () => ({
  default: {
    sendEmail: vi.fn().mockResolvedValue(true),
  },
}));

describe('BaseTemplateService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a concrete implementation for testing
    class TestService extends BaseTemplateService {
      getFormType() {
        return 'test_request';
      }

      getRequiredFields() {
        return ['name', 'email'];
      }

      getNicheFields() {
        return [{ name: 'testField', type: 'text' }];
      }

      validateNicheFields(data) {
        return { testField: data.testField || 'default' };
      }

      formatConfirmationEmail(data) {
        return {
          subject: `Test Request from ${data.name}`,
          html: `<p>Test email for ${data.email}</p>`,
        };
      }
    }

    service = new TestService('test-template');
  });

  describe('validateBaseFields', () => {
    it('should validate required base fields', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        message: 'Test message',
      };

      const result = service.validateBaseFields(validData);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('555-1234');
      expect(result.message).toBe('Test message');
    });

    it('should throw error for missing name', () => {
      const invalidData = {
        email: 'john@example.com',
      };

      expect(() => service.validateBaseFields(invalidData)).toThrow('Validation failed');
    });

    it('should throw error for invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
      };

      expect(() => service.validateBaseFields(invalidData)).toThrow('Validation failed');
    });

    it('should handle optional phone', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = service.validateBaseFields(data);
      expect(result.phone).toBeNull();
    });
  });

  describe('formatPriceDisplay', () => {
    it('should format cents to dollar string', () => {
      expect(service.formatPriceDisplay(1500)).toBe('$15.00');
      expect(service.formatPriceDisplay(0)).toBe('$0.00');
      expect(service.formatPriceDisplay(99)).toBe('$0.99');
    });

    it('should handle invalid input', () => {
      expect(service.formatPriceDisplay(NaN)).toBe('$0.00');
      expect(service.formatPriceDisplay('invalid')).toBe('$0.00');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize text input', () => {
      const result = service.sanitizeInput('  Test Input  ', 100);
      expect(result).toBe('Test Input');
    });

    it('should respect max length', () => {
      const longText = 'a'.repeat(200);
      const result = service.sanitizeInput(longText, 100);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('createSubmission', () => {
    it('should create submission with base and niche data', async () => {
      const siteId = 'test-site-id';
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        testField: 'test value',
        preferred_date: '2024-12-25',
        preferred_time: '14:00',
      };

      prisma.sites.findUnique.mockResolvedValue({
        id: siteId,
        site_data: { brand: { name: 'Test Business' } },
        users: { email: 'owner@example.com' },
      });

      prisma.submissions.create.mockResolvedValue({
        id: 1,
        site_id: siteId,
        form_type: 'test_request',
        status: 'unread',
      });

      const result = await service.createSubmission(siteId, formData);

      expect(prisma.submissions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          site_id: siteId,
          form_type: 'test_request',
          name: 'John Doe',
          email: 'john@example.com',
        }),
      });

      expect(result).toBeDefined();
    });

    it('should throw error on validation failure', async () => {
      const siteId = 'test-site-id';
      const invalidData = {
        email: 'invalid-email',
      };

      await expect(service.createSubmission(siteId, invalidData)).rejects.toThrow();
    });
  });

  describe('abstract methods', () => {
    it('should throw error if getFormType not implemented', () => {
      const baseService = new BaseTemplateService('test');
      expect(() => baseService.getFormType()).toThrow('Subclass must implement');
    });

    it('should throw error if getRequiredFields not implemented', () => {
      const baseService = new BaseTemplateService('test');
      expect(() => baseService.getRequiredFields()).toThrow('Subclass must implement');
    });

    it('should throw error if getNicheFields not implemented', () => {
      const baseService = new BaseTemplateService('test');
      expect(() => baseService.getNicheFields()).toThrow('Subclass must implement');
    });

    it('should throw error if validateNicheFields not implemented', () => {
      const baseService = new BaseTemplateService('test');
      expect(() => baseService.validateNicheFields({})).toThrow('Subclass must implement');
    });

    it('should throw error if formatConfirmationEmail not implemented', () => {
      const baseService = new BaseTemplateService('test');
      expect(() => baseService.formatConfirmationEmail({})).toThrow('Subclass must implement');
    });
  });
});

