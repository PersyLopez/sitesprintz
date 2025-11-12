/**
 * CSRF Protection Integration Tests
 * 
 * These tests verify that CSRF tokens are properly fetched, cached,
 * and included in API requests. Unlike unit tests that mock everything,
 * these tests verify the actual API client behavior.
 * 
 * Purpose: Catch CSRF integration issues before they reach production
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('CSRF Protection Integration', () => {
  let originalFetch;
  let fetchMock;

  beforeEach(() => {
    // Clear module cache to reset CSRF token
    vi.resetModules();
    
    // Setup fetch mock
    originalFetch = global.fetch;
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('CSRF Token Fetching', () => {
    it('should fetch CSRF token on module initialization', async () => {
      // Mock the CSRF token endpoint
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token-123' }),
        headers: new Map([['content-type', 'application/json']])
      });

      // Import module (triggers fetchCsrfToken on load)
      const { api } = await import('../../src/services/api.js');

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify CSRF token was fetched
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/csrf-token'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should cache CSRF token after first fetch', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'cached-token' })
      });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear mock call history
      fetchMock.mockClear();

      // Mock a successful POST request
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Map([['content-type', 'application/json']])
      });

      // Make a POST request
      await api.post('/api/test', { data: 'test' });

      // Verify no new CSRF token fetch (should use cached)
      const csrfFetchCalls = fetchMock.mock.calls.filter(
        call => call[0].includes('/api/csrf-token')
      );
      expect(csrfFetchCalls).toHaveLength(0);
    });

    it('should handle CSRF token fetch failure gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw, just log error
      expect(fetchMock).toHaveBeenCalled();
      // API should still be usable (will try to fetch token on next request)
      expect(api).toBeDefined();
    });
  });

  describe('CSRF Token Inclusion in Requests', () => {
    it('should include CSRF token in POST requests', async () => {
      // Mock CSRF token fetch
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'post-token-123' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      await api.post('/api/test', { data: 'test' });

      // Find the POST request call
      const postCall = fetchMock.mock.calls.find(
        call => call[0].includes('/api/test')
      );

      expect(postCall).toBeDefined();
      expect(postCall[1].headers['X-CSRF-Token']).toBe('post-token-123');
    });

    it('should include CSRF token in PUT requests', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'put-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      await api.put('/api/test/1', { data: 'updated' });

      const putCall = fetchMock.mock.calls.find(
        call => call[0].includes('/api/test/1')
      );

      expect(putCall[1].headers['X-CSRF-Token']).toBe('put-token');
    });

    it('should include CSRF token in PATCH requests', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'patch-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      await api.patch('/api/test/1', { field: 'value' });

      const patchCall = fetchMock.mock.calls.find(
        call => call[0].includes('/api/test/1')
      );

      expect(patchCall[1].headers['X-CSRF-Token']).toBe('patch-token');
    });

    it('should include CSRF token in DELETE requests', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'delete-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      await api.delete('/api/test/1');

      const deleteCall = fetchMock.mock.calls.find(
        call => call[0].includes('/api/test/1')
      );

      expect(deleteCall[1].headers['X-CSRF-Token']).toBe('delete-token');
    });

    it('should NOT include CSRF token in GET requests', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'should-not-be-used' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      await api.get('/api/test');

      const getCall = fetchMock.mock.calls.find(
        call => call[0].includes('/api/test')
      );

      expect(getCall[1].headers['X-CSRF-Token']).toBeUndefined();
    });

    it('should include credentials in all requests', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'cred-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      await api.post('/api/test', { data: 'test' });

      const postCall = fetchMock.mock.calls.find(
        call => call[0].includes('/api/test')
      );

      expect(postCall[1].credentials).toBe('include');
    });
  });

  describe('CSRF Token Auto-Refresh', () => {
    it('should refresh token on 403 CSRF error and retry', async () => {
      const oldToken = 'old-expired-token';
      const newToken = 'new-fresh-token';

      fetchMock
        // Initial token fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: oldToken })
        })
        // First POST attempt - fails with CSRF error
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({
            error: 'Invalid CSRF token',
            code: 'CSRF_INVALID'
          }),
          headers: new Map([['content-type', 'application/json']])
        })
        // Token refresh
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: newToken })
        })
        // Retry POST - succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await api.post('/api/test', { data: 'test' });

      // Verify token was refreshed
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/csrf-token'),
        expect.anything()
      );

      // Verify retry succeeded
      expect(result).toEqual({ success: true });

      // Verify second attempt used new token
      const postCalls = fetchMock.mock.calls.filter(
        call => call[0].includes('/api/test')
      );
      expect(postCalls).toHaveLength(2); // First attempt + retry
      expect(postCalls[1][1].headers['X-CSRF-Token']).toBe(newToken);
    });

    it('should not retry on non-CSRF 403 errors', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'valid-token' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({
            error: 'Forbidden - insufficient permissions'
          }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      await expect(api.post('/api/admin', { data: 'test' }))
        .rejects
        .toThrow('Forbidden - insufficient permissions');

      // Should not attempt token refresh for non-CSRF 403
      const csrfFetchCalls = fetchMock.mock.calls.filter(
        call => call[0].includes('/api/csrf-token')
      );
      expect(csrfFetchCalls).toHaveLength(1); // Only initial fetch
    });
  });

  describe('File Upload CSRF', () => {
    it('should include CSRF token in file uploads', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: 'upload-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image.jpg' }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      const formData = new FormData();
      formData.append('image', new Blob(['test']), 'test.jpg');

      await api.upload('/api/upload', formData);

      const uploadCall = fetchMock.mock.calls.find(
        call => call[0].includes('/api/upload')
      );

      expect(uploadCall[1].headers['X-CSRF-Token']).toBe('upload-token');
      expect(uploadCall[1].credentials).toBe('include');
    });

    it('should retry upload on CSRF error', async () => {
      const oldToken = 'old-upload-token';
      const newToken = 'new-upload-token';

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: oldToken })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({
            error: 'Invalid CSRF token'
          }),
          json: async () => ({ error: 'Invalid CSRF token' }),
          headers: new Map([['content-type', 'application/json']])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: newToken })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      const formData = new FormData();
      formData.append('image', new Blob(['test']), 'test.jpg');

      const result = await api.upload('/api/upload', formData);

      expect(result).toEqual({ url: 'https://example.com/uploaded.jpg' });

      const uploadCalls = fetchMock.mock.calls.filter(
        call => call[0].includes('/api/upload')
      );
      expect(uploadCalls).toHaveLength(2);
      expect(uploadCalls[1][1].headers['X-CSRF-Token']).toBe(newToken);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing CSRF token gracefully', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'No token field' }) // Missing csrfToken
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should either succeed or fail gracefully without crashing
      try {
        const result = await api.post('/api/test', { data: 'test' });
        expect(result).toBeDefined();
      } catch (error) {
        // If it fails, error should be handled gracefully
        expect(error).toBeDefined();
        expect(error.message).toBeTruthy();
      }
    });

    it('should handle network errors during token fetch', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network timeout'));

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      // API should still be usable
      expect(api).toBeDefined();
      expect(api.post).toBeDefined();
    });

    it('should handle concurrent requests with token fetch', async () => {
      let tokenFetchCount = 0;

      fetchMock.mockImplementation((url, options) => {
        if (url.includes('/api/csrf-token')) {
          tokenFetchCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({ csrfToken: `token-${tokenFetchCount}` })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });
      });

      const { api } = await import('../../src/services/api.js');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Make multiple concurrent requests
      await Promise.all([
        api.post('/api/test1', { data: 1 }),
        api.post('/api/test2', { data: 2 }),
        api.post('/api/test3', { data: 3 })
      ]);

      // Should reuse cached token, not fetch multiple times
      expect(tokenFetchCount).toBe(1);
    });
  });
});

