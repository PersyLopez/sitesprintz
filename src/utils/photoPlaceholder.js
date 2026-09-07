/**
 * Picture-frame inserts for customer sites: a first-party sample photo
 * with a replace label — not Unsplash pretending to be the business.
 */

export const PHOTO_INSERT_SRC = '/assets/hero-placeholder.jpg';

const GENERIC_SERVICE_INSERTS = [
  [/oil/i, 'oil.jpg'],
  [/tire/i, 'tires.jpg'],
  [/brake/i, 'brakes.jpg'],
  [/muffler/i, 'muffler.jpg'],
  [/nail/i, 'nails.jpg'],
  [/balayage/i, 'balayage.jpg'],
  [/hair care/i, 'hair-care.jpg'],
  [/haircut/i, 'haircut.jpg'],
  [/color/i, 'coloring.jpg'],
  [/highlight/i, 'highlighting.jpg'],
  [/laser hair removal/i, 'laser.svg'],
  [/bridal styling/i, 'bridal.svg'],
];

const COPY = {
  business: 'Use your business photo here',
  product: 'Use your product photo here',
  service: 'Use a photo of this service here',
  work: 'Use a photo of your work here',
  shop: 'Use a photo of your shop here',
  staff: 'Use a photo of this person here',
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
 * @param {'business'|'product'|'service'|'work'|'shop'|'staff'} kind
 * @param {{ className?: string, priority?: boolean, photoField?: string, src?: string, offerName?: string }} [opts]
 */
export function renderPhotoPlaceholder(kind, opts = {}) {
  const label = opts.offerName
    ? `Example of ${opts.offerName} — use your photo here`
    : photoPlaceholderLabel(kind);
  const extra = opts.className ? ` ${opts.className}` : '';
  const loading = opts.priority ? 'eager' : 'lazy';
  const fetchPriority = opts.priority ? ' fetchpriority="high"' : '';
  const fieldAttr = opts.photoField ? ` data-photo-field="${escapeHtml(opts.photoField)}"` : '';
  const src = opts.src || PHOTO_INSERT_SRC;
  return `<div class="ss-photo-placeholder${extra}" data-testid="photo-placeholder" data-placeholder-kind="${escapeHtml(kind)}"${fieldAttr} role="img" aria-label="${escapeHtml(label)}"><img class="ss-photo-placeholder-img" src="${escapeHtml(src)}" alt="" width="1600" height="900" loading="${loading}" decoding="async"${fetchPriority} /><span class="ss-photo-placeholder-mark">${escapeHtml(label)}</span></div>`;
}

export function genericServiceInsertSrc(name) {
  const serviceName = String(name || '');
  const match = GENERIC_SERVICE_INSERTS.find(([pattern]) => pattern.test(serviceName));
  return match ? `/assets/service-inserts/${match[1]}` : null;
}

export function renderGalleryWorkPlaceholders(count = 3, fieldPrefix = 'gallery.images') {
  return Array.from({ length: count }, (_, index) => renderPhotoPlaceholder('work', {
    className: 'ss-photo-placeholder--tile',
    photoField: `${fieldPrefix}.${index}.src`,
  })).join('\n');
}
