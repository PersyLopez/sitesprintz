import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadsService } from '../../src/services/uploads';
import api from '../../src/services/api';

// Mock the API client
vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn()
  }
}));

describe('Uploads Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Get Admin Token (2 tests)
  describe('getAdminToken', () => {
    it('should fetch admin token', async () => {
      api.get.mockResolvedValueOnce({ token: 'admin-token-123' });

      const result = await uploadsService.getAdminToken();

      expect(api.get).toHaveBeenCalledWith('/api/admin-token');
      expect(result.token).toBe('admin-token-123');
    });

    it('should handle token fetch error', async () => {
      api.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(uploadsService.getAdminToken()).rejects.toThrow('Unauthorized');
    });
  });

  // Upload Image (4 tests)
  describe('uploadImage', () => {
    it('should upload image with admin token', async () => {
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      api.upload.mockResolvedValueOnce({ url: 'https://example.com/image.jpg' });

      const result = await uploadsService.uploadImage(mockFile, 'admin-token-123');

      expect(api.upload).toHaveBeenCalledWith(
        '/api/upload',
        expect.any(FormData)
      );
      expect(result.url).toContain('image.jpg');
    });

    it('should upload image without admin token', async () => {
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      api.upload.mockResolvedValueOnce({ url: 'https://example.com/image.jpg' });

      const result = await uploadsService.uploadImage(mockFile);

      expect(api.upload).toHaveBeenCalled();
      expect(result.url).toBeDefined();
    });

    it('should handle upload failure', async () => {
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      api.upload.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(uploadsService.uploadImage(mockFile)).rejects.toThrow('Upload failed');
    });

    it('should handle large files', async () => {
      const largeFile = new File(['x'.repeat(5000000)], 'large.jpg', { type: 'image/jpeg' });
      api.upload.mockResolvedValueOnce({ url: 'https://example.com/large.jpg' });

      const result = await uploadsService.uploadImage(largeFile, 'token');

      expect(api.upload).toHaveBeenCalled();
      expect(result.url).toBeDefined();
    });
  });

  // Delete Image (3 tests)
  describe('deleteImage', () => {
    it('should delete image by filename', async () => {
      api.delete.mockResolvedValueOnce({ success: true });

      const result = await uploadsService.deleteImage('test-image.jpg');

      expect(api.delete).toHaveBeenCalledWith('/api/uploads/test-image.jpg');
      expect(result.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      api.delete.mockRejectedValueOnce(new Error('File not found'));

      await expect(uploadsService.deleteImage('missing.jpg')).rejects.toThrow('File not found');
    });

    it('should handle special characters in filename', async () => {
      api.delete.mockResolvedValueOnce({ success: true });

      await uploadsService.deleteImage('image-with-spaces and special.jpg');

      expect(api.delete).toHaveBeenCalledWith('/api/uploads/image-with-spaces and special.jpg');
    });
  });

  // Upload Multiple Images (4 tests)
  describe('uploadImages', () => {
    it('should upload multiple images', async () => {
      const file1 = new File(['data1'], 'img1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['data2'], 'img2.jpg', { type: 'image/jpeg' });
      
      api.upload
        .mockResolvedValueOnce({ url: 'https://example.com/img1.jpg' })
        .mockResolvedValueOnce({ url: 'https://example.com/img2.jpg' });

      const result = await uploadsService.uploadImages([file1, file2], 'token');

      expect(api.upload).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].url).toContain('img1.jpg');
      expect(result[1].url).toContain('img2.jpg');
    });

    it('should handle empty array', async () => {
      const result = await uploadsService.uploadImages([], 'token');

      expect(api.upload).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle partial failures', async () => {
      const file1 = new File(['data1'], 'img1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['data2'], 'img2.jpg', { type: 'image/jpeg' });
      
      api.upload
        .mockResolvedValueOnce({ url: 'https://example.com/img1.jpg' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      await expect(uploadsService.uploadImages([file1, file2], 'token')).rejects.toThrow();
    });

    it('should upload without admin token', async () => {
      const file1 = new File(['data1'], 'img1.jpg', { type: 'image/jpeg' });
      
      api.upload.mockResolvedValueOnce({ url: 'https://example.com/img1.jpg' });

      const result = await uploadsService.uploadImages([file1]);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBeDefined();
    });
  });
});

