import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchCsrfToken, getCsrfToken, getHeadersWithCsrf, fetchWithCsrf, initCsrf } from '../../src/utils/csrf';

// Mock fetch
global.fetch = vi.fn();

// Mock console methods
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('CSRF Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Fetch CSRF Token (4 tests)
  describe('fetchCsrfToken', () => {
    it('should fetch CSRF token from server', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token-123' }),
        headers: {
          get: () => null
        }
      });

      const token = await fetchCsrfToken();

      expect(fetch).toHaveBeenCalledWith('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      expect(token).toBe('test-csrf-token-123');
    });

    it('should prefer header token over body token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'body-token' }),
        headers: {
          get: (header) => header === 'X-CSRF-Token' ? 'header-token' : null
        }
      });

      const token = await fetchCsrfToken();

      // Implementation prefers header token
      expect(token).toBe('header-token');
    });

    it('should handle fetch errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const token = await fetchCsrfToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const token = await fetchCsrfToken();

      expect(token).toBeNull();
    });
  });

  // Get CSRF Token (2 tests)
  describe('getCsrfToken', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch token if not cached', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'fresh-token' }),
        headers: { get: () => null }
      });

      const token = await getCsrfToken();

      expect(token).toBe('fresh-token');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached token on subsequent calls', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'cached-token' }),
        headers: { get: () => null }
      });

      const token1 = await getCsrfToken();
      const token2 = await getCsrfToken();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(token1).toBe('cached-token');
      expect(token2).toBe('cached-token');
    });
  });

  // Get Headers with CSRF (2 tests)
  describe('getHeadersWithCsrf', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should include CSRF token in headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'header-token' }),
        headers: { get: () => null }
      });

      const headers = await getHeadersWithCsrf();

      expect(headers['X-CSRF-Token']).toBe('header-token');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should merge additional headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token-abc' }),
        headers: { get: () => null }
      });

      const headers = await getHeadersWithCsrf({
        'Authorization': 'Bearer xyz',
        'Custom-Header': 'value'
      });

      expect(headers['X-CSRF-Token']).toBe('token-abc');
      expect(headers['Authorization']).toBe('Bearer xyz');
      expect(headers['Custom-Header']).toBe('value');
    });
  });

  // Fetch with CSRF (4 tests)
  describe('fetchWithCsrf', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should include CSRF token for POST requests', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'post-token' }),
        headers: { get: () => null }
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await fetchWithCsrf('/api/test', { method: 'POST' });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            'X-CSRF-Token': 'post-token'
          })
        })
      );
    });

    it('should not include CSRF token for GET requests', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'response' })
      });

      await fetchWithCsrf('/api/data');

      expect(fetch).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({
          credentials: 'include'
        })
      );

      const callArgs = fetch.mock.calls[0][1];
      const headers = callArgs.headers || {};
      expect(headers['X-CSRF-Token']).toBeUndefined();
    });

    it('should retry with new token on CSRF error', async () => {
      // First fetch for CSRF token
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'old-token' }),
        headers: { get: () => null }
      });

      // First attempt fails with CSRF error
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ code: 'CSRF_INVALID' })
      });

      // Fetch new token
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'new-token' }),
        headers: { get: () => null }
      });

      // Retry succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const response = await fetchWithCsrf('/api/test', { method: 'POST' });

      expect(response.ok).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('CSRF token invalid, refreshing...');
    });

    it('should handle network errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
        headers: { get: () => null }
      });

      global.fetch.mockRejectedValueOnce(new Error('Network failed'));

      await expect(fetchWithCsrf('/api/test', { method: 'POST' })).rejects.toThrow('Network failed');
    });
  });

  // Init CSRF (2 tests)
  describe('initCsrf', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should initialize CSRF protection', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'init-token' }),
        headers: { get: () => null }
      });

      const token = await initCsrf();

      expect(token).toBe('init-token');
      expect(console.log).toHaveBeenCalledWith('Initializing CSRF protection...');
      expect(console.log).toHaveBeenCalledWith('✅ CSRF token loaded');
    });

    it('should warn if initialization fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Init failed'));

      const token = await initCsrf();

      expect(token).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('⚠️  Failed to load CSRF token');
    });
  });
});
