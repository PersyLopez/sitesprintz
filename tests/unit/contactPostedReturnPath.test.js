import { describe, expect, it } from 'vitest';
import { contactOwnerNotice, contactPostedReturnPath, zipCheckMessage } from '../../server/routes/submissions.routes.js';

describe('contactPostedReturnPath', () => {
  it('returns to the same shop path', () => {
    expect(contactPostedReturnPath({
      host: 'rightsitelight.com',
      referer: 'https://rightsitelight.com/view/gallery-salon',
      subdomain: 'gallery-salon',
    })).toBe('/view/gallery-salon?contact=sent');
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
