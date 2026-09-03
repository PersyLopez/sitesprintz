import { describe, it, expect } from 'vitest';
import {
  applyDeliverySetting,
  buildDeliveryCharge,
  getPublicDeliveryConfig,
  isDeliveryEnabled,
  mergeDeliveryIntoSettings,
  normalizeDeliverySetting,
  shopHasDeliveryOrigin,
} from '../../server/utils/delivery.js';
import { mergeSiteDataSettings } from '../../server/utils/payOnSite.js';

describe('delivery settings', () => {
  const withStreet = {
    contact: { privateStreet: '100 Main St, Trenton, NJ' },
    settings: { payOnSite: true },
  };

  it('defaults delivery off', () => {
    expect(isDeliveryEnabled({})).toBe(false);
    expect(getPublicDeliveryConfig({}).enabled).toBe(false);
  });

  it('normalizes flat fee and radius presets', () => {
    expect(normalizeDeliverySetting({
      enabled: true,
      flatFee: '7.50',
      maxRadiusMiles: 10,
    })).toEqual({ enabled: true, flatFee: 7.5, maxRadiusMiles: 10 });
    expect(normalizeDeliverySetting({ enabled: true, maxRadiusMiles: 99 }).maxRadiusMiles).toBe(10);
  });

  it('requires a private street before enabling', () => {
    const result = applyDeliverySetting({ settings: {} }, {
      enabled: true,
      flatFee: 5,
      maxRadiusMiles: 10,
    });
    expect(result.error).toMatch(/private street/i);
    expect(result.code).toBe('DELIVERY_ORIGIN_REQUIRED');
  });

  it('applies delivery when origin exists', () => {
    const result = applyDeliverySetting(withStreet, {
      enabled: true,
      flatFee: 5,
      maxRadiusMiles: 15,
    });
    expect(result.siteData.settings.delivery).toEqual({
      enabled: true,
      flatFee: 5,
      maxRadiusMiles: 15,
    });
    expect(result.siteData.settings.allowCheckout).toBe(true);
    expect(shopHasDeliveryOrigin(result.siteData)).toBe(true);
  });

  it('preserves delivery when editor save omits it', () => {
    const existing = applyDeliverySetting(withStreet, {
      enabled: true,
      flatFee: 4,
      maxRadiusMiles: 5,
    }).siteData;
    const merged = mergeSiteDataSettings(existing, {
      brand: { name: 'Cafe' },
      settings: { theme: 'light' },
    });
    expect(merged.settings.delivery).toEqual({
      enabled: true,
      flatFee: 4,
      maxRadiusMiles: 5,
    });
    expect(merged.settings.theme).toBe('light');
  });

  it('deep-merges delivery patches without wiping fee', () => {
    const merged = mergeDeliveryIntoSettings(
      { delivery: { enabled: true, flatFee: 6, maxRadiusMiles: 10 } },
      { delivery: { enabled: false } }
    );
    expect(merged.delivery).toEqual({
      enabled: false,
      flatFee: 6,
      maxRadiusMiles: 10,
    });
  });

  it('buildDeliveryCharge adds flat fee when within radius', async () => {
    const siteData = applyDeliverySetting(withStreet, {
      enabled: true,
      flatFee: 5,
      maxRadiusMiles: 10,
    }).siteData;
    const result = await buildDeliveryCharge(siteData, {
      fulfillment: 'delivery',
      address: '200 Broad St, Trenton, NJ',
    }, {
      measureDeliveryMiles: async () => ({
        ok: true,
        miles: 2.4,
        origin: { lat: 1, lng: 1 },
        destination: { lat: 2, lng: 2 },
      }),
    });
    expect(result.ok).toBe(true);
    expect(result.fee).toBe(5);
    expect(result.miles).toBe(2.4);
    expect(result.fulfillmentType).toBe('delivery');
  });

  it('buildDeliveryCharge rejects out of range addresses', async () => {
    const siteData = applyDeliverySetting(withStreet, {
      enabled: true,
      flatFee: 5,
      maxRadiusMiles: 5,
    }).siteData;
    const result = await buildDeliveryCharge(siteData, {
      fulfillment: 'delivery',
      address: 'Far Away',
    }, {
      measureDeliveryMiles: async () => ({
        ok: true,
        miles: 12,
        origin: { lat: 1, lng: 1 },
        destination: { lat: 2, lng: 2 },
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('DELIVERY_OUT_OF_RANGE');
  });

  it('buildDeliveryCharge ignores client fee on pickup', async () => {
    const result = await buildDeliveryCharge(withStreet, { fulfillment: 'pickup' });
    expect(result).toEqual({
      ok: true,
      fee: 0,
      miles: null,
      shippingAddress: null,
      fulfillmentType: 'pay_on_site',
    });
  });
});
