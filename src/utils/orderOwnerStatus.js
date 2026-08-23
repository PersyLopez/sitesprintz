/**
 * Owner Orders inbox — UI filter labels vs API / DB order statuses.
 * API state machine: pending, processing, fulfilled, shipped, delivered, cancelled.
 */

export const OWNER_ORDER_FILTERS = {
  ALL: 'all',
  NEW: 'new',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/** Statuses that count as "New" in the owner inbox */
export const OWNER_NEW_STATUSES = ['pending', 'new', 'processing'];

/** Statuses that count as "Completed" in the owner inbox */
export const OWNER_COMPLETED_STATUSES = ['fulfilled', 'shipped', 'delivered', 'completed'];

export const OWNER_CANCELLED_STATUSES = ['cancelled'];

/** API status sent on GET ?status= for a UI filter chip (undefined = load all) */
export function ownerFilterToApiQueryStatus(filter) {
  if (filter === OWNER_ORDER_FILTERS.NEW) {
    // New spans pending/new/processing — load all and filter client-side
    return undefined;
  }
  if (filter === OWNER_ORDER_FILTERS.CANCELLED) {
    return 'cancelled';
  }
  // Completed spans fulfilled/shipped/delivered — load all and filter client-side
  return undefined;
}

export function orderMatchesOwnerFilter(order, filter) {
  const status = order?.status;
  if (!status || filter === OWNER_ORDER_FILTERS.ALL) {
    return filter === OWNER_ORDER_FILTERS.ALL;
  }
  if (filter === OWNER_ORDER_FILTERS.NEW) {
    return OWNER_NEW_STATUSES.includes(status);
  }
  if (filter === OWNER_ORDER_FILTERS.COMPLETED) {
    return OWNER_COMPLETED_STATUSES.includes(status);
  }
  if (filter === OWNER_ORDER_FILTERS.CANCELLED) {
    return OWNER_CANCELLED_STATUSES.includes(status);
  }
  return true;
}

export function countOrdersForOwnerFilter(orders, filter) {
  if (filter === OWNER_ORDER_FILTERS.ALL) {
    return orders.length;
  }
  return orders.filter((order) => orderMatchesOwnerFilter(order, filter)).length;
}

export function isOwnerActionableOrder(order) {
  return OWNER_NEW_STATUSES.includes(order?.status);
}

/** Status value for PUT /orders/:id/status when marking complete */
export function ownerMarkCompleteApiStatus() {
  return 'fulfilled';
}

export function ownerCancelApiStatus() {
  return 'cancelled';
}

export function formatOwnerOrderStatusLabel(status) {
  if (OWNER_NEW_STATUSES.includes(status)) {
    return 'New';
  }
  if (OWNER_COMPLETED_STATUSES.includes(status)) {
    return 'Completed';
  }
  if (status === 'cancelled') {
    return 'Cancelled';
  }
  if (status === 'processing') {
    return 'Processing';
  }
  return status || 'Unknown';
}

export function ownerOrderStatusCssClass(status) {
  if (OWNER_NEW_STATUSES.includes(status)) {
    return 'status-new';
  }
  if (OWNER_COMPLETED_STATUSES.includes(status)) {
    return 'status-completed';
  }
  if (status === 'cancelled') {
    return 'status-cancelled';
  }
  return '';
}

export function ownerOrderStatusIcon(status) {
  if (OWNER_NEW_STATUSES.includes(status)) {
    return '🔔';
  }
  if (OWNER_COMPLETED_STATUSES.includes(status)) {
    return '✅';
  }
  if (status === 'cancelled') {
    return '❌';
  }
  return '📦';
}
