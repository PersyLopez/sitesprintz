import { describe, it, expect } from 'vitest';
import {
  isPayOnSiteEnabled,
  applyPayOnSiteSetting,
  buildPayOnSiteOrderItems,
  mergeSiteDataSettings,
  extractSiteCatalog
} from '../../server/utils/payOnSite.js';
import { describe, it, expect } from 'vitest';
import {
  isPayOnSiteEnabled,
  applyPayOnSiteSetting,
  buildPayOnSiteOrderItems,
  mergeSiteDataSettings,
  extractSiteCatalog
} from '../../server/utils/payOnSite.js';
import {
  isPayOnSiteEnabled as isPayOnSiteEnabledClient,
  resolvePayOnSiteForPublish
} from '../../src/utils/payOnSite.js';
import { buildPublishableContent } from '../../src/services/publishService.js';

describe('pay on site helpers', () => {
  it('requires an explicit settings.payOnSite flag', () => {
    expect(isPayOnSiteEnabled(undefined)).toBe(false);
    expect(isPayOnSiteEnabled({ _features: { cashPayment: { enabled: true } } })).toBe(false);
    expect(isPayOnSiteEnabled({ settings: { payOnSite: true } })).toBe(true);
    expect(isPayOnSiteEnabledClient({ settings: { payOnSite: true } })).toBe(true);
  });

  it('defaults created-site checkout to pay-on-site unless cash was turned off', () => {
    expect(resolvePayOnSiteForPublish({}, true)).toBe(true);
    expect(resolvePayOnSiteForPublish({ settings: { payOnSite: true } }, true)).toBe(true);
    expect(resolvePayOnSiteForPublish({ settings: { payOnSite: false } }, true)).toBe(false);
    expect(resolvePayOnSiteForPublish({
      _features: { cashPayment: { offered: true, enabled: false } }
    }, true)).toBe(false);
    expect(resolvePayOnSiteForPublish({ settings: { payOnSite: true } }, false)).toBe(false);
  });

  it('enables checkout when turning pay on site on', () => {
    const next = applyPayOnSiteSetting(
      { settings: { allowCheckout: false }, brand: { name: 'Cafe' } },
      true
    );
    expect(next.settings.payOnSite).toBe(true);
    expect(next.settings.allowCheckout).toBe(true);
    expect(next._features.cashPayment.enabled).toBe(true);
    expect(next.brand.name).toBe('Cafe');
  });

  it('does not disable Stripe checkout when turning pay on site off', () => {
    const next = applyPayOnSiteSetting(
      { settings: { allowCheckout: true, payOnSite: true } },
      false
    );
    expect(next.settings.payOnSite).toBe(false);
    expect(next.settings.allowCheckout).toBe(true);
  });

  it('recalculates totals from the Neon site catalog, not client prices', () => {
    const catalog = [
      { id: 'soup', name: 'Soup', price: 8 },
      { id: 'bread', name: 'Bread', price: 3 }
    ];
    expect(buildPayOnSiteOrderItems([], catalog).valid).toBe(false);
    expect(buildPayOnSiteOrderItems([{ name: 'Soup', price: 8, quantity: 1 }]).valid).toBe(false);
    expect(buildPayOnSiteOrderItems([
      { name: 'Mystery', price: 8, quantity: 1 }
    ], catalog).valid).toBe(false);
    const built = buildPayOnSiteOrderItems([
      { id: 'soup', name: 'Soup', price: 0.01, quantity: 2 },
      { name: 'Bread', price: 999, quantity: 1 }
    ], catalog);
    expect(built.valid).toBe(true);
    expect(built.total).toBe(19);
    expect(built.items[0].price).toBe(8);
    expect(built.items[1].price).toBe(3);
  });

  it('keeps payOnSite when an editor save replaces settings without that key', () => {
    const merged = mergeSiteDataSettings(
      { settings: { payOnSite: true, allowCheckout: true }, brand: { name: 'Cafe' } },
      { settings: { allowCheckout: true }, brand: { name: 'Cafe' } }
    );
    expect(merged.settings.payOnSite).toBe(true);
    expect(merged.brand.name).toBe('Cafe');
  });

  it('reads purchasable items from the site_data stored on Neon', () => {
    const catalog = extractSiteCatalog({
      products: [{ id: 'soup', name: 'Soup', price: 8 }],
      menu: { sections: [{ items: [{ name: 'Bread', price: '$3.00' }] }] }
    });
    expect(catalog).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'soup', price: 8 }),
      expect.objectContaining({ name: 'Bread', price: 3 })
    ]));
  });

  it('copies payOnSite through publish for Growth drafts only', () => {
    const draft = {
      id: 'draft-1',
      businessName: 'Test',
      sections: [{ id: '1', type: 'hero', enabled: true, order: 0 }],
      settings: { payOnSite: true, allowCheckout: true }
    };
    expect(buildPublishableContent(draft, 'growth').settings.payOnSite).toBe(true);
    expect(buildPublishableContent(draft, 'starter').settings.payOnSite).toBe(false);
  });

  it('defaults Growth checkout to pay-on-site so created sites are not blocked on Stripe', () => {
    const draft = {
      id: 'draft-2',
      businessName: 'Cafe',
      sections: [{ id: '1', type: 'hero', enabled: true, order: 0 }],
      settings: { allowCheckout: true }
    };
    expect(buildPublishableContent(draft, 'growth').settings.payOnSite).toBe(true);
  });

  it('keeps pay-on-site off when the owner disabled cash', () => {
    const draft = {
      id: 'draft-3',
      businessName: 'Cafe',
      sections: [{ id: '1', type: 'hero', enabled: true, order: 0 }],
      settings: { allowCheckout: true, payOnSite: false },
      _features: { cashPayment: { offered: true, enabled: false } }
    };
    expect(buildPublishableContent(draft, 'growth').settings.payOnSite).toBe(false);
  });
});
