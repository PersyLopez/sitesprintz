/**
 * Detect placeholder stock hosts so customer sites do not publish Unsplash
 * as if it were the business's own photography. Gallery demo seeds keep
 * stock URLs via `_demo: true` and/or `settings.demoMode: true`.
 */

const STOCK_HOSTS = [
  'images.unsplash.com',
  'unsplash.com',
  'source.unsplash.com',
];

/**
 * @param {unknown} url
 * @returns {boolean}
 */
export function isStockImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const host = new URL(url, 'https://sitesprintz.local').hostname.toLowerCase();
    return STOCK_HOSTS.some((stockHost) => host === stockHost || host.endsWith(`.${stockHost}`));
  } catch {
    return /unsplash\.com/i.test(url);
  }
}

/**
 * @param {unknown} image
 * @returns {string}
 */
export function imageSrc(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.src || image.url || image.image || '';
}

/**
 * Gallery / showcase seeds keep Unsplash. Customer and claimable sites do not.
 * Matches server/utils/showcaseDemo.js (settings.demoMode) plus the seed `_demo` flag.
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function allowsDemoStockPhotos(siteData) {
  return siteData?._demo === true || siteData?.settings?.demoMode === true;
}

/**
 * Drop stock URLs unless this is an explicit demo/gallery seed.
 * @param {Array|undefined} images
 * @param {{ allowStock?: boolean }} [opts]
 * @returns {Array}
 */
export function filterStockImages(images, opts = {}) {
  const list = Array.isArray(images) ? images : [];
  if (opts.allowStock) return list;
  return list.filter((img) => {
    const src = imageSrc(img);
    return Boolean(src) && !isStockImageUrl(src);
  });
}
