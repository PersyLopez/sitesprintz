/**
 * Pay-on-site (cash / in person) — owner opt-in, priced from the Neon site row.
 */

export function isPayOnSiteEnabled(siteData) {
  return siteData?.settings?.payOnSite === true;
}

/**
 * Merge pay-on-site into published site_data.
 * Enabling also turns on allowCheckout so the live cart can appear.
 * Disabling leaves Stripe checkout flags alone.
 *
 * @param {object} siteData
 * @param {boolean} payOnSite
 * @returns {object}
 */
export function applyPayOnSiteSetting(siteData, payOnSite) {
  const source = siteData && typeof siteData === 'object' ? siteData : {};
  const enabled = Boolean(payOnSite);
  const existingFeatures = source._features && typeof source._features === 'object'
    ? source._features
    : {};
  const cash = existingFeatures.cashPayment && typeof existingFeatures.cashPayment === 'object'
    ? existingFeatures.cashPayment
    : {};

  return {
    ...source,
    settings: {
      ...(source.settings || {}),
      payOnSite: enabled,
      ...(enabled ? { allowCheckout: true } : {})
    },
    _features: {
      ...existingFeatures,
      cashPayment: {
        offered: cash.offered !== false,
        enabled
      }
    }
  };
}

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function productKey(item, index) {
  if (item?.id) return String(item.id);
  const slug = String(item?.name || item?.title || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
  return `${slug}-${index}`;
}

/** Stable catalog id for a site_data product (explicit id or name+index). */
export { productKey as catalogProductKey };

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function pushCatalogItem(list, item, index) {
  if (!item || item.available === false) return;
  const name = String(item.name || item.title || '').trim();
  const price = parseMoney(item.price);
  if (!name || price <= 0) return;
  const catalogItem = {
    id: productKey(item, index),
    name,
    price
  };
  if (item.stock !== undefined && item.stock !== null) {
    const stock = Number.parseInt(String(item.stock), 10);
    if (Number.isFinite(stock)) {
      catalogItem.stock = stock;
    }
  }
  list.push(catalogItem);
}

/**
 * Flatten menu / products / catalog sections from the site's Neon site_data.
 *
 * @param {object|null|undefined} siteData
 * @returns {{ id: string, name: string, price: number }[]}
 */
export function extractSiteCatalog(siteData) {
  const catalog = [];
  const data = siteData && typeof siteData === 'object' ? siteData : {};

  if (Array.isArray(data.products)) {
    data.products.forEach((item, index) => pushCatalogItem(catalog, item, index));
  }

  (data.menu?.sections || []).forEach((section) => {
    (section.items || []).forEach((item, index) => pushCatalogItem(catalog, item, index));
  });

  (Array.isArray(data.sections) ? data.sections : []).forEach((section) => {
    if (!['catalog', 'menu', 'products'].includes(section?.type)) return;
    (section.content?.items || []).forEach((item, index) => pushCatalogItem(catalog, item, index));
  });

  if (Array.isArray(data.services?.items)) {
    data.services.items.forEach((item, index) => pushCatalogItem(catalog, item, index));
  }

  return catalog;
}

/**
 * Build line items from the cart, using catalog prices from the Neon site row.
 * Client prices are ignored.
 *
 * @param {unknown} rawItems
 * @param {{ id: string, name: string, price: number }[]} catalog
 * @returns {{ valid: true, items: object[], total: number } | { valid: false, error: string }}
 */
export function buildPayOnSiteOrderItems(rawItems, catalog) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { valid: false, error: 'Cart is empty' };
  }

  if (rawItems.length > 50) {
    return { valid: false, error: 'Too many items in this order' };
  }

  if (!Array.isArray(catalog) || catalog.length === 0) {
    return { valid: false, error: 'This site has no products to order' };
  }

  const byId = new Map();
  const byName = new Map();
  for (const item of catalog) {
    if (item.id) byId.set(String(item.id), item);
    const key = normalizeName(item.name);
    if (key && !byName.has(key)) byName.set(key, item);
  }

  const items = [];
  let total = 0;

  for (const raw of rawItems) {
    const quantity = Number.parseInt(raw?.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { valid: false, error: 'Invalid item quantity' };
    }

    const id = typeof raw?.id === 'string' ? raw.id.slice(0, 100) : '';
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    const catalogItem = (id && byId.get(id)) || (name && byName.get(normalizeName(name)));

    if (!catalogItem) {
      return { valid: false, error: 'An item is not on this site\'s menu' };
    }

    if (catalogItem.stock !== undefined && catalogItem.stock !== null) {
      if (catalogItem.stock < quantity) {
        return {
          valid: false,
          error: `Insufficient stock for ${catalogItem.name}. Available: ${catalogItem.stock}, Requested: ${quantity}`
        };
      }
    }

    items.push({
      id: catalogItem.id,
      name: catalogItem.name,
      price: catalogItem.price,
      quantity
    });
    total += catalogItem.price * quantity;
  }

  const roundedTotal = Math.round(total * 100) / 100;
  if (roundedTotal <= 0) {
    return { valid: false, error: 'Order total must be greater than zero' };
  }
  if (roundedTotal > 100000) {
    return { valid: false, error: 'Order total is too large' };
  }

  return { valid: true, items, total: roundedTotal };
}

/**
 * Nested-merge settings so an editor save cannot wipe payOnSite
 * by replacing the whole settings object.
 *
 * @param {object} existingData
 * @param {object} newData
 * @returns {object}
 */
export function mergeSiteDataSettings(existingData, newData) {
  const existing = existingData && typeof existingData === 'object' ? existingData : {};
  const incoming = newData && typeof newData === 'object' ? newData : {};
  const existingFeatures = existing._features && typeof existing._features === 'object'
    ? existing._features
    : {};
  const incomingFeatures = incoming._features && typeof incoming._features === 'object'
    ? incoming._features
    : {};

  const existingSettings = existing.settings && typeof existing.settings === 'object'
    ? existing.settings
    : {};
  const incomingSettings = incoming.settings && typeof incoming.settings === 'object'
    ? incoming.settings
    : {};
  const existingDelivery = existingSettings.delivery && typeof existingSettings.delivery === 'object'
    ? existingSettings.delivery
    : {};
  const hasIncomingDelivery = Object.prototype.hasOwnProperty.call(incomingSettings, 'delivery');

  return {
    ...existing,
    ...incoming,
    settings: {
      ...existingSettings,
      ...incomingSettings,
      delivery: hasIncomingDelivery
        ? {
            ...existingDelivery,
            ...(incomingSettings.delivery && typeof incomingSettings.delivery === 'object'
              ? incomingSettings.delivery
              : {}),
          }
        : existingSettings.delivery,
    },
    _features: {
      ...existingFeatures,
      ...incomingFeatures
    }
  };
}
