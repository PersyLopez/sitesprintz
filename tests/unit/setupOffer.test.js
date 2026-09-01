import { describe, it, expect } from 'vitest';
import {
  isSetupOfferActive,
  setupOfferDismissKey,
  setupOfferEndLabel,
  PRICING_CONFIG,
} from '../../src/config/pricing.config.js';
import {
  recommendedPlanFromFeatures,
  sanitizeBuildIntake,
  sanitizeIntakePhotoUrl,
} from '../../src/config/buildIntake.js';

const during = new Date('2026-09-15T12:00:00.000Z');
const after = new Date('2026-10-01T00:00:00.000Z');
const before = new Date('2026-08-31T23:59:59.000Z');

const basePayload = {
  contactName: 'Jane Doe',
  contactEmail: 'jane@example.com',
  businessName: 'Jane Salon',
  website: '',
};

describe('setupOffer config', () => {
  it('is active only when enabled and startsAt <= now < endsAt', () => {
    const offer = PRICING_CONFIG.setupOffer;
    expect(isSetupOfferActive(during, offer)).toBe(true);
    expect(isSetupOfferActive(after, offer)).toBe(false);
    expect(isSetupOfferActive(before, offer)).toBe(false);
    expect(isSetupOfferActive(during, { ...offer, enabled: false })).toBe(false);
    expect(isSetupOfferActive(during, { ...offer, startsAt: offer.endsAt })).toBe(false);
  });

  it('keys dismiss storage by campaign id', () => {
    expect(setupOfferDismissKey({ campaignId: 'holiday-2026' })).toBe('rsl-setup-offer:holiday-2026');
  });

  it('labels the last calendar day of an exclusive endsAt', () => {
    expect(setupOfferEndLabel('en', { endsAt: '2026-10-01T00:00:00.000Z' })).toMatch(/September/);
  });
});

describe('recommendedPlanFromFeatures', () => {
  it('picks Growth when scheduling or ordering is on, else Starter', () => {
    expect(recommendedPlanFromFeatures({ booking: true })).toBe('growth');
    expect(recommendedPlanFromFeatures({ shop: true })).toBe('growth');
    expect(recommendedPlanFromFeatures({ booking: true, shop: true })).toBe('growth');
    expect(recommendedPlanFromFeatures({})).toBe('starter');
  });
});

describe('sanitizeBuildIntake campaign gate', () => {
  it('skips Managed ack during the offer and stamps starter vs growth', () => {
    const starter = sanitizeBuildIntake(basePayload, { now: during });
    expect(starter.ok).toBe(true);
    expect(starter.data.recommendedPlan).toBe('starter');
    expect(starter.data.planPriceMonthly).toBe(10);
    expect(starter.data.setupOfferCampaignId).toBe('launch-2026-09');

    const growth = sanitizeBuildIntake(
      { ...basePayload, wantsScheduling: true },
      { now: during },
    );
    expect(growth.data.recommendedPlan).toBe('growth');
    expect(growth.data.planPriceMonthly).toBe(35);
    expect(growth.data.features.booking).toBe(true);
  });

  it('requires Managed ack after the window', () => {
    expect(sanitizeBuildIntake(basePayload, { now: after }).code).toBe('MISSING_PLAN_ACK');
    const result = sanitizeBuildIntake(
      { ...basePayload, acceptedManagedPlan: true, plan: 'starter' },
      { now: after },
    );
    expect(result.ok).toBe(true);
    expect(result.data.plan).toBe('growth_managed');
    expect(result.data.planPriceMonthly).toBe(75);
  });

  it('strips XSS from catalog names and rejects javascript/http photo URLs', () => {
    const result = sanitizeBuildIntake({
      ...basePayload,
      catalogItems: [
        { name: '<img src=x onerror=alert(1)>Cut', price: '40', photoUrl: 'javascript:alert(1)' },
        { name: 'Color', price: '90', photoUrl: 'http://evil.example/a.jpg' },
        { name: 'Blowout', price: '30', photoUrl: 'https://cdn.example/blowout.jpg' },
        { name: 'Escape', price: '1', photoUrl: '/uploads/../secret.jpg' },
      ],
    }, { now: during });
    expect(result.ok).toBe(true);
    expect(result.data.catalogItems[0].name).not.toMatch(/<img/);
    expect(result.data.catalogItems[0].photoUrl).toBe('');
    expect(result.data.catalogItems[1].photoUrl).toBe('');
    expect(result.data.catalogItems[2].photoUrl).toBe('https://cdn.example/blowout.jpg');
    expect(result.data.catalogItems.find((row) => row.name === 'Escape').photoUrl).toBe('');
  });

  it('keeps street private by default', () => {
    const result = sanitizeBuildIntake({
      ...basePayload,
      streetAddress: '123 Main St',
    }, { now: during });
    expect(result.data.locationPublic).toBe(false);
    expect(result.data.streetAddress).toBe('123 Main St');
  });
});

describe('sanitizeIntakePhotoUrl', () => {
  it('allows https and intake upload paths only', () => {
    expect(sanitizeIntakePhotoUrl('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    expect(sanitizeIntakePhotoUrl('/uploads/intake-abc123.webp')).toBe('/uploads/intake-abc123.webp');
    expect(sanitizeIntakePhotoUrl('data:image/png;base64,aaa')).toBe('');
    expect(sanitizeIntakePhotoUrl('javascript:alert(1)')).toBe('');
  });
});
