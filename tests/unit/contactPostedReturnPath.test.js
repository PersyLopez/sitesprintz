import { describe, expect, it } from 'vitest';
import { contactOwnerNotice, contactPostedReturnPath } from '../../server/routes/submissions.routes.js';

describe('contactPostedReturnPath', () => {
  it('returns to the same shop path', () => {
    expect(contactPostedReturnPath({
      host: 'rightsitelight.com',
      referer: 'https://rightsitelight.com/view/gallery-salon',
      subdomain: 'gallery-salon',
    })).toBe('/view/gallery-salon?contact=sent');
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
