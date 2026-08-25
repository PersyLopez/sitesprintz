import { describe, it, expect } from 'vitest';
import { EmailService } from '../../server/services/emailService.js';

describe('build intake and labor purchase emails', () => {
  const emailService = new EmailService();

  it('labor purchase customer email links to /build', () => {
    const rendered = emailService.renderLaborPurchaseCustomerTemplate({ skuName: 'Brand match' });
    expect(rendered.html).toContain('/build');
  });

  it('build intake customer email explains address privacy', () => {
    const rendered = emailService.renderBuildIntakeCustomerTemplate({ contactName: 'Jane' });
    expect(rendered.html).toMatch(/street stays private|service area/i);
    expect(rendered.html).toContain('/build');
  });
});
