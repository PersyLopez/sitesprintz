/**
 * Unit Tests for Foundation Service
 * 
 * TDD: RED-GREEN-REFACTOR approach
 * These tests define the expected behavior of the FoundationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FoundationService } from '../../server/services/foundationService.js';

describe('FoundationService', () => {
  let service;
  let mockDb;
  let mockCache;

  beforeEach(() => {
    // Mock database
    mockDb = {
      query: vi.fn()
    };

    // Mock cache
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn(), // SimpleCache uses invalidate
      delete: vi.fn(),      // For compatibility with other cache implementations
      clear: vi.fn()
    };

    service = new FoundationService(mockDb, mockCache);
  });

  describe('constructor', () => {
    it('should create service with provided dependencies', () => {
      expect(service).toBeInstanceOf(FoundationService);
      expect(service.db).toBe(mockDb);
      expect(service.cache).toBe(mockCache);
    });

    it('should use default cache if not provided', () => {
      const serviceWithoutCache = new FoundationService(mockDb);
      expect(serviceWithoutCache.cache).toBeDefined();
    });
  });

  describe('getConfig', () => {
    const subdomain = 'test-site';
    const mockSiteData = {
      brand: { name: 'Test Business' },
      foundation: {
        trustSignals: {
          enabled: true,
          yearsInBusiness: 10
        }
      }
    };

    it('should return config from cache if available', async () => {
      const cachedConfig = {
        foundation: mockSiteData.foundation,
        plan: 'starter'
      };

      mockCache.get.mockReturnValueOnce(cachedConfig);

      const result = await service.getConfig(subdomain);

      expect(result).toEqual({ ...cachedConfig, source: 'cache' });
      expect(mockCache.get).toHaveBeenCalledWith(`foundation:${subdomain}`);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache misses', async () => {
      mockCache.get.mockReturnValueOnce(null);
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          site_data: mockSiteData,
          plan: 'starter'
        }]
      });

      const result = await service.getConfig(subdomain);

      expect(result.foundation).toEqual(mockSiteData.foundation);
      expect(result.plan).toBe('starter');
      expect(result.source).toBe('database');
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should return default config when site has no foundation config', async () => {
      mockCache.get.mockReturnValueOnce(null);
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          site_data: { brand: { name: 'Test' } },
          plan: 'starter'
        }]
      });

      const result = await service.getConfig(subdomain);

      expect(result.foundation).toBeDefined();
      expect(result.foundation.trustSignals).toBeDefined();
      expect(result.foundation.contactForm).toBeDefined();
      expect(result.foundation.seo).toBeDefined();
    });

    it('should throw error when site not found', async () => {
      mockCache.get.mockReturnValueOnce(null);
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      await expect(service.getConfig(subdomain)).rejects.toThrow('Site not found');
    });

    it('should handle database errors', async () => {
      mockCache.get.mockReturnValueOnce(null);
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.getConfig(subdomain)).rejects.toThrow('Database error');
    });

    it('should parse site_data if it is a string', async () => {
      mockCache.get.mockReturnValueOnce(null);
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          site_data: JSON.stringify(mockSiteData),
          plan: 'pro'
        }]
      });

      const result = await service.getConfig(subdomain);

      expect(result.foundation).toEqual(mockSiteData.foundation);
    });
  });

  describe('updateConfig', () => {
    const subdomain = 'test-site';
    const newConfig = {
      trustSignals: {
        enabled: true,
        yearsInBusiness: 15
      },
      contactForm: {
        enabled: true,
        recipientEmail: 'test@example.com'
      }
    };

    it('should update config and invalidate cache', async () => {
      const existingSiteData = {
        brand: { name: 'Test' },
        foundation: { trustSignals: { enabled: false } }
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            site_data: existingSiteData,
            plan: 'starter'
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      const result = await service.updateConfig(subdomain, newConfig);

      expect(result.foundation).toEqual(newConfig);
      // Check for either invalidate or delete being called (depending on cache implementation)
      expect(mockCache.invalidate || mockCache.delete).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error when site not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      await expect(service.updateConfig(subdomain, newConfig))
        .rejects.toThrow('Site not found');
    });

    it('should validate config before updating', async () => {
      const invalidConfig = {
        contactForm: {
          enabled: true,
          recipientEmail: 'invalid-email' // Invalid email
        }
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          site_data: { brand: { name: 'Test' } },
          plan: 'starter'
        }]
      });

      await expect(service.updateConfig(subdomain, invalidConfig))
        .rejects.toThrow('Invalid recipient email');
    });

    it('should handle database errors during update', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            site_data: { brand: { name: 'Test' } },
            plan: 'starter'
          }]
        })
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(service.updateConfig(subdomain, newConfig))
        .rejects.toThrow('Update failed');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return starter tier defaults', () => {
      const config = service.getDefaultConfig('starter');

      expect(config).toBeDefined();
      expect(config.trustSignals).toBeDefined();
      expect(config.trustSignals.enabled).toBe(true);
      expect(config.contactForm).toBeDefined();
      expect(config.contactForm.enabled).toBe(false);
    });

    it('should return pro tier defaults with enhanced features', () => {
      const config = service.getDefaultConfig('pro');

      expect(config).toBeDefined();
      expect(config.trustSignals).toBeDefined();
      // Pro tier might have additional defaults
    });

    it('should return starter defaults for unknown tier', () => {
      const config = service.getDefaultConfig('unknown');

      expect(config).toBeDefined();
      expect(config.trustSignals).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('should pass validation for valid config', () => {
      const validConfig = {
        trustSignals: {
          enabled: true,
          yearsInBusiness: 10
        },
        contactForm: {
          enabled: true,
          recipientEmail: 'test@example.com'
        }
      };

      expect(() => service.validateConfig(validConfig, 'starter')).not.toThrow();
    });

    it('should reject invalid email in contactForm', () => {
      const invalidConfig = {
        contactForm: {
          enabled: true,
          recipientEmail: 'invalid-email'
        }
      };

      expect(() => service.validateConfig(invalidConfig, 'starter'))
        .toThrow('Invalid recipient email');
    });

    it('should reject negative years in business', () => {
      const invalidConfig = {
        trustSignals: {
          enabled: true,
          yearsInBusiness: -5
        }
      };

      expect(() => service.validateConfig(invalidConfig, 'starter'))
        .toThrow('Years in business must be non-negative');
    });

    it('should validate social media URLs if provided', () => {
      const invalidConfig = {
        socialMedia: {
          enabled: true,
          profiles: {
            facebook: 'not-a-url'
          }
        }
      };

      expect(() => service.validateConfig(invalidConfig, 'starter'))
        .toThrow('Invalid social media URL');
    });

    it('should enforce tier limits', () => {
      const proFeatureConfig = {
        trustSignalsPro: {
          enabled: true,
          customBadges: []
        }
      };

      // Should work for Pro tier
      expect(() => service.validateConfig(proFeatureConfig, 'pro')).not.toThrow();

      // Should fail for Starter tier
      expect(() => service.validateConfig(proFeatureConfig, 'starter'))
        .toThrow('Feature not available in starter tier');
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific subdomain using invalidate', () => {
      const subdomain = 'test-site';
      service.clearCache(subdomain);

      expect(mockCache.invalidate).toHaveBeenCalledWith(`foundation:${subdomain}`);
    });

    it('should clear cache for specific subdomain using delete if invalidate not available', () => {
      const subdomain = 'test-site';
      mockCache.invalidate = undefined; // Simulate cache without invalidate
      
      service.clearCache(subdomain);

      expect(mockCache.delete).toHaveBeenCalled();
    });

    it('should clear all foundation cache if no subdomain provided', () => {
      service.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      mockCache.size = 10;
      mockCache.hits = 100;
      mockCache.misses = 20;

      const stats = service.getCacheStats();

      expect(stats).toEqual({
        size: 10,
        hits: 100,
        misses: 20,
        hitRate: expect.any(Number)
      });
    });
  });
});

