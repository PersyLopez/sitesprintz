/**
 * Draft Spanish overlays for published shop copy via Cloud Translation.
 * Chrome dictionaries still switch without an API key; body copy stays English.
 */

import { createHash } from 'crypto';
import {
  collectTranslatableStrings,
  sourceHashFromStrings,
} from '../../src/utils/localeOverlay.js';

const TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const BATCH_SIZE = 100;

export function hashSourceStrings(strings) {
  return createHash('sha256').update(sourceHashFromStrings(strings), 'utf8').digest('hex');
}

function getApiKey() {
  return process.env.GOOGLE_TRANSLATE_API_KEY || '';
}

function resolveFetch(fetchFn) {
  if (fetchFn) return fetchFn;
  const impl = globalThis.fetch;
  return typeof impl === 'function' ? impl.bind(globalThis) : fetch;
}

async function translateBatch(texts, apiKey, fetchFn) {
  const url = `${TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: texts,
      source: 'en',
      target: 'es',
      format: 'text',
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Translation API ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  const data = await response.json();
  const translations = data?.data?.translations;
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new Error('Translation API returned unexpected payload');
  }
  return translations.map((item) => item.translatedText || '');
}

export async function translateStringMap(strings, options = {}) {
  const apiKey = options.apiKey ?? getApiKey();
  const fetchFn = resolveFetch(options.fetchFn);
  const entries = Object.entries(strings);
  const translated = {};
  for (let index = 0; index < entries.length; index += BATCH_SIZE) {
    const batch = entries.slice(index, index + BATCH_SIZE);
    const texts = batch.map(([, value]) => value);
    const results = await translateBatch(texts, apiKey, fetchFn);
    batch.forEach(([key], offset) => {
      translated[key] = results[offset];
    });
  }
  return translated;
}

/**
 * Store site_data.locales.es when English copy changed. No-ops without an API key.
 */
export async function attachSpanishLocale(siteData, options = {}) {
  if (!siteData || typeof siteData !== 'object') return siteData;

  const strings = collectTranslatableStrings(siteData);
  const sourceHash = hashSourceStrings(strings);
  const existing = siteData.locales?.es;
  if (existing?.sourceHash === sourceHash && existing?.strings) {
    return siteData;
  }

  const apiKey = options.apiKey ?? getApiKey();
  if (!apiKey || Object.keys(strings).length === 0) {
    return siteData;
  }

  try {
    const translated = await translateStringMap(strings, { ...options, apiKey });
    return {
      ...siteData,
      locales: {
        ...(siteData.locales || {}),
        es: { strings: translated, sourceHash },
      },
    };
  } catch (error) {
    console.error('[translate] Failed to attach Spanish overlay:', error.message);
    return siteData;
  }
}
