/**
 * Product stock semantics:
 * null / undefined / '' = unlimited (purchasable unless available === false)
 * stock === 0 OR available === false = not purchasable
 */
export function remainingStock(product) {
  if (!product) return null;
  const raw = product.stock ?? product.inventory;
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function isPurchasable(product) {
  if (!product || product.available === false) {
    return false;
  }
  const remaining = remainingStock(product);
  if (remaining === null) {
    return true;
  }
  return remaining > 0;
}

export function isLowStock(product) {
  const remaining = remainingStock(product);
  return remaining !== null && remaining > 0 && remaining <= 10;
}
