import { describe, expect, it } from 'vitest';
import { classRequestMessage, contactOwnerNotice, contactPostedReturnPath, diagnosticQuoteMessage, packageQuoteMessage, planRequestMessage, zipCheckMessage } from '../../server/routes/submissions.routes.js';

describe('contactPostedReturnPath', () => {
  it('returns to the same shop path', () => {
    expect(contactPostedReturnPath({
      host: 'rightsitelight.com',
      referer: 'https://rightsitelight.com/view/gallery-salon',
      subdomain: 'gallery-salon',
    })).toBe('/view/gallery-salon?contact=sent');
  });

  it('lists the requested plan and frequency on the note', () => {
    expect(planRequestMessage('Please set up this plan.', {
      plan_choice: 'Basic Maintenance Plan — $199',
      frequency_choice: 'Annual (15% off)',
    }, 'plan-request')).toBe('Basic Maintenance Plan — $199; Annual (15% off)');
    expect(planRequestMessage('Hello', { plan_choice: 'VIP' }, 'contact')).toBe('Hello');
  });

  it('lists the requested class on the note', () => {
    expect(classRequestMessage('Please hold a spot in this class.', {
      class_choice: 'Strength Foundations — Mon, Wed, Fri · 6:00 AM',
    }, 'class-request')).toBe('Strength Foundations — Mon, Wed, Fri · 6:00 AM');
    expect(classRequestMessage('Hello', { class_choice: 'HIIT Burn' }, 'contact')).toBe('Hello');
  });

  it('lists the diagnostic answers on the estimate note', () => {
    expect(diagnosticQuoteMessage('Please estimate this repair.', {
      answer_0: 'iPhone',
      answer_1: 'Cracked screen — $150',
    }, 'diagnostic-quote')).toBe('iPhone; Cracked screen — $150');
    expect(diagnosticQuoteMessage('Hello', { answer_0: 'iPhone' }, 'contact')).toBe('Hello');
  });

  it('lists the chosen package on the quote note', () => {
    expect(packageQuoteMessage('Please quote this package.', {
      item_0: 'Haircut — $75',
      item_1: 'Full Color — $150',
      email: 'ada@example.com',
    }, 'package-quote')).toBe('Haircut — $75, Full Color — $150');
    expect(packageQuoteMessage('Hello', {}, 'contact')).toBe('Hello');
  });

  it('keeps the ZIP on a service-area note', () => {
    expect(zipCheckMessage('Please check this ZIP.', '75001', 'zip-check')).toBe('ZIP 75001: Please check this ZIP.');
    expect(zipCheckMessage('Hello', 'nope', 'zip-check')).toBe('Hello');
    expect(zipCheckMessage('Hello', '75001', 'contact')).toBe('Hello');
  });

  it('points the owner email at the live shop and Messages', () => {
    const notice = contactOwnerNotice({
      subdomain: 'gallery-salon',
      siteId: 'site-1',
      phone: '(201) 555-0123',
    });
    expect(notice.siteUrl).toMatch(/^https?:\/\/.+\/view\/gallery-salon$/);
    expect(notice.messagesUrl).toMatch(/\/dashboard\/sites\/site-1\/messages$/);
    expect(notice.submitterPhone).toBe('(201) 555-0123');
  });

  it('ignores a referer on another host', () => {
    expect(contactPostedReturnPath({
      host: 'rightsitelight.com',
      referer: 'https://evil.example/phish',
      subdomain: 'gallery-salon',
    })).toBe('/view/gallery-salon?contact=sent');
  });
});
