import { describe, it, expect, beforeEach, vi } from 'vitest';
import TrackingService from '../../../server/services/trackingService.js';
import { prisma } from '../../../database/db.js';

// Mock prisma
vi.mock('../../../database/db.js', () => ({
  prisma: {
    tracking_tokens: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    orders: {
      findUnique: vi.fn(),
    },
    appointments: {
      findUnique: vi.fn(),
    },
  },
}));

describe('TrackingService', () => {
  let service;

  beforeEach(() => {
    service = new TrackingService();
    vi.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a 32-character hex token', () => {
      const token = service.generateToken();
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('createOrGetOrderToken', () => {
    it('should return existing token if valid', async () => {
      const orderId = 'order-123';
      const email = 'customer@example.com';
      const existingToken = {
        id: 'token-123',
        type: 'order',
        reference_id: orderId,
        email,
        token: 'existing-token',
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      };

      prisma.tracking_tokens.findFirst.mockResolvedValue(existingToken);

      const result = await service.createOrGetOrderToken(orderId, email);

      expect(result).toEqual(existingToken);
      expect(prisma.tracking_tokens.create).not.toHaveBeenCalled();
    });

    it('should create new token if none exists', async () => {
      const orderId = 'order-123';
      const email = 'customer@example.com';

      prisma.tracking_tokens.findFirst.mockResolvedValue(null);
      prisma.tracking_tokens.create.mockResolvedValue({
        id: 'token-123',
        type: 'order',
        reference_id: orderId,
        email,
        token: 'new-token',
        expires_at: new Date(),
      });

      const result = await service.createOrGetOrderToken(orderId, email);

      expect(result).toBeDefined();
      expect(prisma.tracking_tokens.create).toHaveBeenCalled();
    });
  });

  describe('getOrderByToken', () => {
    it('should return order for valid token', async () => {
      const token = 'valid-token';
      const trackingToken = {
        id: 'token-123',
        type: 'order',
        reference_id: 'order-123',
        expires_at: new Date(Date.now() + 1000),
      };

      const order = {
        id: 'order-123',
        status: 'pending',
        customer_name: 'Test Customer',
        total: 100.0,
      };

      prisma.tracking_tokens.findUnique.mockResolvedValue(trackingToken);
      prisma.tracking_tokens.update.mockResolvedValue({});
      prisma.orders.findUnique.mockResolvedValue(order);

      const result = await service.getOrderByToken(token);

      expect(result.order).toEqual(order);
      expect(result.trackingToken).toEqual(trackingToken);
    });

    it('should throw error for invalid token', async () => {
      prisma.tracking_tokens.findUnique.mockResolvedValue(null);

      await expect(service.getOrderByToken('invalid')).rejects.toThrow('Invalid');
    });
  });
});



