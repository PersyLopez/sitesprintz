import { describe, it, expect } from 'vitest';
import { EmailService } from '../../server/services/emailService.js';

describe('build intake and labor purchase emails', () => {
  const emailService = new EmailService();

  it('labor purchase customer email links to /build', () => {
    const rendered = emailService.renderLaborPurchaseCustomerTemplate({ skuName: 'Brand match' });
    expect(rendered.html).toContain('/build');
  });

  it('build intake customer email explains Growth Managed and address privacy', () => {
    const rendered = emailService.renderBuildIntakeCustomerTemplate({ contactName: 'Jane' });
    expect(rendered.html).toMatch(/Growth Managed/i);
    expect(rendered.html).toMatch(/\$75/);
    expect(rendered.html).toMatch(/street stays private|service area/i);
    expect(rendered.html).toContain('/build');
  });

  it('build intake customer email explains the 15-day live clock during a setup offer', () => {
    const rendered = emailService.renderBuildIntakeCustomerTemplate({
      contactName: 'Jane',
      setupOfferActive: true,
      recommendedPlan: 'starter',
      planPriceMonthly: 10,
    });
    expect(rendered.html).toMatch(/15 days live/i);
    expect(rendered.html).toMatch(/starter/i);
    expect(rendered.html).toMatch(/not instant|when the page is ready/i);
  });

  it('build intake ops email names the recommended plan and catalog', () => {
    const rendered = emailService.renderBuildIntakeOpsTemplate({
      businessName: 'Jane Salon',
      plan: 'growth',
      recommendedPlan: 'growth',
      planPriceMonthly: 35,
      features: { booking: true },
      coverPhotoUrl: 'https://cdn.example/cover.jpg',
      catalogItems: [{ name: 'Cut', price: '40', photoUrl: 'https://cdn.example/cut.jpg' }],
    });
    expect(rendered.subject).toMatch(/Jane Salon/);
    expect(rendered.html).toMatch(/growth/i);
    expect(rendered.html).toMatch(/\$35\/mo/);
    expect(rendered.html).toMatch(/Cover photo/);
    expect(rendered.html).toMatch(/Cut/);
  });
});
