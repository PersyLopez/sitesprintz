import { describe, it, expect, beforeEach, vi } from 'vitest';
import { draftsService } from '../../src/services/drafts';
import api from '../../src/services/api';

// Mock the API client
vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock console
global.console = {
  ...console,
  log: vi.fn()
};

describe('Drafts Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Save Draft (4 tests)
  describe('saveDraft', () => {
    it('should save draft data', async () => {
      const draftData = {
        data: {
          businessName: 'Test Business',
          template: 'restaurant'
        }
      };

      api.post.mockResolvedValueOnce({
        id: 'draft-123',
        ...draftData
      });

      const result = await draftsService.saveDraft(draftData);

      expect(api.post).toHaveBeenCalledWith('/api/drafts', draftData);
      expect(result.id).toBe('draft-123');
    });

    it('should log draft data on save', async () => {
      const draftData = {
        data: {
          businessName: 'Test'
        }
      };

      api.post.mockResolvedValueOnce({ id: 'draft-123' });

      await draftsService.saveDraft(draftData);

      expect(console.log).toHaveBeenCalledWith(
        '📤 Sending draft data:',
        expect.objectContaining({
          hasData: true,
          dataKeys: ['businessName']
        })
      );
    });

    it('should handle empty draft data', async () => {
      const draftData = { data: {} };

      api.post.mockResolvedValueOnce({ id: 'draft-empty' });

      await draftsService.saveDraft(draftData);

      expect(console.log).toHaveBeenCalledWith(
        '📤 Sending draft data:',
        expect.objectContaining({
          dataEmpty: true
        })
      );
    });

    it('should handle save errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Save failed'));

      await expect(draftsService.saveDraft({ data: {} })).rejects.toThrow('Save failed');
    });
  });

  // Get Draft (3 tests)
  describe('getDraft', () => {
    it('should fetch draft by ID', async () => {
      const mockDraft = {
        id: 'draft-456',
        data: { businessName: 'Loaded Business' }
      };

      api.get.mockResolvedValueOnce(mockDraft);

      const result = await draftsService.getDraft('draft-456');

      expect(api.get).toHaveBeenCalledWith('/api/drafts/draft-456');
      expect(result.id).toBe('draft-456');
      expect(result.data.businessName).toBe('Loaded Business');
    });

    it('should handle draft not found', async () => {
      api.get.mockRejectedValueOnce(new Error('Draft not found'));

      await expect(draftsService.getDraft('nonexistent')).rejects.toThrow('Draft not found');
    });

    it('should handle malformed draft data', async () => {
      api.get.mockResolvedValueOnce({ id: 'bad-draft', data: null });

      const result = await draftsService.getDraft('bad-draft');

      expect(result.data).toBeNull();
    });
  });

  // Delete Draft (3 tests)
  describe('deleteDraft', () => {
    it('should delete draft by ID', async () => {
      api.delete.mockResolvedValueOnce({ success: true });

      const result = await draftsService.deleteDraft('draft-789');

      expect(api.delete).toHaveBeenCalledWith('/api/drafts/draft-789');
      expect(result.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      api.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(draftsService.deleteDraft('draft-bad')).rejects.toThrow('Delete failed');
    });

    it('should handle deleting already deleted draft', async () => {
      api.delete.mockRejectedValueOnce(new Error('Draft not found'));

      await expect(draftsService.deleteDraft('deleted-draft')).rejects.toThrow('Draft not found');
    });
  });

  // Publish Draft (4 tests)
  describe('publishDraft', () => {
    it('should publish draft with data', async () => {
      const publishData = {
        domain: 'example.com',
        title: 'Published Site'
      };

      api.post.mockResolvedValueOnce({
        success: true,
        siteId: 'site-123',
        url: 'https://example.com'
      });

      const result = await draftsService.publishDraft('draft-pub-1', publishData);

      expect(api.post).toHaveBeenCalledWith('/api/drafts/draft-pub-1/publish', publishData);
      expect(result.success).toBe(true);
      expect(result.siteId).toBe('site-123');
    });

    it('should handle publish without custom domain', async () => {
      const publishData = { title: 'My Site' };

      api.post.mockResolvedValueOnce({
        success: true,
        siteId: 'site-456'
      });

      const result = await draftsService.publishDraft('draft-pub-2', publishData);

      expect(result.success).toBe(true);
    });

    it('should handle publish errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Publish failed'));

      await expect(
        draftsService.publishDraft('draft-bad', {})
      ).rejects.toThrow('Publish failed');
    });

    it('should handle invalid draft on publish', async () => {
      api.post.mockRejectedValueOnce(new Error('Draft not found'));

      await expect(
        draftsService.publishDraft('nonexistent', { title: 'Test' })
      ).rejects.toThrow('Draft not found');
    });
  });
});

