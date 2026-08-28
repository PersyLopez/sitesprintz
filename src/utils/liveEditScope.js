export const LIVE_EDIT_SCOPE_HINT =
  'Click outlined text to change it. Click a sample photo to drop in yours. Phone, hours, and booking are not edited here.';

export const LIVE_EDIT_HELP_ROWS = [
  { key: 'settings', title: 'Phone, hours, address' },
  { key: 'edit', title: 'Sections, FAQ, menu' },
  { key: 'appointments', title: 'Booking' },
  { key: 'products', title: 'Cart and catalog' },
];

const UNBOUND_HINTS = {
  settings: 'Phone, hours, and address are in Site settings.',
  edit: 'Sections, FAQ, and menu are in the Page builder.',
  appointments: 'Booking is managed in Appointments.',
  products: 'Cart and catalog are in Products.',
};

function matchRow(key) {
  const row = LIVE_EDIT_HELP_ROWS.find((item) => item.key === key);
  return row ? { key, title: row.title } : null;
}

function isInsideForm(node) {
  return Boolean(node.closest('form'));
}

function closestMatch(node, selector) {
  const match = node.closest(selector);
  return match && !match.closest('[data-editable]') ? match : null;
}

/**
 * @param {Element | null} node
 * @returns {{ key: string, title: string } | null}
 */
export function classifyUnboundLiveEditTarget(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  if (node.closest('[data-editable]')) return null;

  if (
    closestMatch(node, 'img')
    || closestMatch(node, '.ss-hero-photo')
    || closestMatch(node, '.ss-gallery-item')
    || closestMatch(node, '.ss-photo-placeholder')
  ) {
    return matchRow('edit');
  }

  const napSelectors = [
    '[data-testid="header-call"]',
    '[data-testid="footer-call"]',
    '[data-testid="hero-phone"]',
    '[data-testid="hero-hours"]',
    '[data-testid="hero-address"]',
    '[data-testid="footer-address"]',
    '.ss-nav-phone',
    '.ss-hours',
    '.ss-location',
  ];
  for (const selector of napSelectors) {
    if (closestMatch(node, selector)) {
      return matchRow('settings');
    }
  }
  if (closestMatch(node, '.ss-contact') && !isInsideForm(node)) {
    return matchRow('settings');
  }

  const listSelectors = [
    '.ss-faq',
    '.ss-testimonials',
    '.ss-stats',
    '.ss-menu',
    '.ss-social',
  ];
  for (const selector of listSelectors) {
    if (closestMatch(node, selector)) {
      return matchRow('edit');
    }
  }

  if (
    closestMatch(node, '[data-ss-booking-mount]')
    || closestMatch(node, '.booking-widget')
  ) {
    return matchRow('appointments');
  }

  if (
    closestMatch(node, '.cart-sidebar')
    || closestMatch(node, '[data-testid="cart-sidebar"]')
    || closestMatch(node, '[data-testid="cart-toggle-button"]')
    || closestMatch(node, '.cart-toggle-btn')
  ) {
    return matchRow('products');
  }

  return null;
}

export function getUnboundHintForKey(key) {
  return UNBOUND_HINTS[key] || '';
}
