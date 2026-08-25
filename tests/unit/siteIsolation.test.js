import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { TemplateNormalizer } from '../../server/services/templateNormalizer.js';
import {
  PathEscapeError,
  allocateUniqueSubdomain,
  cloneIsolatedSiteData,
  deepClone,
  getDraftFilePath,
  getLegacyDraftFilePath,
  getPrivateDraftsDir,
  getPublishedSitesRoot,
  getSiteDirectory,
  getTemplateFilePath,
  isSafeSiteIdentifier,
  loadTemplateCopy,
  removeIsolatedSiteFiles,
  resolveContainedPath,
  slugifySubdomain,
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
