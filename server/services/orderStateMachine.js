/**
 * Order State Machine
 * Defines canonical order statuses and allowed transitions
 */

export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  FULFILLED: 'fulfilled',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  FAILED: 'failed'
};

export const PAYMENT_STATUSES = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

/**
 * Define allowed state transitions for orders
 * Maps current status -> array of allowed next statuses
 */
export const ORDER_STATE_TRANSITIONS = {
  [ORDER_STATUSES.PENDING]: [
    ORDER_STATUSES.PROCESSING,
    ORDER_STATUSES.FULFILLED,
    ORDER_STATUSES.CANCELLED,
    ORDER_STATUSES.FAILED
  ],
  [ORDER_STATUSES.PROCESSING]: [
    ORDER_STATUSES.FULFILLED,
    ORDER_STATUSES.CANCELLED,
    ORDER_STATUSES.FAILED
  ],
  [ORDER_STATUSES.FULFILLED]: [
    ORDER_STATUSES.SHIPPED,
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.SHIPPED]: [
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.DELIVERED]: [
    ORDER_STATUSES.REFUNDED
  ],
  [ORDER_STATUSES.CANCELLED]: [],
  [ORDER_STATUSES.REFUNDED]: [],
  [ORDER_STATUSES.FAILED]: [
    ORDER_STATUSES.PENDING // Allow retry
  ]
};

/**
 * Define allowed payment transitions
 */
export const PAYMENT_STATE_TRANSITIONS = {
  [PAYMENT_STATUSES.UNPAID]: [
    PAYMENT_STATUSES.PAID,
    PAYMENT_STATUSES.FAILED
  ],
  [PAYMENT_STATUSES.PAID]: [
    PAYMENT_STATUSES.REFUNDED
  ],
  [PAYMENT_STATUSES.FAILED]: [
    PAYMENT_STATUSES.PAID // Allow retry
  ],
  [PAYMENT_STATUSES.REFUNDED]: []
};

/**
 * Validate if a status transition is allowed
 * @param {string} currentStatus - Current order status
 * @param {string} nextStatus - Desired next status
 * @returns {boolean} - True if transition is allowed
 */
export function isValidOrderTransition(currentStatus, nextStatus) {
  const allowedTransitions = ORDER_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(nextStatus);
}

/**
 * Validate if a payment transition is allowed
 * @param {string} currentStatus - Current payment status
 * @param {string} nextStatus - Desired next status
 * @returns {boolean} - True if transition is allowed
 */
export function isValidPaymentTransition(currentStatus, nextStatus) {
  const allowedTransitions = PAYMENT_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(nextStatus);
}

/**
 * Get allowed next statuses for current order status
 * @param {string} currentStatus - Current order status
 * @returns {array} - Array of allowed next statuses
 */
export function getAllowedOrderTransitions(currentStatus) {
  return ORDER_STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * Get allowed next statuses for current payment status
 * @param {string} currentStatus - Current payment status
 * @returns {array} - Array of allowed next statuses
 */
export function getAllowedPaymentTransitions(currentStatus) {
  return PAYMENT_STATE_TRANSITIONS[currentStatus] || [];
}

export default {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  ORDER_STATE_TRANSITIONS,
  PAYMENT_STATE_TRANSITIONS,
  isValidOrderTransition,
  isValidPaymentTransition,
  getAllowedOrderTransitions,
  getAllowedPaymentTransitions
};
