import { describe, it, expect } from 'vitest';
import {
  OWNER_ORDER_FILTERS,
  ownerFilterToApiQueryStatus,
  orderMatchesOwnerFilter,
  countOrdersForOwnerFilter,
  isOwnerActionableOrder,
  ownerMarkCompleteApiStatus,
  ownerCancelApiStatus,
  formatOwnerOrderStatusLabel,
  ownerOrderStatusCssClass,
} from '../../src/utils/orderOwnerStatus.js';

describe('orderOwnerStatus', () => {
  describe('ownerFilterToApiQueryStatus', () => {
    it('does not narrow New to a single API status', () => {
      expect(ownerFilterToApiQueryStatus(OWNER_ORDER_FILTERS.NEW)).toBeUndefined();
    });

    it('maps Cancelled to cancelled', () => {
      expect(ownerFilterToApiQueryStatus(OWNER_ORDER_FILTERS.CANCELLED)).toBe('cancelled');
    });

    it('does not send completed to the API', () => {
      expect(ownerFilterToApiQueryStatus(OWNER_ORDER_FILTERS.COMPLETED)).toBeUndefined();
      expect(ownerFilterToApiQueryStatus(OWNER_ORDER_FILTERS.ALL)).toBeUndefined();
    });
  });

  describe('orderMatchesOwnerFilter', () => {
    it('matches pending, new, and processing for New filter', () => {
      expect(orderMatchesOwnerFilter({ status: 'pending' }, OWNER_ORDER_FILTERS.NEW)).toBe(true);
      expect(orderMatchesOwnerFilter({ status: 'new' }, OWNER_ORDER_FILTERS.NEW)).toBe(true);
      expect(orderMatchesOwnerFilter({ status: 'processing' }, OWNER_ORDER_FILTERS.NEW)).toBe(true);
      expect(orderMatchesOwnerFilter({ status: 'fulfilled' }, OWNER_ORDER_FILTERS.NEW)).toBe(false);
    });

    it('matches fulfilled family for Completed filter', () => {
      expect(orderMatchesOwnerFilter({ status: 'fulfilled' }, OWNER_ORDER_FILTERS.COMPLETED)).toBe(true);
      expect(orderMatchesOwnerFilter({ status: 'shipped' }, OWNER_ORDER_FILTERS.COMPLETED)).toBe(true);
      expect(orderMatchesOwnerFilter({ status: 'delivered' }, OWNER_ORDER_FILTERS.COMPLETED)).toBe(true);
      expect(orderMatchesOwnerFilter({ status: 'pending' }, OWNER_ORDER_FILTERS.COMPLETED)).toBe(false);
    });
  });

  describe('countOrdersForOwnerFilter', () => {
    const orders = [
      { status: 'new' },
      { status: 'fulfilled' },
      { status: 'cancelled' },
    ];

    it('counts all orders', () => {
      expect(countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.ALL)).toBe(3);
    });

    it('counts new and completed separately', () => {
      expect(countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.NEW)).toBe(1);
      expect(countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.COMPLETED)).toBe(1);
      expect(countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.CANCELLED)).toBe(1);
    });
  });

  describe('actions and display', () => {
    it('identifies actionable orders', () => {
      expect(isOwnerActionableOrder({ status: 'pending' })).toBe(true);
      expect(isOwnerActionableOrder({ status: 'new' })).toBe(true);
      expect(isOwnerActionableOrder({ status: 'fulfilled' })).toBe(false);
    });

    it('uses API statuses for mutations', () => {
      expect(ownerMarkCompleteApiStatus()).toBe('fulfilled');
      expect(ownerCancelApiStatus()).toBe('cancelled');
    });

    it('formats labels and css classes', () => {
      expect(formatOwnerOrderStatusLabel('pending')).toBe('New');
      expect(formatOwnerOrderStatusLabel('fulfilled')).toBe('Completed');
      expect(ownerOrderStatusCssClass('shipped')).toBe('status-completed');
      expect(ownerOrderStatusCssClass('new')).toBe('status-new');
    });
  });
});
