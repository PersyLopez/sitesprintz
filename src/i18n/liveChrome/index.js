import { translate } from '../locale.js';
import en from './en.js';
import es from './es.js';

const DICTS = { en, es };

export function tLive(locale, key, vars) {
  return translate(DICTS[locale] || en, en, key, vars);
}

export function getLiveChrome(locale) {
  const resolved = locale === 'es' ? 'es' : 'en';
  return {
    locale: resolved,
    t: (key, vars) => tLive(resolved, key, vars),
  };
}
