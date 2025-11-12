import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sitesService } from '../../src/services/sites';
import api from '../../src/services/api';

// Mock the API client
vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Sites Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Get User Sites (3 tests)
  describe('getUserSites', () => {
    it('should fetch user sites', async () => {
      const mockSites = [
        { id: 'site1', name: 'Site 1' },
        { id: 'site2', name: 'Site 2' }
      ];

      api.get.mockResolvedValueOnce(mockSites);

      const result = await sitesService.getUserSites('user123');

      expect(api.get).toHaveBeenCalledWith('/api/users/user123/sites');
      expect(result).toEqual(mockSites);
    });

    it('should handle empty sites array', async () => {
      api.get.mockResolvedValueOnce([]);

      const result = await sitesService.getUserSites('user123');

      expect(result).toEqual([]);
    });

    it('should handle fetch error', async () => {
      api.get.mockRejectedValueOnce(new Error('Fetch failed'));

      await expect(sitesService.getUserSites('user123')).rejects.toThrow('Fetch failed');
    });
  });

  // Delete Site (3 tests)
  describe('deleteSite', () => {
    it('should delete a site', async () => {
      api.delete.mockResolvedValueOnce({ success: true });

      const result = await sitesService.deleteSite('user123', 'site456');

      expect(api.delete).toHaveBeenCalledWith('/api/users/user123/sites/site456');
      expect(result).toEqual({ success: true });
    });

    it('should handle delete errors', async () => {
      api.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(sitesService.deleteSite('user123', 'site456')).rejects.toThrow('Delete failed');
    });

    it('should handle 404 for non-existent site', async () => {
      api.delete.mockRejectedValueOnce(new Error('Not found'));

      await expect(sitesService.deleteSite('user123', 'nonexistent')).rejects.toThrow('Not found');
    });
  });

  // Get Site Analytics (3 tests)
  describe('getSiteAnalytics', () => {
    it('should fetch site analytics', async () => {
      const mockAnalytics = {
        views: 1000,
        visitors: 500,
        bounceRate: 35.2
      };

      api.get.mockResolvedValueOnce(mockAnalytics);

      const result = await sitesService.getSiteAnalytics('user123');

      expect(api.get).toHaveBeenCalledWith('/api/users/user123/analytics');
      expect(result).toEqual(mockAnalytics);
    });

    it('should handle empty analytics', async () => {
      api.get.mockResolvedValueOnce({});

      const result = await sitesService.getSiteAnalytics('user123');

      expect(result).toEqual({});
    });

    it('should handle analytics fetch error', async () => {
      api.get.mockRejectedValueOnce(new Error('Analytics unavailable'));

      await expect(sitesService.getSiteAnalytics('user123')).rejects.toThrow('Analytics unavailable');
    });
  });
});

