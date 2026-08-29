const SKIP_KEYS = new Set([
  'id', 'type', 'enabled', 'image', 'images', 'src', 'url', 'href', 'logo',
  'phone', 'email', 'address', 'privateStreet', 'price', 'lat', 'lng', 'mapUrl', 'tel',
  'whatsapp', 'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin',
  'twitter', 'website', 'color', 'accent', 'theme', 'themeVars', 'css',
  'locales', 'sourceHash', 'subdomain', 'template', 'layout',
  'userId', 'siteId', 'stripe', 'publishableKey',
]);

function isUrl(value) {
  return /^(https?:|mailto:|tel:|\/|#)/i.test(value.trim());
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  return /^\+?[\d\s().-]{7,}$/.test(value) && /\d{3,}/.test(value);
}

function isPrice(value) {
  return /^\$?\d+(\.\d{2})?$/.test(value.trim());
}

function shouldSkipKey(key) {
  if (!key || SKIP_KEYS.has(key)) return true;
  if (key.startsWith('_')) return true;
  return /phone|email|address|street|href|url|image|price|tel/i.test(key);
}

/**
 * Collect copy strings from site_data. Skips brand, NAP, prices, and URLs.
 */
export function collectTranslatableStrings(node, path = '', out = {}) {
  if (node == null) return out;
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      collectTranslatableStrings(item, path ? `${path}.${index}` : String(index), out);
    });
    return out;
  }
  if (typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'brand' || key === 'locales' || shouldSkipKey(key)) continue;
      const next = path ? `${path}.${key}` : key;
      collectTranslatableStrings(value, next, out);
    }
    return out;
  }
  if (typeof node === 'string') {
    const trimmed = node.trim();
    if (!trimmed || trimmed.length < 2) return out;
    if (isUrl(trimmed) || isEmail(trimmed) || isPhone(trimmed) || isPrice(trimmed)) return out;
    if (path) out[path] = node;
  }
  return out;
}

function setByPath(target, path, value) {
  const parts = path.split('.');
  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (current == null || typeof current !== 'object') return;
    current = current[part];
  }
  const last = parts[parts.length - 1];
  if (current != null && typeof current === 'object' && last in current) {
    current[last] = value;
  }
}

export function applyTranslatedStrings(siteData, strings) {
  if (!siteData || !strings || typeof strings !== 'object') return siteData;
  const clone = JSON.parse(JSON.stringify(siteData));
  Object.entries(strings).forEach(([path, value]) => {
    if (path.startsWith('locales')) return;
    setByPath(clone, path, value);
  });
  return clone;
}

export function applyLocaleOverlay(siteData, locale) {
  if (!siteData || locale === 'en' || !locale) return siteData;
  const strings = siteData.locales?.[locale]?.strings;
  if (!strings) return siteData;
  return applyTranslatedStrings(siteData, strings);
}

export function sourceHashFromStrings(strings) {
  const keys = Object.keys(strings || {}).sort();
  return keys.map((key) => `${key}=${strings[key]}`).join('\n');
}
