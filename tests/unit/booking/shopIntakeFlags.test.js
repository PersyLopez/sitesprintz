import { describe, it, expect } from 'vitest';
import {
  applyShopIntakeSiteFeatures,
  buildShopIntakeSettings,
  parseShopIntakePutBody,
  siteSchedulingEnabled,
} from '../../../server/services/booking/shopIntakeFlags.js';

describe('shopIntakeFlags', () => {
  it('mirrors scheduling onto _features.booking.enabled', () => {
    const next = applyShopIntakeSiteFeatures(
      { _features: { booking: { offered: true, enabled: true } } },
      { schedulingEnabled: false }
    );
    expect(next._features.booking.enabled).toBe(false);
  });

  it('persists urgent and fees on site _features', () => {
    const next = applyShopIntakeSiteFeatures({}, {
      urgentEnabled: false,
      feesEnabled: true,
    });
    expect(next._features.serviceRequests.enabled).toBe(false);
    expect(next._features.bookingFees.enabled).toBe(true);
  });

  it('builds GET payload from tenant + site', () => {
    const settings = buildShopIntakeSettings(
      { enabled: true, hoursBefore: 24, template: 'default' },
      {
        booking_page_enabled: false,
        payment_enabled: true,
        default_payment_type: 'deposit',
        default_deposit_percentage: 40,
      },
      { _features: { serviceRequests: { enabled: true }, bookingFees: { enabled: false } } }
    );
    expect(settings.scheduling_enabled).toBe(false);
    expect(settings.payment_enabled).toBe(true);
    expect(settings.urgent_enabled).toBe(true);
    expect(settings.fees_enabled).toBe(false);
    expect(settings.default_payment_type).toBe('deposit');
    expect(settings.default_deposit_percentage).toBe(40);
  });

  it('maps PUT body to tenant and site updates', () => {
    const parsed = parseShopIntakePutBody({
      scheduling_enabled: false,
      payment_enabled: true,
      urgent_enabled: false,
      fees_enabled: true,
      default_payment_type: 'full',
      default_deposit_percentage: 25,
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.tenantData.booking_page_enabled).toBe(false);
    expect(parsed.tenantData.payment_enabled).toBe(true);
    expect(parsed.siteUpdates).toEqual({
      schedulingEnabled: false,
      urgentEnabled: false,
      feesEnabled: true,
    });
    expect(siteSchedulingEnabled({}, { booking_page_enabled: false })).toBe(false);
  });
});
