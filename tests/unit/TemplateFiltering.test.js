/**
 * @vitest-environment node
 */

import { describe, test, expect, beforeEach } from 'vitest';

// Mock template data - will be replaced with actual template loading
const mockTemplates = [
  // Starter templates (13)
  { id: 'restaurant-starter', name: 'Restaurant', tier: 'Starter' },
  { id: 'salon-starter', name: 'Salon', tier: 'Starter' },
  { id: 'gym-starter', name: 'Gym', tier: 'Starter' },
  { id: 'consultant-starter', name: 'Consultant', tier: 'Starter' },
  { id: 'freelancer-starter', name: 'Freelancer', tier: 'Starter' },
  { id: 'cleaning-starter', name: 'Cleaning', tier: 'Starter' },
  { id: 'pet-care-starter', name: 'Pet Care', tier: 'Starter' },
  { id: 'tech-repair-starter', name: 'Tech Repair', tier: 'Starter' },
  { id: 'electrician-starter', name: 'Electrician', tier: 'Starter' },
  { id: 'auto-repair-starter', name: 'Auto Repair', tier: 'Starter' },
  { id: 'plumbing-starter', name: 'Plumbing', tier: 'Starter' },
  { id: 'product-showcase-starter', name: 'Product Showcase', tier: 'Starter' },
  { id: 'generic-starter', name: 'Generic Starter', tier: 'Starter' },
  
  // Pro templates (12)
  { id: 'restaurant-pro', name: 'Restaurant Pro', tier: 'Pro' },
  { id: 'salon-pro', name: 'Salon Pro', tier: 'Pro' },
  { id: 'gym-pro', name: 'Gym Pro', tier: 'Pro' },
  { id: 'consultant-pro', name: 'Consultant Pro', tier: 'Pro' },
  { id: 'freelancer-pro', name: 'Freelancer Pro', tier: 'Pro' },
  { id: 'cleaning-pro', name: 'Cleaning Pro', tier: 'Pro' },
  { id: 'pet-care-pro', name: 'Pet Care Pro', tier: 'Pro' },
  { id: 'tech-repair-pro', name: 'Tech Repair Pro', tier: 'Pro' },
  { id: 'electrician-pro', name: 'Electrician Pro', tier: 'Pro' },
  { id: 'auto-repair-pro', name: 'Auto Repair Pro', tier: 'Pro' },
  { id: 'plumbing-pro', name: 'Plumbing Pro', tier: 'Pro' },
  { id: 'product-showcase-pro', name: 'Product Showcase Pro', tier: 'Pro' },
  
  // Premium templates (4)
  { id: 'restaurant-premium', name: 'Restaurant Premium', tier: 'Premium' },
  { id: 'salon-premium', name: 'Salon Premium', tier: 'Premium' },
  { id: 'gym-premium', name: 'Gym Premium', tier: 'Premium' },
  { id: 'consultant-premium', name: 'Consultant Premium', tier: 'Premium' }
];

// Template filtering utility functions
function filterTemplatesByTier(templates, tier) {
  return templates.filter(template => {
    const templateTier = (template.tier || 'Starter').toLowerCase();
    return templateTier === tier.toLowerCase();
  });
}

function getTemplateCountByTier(templates) {
  const counts = {
    starter: 0,
    pro: 0,
    premium: 0
  };
  
  templates.forEach(template => {
    const tier = (template.tier || 'Starter').toLowerCase();
    if (counts.hasOwnProperty(tier)) {
      counts[tier]++;
    }
  });
  
  return counts;
}

function isTemplateTierAvailable(tier) {
  const availableTiers = ['starter', 'pro'];
  return availableTiers.includes(tier.toLowerCase());
}

describe('Template Tier Filtering', () => {
  describe('Template Counts', () => {
    test('should have exactly 13 Starter templates', () => {
      const starterTemplates = filterTemplatesByTier(mockTemplates, 'Starter');
      expect(starterTemplates).toHaveLength(13);
    });

    test('should have exactly 12 Pro templates', () => {
      const proTemplates = filterTemplatesByTier(mockTemplates, 'Pro');
      expect(proTemplates).toHaveLength(12);
    });

    test('should have exactly 4 Premium templates', () => {
      const premiumTemplates = filterTemplatesByTier(mockTemplates, 'Premium');
      expect(premiumTemplates).toHaveLength(4);
    });

    test('should have total of 29 templates', () => {
      expect(mockTemplates).toHaveLength(29);
    });
  });

  describe('Filter Function', () => {
    test('should filter templates by Starter tier', () => {
      const filtered = filterTemplatesByTier(mockTemplates, 'Starter');
      
      expect(filtered).toHaveLength(13);
      expect(filtered.every(t => t.tier === 'Starter')).toBe(true);
    });

    test('should filter templates by Pro tier', () => {
      const filtered = filterTemplatesByTier(mockTemplates, 'Pro');
      
      expect(filtered).toHaveLength(12);
      expect(filtered.every(t => t.tier === 'Pro')).toBe(true);
    });

    test('should filter templates by Premium tier', () => {
      const filtered = filterTemplatesByTier(mockTemplates, 'Premium');
      
      expect(filtered).toHaveLength(4);
      expect(filtered.every(t => t.tier === 'Premium')).toBe(true);
    });

    test('should be case-insensitive', () => {
      const lower = filterTemplatesByTier(mockTemplates, 'starter');
      const upper = filterTemplatesByTier(mockTemplates, 'STARTER');
      const mixed = filterTemplatesByTier(mockTemplates, 'StArTeR');
      
      expect(lower).toHaveLength(13);
      expect(upper).toHaveLength(13);
      expect(mixed).toHaveLength(13);
    });

    test('should return empty array for invalid tier', () => {
      const filtered = filterTemplatesByTier(mockTemplates, 'invalid');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Count Function', () => {
    test('should return correct counts for all tiers', () => {
      const counts = getTemplateCountByTier(mockTemplates);
      
      expect(counts.starter).toBe(13);
      expect(counts.pro).toBe(12);
      expect(counts.premium).toBe(4);
    });

    test('should handle empty template array', () => {
      const counts = getTemplateCountByTier([]);
      
      expect(counts.starter).toBe(0);
      expect(counts.pro).toBe(0);
      expect(counts.premium).toBe(0);
    });

    test('should handle templates with missing tier', () => {
      const templatesWithMissingTier = [
        { id: 'test-1', name: 'Test 1', tier: 'Starter' },
        { id: 'test-2', name: 'Test 2' }, // Missing tier - should default to Starter
        { id: 'test-3', name: 'Test 3', tier: 'Pro' }
      ];
      
      const counts = getTemplateCountByTier(templatesWithMissingTier);
      
      // Template with missing tier should default to Starter
      expect(counts.starter).toBe(2); // Explicit Starter + missing tier default
      expect(counts.pro).toBe(1);
      expect(counts.premium).toBe(0);
    });
  });

  describe('Tier Availability', () => {
    test('should mark Starter as available', () => {
      expect(isTemplateTierAvailable('starter')).toBe(true);
    });

    test('should mark Pro as available', () => {
      expect(isTemplateTierAvailable('pro')).toBe(true);
    });

    test('should mark Premium as NOT available', () => {
      expect(isTemplateTierAvailable('premium')).toBe(false);
    });

    test('should be case-insensitive for availability check', () => {
      expect(isTemplateTierAvailable('STARTER')).toBe(true);
      expect(isTemplateTierAvailable('PRO')).toBe(true);
      expect(isTemplateTierAvailable('PREMIUM')).toBe(false);
    });
  });

  describe('Template Tier Properties', () => {
    test('all Starter templates should have correct tier property', () => {
      const starterTemplates = filterTemplatesByTier(mockTemplates, 'Starter');
      starterTemplates.forEach(template => {
        expect(template.tier).toBe('Starter');
        expect(template.id).toContain('starter');
      });
    });

    test('all Pro templates should have correct tier property', () => {
      const proTemplates = filterTemplatesByTier(mockTemplates, 'Pro');
      proTemplates.forEach(template => {
        expect(template.tier).toBe('Pro');
        expect(template.id).toContain('pro');
      });
    });

    test('all Premium templates should have correct tier property', () => {
      const premiumTemplates = filterTemplatesByTier(mockTemplates, 'Premium');
      premiumTemplates.forEach(template => {
        expect(template.tier).toBe('Premium');
        expect(template.id).toContain('premium');
      });
    });
  });
});

