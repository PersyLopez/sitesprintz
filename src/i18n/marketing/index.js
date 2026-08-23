import { translate } from '../locale.js';
import en from './en.js';
import es from './es.js';

const DICTS = { en, es };

export function tMarketing(locale, key, vars) {
  return translate(DICTS[locale] || en, en, key, vars);
}

export { en as marketingEn, es as marketingEs };
