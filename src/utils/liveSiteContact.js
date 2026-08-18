/**
 * Shared NAP / conversion helpers for live published sites.
 */

import { getLayout } from '../config/layouts.js';

const PRIMARY_BY_INTENT = {
  booking: { href: '#booking', label: 'Book', stickyTestId: 'sticky-cta-book' },
  quote: { href: '#contact', label: 'Get a Quote', stickyTestId: 'sticky-cta-quote' },
  ordering: { href: '#catalog', label: 'Order', stickyTestId: 'sticky-cta-order' },
  contact: { href: '#contact', label: 'Contact', stickyTestId: 'sticky-cta-contact' },
};

export function telHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export function resolveSitePhone(siteData) {
  const fromSection = (Array.isArray(siteData?.sections) ? siteData.sections : [])
    .find((section) => section?.type === 'contact')?.content?.phone;
  return siteData?.contactPhone || siteData?.contact?.phone || fromSection || '';
}

export function resolveSiteAddress(siteData) {
  const fromSection = (Array.isArray(siteData?.sections) ? siteData.sections : [])
    .find((section) => section?.type === 'location' || section?.type === 'contact')?.content?.address;
  return siteData?.contactAddress || siteData?.contact?.address || fromSection || '';
}

export function resolvePrimaryCta(siteData, page) {
  const layoutKey = page?.layout || siteData?._layout;
  const intent = getLayout(layoutKey)?.hero?.ctaDefault || 'contact';
  return PRIMARY_BY_INTENT[intent] || PRIMARY_BY_INTENT.contact;
}

export function shouldRemoveBranding(siteData) {
  if (siteData?.settings?.removeBranding === true) return true;
  const plan = String(siteData?.plan || siteData?.settings?.tier || '').toLowerCase();
  return plan === 'growth' || plan === 'pro' || plan === 'premium';
}
