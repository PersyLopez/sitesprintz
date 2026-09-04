/**
 * Square OAuth Flow Tests
 * 
 * Tests for Square OAuth connection flow with CSRF protection and encryption.
 * Following TDD: Tests written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import crypto from 'crypto';

// Create mock objects first
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  ttl: vi.fn()
};

const mockLocationsApi = {
  listLocations: vi.fn()
};

const mockSquareApi = {
  locationsApi: mockLocationsApi
};

const mockEncrypt = vi.fn((text) => `encrypted_${text}`);
const mockDecrypt = vi.fn((text) => text.replace('encrypted_', ''));

const mockPrisma = {
  payment_processor_credentials: {
    upsert: vi.fn(),
    findFirst: vi.fn()
  },
  sites: {
    update: vi.fn(),
    findFirst: vi.fn()
  }
};

// Mock global fetch
global.fetch = vi.fn();

// Now setup mocks
vi.mock('../../../server/utils/redis.js', () => ({
  default: mockRedis,
  getRedis: () => mockRedis
}));

vi.mock('square/legacy', () => {
  const Environment = {
    Production: 'production',
    Sandbox: 'sandbox'
  };
  class Client {
    constructor() {
      return mockSquareApi;
    }
  }
  return {
    Client,
    Environment,
    default: { Client, Environment }
  };
});

vi.mock('../../../server/utils/encryption.js', () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt
}));

vi.mock('../../../database/db.js', () => ({
  prisma: mockPrisma
}));

describe('Square OAuth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQUARE_APPLICATION_ID = 'test_app_id';
    process.env.SQUARE_APPLICATION_SECRET = 'test_app_secret';
  });

  afterEach(() => {
    delete process.env.SQUARE_APPLICATION_ID;
    delete process.env.SQUARE_APPLICATION_SECRET;
  });

  describe('initiateSquareOAuth()', () => {
    it('should generate cryptographically secure state token', async () => {
      const { initiateSquareOAuth } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      const result = await initiateSquareOAuth('site_123', 'user_123');
      
      expect(result.state).toHaveLength(64); // 32 bytes hex
      expect(result.state).toMatch(/^[a-f0-9]+$/);
    });

    it('should store state in Redis with 10-minute expiration', async () => {
      const { initiateSquareOAuth } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      const result = await initiateSquareOAuth('site_123', 'user_123');
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `square_oauth_state:${result.state}`,
        600, // 10 minutes
        expect.stringContaining('site_123')
      );
    });

    it('should include required OAuth scopes', async () => {
      const { initiateSquareOAuth } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      const result = await initiateSquareOAuth('site_123', 'user_123');
      
      expect(result.authorizeUrl).toContain('PAYMENTS_READ');
      expect(result.authorizeUrl).toContain('PAYMENTS_WRITE');
      expect(result.authorizeUrl).toContain('MERCHANT_PROFILE_READ');
    });

    it('should include state parameter in authorize URL', async () => {
      const { initiateSquareOAuth } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      const result = await initiateSquareOAuth('site_123', 'user_123');
      
      expect(result.authorizeUrl).toContain(`state=${result.state}`);
    });

    it('should include client_id in authorize URL', async () => {
      const { initiateSquareOAuth } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      const result = await initiateSquareOAuth('site_123', 'user_123');
      
      expect(result.authorizeUrl).toContain(`client_id=${process.env.SQUARE_APPLICATION_ID}`);
    });
  });

  describe('handleSquareCallback()', () => {
    it('should reject if state token not found (CSRF protection)', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const { handleSquareCallback } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      await expect(handleSquareCallback('code', 'invalid-state'))
        .rejects.toThrow('Invalid or expired state token');
    });

    it('should reject if state token expired', async () => {
      mockRedis.get.mockResolvedValue(null); // Expired = not found
      
      const { handleSquareCallback } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      await expect(handleSquareCallback('code', 'expired-state'))
        .rejects.toThrow('Invalid or expired state token');
    });

    it('should encrypt access token before storage', async () => {
      const state = 'valid_state_token';
      const stateData = JSON.stringify({ userId: 'user_123', siteId: 'site_123' });
      
      mockRedis.get.mockResolvedValue(stateData);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sq0atp-xxx',
          refresh_token: 'sq0atr-xxx',
          merchant_id: 'merchant_123',
          expires_at: '2026-01-05T00:00:00Z'
        })
      });
      mockLocationsApi.listLocations.mockResolvedValue({
        result: {
          locations: [{ id: 'loc_123', name: 'Main Location' }]
        }
      });
      mockPrisma.payment_processor_credentials.upsert.mockResolvedValue({
        id: 'cred_123',
        access_token_encrypted: 'encrypted_sq0atp-xxx'
      });
      mockPrisma.sites.update.mockResolvedValue({});
      
      const { handleSquareCallback } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      await handleSquareCallback('valid-code', state);
      
      // Verify encryption was called
      expect(mockEncrypt).toHaveBeenCalledWith('sq0atp-xxx');
      expect(mockEncrypt).toHaveBeenCalledWith('sq0atr-xxx');
      
      // Verify encrypted values stored
      const upsertCall = mockPrisma.payment_processor_credentials.upsert.mock.calls[0][0];
      expect(upsertCall.create.access_token_encrypted).toBe('encrypted_sq0atp-xxx');
      expect(upsertCall.create.refresh_token_encrypted).toBe('encrypted_sq0atr-xxx');
    });

    it('should delete state token after use (prevent replay)', async () => {
      const state = 'valid_state_token';
      const stateData = JSON.stringify({ userId: 'user_123', siteId: 'site_123' });
      
      mockRedis.get.mockResolvedValue(stateData);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sq0atp-xxx',
          merchant_id: 'merchant_123'
        })
      });
      mockLocationsApi.listLocations.mockResolvedValue({
        result: { locations: [] }
      });
      mockPrisma.payment_processor_credentials.upsert.mockResolvedValue({});
      mockPrisma.sites.update.mockResolvedValue({});
      
      const { handleSquareCallback } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      await expect(handleSquareCallback('valid-code', state))
        .rejects.toThrow('active location');
      
      expect(mockPrisma.payment_processor_credentials.upsert).not.toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith(`square_oauth_state:${state}`);
    });

    it('fails closed when Square locations are inactive', async () => {
      const state = 'valid_state_token';
      const stateData = JSON.stringify({ userId: 'user_123', siteId: 'site_123' });

      mockRedis.get.mockResolvedValue(stateData);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sq0atp-xxx',
          merchant_id: 'merchant_123'
        })
      });
      mockLocationsApi.listLocations.mockResolvedValue({
        result: { locations: [{ id: 'loc_inactive', name: 'Closed', status: 'INACTIVE' }] }
      });

      const { handleSquareCallback } = await import('../../../server/services/payments/SquareOAuthService.js');

      await expect(handleSquareCallback('valid-code', state))
        .rejects.toThrow('active location');
      expect(mockPrisma.payment_processor_credentials.upsert).not.toHaveBeenCalled();
    });

    it('should store location IDs in metadata', async () => {
      const state = 'valid_state_token';
      const stateData = JSON.stringify({ userId: 'user_123', siteId: 'site_123' });
      
      mockRedis.get.mockResolvedValue(stateData);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sq0atp-xxx',
          merchant_id: 'merchant_123'
        })
      });
      mockLocationsApi.listLocations.mockResolvedValue({
        result: {
          locations: [
            { id: 'loc_123', name: 'Main Location', status: 'ACTIVE' },
            { id: 'loc_456', name: 'Second Location', status: 'ACTIVE' }
          ]
        }
      });
      mockPrisma.payment_processor_credentials.upsert.mockResolvedValue({});
      mockPrisma.sites.update.mockResolvedValue({});
      
      const { handleSquareCallback } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      await handleSquareCallback('valid-code', state);
      
      const upsertCall = mockPrisma.payment_processor_credentials.upsert.mock.calls[0][0];
      expect(upsertCall.create.metadata.location_id).toBe('loc_123');
      expect(upsertCall.create.metadata.location_ids).toEqual([
        { id: 'loc_123', name: 'Main Location' },
        { id: 'loc_456', name: 'Second Location' }
      ]);
    });

    it('should update site payment_processor field', async () => {
      const state = 'valid_state_token';
      const stateData = JSON.stringify({ userId: 'user_123', siteId: 'site_123' });
      
      mockRedis.get.mockResolvedValue(stateData);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'sq0atp-xxx',
          merchant_id: 'merchant_123'
        })
      });
      mockLocationsApi.listLocations.mockResolvedValue({
        result: { locations: [{ id: 'loc_123', name: 'Main Location', status: 'ACTIVE' }] }
      });
      mockPrisma.payment_processor_credentials.upsert.mockResolvedValue({});
      mockPrisma.sites.update.mockResolvedValue({});
      
      const { handleSquareCallback } = await import('../../../server/services/payments/SquareOAuthService.js');
      
      await handleSquareCallback('valid-code', state);
      
      expect(mockRedis.del).toHaveBeenCalledWith(`square_oauth_state:${state}`);
      expect(mockPrisma.sites.update).toHaveBeenCalledWith({
        where: { id: 'site_123' },
        data: {
          payment_processor: 'square'
        }
      });
    });
  });
});
