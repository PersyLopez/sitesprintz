/**
 * Order field mapping and validation
 * Handles normalization between legacy field names and canonical Prisma schema
 */

import { Decimal } from '@prisma/client/runtime/library.js';

/**
 * Normalize order object from webhook or old code to canonical format
 * Handles variations: total_amount vs total vs amount, etc.
 */
export function normalizeOrderData(data) {
  return {
    id: data.id || undefined,
    site_id: data.site_id || data.siteId || undefined,
    user_id: data.user_id || data.userId || undefined,
    customer_email: data.customer_email || data.customerEmail || undefined,
    customer_name: data.customer_name || data.customerName || data.customer_details?.name || 'Guest',
    customer_phone: data.customer_phone || data.customerPhone || undefined,
    items: data.items || data.order_items || '[]',
    total_amount: toDecimal(data.total_amount || data.total || data.amount || 0),
    currency: data.currency || 'usd',
    stripe_session_id: data.stripe_session_id || data.stripeSessionId || undefined,
    stripe_payment_id: data.stripe_payment_id || data.stripePaymentId || undefined,
    stripe_charge_id: data.stripe_charge_id || data.stripeChargeId || undefined,
    payment_status: data.payment_status || data.paymentStatus || 'unpaid',
    status: data.status || 'pending',
    fulfillment_type: data.fulfillment_type || data.fulfillmentType || undefined,
    scheduled_for: data.scheduled_for || data.scheduledFor || undefined,
    shipping_address: data.shipping_address || data.shippingAddress || undefined,
    special_instructions: data.special_instructions || data.specialInstructions || undefined,
    notes: data.notes || undefined,
    metadata: data.metadata || undefined,
  };
}

/**
 * Normalize order items array
 * Handles JSON strings and arrays
 */
export function normalizeOrderItems(items) {
  if (!items) return [];
  
  // If already an array, return as is
  if (Array.isArray(items)) return items;
  
  // If JSON string, parse it
  if (typeof items === 'string') {
    try {
      return JSON.parse(items);
    } catch {
      console.warn('Failed to parse order items JSON:', items);
      return [];
    }
  }
  
  return [];
}

/**
 * Convert value to Decimal or throw
 */
export function toDecimal(value) {
  if (typeof value === 'number') return new Decimal(value);
  if (typeof value === 'string') return new Decimal(value);
  if (value && typeof value.toNumber === 'function') return value; // Already Decimal
  return new Decimal(0);
}

/**
 * Validate required order fields
 */
export function validateOrderData(data) {
  const errors = [];
  
  if (!data.customer_email) errors.push('customer_email is required');
  if (!data.site_id) errors.push('site_id is required');
  if (typeof data.total_amount !== 'number' && !data.total_amount?.toNumber) {
    errors.push('total_amount must be numeric');
  }
  
  if (errors.length > 0) {
    throw new Error(`Order validation failed: ${errors.join('; ')}`);
  }
  
  return true;
}

/**
 * Validate order item
 */
export function validateOrderItem(item) {
  const errors = [];
  
  if (!item.name) errors.push('item.name is required');
  if (!item.quantity || item.quantity < 1) errors.push('item.quantity must be >= 1');
  if (typeof item.unit_price !== 'number' && !item.unit_price?.toNumber) {
    errors.push('item.unit_price must be numeric');
  }
  if (typeof item.total_price !== 'number' && !item.total_price?.toNumber) {
    errors.push('item.total_price must be numeric');
  }
  
  if (errors.length > 0) {
    throw new Error(`Order item validation failed: ${errors.join('; ')}`);
  }
  
  return true;
}
