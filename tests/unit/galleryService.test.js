/**
 * GALLERY SERVICE UNIT TESTS
 * 
 * TDD Phase: RED
 * Testing the GalleryService for public showcase functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import GalleryService from '../../server/services/galleryService.js';

// Mock database
vi.mock('../../database/db.js', () => ({
  pool: {
    query: vi.fn()
  }
}));

import { pool } from '../../database/db.js';

describe('GalleryService', () => {
  let galleryService;

  beforeEach(() => {
    galleryService = new GalleryService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== CONSTRUCTOR TESTS ====================
  describe('Constructor', () => {
    it('should create an instance of GalleryService', () => {
      expect(galleryService).toBeInstanceOf(GalleryService);
    });

    it('should initialize with default configuration', () => {
      expect(galleryService.defaultPageSize).toBe(12);
      expect(galleryService.maxPageSize).toBe(50);
    });
  });

  // ==================== GET PUBLIC SITES TESTS ====================
  describe('getPublicSites', () => {
    const mockSites = [
      {
        id: 'site-1',
        subdomain: 'restaurant1',
        template_id: 'restaurant',
        status: 'published',
        plan: 'pro',
        is_public: true,
        created_at: new Date('2024-01-01'),
        site_data: { hero: { title: 'Welcome' } }
      },
      {
        id: 'site-2',
        subdomain: 'salon1',
        template_id: 'salon',
        status: 'published',
        plan: 'starter',
        is_public: true,
        created_at: new Date('2024-01-02'),
        site_data: { hero: { title: 'Look Great' } }
      }
    ];

    it('should return all public published sites', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockSites, rowCount: 2 });

      const result = await galleryService.getPublicSites();

      expect(result.sites).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_public = TRUE AND status = $1'),
        expect.arrayContaining(['published'])
      );
    });

    it('should paginate results with default page size', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockSites, rowCount: 2 });

      await galleryService.getPublicSites({ page: 1 });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([12, 0]) // limit, offset
      );
    });

    it('should paginate results with custom page size', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockSites, rowCount: 2 });

      await galleryService.getPublicSites({ page: 2, pageSize: 6 });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([6, 6]) // limit, offset for page 2
      );
    });

    it('should enforce maximum page size', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockSites, rowCount: 2 });

      await galleryService.getPublicSites({ pageSize: 100 });

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([50, 0]) // max page size enforced
      );
    });

    it('should filter by category (template)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockSites[0]], rowCount: 1 });

      const result = await galleryService.getPublicSites({ category: 'restaurant' });

      expect(result.sites).toHaveLength(1);
      expect(result.sites[0].template_id).toBe('restaurant');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND template_id = $'),
        expect.arrayContaining(['restaurant'])
      );
    });

    it('should search by name (case-insensitive)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockSites[0]], rowCount: 1 });

      const result = await galleryService.getPublicSites({ search: 'amazing' });

      expect(result.sites).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%amazing%'])
      );
    });

    it('should sort by created_at DESC by default', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockSites, rowCount: 2 });

      await galleryService.getPublicSites();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should support sorting by name ASC', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockSites, rowCount: 2 });

      await galleryService.getPublicSites({ sortBy: 'name', sortOrder: 'asc' });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC'),
        expect.any(Array)
      );
    });

    it('should return empty array when no public sites exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await galleryService.getPublicSites();

      expect(result.sites).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(galleryService.getPublicSites()).rejects.toThrow('Database error');
    });
  });

  // ==================== GET SITE BY SUBDOMAIN TESTS ====================
  describe('getSiteBySubdomain', () => {
    const mockSite = {
      id: 'site-1',
      subdomain: 'restaurant1',
      name: 'Amazing Restaurant',
      template: 'restaurant',
      status: 'published',
      plan: 'pro',
      is_public: true,
      created_at: new Date('2024-01-01'),
      site_data: { hero: { title: 'Welcome' } }
    };

    it('should return site by subdomain if public', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockSite], rowCount: 1 });

      const result = await galleryService.getSiteBySubdomain('restaurant1');

      expect(result).toEqual(mockSite);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE subdomain = $1 AND is_public = TRUE AND status = $2'),
        ['restaurant1', 'published']
      );
    });

    it('should return null if site not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await galleryService.getSiteBySubdomain('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if site is not public', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await galleryService.getSiteBySubdomain('private-site');

      expect(result).toBeNull();
    });

    it('should validate subdomain format', async () => {
      await expect(galleryService.getSiteBySubdomain('')).rejects.toThrow('Invalid subdomain');
      await expect(galleryService.getSiteBySubdomain(null)).rejects.toThrow('Invalid subdomain');
      await expect(galleryService.getSiteBySubdomain('invalid!@#')).rejects.toThrow('Invalid subdomain');
    });
  });

  // ==================== TOGGLE PUBLIC STATUS TESTS ====================
  describe('togglePublicStatus', () => {
    it('should set site to public', async () => {
      pool.query.mockResolvedValueOnce({ 
        rows: [{ id: 'site-1', is_public: true }], 
        rowCount: 1 
      });

      const result = await galleryService.togglePublicStatus('site-1', 'user-1', true);

      expect(result.is_public).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sites'),
        [true, 'site-1', 'user-1', 'published']
      );
    });

    it('should set site to private', async () => {
      pool.query.mockResolvedValueOnce({ 
        rows: [{ id: 'site-1', is_public: false }], 
        rowCount: 1 
      });

      const result = await galleryService.togglePublicStatus('site-1', 'user-1', false);

      expect(result.is_public).toBe(false);
    });

    it('should only allow owners to toggle status', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        galleryService.togglePublicStatus('site-1', 'wrong-user', true)
      ).rejects.toThrow('Site not found or unauthorized');
    });

    it('should only allow published sites to be made public', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        galleryService.togglePublicStatus('draft-site', 'user-1', true)
      ).rejects.toThrow('Site not found or unauthorized');
    });

    it('should validate inputs', async () => {
      await expect(
        galleryService.togglePublicStatus('', 'user-1', true)
      ).rejects.toThrow('Invalid site ID');

      await expect(
        galleryService.togglePublicStatus('site-1', '', true)
      ).rejects.toThrow('Invalid user ID');
    });
  });

  // ==================== GET CATEGORIES TESTS ====================
  describe('getCategories', () => {
    it('should return list of available categories', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { template_id: 'restaurant', count: '5' },
          { template_id: 'salon', count: '3' },
          { template_id: 'gym', count: '2' }
        ],
        rowCount: 3
      });

      const result = await galleryService.getCategories();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ template: 'restaurant', count: 5 });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY template_id'),
        ['published']
      );
    });

    it('should return empty array if no public sites', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await galleryService.getCategories();

      expect(result).toEqual([]);
    });
  });

  // ==================== GET STATS TESTS ====================
  describe('getStats', () => {
    it('should return gallery statistics', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_public: '25',
          total_categories: '8',
          latest_date: new Date('2024-01-15')
        }],
        rowCount: 1
      });

      const result = await galleryService.getStats();

      expect(result.totalPublic).toBe(25);
      expect(result.totalCategories).toBe(8);
      expect(result.latestDate).toBeInstanceOf(Date);
    });
  });

  // ==================== VALIDATE PUBLIC ELIGIBILITY TESTS ====================
  describe('validatePublicEligibility', () => {
    it('should return true for published sites', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ 
          status: 'published', 
          plan: 'pro',
          site_data: { hero: { title: 'My Site' } }
        }],
        rowCount: 1
      });

      const result = await galleryService.validatePublicEligibility('site-1');

      expect(result.eligible).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('should return false for draft sites', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ status: 'draft', plan: 'pro' }],
        rowCount: 1
      });

      const result = await galleryService.validatePublicEligibility('site-1');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Site must be published');
    });

    it('should check if site has required content', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          status: 'published',
          plan: 'pro',
          site_data: { hero: {} } // Missing title
        }],
        rowCount: 1
      });

      const result = await galleryService.validatePublicEligibility('site-1');

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Site missing required content');
    });
  });
});

