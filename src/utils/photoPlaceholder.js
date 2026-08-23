/**
 * Honest photo slots for customer sites. These are labeled placeholders,
 * not stock photography pretending to be the business.
 */

const COPY = {
  business: 'Use your business photo here',
  product: 'Use your product photo here',
  service: 'Use a photo of this service here',
  work: 'Use a photo of your work here',
  shop: 'Use a photo of your shop here',
};

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function photoPlaceholderLabel(kind) {
  return COPY[kind] || COPY.business;
}

/**
 * @param {'business'|'product'|'service'|'work'|'shop'} kind
 * @param {{ className?: string }} [opts]
 */
export function renderPhotoPlaceholder(kind, opts = {}) {
  const label = photoPlaceholderLabel(kind);
  const extra = opts.className ? ` ${opts.className}` : '';
  return `<div class="ss-photo-placeholder${extra}" data-testid="photo-placeholder" data-placeholder-kind="${escapeHtml(kind)}" role="img" aria-label="${escapeHtml(label)}"><span class="ss-photo-placeholder-mark">${escapeHtml(label)}</span></div>`;
}

export function renderGalleryWorkPlaceholders(count = 3) {
  return Array.from({ length: count }, () => renderPhotoPlaceholder('work', { className: 'ss-photo-placeholder--tile' })).join('\n');
}
