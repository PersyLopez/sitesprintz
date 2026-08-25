import { PRICING_CONFIG } from '../../../src/config/pricing.config.js';
import { redactLaborSecrets } from './laborSecrets.js';

const BATCH_HINTS = [
  'menu',
  'services',
  'prices',
  'price list',
  'hours',
  'catalog',
  'products',
  'here is the list',
  'updated list',
];

const DRIP_HINTS = [
  'just this one',
  'real quick',
  'typo',
  'one sandwich',
  'add soup',
  'while you are in there',
];

export function batchesPerMonth(labor = PRICING_CONFIG.labor) {
  const n = Number(labor?.managedCare?.batchesPerMonth);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * One email with a whole list is a batch. Tiny follow-ups are drips.
 * @param {string} [message]
 */
export function classifyLaborRequest(message) {
  const text = redactLaborSecrets(message).toLowerCase();
  if (!text.trim()) {
    return { kind: 'empty', accept: false, reason: 'Nothing to apply' };
  }
  const looksLikeBatch = BATCH_HINTS.some((hint) => text.includes(hint))
    || text.split('\n').filter((line) => line.trim()).length >= 4;
  const looksLikeDrip = DRIP_HINTS.some((hint) => text.includes(hint))
    && !looksLikeBatch;
  if (looksLikeDrip) {
    return {
      kind: 'drip',
      accept: false,
      reason: 'Send the whole list in one email. Care is two batches a month, not a helpdesk.',
    };
  }
  return {
    kind: 'batch',
    accept: true,
    reason: 'Counts as one catalog batch',
  };
}

/**
 * @param {Array<{ sku?: string, kind?: string }>} monthRows
 * @param {typeof PRICING_CONFIG.labor} [labor]
 */
export function remainingCareBatches(monthRows, labor = PRICING_CONFIG.labor) {
  const cap = batchesPerMonth(labor);
  const used = (monthRows || []).filter((row) => (
    row.sku === 'managed_care' || row.kind === 'batch'
  )).length;
  return Math.max(0, cap - used);
}

export function declineDripCopy() {
  return 'This looks like a drip, not a batch. Wait and send the full menu/services/prices together — that uses one of the two monthly slots.';
}
