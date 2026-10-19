import { describe, expect, it } from 'vitest';
import { filterFeaturesByPlan } from '../../server/routes/drafts.routes.js';

const site = {
  sections: [
    { type: 'hero' },
    { type: 'faq', content: { items: [{ q: 'Hours?', a: '9 to 5' }] } },
    { type: 'before-after', content: { pairs: [{ before: '/b.jpg', after: '/a.jpg' }] } },
    { type: 'contact' },
  ],
  faq: [{ q: 'Hours?', a: '9 to 5' }],
  beforeAfter: [{ before: '/b.jpg', after: '/a.jpg' }],
  nav: [
    { href: '#faq', label: 'FAQ' },
    { href: '#before-after', label: 'Work' },
    { href: '#contact', label: 'Contact' },
  ],
};

describe('filterFeaturesByPlan', () => {
  it('drops FAQ and before-after from a live trial publish', () => {
    const result = filterFeaturesByPlan(site, 'trial');

    expect(result.sections.map((section) => section.type)).toEqual(['hero', 'contact']);
    expect(result.faq).toBeUndefined();
    expect(result.beforeAfter).toBeUndefined();
    expect(result.nav.map((item) => item.href)).toEqual(['#contact']);
  });

  it('drops a checkout section on the live trial and keeps it on Growth', () => {
    const withCheckout = {
      sections: [
        { type: 'hero' },
        { type: 'checkout', content: { enabled: true } },
        { type: 'contact' },
      ],
      nav: [
        { href: '#checkout', label: 'Checkout' },
        { href: '#contact', label: 'Contact' },
      ],
    };

    const trial = filterFeaturesByPlan(withCheckout, 'trial');
    expect(trial.sections.map((section) => section.type)).toEqual(['hero', 'contact']);
    expect(trial.nav.map((item) => item.href)).toEqual(['#contact']);
    expect(trial.settings.allowCheckout).toBe(false);

    const growth = filterFeaturesByPlan(withCheckout, 'growth');
    expect(growth.sections.map((section) => section.type)).toContain('checkout');
    expect(growth.settings.allowCheckout).toBe(true);
  });

  it('keeps FAQ and before-after on Starter', () => {
    const result = filterFeaturesByPlan(site, 'starter');

    expect(result.sections.map((section) => section.type)).toEqual([
      'hero',
      'faq',
      'before-after',
      'contact',
    ]);
    expect(result.nav.map((item) => item.href)).toEqual(['#faq', '#before-after', '#contact']);
  });
});
