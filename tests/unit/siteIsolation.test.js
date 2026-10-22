import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { TemplateNormalizer } from '../../server/services/templateNormalizer.js';
import {
  PathEscapeError,
  allocateUniqueSubdomain,
  blockedPublicTreePath,
  cloneIsolatedSiteData,
  crawlerPublishedDocumentUrl,
  deepClone,
  getDraftFilePath,
  getLegacyDraftFilePath,
  getPrivateDraftsDir,
  getPublishedSitesRoot,
  getSiteDirectory,
  getTemplateFilePath,
  isSafeSiteIdentifier,
  injectPublishedSiteEmbed,
  injectPublishedViewMarkup,
  preloadPublishedViewHero,
  yieldPublishedViewModules,
  liveSiteDocumentIdentifier,
  liveSiteRedirectTarget,
  liveViewDocumentIdentifier,
  publishedDocumentShell,
  resolvePublishedDocumentSubdomain,
  loadTemplateCopy,
  removeIsolatedSiteFiles,
  resolveContainedPath,
  slugifySubdomain,
  deferPublishedViewFonts,
  preloadPublishedViewDisplayFont,
  PUBLISHED_VIEW_DISPLAY_FONT_HREF,
  stripPublishedViewThirdParties,
  writeIsolatedSiteFiles
} from '../../server/utils/siteIsolation.js';
import {
  generateSecureId,
  validateDraftId,
  validateSubdomain,
  validateTemplateId
} from '../../server/utils/validators.js';

const createdSubdomains = [];

afterAll(async () => {
  await Promise.all(
    createdSubdomains.map((subdomain) =>
      removeIsolatedSiteFiles(subdomain).catch(() => {})
    )
  );
});

describe('site isolation — identifiers', () => {
  it('accepts draft IDs produced by generateSecureId', () => {
    const draftId = generateSecureId('draft');
    const result = validateDraftId(draftId);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(draftId);
  });

  it('rejects path-traversal draft IDs', () => {
    expect(validateDraftId('draft-../../../etc/passwd').valid).toBe(false);
    expect(validateDraftId('draft-foo/bar').valid).toBe(false);
    expect(validateDraftId('../../../etc/passwd').valid).toBe(false);
    expect(validateDraftId('already-deleted-draft').valid).toBe(false);
  });

  it('rejects path-traversal template IDs', () => {
    expect(validateTemplateId('../salon').valid).toBe(false);
    expect(validateTemplateId('salon/../../secret').valid).toBe(false);
    expect(validateTemplateId('salon\\..\\foo').valid).toBe(false);
    expect(validateTemplateId('salon').valid).toBe(true);
  });

  it('rejects reserved subdomains used by the platform', () => {
    expect(validateSubdomain('admin').valid).toBe(false);
    expect(validateSubdomain('api').valid).toBe(false);
    expect(validateSubdomain('drafts').valid).toBe(false);
    expect(validateSubdomain('templates').valid).toBe(false);
    expect(validateSubdomain('pizza-palace').valid).toBe(true);
  });

  it('rejects unsafe live-site identifiers', () => {
    expect(isSafeSiteIdentifier('pizza-palace')).toBe(true);
    expect(isSafeSiteIdentifier('../etc/passwd')).toBe(false);
    expect(isSafeSiteIdentifier('foo/bar')).toBe(false);
    expect(isSafeSiteIdentifier('drafts')).toBe(true); // format-ok; reserved check is separate
  });
});

describe('site isolation — live document redirect', () => {
  it('sends leftover live pages to /view and keeps query strings', () => {
    expect(liveSiteRedirectTarget('/sites/plants-and-threads')).toBe('/view/plants-and-threads');
    expect(liveSiteRedirectTarget('/sites/plants-and-threads/')).toBe('/view/plants-and-threads');
    expect(liveSiteRedirectTarget('/sites/plants-and-threads/index.html')).toBe('/view/plants-and-threads');
    expect(liveSiteRedirectTarget('/sites/plants-and-threads/', '/sites/plants-and-threads/?order=success'))
      .toBe('/view/plants-and-threads?order=success');
  });

  it('does not treat photos or hydrate scripts as live documents', () => {
    expect(liveSiteDocumentIdentifier('/sites/plants-and-threads/gallery/hero.jpg')).toBeNull();
    expect(liveSiteRedirectTarget('/sites/plants-and-threads/products/a.jpg')).toBeNull();
    expect(liveSiteDocumentIdentifier('/sites/site-hydrate.js')).toBeNull();
  });

  it('uses the shop shell for a published view and the app shell otherwise', () => {
    expect(publishedDocumentShell('/view/gallery-salon')).toBe('view.html');
    expect(publishedDocumentShell('/view/gallery-salon/')).toBe('view.html');
    expect(publishedDocumentShell('/')).toBe('index.html');
    expect(publishedDocumentShell('/dashboard')).toBe('index.html');
    expect(publishedDocumentShell('/view/../etc/passwd')).toBe('index.html');
  });

  it('uses the shop document for a connected customer domain and the app shell for the platform', async () => {
    const lookup = async (host) => (host === 'oak.example' ? { subdomain: 'oak-barber' } : null);
    expect(await resolvePublishedDocumentSubdomain('/view/gallery-salon', 'rightsitelight.com', lookup)).toBe('gallery-salon');
    expect(await resolvePublishedDocumentSubdomain('/', 'oak.example', lookup)).toBe('oak-barber');
    expect(await resolvePublishedDocumentSubdomain('/', 'rightsitelight.com', lookup)).toBeNull();
    expect(await resolvePublishedDocumentSubdomain('/', 'localhost', lookup)).toBeNull();
    expect(await resolvePublishedDocumentSubdomain('/', 'missing.example', lookup)).toBeNull();
  });

  it('rewrites crawler /view documents to the SSR /sites document', () => {
    expect(crawlerPublishedDocumentUrl('/view/gallery-salon', '/view/gallery-salon', true)).toBe('/sites/gallery-salon');
    expect(crawlerPublishedDocumentUrl('/view/gallery-salon/', '/view/gallery-salon/?ssr=1', true)).toBe('/sites/gallery-salon?ssr=1');
    expect(crawlerPublishedDocumentUrl('/view/gallery-salon', '/view/gallery-salon?ssr=1', true)).toBe('/sites/gallery-salon?ssr=1');
  });

  it('does not rewrite crawler /view rewrites for humans, assets, or other paths', () => {
    expect(crawlerPublishedDocumentUrl('/view/gallery-salon', '/view/gallery-salon', false)).toBeNull();
    expect(crawlerPublishedDocumentUrl('/view/gallery-salon/data/site.json', '/view/gallery-salon/data/site.json', true)).toBeNull();
    expect(crawlerPublishedDocumentUrl('/showcase/gallery-salon', '/showcase/gallery-salon', true)).toBeNull();
    expect(crawlerPublishedDocumentUrl('/view/gallery-salon', '/view/gallery-salon', undefined)).toBeNull();
  });
});

describe('site isolation — blocked public trees', () => {
  it('blocks drafts and users trees at their legacy root and /data locations', () => {
    expect(blockedPublicTreePath('/drafts')).toBe(true);
    expect(blockedPublicTreePath('/drafts/gym-demo-1762266441700.json')).toBe(true);
    expect(blockedPublicTreePath('/users')).toBe(true);
    expect(blockedPublicTreePath('/users/persylopez9_gmail_com.json')).toBe(true);
    expect(blockedPublicTreePath('/data/drafts')).toBe(true);
    expect(blockedPublicTreePath('/data/drafts/gym-demo-1762266441700.json')).toBe(true);
    expect(blockedPublicTreePath('/data/users')).toBe(true);
    expect(blockedPublicTreePath('/data/users/persylopez9_gmail_com.json')).toBe(true);
  });

  it('allows api routes, other public data documents, and empty input', () => {
    expect(blockedPublicTreePath('/api/users')).toBe(false);
    expect(blockedPublicTreePath('/api/users/me')).toBe(false);
    expect(blockedPublicTreePath('/api/drafts')).toBe(false);
    expect(blockedPublicTreePath('/data/templates')).toBe(false);
    expect(blockedPublicTreePath('/data/templates/salon.json')).toBe(false);
    expect(blockedPublicTreePath('/data/section-registry.json')).toBe(false);
    expect(blockedPublicTreePath('')).toBe(false);
    expect(blockedPublicTreePath(null)).toBe(false);
  });
});

describe('site isolation — /view document and embed', () => {
  it('matches only /view document paths, not deeper asset paths', () => {
    expect(liveViewDocumentIdentifier('/view/gallery-salon')).toBe('gallery-salon');
    expect(liveViewDocumentIdentifier('/view/gallery-salon/')).toBe('gallery-salon');
    expect(liveViewDocumentIdentifier('/view/gallery-salon/data/site.json')).toBeNull();
    expect(liveViewDocumentIdentifier('/view/')).toBeNull();
    expect(liveViewDocumentIdentifier('/view/gallery-salon?edit=true')).toBeNull();
    expect(liveViewDocumentIdentifier('/sites/gallery-salon')).toBeNull();
  });

  it('injects one escaped embed script before </head>', () => {
    const payload = { success: true, site: { subdomain: 'wren', name: 'Wren </script>x' } };
    const html = injectPublishedSiteEmbed('<html><head></head><body></body></html>', payload);
    const scriptCount = (html.match(/<script>/g) || []).length;
    expect(scriptCount).toBe(1);
    expect(html).toContain('window.__RSL_PUBLISHED_SITE__=');
    // `<` inside the JSON payload is escaped so it cannot break out
    expect(html).toContain('\\u003c');
    expect(html).not.toContain('</script>x');
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</head>'));
  });

  it('preloads the painted hero photo from the head', () => {
    const shell = '<html><head></head><body><div id="root"></div></body></html>';
    const fragment = '<div class="ss-live"><img class="ss-hero-photo" data-photo-field="hero.image" src="/photos/hero.jpg" alt="Shop" width="1600" height="900"></div>';
    const html = injectPublishedViewMarkup(shell, fragment);
    expect(html).toContain('<link rel="preload" as="image" fetchpriority="high" href="/photos/hero.jpg">');
    expect(html.indexOf('rel="preload" as="image"')).toBeLessThan(html.indexOf('</head>'));
    expect(preloadPublishedViewHero(html)).toBe(html);
    expect(preloadPublishedViewHero(`${shell}<img class="ss-hero-photo" src="data:image/gif;base64,aaaa">`)).not.toContain('rel="preload" as="image"');
  });

  it('paints the shop inside the empty root', () => {
    const shell = '<html><head></head><body><div id="root"></div></body></html>';
    const html = injectPublishedViewMarkup(shell, '<style id="ss-prerender"></style><div class="ss-live">Oak</div>');
    expect(html).toContain('<div id="root"><style id="ss-prerender"></style><div class="ss-live">Oak</div></div>');
    expect(injectPublishedViewMarkup(shell, '')).toBe(shell);
    expect(injectPublishedViewMarkup('<html><body></body></html>', '<div>Oak</div>')).toBe('<html><body></body></html>');
  });

  it('leaves HTML without a head end tag unchanged', () => {
    expect(injectPublishedSiteEmbed('<html><body></body></html>', { a: 1 })).toBe('<html><body></body></html>');
  });

  it('strips Turnstile and Unsplash hints from the view document, keeps fonts and og', async () => {
    const shell = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
    expect(shell).toContain('challenges.cloudflare.com/turnstile');
    expect(shell).toContain('images.unsplash.com');

    const stripped = stripPublishedViewThirdParties(shell);
    expect(stripped).not.toContain('challenges.cloudflare.com/turnstile');
    expect(stripped).not.toContain('images.unsplash.com');
    expect(stripped).toContain('fonts.googleapis.com');
    expect(stripped).toContain('og:image');

    expect(stripPublishedViewThirdParties(null)).toBe(null);
    expect(stripPublishedViewThirdParties(undefined)).toBe(undefined);
  });

  it('defers the Inter font stylesheet on the view document, keeps preconnects', async () => {
    const shell = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
    expect(shell).toContain('fonts.googleapis.com/css2');
    expect(shell).toContain('fonts.gstatic.com');

    const deferred = deferPublishedViewFonts(shell);
    const asyncMatch = deferred.match(/<link[^>]*rel="stylesheet" media="print" onload="this\.media='all'"[^>]*>/);
    expect(asyncMatch).not.toBeNull();
    expect(asyncMatch[0]).toContain('fonts.googleapis.com/css2');

    const noscriptMatch = deferred.match(/<noscript>(<link[^>]*rel="stylesheet"[^>]*>)<\/noscript>/);
    expect(noscriptMatch).not.toBeNull();
    expect(noscriptMatch[1]).toContain('fonts.googleapis.com/css2');
    expect(noscriptMatch[1]).not.toContain('media="print"');

    expect(deferred).toContain('href="https://fonts.gstatic.com"');
    expect(deferred.match(/fonts\.googleapis\.com\/css2/g).length).toBe(2);

    expect(deferPublishedViewFonts(null)).toBe(null);
    expect(deferPublishedViewFonts(undefined)).toBe(undefined);
  });

  it('lets the hero photo outrank the shop module graph', () => {
    const shell = [
      '<html><head>',
      '<link rel="modulepreload" crossorigin href="/assets/global.js">',
      '<link rel="preload" as="image" fetchpriority="high" href="/photos/hero.jpg">',
      '</head><body>',
      '<script type="module" crossorigin src="/assets/view.js"></script>',
      '</body></html>',
    ].join('');
    const yielded = yieldPublishedViewModules(shell);
    expect(yielded).toContain('<link fetchpriority="low" rel="modulepreload" crossorigin href="/assets/global.js">');
    expect(yielded).toContain('<script fetchpriority="low" type="module" crossorigin src="/assets/view.js"></script>');
    expect(yielded).toContain('rel="preload" as="image" fetchpriority="high" href="/photos/hero.jpg"');
    expect(yieldPublishedViewModules(yielded)).toBe(yielded);
    expect(deferPublishedViewFonts(shell)).toContain('fetchpriority="low" rel="modulepreload"');
    expect(yieldPublishedViewModules(null)).toBe(null);
  });

  it('starts the Fraunces display face in the view document without a second copy', () => {
    const shell = '<html><head><title>Shop</title></head><body><style>.ss-brand { font-family: "Fraunces", serif; }</style></body></html>';
    const preloaded = preloadPublishedViewDisplayFont(shell);
    const interOnly = '<html><head></head><body><style>.ss-brand { font-family: "Inter", sans-serif; }</style></body></html>';
    expect(preloadPublishedViewDisplayFont(interOnly)).toBe(interOnly);
    expect(preloaded).toContain('id="ss-live-fonts"');
    expect(preloaded).toContain(`href="${PUBLISHED_VIEW_DISPLAY_FONT_HREF}"`);
    expect(preloaded).toContain('media="print" onload="this.media=\'all\'"');
    expect(preloaded.indexOf('id="ss-live-fonts"')).toBeLessThan(preloaded.indexOf('</head>'));
    expect(preloaded.match(/family=Fraunces/g)).toHaveLength(2);

    expect(preloadPublishedViewDisplayFont(preloaded).match(/id="ss-live-fonts"/g)).toHaveLength(1);
    expect(preloadPublishedViewDisplayFont('<html><body></body></html>')).toBe('<html><body></body></html>');
    expect(preloadPublishedViewDisplayFont(null)).toBe(null);
  });
});

describe('site isolation — contained paths', () => {
  it('resolves paths inside the root', () => {
    const root = os.tmpdir();
    const resolved = resolveContainedPath(root, 'sites', 'acme');
    expect(resolved.startsWith(path.resolve(root))).toBe(true);
    expect(resolved.endsWith(path.join('sites', 'acme'))).toBe(true);
  });

  it('throws PathEscapeError on traversal segments', () => {
    const root = path.join(os.tmpdir(), 'iso-root');
    expect(() => resolveContainedPath(root, '..', 'etc', 'passwd')).toThrow(PathEscapeError);
    expect(() => resolveContainedPath(root, 'ok', '..', '..', 'secret')).toThrow(PathEscapeError);
  });

  it('keeps draft files under private storage, not public/', () => {
    const draftId = generateSecureId('draft');
    const privatePath = getDraftFilePath(draftId);
    const legacyPath = getLegacyDraftFilePath(draftId);

    expect(privatePath.startsWith(getPrivateDraftsDir())).toBe(true);
    expect(privatePath.includes(`${path.sep}public${path.sep}`)).toBe(false);
    expect(legacyPath.includes(`${path.sep}public${path.sep}drafts${path.sep}`)).toBe(true);
  });

  it('rejects traversal when building draft, template, and site paths', () => {
    expect(() => getDraftFilePath('draft-../../secret')).toThrow(PathEscapeError);
    expect(() => getTemplateFilePath('../salon')).toThrow(PathEscapeError);
    expect(() => getSiteDirectory('../sites')).toThrow(PathEscapeError);
    expect(() => getSiteDirectory('admin')).toThrow(PathEscapeError);
  });

  it('places published sites in isolated per-subdomain directories', () => {
    const a = getSiteDirectory('iso-alpha-cafe');
    const b = getSiteDirectory('iso-beta-salon');
    expect(a).not.toBe(b);
    expect(a.startsWith(getPublishedSitesRoot())).toBe(true);
    expect(b.startsWith(getPublishedSitesRoot())).toBe(true);
    expect(path.basename(a)).toBe('iso-alpha-cafe');
    expect(path.basename(b)).toBe('iso-beta-salon');
  });
});

describe('site isolation — template copies', () => {
  it('deepClone breaks shared nested references', () => {
    const template = { brand: { name: 'Catalog' }, menu: { items: [{ id: 'p1', name: 'Pizza' }] } };
    const a = deepClone(template);
    const b = deepClone(template);
    a.brand.name = 'Tenant A';
    a.menu.items[0].name = 'Tenant A Pizza';
    expect(b.brand.name).toBe('Catalog');
    expect(b.menu.items[0].name).toBe('Pizza');
    expect(template.brand.name).toBe('Catalog');
  });

  it('cloneIsolatedSiteData stamps tenant identity without sharing nested objects', () => {
    const template = { id: 'salon', brand: { name: 'Template Salon' }, settings: { allowOrders: true } };
    const siteA = cloneIsolatedSiteData(template, { siteId: 'acme-salon', subdomain: 'acme-salon', templateId: 'salon' });
    const siteB = cloneIsolatedSiteData(template, { siteId: 'beta-salon', subdomain: 'beta-salon', templateId: 'salon' });

    siteA.brand.name = 'Acme';
    siteA.settings.allowOrders = false;

    expect(siteB.brand.name).toBe('Template Salon');
    expect(siteB.settings.allowOrders).toBe(true);
    expect(siteA._isolation.siteId).toBe('acme-salon');
    expect(siteB._isolation.siteId).toBe('beta-salon');
    expect(siteA._isolation.sourceTemplateId).toBe('salon');
    expect(siteA._isolation.siteId).not.toBe(siteB._isolation.siteId);
  });

  it('TemplateNormalizer.normalize does not mutate the catalog object', () => {
    const catalog = {
      id: 'salon',
      brand: { name: 'Catalog Salon' },
      hero: { title: 'Hello' },
      menu: { sections: [{ id: 'cuts', name: 'Cuts', items: [{ name: 'Fade', price: 30 }] }] }
    };

    const normalized = TemplateNormalizer.normalize(catalog);
    normalized.brand.name = 'Tenant Salon';
    normalized.menu.sections[0].items[0].price = 99;

    expect(catalog.brand.name).toBe('Catalog Salon');
    expect(catalog.menu.sections[0].items[0].price).toBe(30);
  });

  it('loadTemplateCopy returns an isolated copy of a catalog template', async () => {
    const copyA = await loadTemplateCopy('salon');
    const copyB = await loadTemplateCopy('salon');
    copyA.brand = copyA.brand || {};
    copyA.brand.name = 'Mutated Tenant';
    expect(copyB.brand?.name).not.toBe('Mutated Tenant');
  });

  it('loadTemplateCopy strips unowned account links but keeps brand', async () => {
    // QA C-06: salon template carries facebook + calendly links the business
    // does not own yet; a fresh template copy must not inherit them.
    const copy = await loadTemplateCopy('salon');
    expect(JSON.stringify(copy)).not.toContain('facebook.com/');
    expect(JSON.stringify(copy)).not.toContain('calendly.com/');
    expect(copy.brand?.name).toBe('Luxe Beauty Studio');
  });
});

describe('site isolation — subdomain allocation', () => {
  it('slugifies business names', () => {
    expect(slugifySubdomain('Pizza Palace!')).toBe('pizza-palace');
  });

  it('skips reserved names and already-taken slugs', async () => {
    const taken = new Set(['pizza-palace']);
    const slug = await allocateUniqueSubdomain('Admin', async (candidate) => taken.has(candidate));
    expect(slug).not.toBe('admin');
    expect(validateSubdomain(slug).valid).toBe(true);

    const unique = await allocateUniqueSubdomain('Pizza Palace', async (candidate) => taken.has(candidate));
    expect(unique).not.toBe('pizza-palace');
    expect(unique.startsWith('pizza-palace-')).toBe(true);
  });
});

describe('site isolation — published site directories', () => {
  it('writes two template-based sites into separate contained directories', async () => {
    const template = await loadTemplateCopy('salon');
    const siteA = cloneIsolatedSiteData(template, {
      siteId: 'iso-tenant-alpha',
      subdomain: 'iso-tenant-alpha',
      templateId: 'salon'
    });
    siteA.brand = { ...(siteA.brand || {}), name: 'Alpha Cuts' };

    const siteB = cloneIsolatedSiteData(template, {
      siteId: 'iso-tenant-beta',
      subdomain: 'iso-tenant-beta',
      templateId: 'salon'
    });
    siteB.brand = { ...(siteB.brand || {}), name: 'Beta Cuts' };

    createdSubdomains.push('iso-tenant-alpha', 'iso-tenant-beta');
    const dirA = await writeIsolatedSiteFiles('iso-tenant-alpha', siteA);
    const dirB = await writeIsolatedSiteFiles('iso-tenant-beta', siteB);

    expect(dirA).not.toBe(dirB);
    expect(dirA.startsWith(getPublishedSitesRoot())).toBe(true);

    const jsonA = JSON.parse(await fs.readFile(path.join(dirA, 'data', 'site.json'), 'utf-8'));
    const jsonB = JSON.parse(await fs.readFile(path.join(dirB, 'data', 'site.json'), 'utf-8'));

    expect(jsonA.brand.name).toBe('Alpha Cuts');
    expect(jsonB.brand.name).toBe('Beta Cuts');
    expect(jsonA._isolation.siteId).toBe('iso-tenant-alpha');
    expect(jsonB._isolation.siteId).toBe('iso-tenant-beta');
    expect(jsonA._isolation.sourceTemplateId).toBe('salon');

    const indexA = await fs.readFile(path.join(dirA, 'index.html'), 'utf-8');
    expect(indexA).toContain('class="ss-live"');
    expect(indexA).toContain('Alpha Cuts');
    expect(indexA).not.toContain('site-hydrate.js');
  });

  it('redacts the private street from published site.json in area mode', async () => {
    const subdomain = 'iso-area-privacy';
    const street = '99 Hidden Ln Unit 4B';
    createdSubdomains.push(subdomain);

    const dir = await writeIsolatedSiteFiles(subdomain, {
      brand: { name: 'Area Privacy Shop' },
      contact: {
        address: street,
        privateStreet: street,
        addressDisplay: 'area',
        serviceAreaLabel: 'Montclair, NJ',
        serviceRadiusMiles: 10,
      },
    });

    const json = JSON.parse(await fs.readFile(path.join(dir, 'data', 'site.json'), 'utf-8'));
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain('99 Hidden');
    expect(serialized).not.toContain(street);
    expect(json.contact.address).toBe('Serving Montclair, NJ · within 10 miles');
    expect(json.contact.privateStreet).toBeUndefined();
  });
});
