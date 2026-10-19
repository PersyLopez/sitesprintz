import { describe, expect, it } from 'vitest';
import { contactPostedReturnPath } from '../../server/routes/submissions.routes.js';

describe('contactPostedReturnPath', () => {
  it('returns to the same shop path', () => {
    expect(contactPostedReturnPath({
      host: 'rightsitelight.com',
      referer: 'https://rightsitelight.com/view/gallery-salon',
      subdomain: 'gallery-salon',
    })).toBe('/view/gallery-salon?contact=sent');
  });

  it('ignores a referer on another host', () => {
    expect(contactPostedReturnPath({
      host: 'rightsitelight.com',
      referer: 'https://evil.example/phish',
      subdomain: 'gallery-salon',
    })).toBe('/view/gallery-salon?contact=sent');
  });
});
