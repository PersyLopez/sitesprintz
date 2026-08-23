import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  isValidOrderTransition,
  getAllowedOrderTransitions,
} from '../../server/services/orderStateMachine.js';

describe('orderStateMachine', () => {
  it('defines canonical statuses without legacy new/completed', () => {
    expect(ORDER_STATUSES.PENDING).toBe('pending');
    expect(ORDER_STATUSES.FULFILLED).toBe('fulfilled');
    expect(ORDER_STATUSES.CANCELLED).toBe('cancelled');
    expect(ORDER_STATUSES).not.toHaveProperty('NEW');
    expect(ORDER_STATUSES).not.toHaveProperty('COMPLETED');
  });

  it('allows pending to fulfilled and cancelled', () => {
    expect(isValidOrderTransition(ORDER_STATUSES.PENDING, ORDER_STATUSES.FULFILLED)).toBe(true);
    expect(isValidOrderTransition(ORDER_STATUSES.PENDING, ORDER_STATUSES.CANCELLED)).toBe(true);
    expect(isValidOrderTransition(ORDER_STATUSES.PENDING, ORDER_STATUSES.DELIVERED)).toBe(false);
  });

  it('returns allowed transitions for pending', () => {
    const allowed = getAllowedOrderTransitions(ORDER_STATUSES.PENDING);
    expect(allowed).toContain(ORDER_STATUSES.FULFILLED);
    expect(allowed).toContain(ORDER_STATUSES.CANCELLED);
  });
});
