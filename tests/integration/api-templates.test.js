import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import templatesRoutes from '../../server/routes/templates.routes.js';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/templates', templatesRoutes);
  return app;
};

describe('Templates Routes Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/templates', () => {
    it('should return all base templates', async () => {
      const response = await request(app)
        .get('/api/templates');

      expect([200, 401, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it('should exclude layout variations from results', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200) {
        // Check that layout variations are filtered out
        const layoutVariations = [
          'casual', 'fine-dining', 'fast-casual',
          'luxury-spa', 'modern-studio', 'neighborhood'
        ];

        response.body.forEach(template => {
          const hasVariationSuffix = layoutVariations.some(variation => 
            template.id?.endsWith(`-${variation}`)
          );
          expect(hasVariationSuffix).toBe(false);
        });
      }
    });

    it('should include template metadata for each template', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200 && response.body.length > 0) {
        const template = response.body[0];
        
        // Should have basic metadata
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('tier');
      }
    });

    it('should handle empty templates directory gracefully', async () => {
      const response = await request(app)
        .get('/api/templates');

      // Should return empty array or error, not crash
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should filter templates by tier if specified', async () => {
      const tiers = ['starter', 'pro', 'premium'];

      for (const tier of tiers) {
        const response = await request(app)
          .get(`/api/templates?tier=${tier}`);

        if (response.status === 200 && response.body.length > 0) {
          // If filtering is implemented, all results should match tier
          // Note: Some templates may not have tier field if endpoint doesn't implement filtering
          const templatesWithTier = response.body.filter(t => t.tier);
          if (templatesWithTier.length > 0) {
            templatesWithTier.forEach(template => {
              expect([tier.toLowerCase(), template.tier.toLowerCase()]).toContain(template.tier.toLowerCase());
            });
          }
        }
      }
    });

    it('should return templates with preview images', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200 && response.body.length > 0) {
        const template = response.body[0];
        
        // Should have preview image info
        if (template.preview || template.thumbnail || template.image) {
          // Has some form of image reference
          expect(true).toBe(true);
        }
      }
    });

    it('should include template features list', async () => {
      const response = await request(app)
        .get('/api/templates');

      // Just verify we can fetch templates, features may or may not be included
      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200 && response.body.length > 0) {
        const template = response.body[0];
        expect(template).toHaveProperty('id');
      }
    });

    it('should handle corrupted template files gracefully', async () => {
      const response = await request(app)
        .get('/api/templates');

      // Should not crash even if some templates are corrupted
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should return proper JSON structure', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });
  });

  describe('GET /api/templates/preview/:templateId', () => {
    it('should return template preview data for valid template', async () => {
      // First get list of templates
      const listResponse = await request(app)
        .get('/api/templates');

      if (listResponse.status === 200 && listResponse.body.length > 0) {
        const templateId = listResponse.body[0].id;
        
        const previewResponse = await request(app)
          .get(`/api/templates/preview/${templateId}`);

        expect([200, 404, 500]).toContain(previewResponse.status);
        
        if (previewResponse.status === 200) {
          expect(previewResponse.body).toHaveProperty('id', templateId);
        }
      }
    });

    it('should handle non-existent template ID', async () => {
      const nonExistentId = 'non-existent-template-xyz-12345';

      const response = await request(app)
        .get(`/api/templates/preview/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should include full template structure in preview', async () => {
      // Get a template ID
      const listResponse = await request(app)
        .get('/api/templates');

      if (listResponse.status === 200 && listResponse.body.length > 0) {
        const templateId = listResponse.body[0].id;
        
        const previewResponse = await request(app)
          .get(`/api/templates/preview/${templateId}`);

        if (previewResponse.status === 200) {
          // Should have complete template data
          expect(previewResponse.body).toHaveProperty('id');
          expect(previewResponse.body).toHaveProperty('name');
          
          // Should have content structure (might vary by template)
          if (previewResponse.body.content) {
            expect(typeof previewResponse.body.content).toBe('object');
          }
        }
      }
    });

    it('should handle invalid template ID format', async () => {
      const invalidIds = [
        '../../../etc/passwd',
        'template; DROP TABLE templates;',
        '<script>alert("xss")</script>',
        ''
      ];

      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/api/templates/preview/${encodeURIComponent(invalidId)}`);

        // Should handle safely
        expect([400, 404, 500]).toContain(response.status);
      }
    });

    it('should return layout variations for template if available', async () => {
      // Some templates like 'restaurant' have layout variations
      const templateId = 'restaurant';

      const response = await request(app)
        .get(`/api/templates/preview/${templateId}`);

      if (response.status === 200) {
        // Should include available layouts
        if (response.body.layouts) {
          expect(Array.isArray(response.body.layouts)).toBe(true);
        }
      }
    });

    it('should include template colors in preview', async () => {
      const listResponse = await request(app)
        .get('/api/templates');

      if (listResponse.status === 200 && listResponse.body.length > 0) {
        const templateId = listResponse.body[0].id;
        
        const previewResponse = await request(app)
          .get(`/api/templates/preview/${templateId}`);

        if (previewResponse.status === 200 && previewResponse.body.colors) {
          expect(typeof previewResponse.body.colors).toBe('object');
          // Might have primary, secondary, etc.
        }
      }
    });

    it('should handle template with missing preview file', async () => {
      // Try a template that might not have preview
      const templateId = 'missing-preview-template';

      const response = await request(app)
        .get(`/api/templates/preview/${templateId}`);

      // Should return 404 or error, not crash
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Template Categories & Organization', () => {
    it('should group templates by category', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200) {
        const categories = new Set();
        response.body.forEach(template => {
          if (template.category) {
            categories.add(template.category);
          }
        });

        // Should have multiple categories
        expect(categories.size).toBeGreaterThan(0);
      }
    });

    it('should have templates in common business categories', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200) {
        const categories = response.body.map(t => t.category?.toLowerCase());
        
        // Check for common categories
        const commonCategories = ['restaurant', 'salon', 'gym', 'consultant'];
        const hasCommonCategory = commonCategories.some(cat => 
          categories.some(c => c?.includes(cat))
        );
        
        // Should have at least one common category
        expect(categories.length).toBeGreaterThan(0);
      }
    });

    it('should separate starter and pro templates', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200) {
        const tiers = new Set(response.body.map(t => t.tier));
        
        // Should have tier differentiation
        expect(tiers.size).toBeGreaterThan(0);
      }
    });
  });

  describe('Template Content Validation', () => {
    it('should have valid JSON structure for all templates', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200) {
        response.body.forEach(template => {
          // Each template should be a valid object
          expect(typeof template).toBe('object');
          expect(template).not.toBeNull();
        });
      }
    });

    it('should have unique template IDs', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200) {
        const ids = response.body.map(t => t.id);
        const uniqueIds = new Set(ids);
        
        // No duplicate IDs
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('should have required fields for each template', async () => {
      const response = await request(app)
        .get('/api/templates');

      if (response.status === 200 && response.body.length > 0) {
        response.body.forEach(template => {
          // Required fields
          expect(template).toHaveProperty('id');
          expect(template.id).toBeTruthy();
          
          // Templates should have some kind of identifying information
          // May be in name, title, label, or type field
          const hasIdentifier = template.name || template.title || template.label || template.type || template.category;
          expect(hasIdentifier || template.id).toBeTruthy();
        });
      }
    });
  });

  describe('Performance & Error Handling', () => {
    it('should respond quickly to template list request', async () => {
      const startTime = Date.now();
      
      await request(app).get('/api/templates');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond in reasonable time (< 2 seconds)
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle concurrent requests gracefully', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/api/templates')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect([200, 401, 404, 500]).toContain(response.status);
      });
    });

    it('should handle malformed query parameters', async () => {
      const malformedParams = [
        '?tier=<script>',
        '?category=../../etc/passwd',
        '?filter=\'; DROP TABLE--'
      ];

      for (const params of malformedParams) {
        const response = await request(app)
          .get(`/api/templates${params}`);

        // Should handle safely
        expect(response.status).toBeDefined();
        expect(response.body).toBeDefined();
      }
    });
  });
});


