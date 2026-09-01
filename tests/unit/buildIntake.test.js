import { describe, it, expect } from 'vitest';
import { sanitizeBuildIntake } from '../../src/config/buildIntake.js';

const basePayload = {
  contactName: 'Jane Doe',
  contactEmail: 'jane@example.com',
  businessName: 'Jane Salon',
  website: '',
  acceptedManagedPlan: true,
};

const AFTER_OFFER = new Date('2026-10-01T00:00:00.000Z');

describe('sanitizeBuildIntake', () => {
  it('requires contact name, email, and business name', () => {
    expect(sanitizeBuildIntake({ ...basePayload, contactName: '' }, { now: AFTER_OFFER }).ok).toBe(false);
    expect(sanitizeBuildIntake({ ...basePayload, contactEmail: 'bad' }, { now: AFTER_OFFER }).ok).toBe(false);
    expect(sanitizeBuildIntake({ ...basePayload, businessName: '' }, { now: AFTER_OFFER }).ok).toBe(false);
    expect(sanitizeBuildIntake(basePayload, { now: AFTER_OFFER }).ok).toBe(true);
  });

  it('requires Growth Managed plan acknowledgement and stamps $75', () => {
    expect(sanitizeBuildIntake({ ...basePayload, acceptedManagedPlan: false }, { now: AFTER_OFFER }).code).toBe('MISSING_PLAN_ACK');
    const result = sanitizeBuildIntake({ ...basePayload, plan: 'starter' }, { now: AFTER_OFFER });
    expect(result.ok).toBe(true);
    expect(result.data.plan).toBe('growth_managed');
    expect(result.data.planPriceMonthly).toBe(75);
    expect(result.data.acceptedManagedPlan).toBe(true);
  });

  it('rejects honeypot when website field is filled', () => {
    const result = sanitizeBuildIntake({ ...basePayload, website: 'http://spam.example' });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('SPAM');
  });

  it('drops invalid URLs and strips HTML', () => {
    const result = sanitizeBuildIntake({
      ...basePayload,
      websiteUrl: 'ftp://bad.example',
      instagram: 'https://instagram.com/jane',
      aboutBio: '<b>Hello</b>',
    }, { now: AFTER_OFFER });
    expect(result.ok).toBe(true);
    expect(result.data.website).toBe('');
    expect(result.data.instagram).toBe('https://instagram.com/jane');
    expect(result.data.aboutBio).toBe('Hello');
  });

  it('defaults locationPublic to false with service radius', () => {
    const result = sanitizeBuildIntake({
      ...basePayload,
      streetAddress: '123 Main St',
      serviceAreaLabel: 'Montclair, NJ',
    }, { now: AFTER_OFFER });
    expect(result.ok).toBe(true);
    expect(result.data.locationPublic).toBe(false);
    expect(result.data.serviceAreaLabel).toBe('Montclair, NJ');
    expect(result.data.serviceRadiusMiles).toBe(10);
  });

  it('clears service area fields when street is public', () => {
    const result = sanitizeBuildIntake({
      ...basePayload,
      locationPublic: true,
      serviceAreaLabel: 'Montclair, NJ',
      serviceRadiusMiles: 15,
    }, { now: AFTER_OFFER });
    expect(result.ok).toBe(true);
    expect(result.data.locationPublic).toBe(true);
    expect(result.data.serviceAreaLabel).toBe('');
    expect(result.data.serviceRadiusMiles).toBeNull();
  });

  it('sanitizes feature flags and caps oversized strings', () => {
    const result = sanitizeBuildIntake({
      ...basePayload,
      features: { booking: true, shop: 'true', faq: 1 },
      servicesText: 'x'.repeat(9000),
    }, { now: AFTER_OFFER });
    expect(result.ok).toBe(true);
    expect(result.data.features.booking).toBe(true);
    expect(result.data.features.shop).toBe(true);
    expect(result.data.features.faq).toBe(true);
    expect(result.data.features.gallery).toBe(false);
    expect(result.data.servicesText.length).toBeLessThanOrEqual(8000);
  });
});
