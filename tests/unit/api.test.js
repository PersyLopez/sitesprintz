import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api as apiClient } from '../../src/services/api';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock window.location
const locationMock = { href: '', pathname: '/dashboard' };
Object.defineProperty(window, 'location', {
  get: () => locationMock,
  configurable: true,
});

// Mock console methods
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('API Client Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Basic Requests (4 tests)
  describe('Basic Requests', () => {
    it('should make GET request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' })
      });

      const result = await apiClient.get('/api/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should make POST request with body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 1 })
      });

      const data = { name: 'Test' };
      const result = await apiClient.post('/api/items', data);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
          credentials: 'include'
        })
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should make PUT request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ updated: true })
      });

      const result = await apiClient.put('/api/items/1', { name: 'Updated' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/1'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should make DELETE request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({})
      });

      await apiClient.delete('/api/items/1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // Authentication (3 tests)
  describe('Authentication', () => {
    it('should include auth token if available', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'test-token-123';
        return null;
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'protected' })
      });

      await apiClient.get('/api/protected');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });

    it('should handle 401 unauthorized', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      await expect(apiClient.get('/api/protected')).rejects.toThrow();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
      expect(window.location.href).toBe('/login');
    });

    it('should not include auth token if not available', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'public' })
      });

      await apiClient.get('/api/public');

      const callArgs = fetch.mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });
  });

  // Error Handling (4 tests)
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failed'));

      await expect(apiClient.get('/api/test')).rejects.toThrow('Network failed');
    });

    it('should handle 404 not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });

      await expect(apiClient.get('/api/missing')).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      });

      await expect(apiClient.get('/api/error')).rejects.toThrow();
    });

    it('should handle malformed JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(apiClient.get('/api/test')).rejects.toThrow();
    });

    it('should attach statusCode and payload without retrying 409', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Version conflict detected', currentVersion: 3 }),
      });

      await expect(apiClient.get('/api/test', { retries: 3 })).rejects.toMatchObject({
        statusCode: 409,
        payload: { currentVersion: 3 },
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry other 4xx but should retry 429', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Bad request' }),
      });

      await expect(apiClient.get('/api/test', { retries: 3 })).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(1);

      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: () => 'application/json' },
          json: async () => ({ error: 'Rate limited' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ ok: true }),
        });

      const result = await apiClient.get('/api/test', { retries: 3 });
      expect(result).toEqual({ ok: true });
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  // Headers (3 tests)
  describe('Headers', () => {
    it('should include default Content-Type header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      await apiClient.post('/api/test', {});

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should allow custom headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      await apiClient.get('/api/test', { 
        headers: { 'X-Custom': 'value' } 
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value'
          })
        })
      );
    });

    it('should always include credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      await apiClient.get('/api/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include'
        })
      );
    });
  });
});

