import { describe, it, expect, beforeEach, vi } from 'vitest';
import { templatesService } from '../../src/services/templates';

// Mock fetch
global.fetch = vi.fn();

describe('Templates Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Get Templates (4 tests)
  describe('getTemplates', () => {
    it('should fetch templates from server', async () => {
      const mockTemplates = [
        { id: 'restaurant-pro', name: 'Restaurant Pro', tier: 'pro' },
        { id: 'salon-pro', name: 'Salon Pro', tier: 'pro' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates
      });

      const result = await templatesService.getTemplates();

      expect(fetch).toHaveBeenCalledWith('/api/templates');
      expect(result).toEqual(mockTemplates);
    });

    it('should return fallback templates if fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await templatesService.getTemplates();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failed'));

      const result = await templatesService.getTemplates();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return templates with correct structure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'test', name: 'Test Template', tier: 'starter' }
        ]
      });

      const result = await templatesService.getTemplates();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });
  });

  // Get Template By ID (3 tests)
  describe('getTemplateById', () => {
    it('should fetch specific template', async () => {
      const mockTemplate = {
        id: 'restaurant-pro',
        name: 'Restaurant Pro',
        content: { hero: { title: 'Welcome' } }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });

      const result = await templatesService.getTemplateById('restaurant-pro');

      expect(fetch).toHaveBeenCalledWith('/api/templates/restaurant-pro');
      expect(result).toEqual(mockTemplate);
    });

    it('should handle template not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await templatesService.getTemplateById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle fetch error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Fetch failed'));

      const result = await templatesService.getTemplateById('test');

      expect(result).toBeNull();
    });
  });

  // Template Categories (2 tests)
  describe('Template Categories', () => {
    it('should return templates by tier', async () => {
      const mockTemplates = [
        { id: 'rest-pro', tier: 'pro' },
        { id: 'salon-starter', tier: 'starter' },
        { id: 'gym-pro', tier: 'pro' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates
      });

      const result = await templatesService.getTemplates();
      const proTemplates = result.filter(t => t.tier === 'pro');

      expect(proTemplates.length).toBe(2);
    });

    it('should include all template tiers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 't1', tier: 'starter' },
          { id: 't2', tier: 'checkout' },
          { id: 't3', tier: 'pro' }
        ]
      });

      const result = await templatesService.getTemplates();
      const tiers = [...new Set(result.map(t => t.tier))];

      expect(tiers).toContain('starter');
      expect(tiers).toContain('checkout');
      expect(tiers).toContain('pro');
    });
  });
});

