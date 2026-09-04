import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookProcessor } from '../../server/services/webhookProcessor.js';

function createMockDb() {
  return {
    webhook_events: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    users: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    orders: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('WebhookProcessor Service', () => {
  let mockDb;
  let mockEmailService;
  let processor;

  beforeEach(() => {
    mockDb = createMockDb();
    mockEmailService = { sendEmail: vi.fn().mockResolvedValue({ success: true }) };
    processor = new WebhookProcessor(mockDb, mockEmailService);
  });

  function setupFreshEvent(event) {
    mockDb.webhook_events.findUnique.mockResolvedValue(null);
    mockDb.webhook_events.create.mockResolvedValue({ id: 'wh_1' });
    mockDb.webhook_events.update.mockResolvedValue({ id: 'wh_1' });
    return processor.processEvent(event);
  }

  describe('processEvent idempotency', () => {
    it('returns duplicate when event already processed', async () => {
      mockDb.webhook_events.findUnique.mockResolvedValue({ id: 'wh_existing', status: 'processed' });

      const result = await processor.processEvent({
        id: 'evt_dup',
        type: 'account.updated',
        data: { object: {} },
      });

      expect(result).toEqual({ processed: false, reason: 'duplicate' });
      expect(mockDb.webhook_events.create).not.toHaveBeenCalled();
    });

    it('returns duplicate on create-first unique violation when already processed', async () => {
      mockDb.webhook_events.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ status: 'processed' });
      mockDb.webhook_events.create.mockRejectedValue({ code: 'P2002' });

      const result = await processor.processEvent({
        id: 'evt_race',
        type: 'account.updated',
        data: { object: {} },
      });

      expect(result).toEqual({ processed: false, reason: 'duplicate' });
    });

    it('reclaims failed row on P2002 and runs handler', async () => {
      mockDb.webhook_events.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ status: 'failed' });
      mockDb.webhook_events.create.mockRejectedValue({ code: 'P2002' });
      mockDb.webhook_events.update.mockResolvedValue({ id: 'wh_1' });
      mockDb.users.findMany.mockResolvedValue([]);

      const result = await processor.processEvent({
        id: 'evt_reclaim',
        type: 'account.updated',
        data: {
          object: { id: 'acct_123', charges_enabled: true, payouts_enabled: true },
        },
      });

      expect(mockDb.webhook_events.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'processing' }),
        })
      );
      expect(result.processed).toBe(true);
      expect(result.warning).toBe('no_user_found');
    });

    it('skips a fresh processing row on P2002 without running the handler', async () => {
      mockDb.webhook_events.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          status: 'processing',
          created_at: new Date(),
        });
      mockDb.webhook_events.create.mockRejectedValue({ code: 'P2002' });

      const result = await processor.processEvent({
        id: 'evt_in_flight',
        type: 'account.updated',
        data: {
          object: { id: 'acct_123', charges_enabled: true, payouts_enabled: true },
        },
      });

      expect(result).toEqual({ processed: false, reason: 'duplicate' });
      expect(mockDb.webhook_events.update).not.toHaveBeenCalled();
      expect(mockDb.users.findMany).not.toHaveBeenCalled();
    });

    it('reclaims a stale processing row on P2002 and runs handler', async () => {
      mockDb.webhook_events.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          status: 'processing',
          created_at: new Date(Date.now() - 16 * 60 * 1000),
        });
      mockDb.webhook_events.create.mockRejectedValue({ code: 'P2002' });
      mockDb.webhook_events.update.mockResolvedValue({ id: 'wh_1' });
      mockDb.users.findMany.mockResolvedValue([]);

      const result = await processor.processEvent({
        id: 'evt_stale_processing',
        type: 'account.updated',
        data: {
          object: { id: 'acct_123', charges_enabled: true, payouts_enabled: true },
        },
      });

      expect(mockDb.webhook_events.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'processing' }),
        })
      );
      expect(result.processed).toBe(true);
      expect(result.warning).toBe('no_user_found');
    });

    it('marks failed and rethrows when handler throws', async () => {
      mockDb.webhook_events.findUnique.mockResolvedValue(null);
      mockDb.webhook_events.create.mockResolvedValue({ id: 'wh_1' });
      mockDb.users.findMany.mockRejectedValue(new Error('Handler blew up'));
      mockDb.webhook_events.update.mockResolvedValue({ id: 'wh_1' });

      await expect(
        processor.processEvent({
          id: 'evt_handler_fail',
          type: 'account.updated',
          data: {
            object: { id: 'acct_123', charges_enabled: true, payouts_enabled: true },
          },
        })
      ).rejects.toThrow('Handler blew up');

      expect(mockDb.webhook_events.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        })
      );
    });

    it('returns unknown_event_type for unregistered handlers', async () => {
      const result = await setupFreshEvent({
        id: 'evt_unknown',
        type: 'unknown.event.type',
        data: { object: {} },
      });

      expect(result).toEqual({ processed: false, reason: 'unknown_event_type' });
      expect(mockDb.webhook_events.update).toHaveBeenCalled();
    });

    it('throws when markEventAsProcessed fails after successful handler', async () => {
      mockDb.webhook_events.findUnique.mockResolvedValue(null);
      mockDb.webhook_events.create.mockResolvedValue({ id: 'wh_1' });
      mockDb.users.findMany.mockResolvedValue([]);
      mockDb.webhook_events.update.mockRejectedValue(new Error('DB write failed'));

      await expect(
        processor.processEvent({
          id: 'evt_fail_mark',
          type: 'account.updated',
          data: {
            object: { id: 'acct_123', charges_enabled: true, payouts_enabled: true },
          },
        })
      ).rejects.toThrow('DB write failed');
    });
  });

  describe('isEventProcessed', () => {
    it('returns true only when status is processed', async () => {
      mockDb.webhook_events.findUnique.mockResolvedValue({ status: 'processed' });
      await expect(processor.isEventProcessed('evt_done')).resolves.toBe(true);
    });

    it('returns false when row exists but status is processing or failed', async () => {
      mockDb.webhook_events.findUnique.mockResolvedValue({ status: 'processing' });
      await expect(processor.isEventProcessed('evt_processing')).resolves.toBe(false);

      mockDb.webhook_events.findUnique.mockResolvedValue({ status: 'failed' });
      await expect(processor.isEventProcessed('evt_failed')).resolves.toBe(false);
    });

    it('throws on database error', async () => {
      mockDb.webhook_events.findUnique.mockRejectedValue(new Error('Database connection lost'));

      await expect(processor.isEventProcessed('evt_error')).rejects.toThrow('Database connection lost');
    });
  });

  describe('account.updated', () => {
    it('sets stripe_connected from charges and payouts enabled', async () => {
      mockDb.users.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockDb.users.updateMany.mockResolvedValue({ count: 1 });

      const result = await setupFreshEvent({
        id: 'evt_account',
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_123',
            charges_enabled: true,
            payouts_enabled: true,
          },
        },
      });

      expect(result.processed).toBe(true);
      expect(mockDb.users.updateMany).toHaveBeenCalledWith({
        where: { stripe_account_id: 'acct_123' },
        data: { stripe_connected: true },
      });
    });

    it('no-ops when no user matches stripe account', async () => {
      mockDb.users.findMany.mockResolvedValue([]);

      const result = await setupFreshEvent({
        id: 'evt_account_none',
        type: 'account.updated',
        data: {
          object: { id: 'acct_orphan', charges_enabled: true, payouts_enabled: true },
        },
      });

      expect(result.warning).toBe('no_user_found');
      expect(mockDb.users.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('charge.dispute', () => {
    it('marks order payment_status and status as disputed', async () => {
      mockDb.orders.findFirst.mockResolvedValue({ id: 'order-1' });
      mockDb.orders.update.mockResolvedValue({ id: 'order-1' });

      const result = await setupFreshEvent({
        id: 'evt_dispute',
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_123',
            charge: 'ch_123',
            payment_intent: 'pi_123',
          },
        },
      });

      expect(result.processed).toBe(true);
      expect(mockDb.orders.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: 'disputed',
          payment_status: 'disputed',
          updated_at: expect.any(Date),
        },
      });
    });

    it('warns without order lookup when charge and payment_intent missing', async () => {
      const result = await setupFreshEvent({
        id: 'evt_dispute_no_refs',
        type: 'charge.dispute',
        data: { object: { id: 'dp_no_refs' } },
      });

      expect(result.warning).toBe('missing_charge_reference');
      expect(mockDb.orders.findFirst).not.toHaveBeenCalled();
    });

    it('warns and returns when no order matches dispute', async () => {
      mockDb.orders.findFirst.mockResolvedValue(null);

      const result = await setupFreshEvent({
        id: 'evt_dispute_missing',
        type: 'charge.dispute',
        data: {
          object: { id: 'dp_orphan', charge: 'ch_orphan' },
        },
      });

      expect(result.warning).toBe('order_not_found');
      expect(mockDb.orders.update).not.toHaveBeenCalled();
    });
  });

  describe('booking payment', () => {
    it('returns warning when appointment_id missing (does not throw)', async () => {
      const result = await processor.handleBookingPayment({
        id: 'cs_booking',
        metadata: { type: 'booking' },
      });

      expect(result).toEqual({
        action: 'booking_payment_processed',
        warning: 'missing appointment_id',
      });
    });
  });

  describe('createOrder', () => {
    it('persists the Stripe payment intent ID', async () => {
      mockDb.$transaction.mockImplementation(async (callback) => callback(mockDb));
      mockDb.orders.create.mockResolvedValue({ id: 'order-1', order_items: [] });

      await processor.createOrder({
        id: 'cs_order',
        payment_intent: 'pi_order',
        amount_total: 2500,
        currency: 'usd',
        customer_email: 'buyer@example.com',
        metadata: {
          site_id: 'site-1',
          order_items: '[]',
        },
      });

      expect(mockDb.orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripe_session_id: 'cs_order',
            stripe_payment_id: 'pi_order',
          }),
        })
      );
    });
  });
});
