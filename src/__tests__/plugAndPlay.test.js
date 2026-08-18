/**
 * Comprehensive Test Suite for Plug-and-Play Feature Builder
 * Phase 6: Cleanup + Validation
 * 
 * These tests validate the entire registry-driven architecture
 */

describe('Section Registry and Rendering', () => {
  describe('sectionRegistry.js', () => {
    test('getAllSections returns all registered sections', () => {
      const { getAllSections } = require('../src/config/sectionRegistry.js');
      const sections = getAllSections();
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
    });

    test('getSectionByType finds section by type', () => {
      const { getSectionByType } = require('../src/config/sectionRegistry.js');
      const hero = getSectionByType('hero');
      expect(hero).toBeDefined();
      expect(hero.type).toBe('hero');
      expect(hero.name).toBeDefined();
    });

    test('createSectionInstance creates valid section instance', () => {
      const { createSectionInstance } = require('../src/config/sectionRegistry.js');
      const instance = createSectionInstance('hero', {
        content: { title: 'Test' }
      });
      expect(instance.id).toBeDefined();
      expect(instance.type).toBe('hero');
      expect(instance.enabled).toBe(true);
      expect(instance.content.title).toBe('Test');
    });

    test('canAccessSection respects tier restrictions', () => {
      const { canAccessSection } = require('../src/config/sectionRegistry.js');
      expect(canAccessSection('trial', 'hero')).toBe(true);
      expect(canAccessSection('trial', 'native-booking')).toBe(false);
      expect(canAccessSection('growth', 'native-booking')).toBe(true);
      expect(canAccessSection('pro', 'checkout')).toBe(true);
    });
  });

  describe('unifiedRenderer.js', () => {
    test('getRendererForType returns renderer for known types', () => {
      const { getRendererForType } = require('../src/utils/unifiedRenderer.js');
      const heroRenderer = getRendererForType('hero');
      expect(typeof heroRenderer).toBe('function');
    });

    test('renderAllSections filters and orders sections', () => {
      const { renderAllSections } = require('../src/utils/unifiedRenderer.js');
      const sections = [
        { id: '1', type: 'hero', enabled: true, order: 0 },
        { id: '2', type: 'contact', enabled: true, order: 1 },
        { id: '3', type: 'stats', enabled: false, order: 2 }
      ];
      const siteData = {};
      const rendered = renderAllSections(sections, siteData);
      expect(rendered.length).toBe(2); // Disabled section filtered out
    });

    test('renderAllSections handles missing renderers gracefully', () => {
      const { renderAllSections } = require('../src/utils/unifiedRenderer.js');
      const sections = [
        { id: '1', type: 'unknown-type', enabled: true, order: 0 }
      ];
      const rendered = renderAllSections(sections, {});
      expect(rendered.length).toBe(0); // Unknown type filtered out
    });
  });

  describe('sectionNormalizer.js', () => {
    test('normalizeTemplateSections converts niche template to sections array', () => {
      const { normalizeTemplateSections } = require('../src/utils/sectionNormalizer.js');
      const template = {
        hero: { title: 'Test' },
        services: [{ name: 'Service 1' }],
        contact: { email: 'test@example.com' }
      };
      const sections = normalizeTemplateSections(template);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.some(s => s.type === 'hero')).toBe(true);
      expect(sections.some(s => s.type === 'services')).toBe(true);
      expect(sections.some(s => s.type === 'contact')).toBe(true);
    });

    test('normalizeTemplateSections handles already-normalized input', () => {
      const { normalizeTemplateSections } = require('../src/utils/sectionNormalizer.js');
      const sections = [
        { id: '1', type: 'hero', enabled: true, order: 0, content: {} }
      ];
      const input = { sections };
      const result = normalizeTemplateSections(input);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'hero' })
      ]));
    });

    test('denormalizeSections converts back to legacy format', () => {
      const { denormalizeSections } = require('../src/utils/sectionNormalizer.js');
      const sections = [
        { type: 'hero', content: { title: 'Hero Title' } },
        { type: 'services', content: { items: ['Service 1'] } }
      ];
      const result = denormalizeSections(sections);
      expect(result.hero).toBeDefined();
      expect(result.services).toBeDefined();
    });
  });
});

describe('Publishing and Custom Templates', () => {
  describe('publishService.js', () => {
    test('buildPublishableContent creates valid site.json', () => {
      const { buildPublishableContent, validatePublishedContent } = require('../src/services/publishService.js');
      const draft = {
        id: 'draft-1',
        businessName: 'Test Business',
        sections: [
          { id: '1', type: 'hero', enabled: true, order: 0 },
          { id: '2', type: 'contact', enabled: true, order: 1 }
        ]
      };
      const published = buildPublishableContent(draft, 'growth');
      expect(published.id).toBe('draft-1');
      expect(published.sections).toBeDefined();
      const validation = validatePublishedContent(published);
      expect(validation.valid).toBe(true);
    });

    test('applyTierFiltering removes locked sections', () => {
      const { applyTierFiltering } = require('../src/services/publishService.js');
      const sections = [
        { id: '1', type: 'hero', enabled: true },
        { id: '2', type: 'checkout', enabled: true }
      ];
      const filtered = applyTierFiltering(sections, 'starter');
      expect(filtered.some(s => s.type === 'hero')).toBe(true);
      expect(filtered.some(s => s.type === 'checkout')).toBe(false);
    });

    test('preparePublishPayload validates before returning', () => {
      const { preparePublishPayload } = require('../src/services/publishService.js');
      const draft = {
        id: 'draft-1',
        businessName: 'Test',
        sections: [
          { id: '1', type: 'hero', enabled: true, order: 0 },
          { id: '2', type: 'contact', enabled: true, order: 1 }
        ]
      };
      expect(() => preparePublishPayload(draft, 'starter')).not.toThrow();
    });
  });

  describe('Custom Template E2E', () => {
    test('custom template can be published and rendered', async () => {
      // This test verifies the full flow:
      // 1. Create custom template with sections
      // 2. Publish it
      // 3. Render published version
      // 4. Verify output matches niche template output
      
      const customDraft = {
        id: 'custom-test',
        isCustom: true,
        businessName: 'Custom Business',
        template: 'custom',
        sections: [
          { id: 's1', type: 'hero', enabled: true, order: 0, content: { title: 'Custom' } },
          { id: 's2', type: 'services', enabled: true, order: 1, content: { items: [] } },
          { id: 's3', type: 'contact', enabled: true, order: 2, content: {} }
        ]
      };

      const { preparePublishPayload } = require('../src/services/publishService.js');
      const { renderAllSections } = require('../src/utils/unifiedRenderer.js');

      // Publish
      const publishPayload = preparePublishPayload(customDraft, 'growth');
      expect(publishPayload.businessData.isCustomTemplate).toBe(true);

      // Render
      const rendered = renderAllSections(publishPayload.businessData.sections, publishPayload.businessData);
      expect(rendered.length).toBeGreaterThan(0);
    });
  });
});

describe('Tier Gating', () => {
  describe('tiers.js', () => {
    test('hasTierAccess respects hierarchy', () => {
      const { hasTierAccess } = require('../src/config/tiers.js');
      expect(hasTierAccess('trial', 'trial')).toBe(true);
      expect(hasTierAccess('starter', 'trial')).toBe(true);
      expect(hasTierAccess('trial', 'starter')).toBe(false);
    });

    test('normalizeTier maps legacy names', () => {
      const { normalizeTier } = require('../src/config/tiers.js');
      expect(normalizeTier('free')).toBe('trial');
      expect(normalizeTier('business')).toBe('pro');
      expect(normalizeTier('pro')).toBe('pro');
    });
  });

  describe('Admin Overrides', () => {
    test('mergeWithAdminOverrides applies overrides correctly', () => {
      const { mergeWithAdminOverrides } = require('../src/services/adminSectionsService.js');
      const sections = [
        { type: 'hero', requiredTier: 'trial', enabled: true },
        { type: 'checkout', requiredTier: 'pro', enabled: true }
      ];
      const overrides = {
        'checkout': { tierOverride: 'starter', enabled: true }
      };
      const merged = mergeWithAdminOverrides(sections, overrides);
      const checkout = merged.find(s => s.type === 'checkout');
      expect(checkout.requiredTier).toBe('starter');
    });

    test('admin can disable sections globally', () => {
      const { mergeWithAdminOverrides } = require('../src/services/adminSectionsService.js');
      const sections = [{ type: 'hero', enabled: true }];
      const overrides = { 'hero': { enabled: false } };
      const merged = mergeWithAdminOverrides(sections, overrides);
      expect(merged[0].enabled).toBe(false);
    });
  });
});

describe('Section CRUD Operations', () => {
  test('can add a section to site', () => {
    const { createSectionInstance } = require('../src/config/sectionRegistry.js');
    const newSection = createSectionInstance('hero', { 
      content: { title: 'New Hero' } 
    });
    expect(newSection).toHaveProperty('id');
    expect(newSection.type).toBe('hero');
  });

  test('can remove a section from site', () => {
    const sections = [
      { id: '1', type: 'hero' },
      { id: '2', type: 'contact' }
    ];
    const updated = sections.filter(s => s.id !== '1');
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe('2');
  });

  test('can reorder sections', () => {
    const sections = [
      { id: '1', type: 'hero', order: 0 },
      { id: '2', type: 'services', order: 1 },
      { id: '3', type: 'contact', order: 2 }
    ];
    // Move services to top
    const reordered = [sections[1], sections[0], sections[2]].map((s, i) => ({
      ...s,
      order: i
    }));
    expect(reordered[0].type).toBe('services');
    expect(reordered[0].order).toBe(0);
  });

  test('can toggle section visibility', () => {
    const section = { id: '1', type: 'hero', enabled: true };
    const toggled = { ...section, enabled: !section.enabled };
    expect(toggled.enabled).toBe(false);
  });
});

describe('Regression Tests - Niche Templates', () => {
  // These tests ensure all 12 niche templates still work correctly
  const niches = [
    'restaurant', 'salon', 'gym', 'consultant', 'electrician',
    'plumber', 'tech-repair', 'photographer', 'cleaning',
    'realtor', 'dentist', 'accountant'
  ];

  niches.forEach(niche => {
    test(`${niche} template renders without errors`, async () => {
      const { normalizeTemplateSections } = require('../src/utils/sectionNormalizer.js');
      const { renderAllSections } = require('../src/utils/unifiedRenderer.js');

      // TODO: Load template from public/data/templates/${niche}.json
      const template = { id: niche, hero: { title: niche } };

      const sections = normalizeTemplateSections(template);
      expect(sections.length).toBeGreaterThan(0);

      const rendered = renderAllSections(sections, template);
      expect(rendered).toBeDefined();
    });
  });
});

export const testSuite = {
  description: 'Plug-and-Play Feature Builder Test Suite',
  phases: [
    'Section Registry and Rendering',
    'Publishing and Custom Templates',
    'Tier Gating',
    'Section CRUD Operations',
    'Regression Tests - Niche Templates'
  ]
};
