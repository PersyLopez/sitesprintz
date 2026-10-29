import { describe, it, expect, vi } from 'vitest';
import { FoundationService } from '../../server/services/foundationService.js';

describe('FoundationService.updateConfig', () => {
  it('stores site_data as an object and keeps an existing Facebook URL', async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      sites: {
        findUnique: vi.fn().mockResolvedValue({
          plan: 'growth',
          site_data: {
            social: { facebook: 'https://www.facebook.com/people/Casa-De-Las-Flores/61591849259324/' },
            foundation: { trustSignals: { enabled: false } },
          },
        }),
        update,
      },
    };
    const cache = { get: () => null, set: () => {}, invalidate: vi.fn() };
    const service = new FoundationService(db, cache);

    await service.updateConfig('casa-de-las-flores', {
      trustSignals: { enabled: true },
      socialMedia: { profiles: { facebook: '' } },
    });

    const data = update.mock.calls[0][0].data;
    expect(data.updated_at).toBeUndefined();
    const saved = data.site_data;
    expect(typeof saved).toBe('object');
    expect(saved.foundation.trustSignals.enabled).toBe(true);
    expect(saved.social.facebook).toBe('https://www.facebook.com/people/Casa-De-Las-Flores/61591849259324/');
  });
});
