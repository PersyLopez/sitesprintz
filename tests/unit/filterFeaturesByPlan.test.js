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

  it('drops groomer profiles below Growth and keeps them on Growth', () => {
    const withProfiles = {
      sections: [
        { type: 'hero' },
        { type: 'enhanced-profiles', settings: { profiles: [{ name: 'Emily Johnson' }] } },
      ],
    };
    expect(filterFeaturesByPlan(withProfiles, 'starter').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withProfiles, 'growth').sections.map((section) => section.type)).toContain('enhanced-profiles');
  });

  it('drops an inquiry form below Growth and keeps it on Growth', () => {
    const withInquiry = {
      sections: [
        { type: 'hero' },
        { type: 'multi-step-form', settings: { steps: [{ title: 'Event', fields: [{ name: 'eventType', label: 'Event Type' }] }] } },
      ],
    };
    expect(filterFeaturesByPlan(withInquiry, 'starter').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withInquiry, 'growth').sections.map((section) => section.type)).toContain('multi-step-form');
  });

  it('drops menu filters on the live trial and keeps them on Starter', () => {
    const withFilters = {
      sections: [
        { type: 'hero' },
        { type: 'service-filters', settings: { items: [{ name: 'Caesar Salad' }] } },
      ],
    };
    expect(filterFeaturesByPlan(withFilters, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withFilters, 'starter').sections.map((section) => section.type)).toContain('service-filters');
  });

  it('drops a maintenance plan on the live trial and keeps it on Growth', () => {
    const withPlans = {
      sections: [
        { type: 'hero' },
        { type: 'subscription-booking', settings: { services: [{ name: 'Basic Maintenance Plan' }] } },
      ],
    };
    expect(filterFeaturesByPlan(withPlans, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withPlans, 'growth').sections.map((section) => section.type)).toContain('subscription-booking');
  });

  it('drops a class schedule on the live trial and keeps it on Growth', () => {
    const withClasses = {
      sections: [
        { type: 'hero' },
        { type: 'class-scheduler', settings: { classes: [{ name: 'HIIT Burn' }] } },
      ],
    };
    expect(filterFeaturesByPlan(withClasses, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withClasses, 'growth').sections.map((section) => section.type)).toContain('class-scheduler');
  });

  it('drops a video library on the live trial and keeps it on Growth', () => {
    const withVideos = {
      sections: [
        { type: 'hero' },
        { type: 'video-gallery', settings: { videos: [{ title: 'Morning Yoga Flow' }] } },
      ],
    };
    expect(filterFeaturesByPlan(withVideos, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withVideos, 'growth').sections.map((section) => section.type)).toContain('video-gallery');
  });

  it('drops a progress tracker on the live trial and keeps it on Growth', () => {
    const withTracker = {
      sections: [
        { type: 'hero' },
        { type: 'progress-tracker', settings: { statuses: [{ label: 'Pending' }] } },
      ],
    };
    expect(filterFeaturesByPlan(withTracker, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withTracker, 'growth').sections.map((section) => section.type)).toContain('progress-tracker');
  });

  it('drops a diagnostic quiz on the live trial and keeps it on Growth', () => {
    const withQuiz = {
      sections: [
        { type: 'hero' },
        { type: 'diagnostic-quiz', settings: { questions: [{ title: 'Device', options: [{ label: 'iPhone' }] }] } },
      ],
    };
    expect(filterFeaturesByPlan(withQuiz, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withQuiz, 'growth').sections.map((section) => section.type)).toContain('diagnostic-quiz');
  });

  it('drops a package calculator on the live trial and keeps it on Growth', () => {
    const withCalculator = {
      sections: [
        { type: 'hero' },
        { type: 'interactive-calculator', settings: { items: [{ name: 'Haircut', price: 75 }] } },
      ],
    };
    expect(filterFeaturesByPlan(withCalculator, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withCalculator, 'growth').sections.map((section) => section.type)).toContain('interactive-calculator');
  });

  it('drops a zip check on the live trial and keeps it on Growth', () => {
    const withZip = {
      sections: [
        { type: 'hero' },
        { type: 'zip-checker', settings: { serviceAreas: ['75001'] } },
      ],
    };
    expect(filterFeaturesByPlan(withZip, 'trial').sections.map((section) => section.type)).toEqual(['hero']);
    expect(filterFeaturesByPlan(withZip, 'growth').sections.map((section) => section.type)).toContain('zip-checker');
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
