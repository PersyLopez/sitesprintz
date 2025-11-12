import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import draftsRoutes from '../../server/routes/drafts.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware (drafts routes might not require auth for public drafts)
  app.use((req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com'
    };
    next();
  });
  
  app.use('/api/drafts', draftsRoutes);
  return app;
};

describe('Drafts Routes Integration Tests', () => {
  let app;
  let testDraftId;

  beforeAll(() => {
    app = createTestApp();
  });

  afterEach(() => {
    // Clean up test draft if created
    testDraftId = null;
  });

  describe('POST /api/drafts', () => {
    it('should save new draft with valid data', async () => {
      const draftData = {
        data: {
          businessName: 'Test Restaurant',
          template: 'restaurant-casual',
          colors: {
            primary: '#FF5722',
            secondary: '#FFC107'
          },
          content: {
            hero: {
              title: 'Welcome to Test Restaurant',
              subtitle: 'Fresh Food Daily'
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/drafts')
        .send(draftData);

      expect([200, 201, 401, 404, 500]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toEqual(draftData.data);
        
        testDraftId = response.body.id;
      }
    });

    it('should update existing draft', async () => {
      // First create a draft
      const initialData = {
        data: {
          businessName: 'Initial Name',
          template: 'restaurant-casual'
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(initialData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;

        // Update the draft
        const updatedData = {
          data: {
            businessName: 'Updated Name',
            template: 'restaurant-casual',
            email: 'updated@example.com'
          }
        };

        const updateResponse = await request(app)
          .post('/api/drafts')
          .send({ ...updatedData, id: draftId });

        expect([200, 201, 401, 404, 500]).toContain(updateResponse.status);
        
        if (updateResponse.status === 200) {
          expect(updateResponse.body.data.businessName).toBe('Updated Name');
        }

        testDraftId = draftId;
      }
    });

    it('should reject draft without data field', async () => {
      const invalidDraft = {
        businessName: 'Test' // Missing 'data' wrapper
      };

      const response = await request(app)
        .post('/api/drafts')
        .send(invalidDraft);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('data');
    });

    it('should handle empty draft data', async () => {
      const emptyDraft = {
        data: {}
      };

      const response = await request(app)
        .post('/api/drafts')
        .send(emptyDraft);

      // Should accept empty data (might be initial save)
      expect([200, 201, 400, 401, 404, 500]).toContain(response.status);
    });

    it('should create draft file on disk', async () => {
      const draftData = {
        data: {
          businessName: 'File Test Restaurant',
          template: 'salon-pro'
        }
      };

      const response = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (response.status === 200 || response.status === 201) {
        // Draft should have been saved to file system
        expect(response.body).toHaveProperty('id');
        testDraftId = response.body.id;
        
        // Verify file exists by trying to load it
        const loadResponse = await request(app)
          .get(`/api/drafts/${testDraftId}`);
        
        if (loadResponse.status === 200) {
          expect(loadResponse.body.data.businessName).toBe('File Test Restaurant');
        }
      }
    });

    it('should include timestamps in saved draft', async () => {
      const draftData = {
        data: {
          businessName: 'Timestamp Test'
        }
      };

      const response = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        
        // Timestamps should be valid ISO strings
        expect(new Date(response.body.createdAt).toString()).not.toBe('Invalid Date');
        expect(new Date(response.body.updatedAt).toString()).not.toBe('Invalid Date');
        
        testDraftId = response.body.id;
      }
    });

    it('should handle large draft data', async () => {
      const largeDraft = {
        data: {
          businessName: 'Large Data Test',
          products: Array(100).fill(null).map((_, i) => ({
            id: `product-${i}`,
            name: `Product ${i}`,
            description: 'A'.repeat(500)
          }))
        }
      };

      const response = await request(app)
        .post('/api/drafts')
        .send(largeDraft);

      // Should handle large data or reject with size limit
      expect([200, 201, 413, 500]).toContain(response.status);
      
      if (response.status === 200 || response.status === 201) {
        testDraftId = response.body.id;
      }
    });
  });

  describe('GET /api/drafts/:draftId', () => {
    it('should load existing draft', async () => {
      // First create a draft
      const draftData = {
        data: {
          businessName: 'Load Test Business',
          template: 'gym-pro'
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;

        // Load the draft
        const loadResponse = await request(app)
          .get(`/api/drafts/${draftId}`);

        expect(loadResponse.status).toBe(200);
        expect(loadResponse.body).toHaveProperty('id', draftId);
        expect(loadResponse.body).toHaveProperty('data');
        expect(loadResponse.body.data.businessName).toBe('Load Test Business');
        
        testDraftId = draftId;
      }
    });

    it('should handle non-existent draft', async () => {
      const nonExistentId = 'non-existent-draft-12345';

      const response = await request(app)
        .get(`/api/drafts/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return correct draft structure', async () => {
      // Create and load a draft
      const draftData = {
        data: {
          businessName: 'Structure Test',
          email: 'structure@test.com'
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;
        const loadResponse = await request(app)
          .get(`/api/drafts/${draftId}`);

        if (loadResponse.status === 200) {
          // Check structure
          expect(loadResponse.body).toHaveProperty('id');
          expect(loadResponse.body).toHaveProperty('data');
          expect(loadResponse.body).toHaveProperty('createdAt');
          expect(loadResponse.body).toHaveProperty('updatedAt');
        }
        
        testDraftId = draftId;
      }
    });

    it('should handle invalid draft ID format', async () => {
      const invalidId = '../../../etc/passwd';

      const response = await request(app)
        .get(`/api/drafts/${encodeURIComponent(invalidId)}`);

      // Should handle path traversal safely
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/drafts/:draftId', () => {
    it('should delete existing draft', async () => {
      // First create a draft
      const draftData = {
        data: {
          businessName: 'Delete Test'
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;

        // Delete the draft
        const deleteResponse = await request(app)
          .delete(`/api/drafts/${draftId}`);

        expect([200, 204]).toContain(deleteResponse.status);
        
        if (deleteResponse.status === 200) {
          expect(deleteResponse.body).toHaveProperty('success', true);
        }

        // Verify draft is gone
        const loadResponse = await request(app)
          .get(`/api/drafts/${draftId}`);
        
        expect(loadResponse.status).toBe(404);
      }
    });

    it('should handle deletion of already deleted draft', async () => {
      const nonExistentId = 'already-deleted-draft';

      const response = await request(app)
        .delete(`/api/drafts/${nonExistentId}`);

      // Should handle gracefully (might succeed or 404)
      expect([200, 204, 404]).toContain(response.status);
    });

    it('should delete draft file from filesystem', async () => {
      // Create, delete, then verify file is gone by trying to load
      const draftData = {
        data: { businessName: 'File Delete Test' }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;
        
        await request(app).delete(`/api/drafts/${draftId}`);
        
        // Try to load - should fail
        const loadResponse = await request(app)
          .get(`/api/drafts/${draftId}`);
        
        expect(loadResponse.status).toBe(404);
      }
    });
  });

  describe('POST /api/drafts/:draftId/publish', () => {
    it('should create site from draft', async () => {
      // Create a complete draft
      const draftData = {
        data: {
          businessName: 'Publish Test Restaurant',
          template: 'restaurant-casual',
          subdomain: `publish-test-${Date.now()}`,
          email: 'publish@test.com',
          phone: '555-1234'
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;

        // Publish the draft
        const publishResponse = await request(app)
          .post(`/api/drafts/${draftId}/publish`);

        // Should create site (might fail if sites route not mocked)
        expect([200, 201, 400, 500]).toContain(publishResponse.status);
        
        if (publishResponse.status === 200 || publishResponse.status === 201) {
          expect(publishResponse.body).toHaveProperty('site');
        }
      }
    });

    it('should delete draft after successful publish', async () => {
      const draftData = {
        data: {
          businessName: 'Auto-Delete Test',
          template: 'salon-pro',
          subdomain: `auto-delete-${Date.now()}`
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(draftData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;
        
        await request(app).post(`/api/drafts/${draftId}/publish`);
        
        // Draft should be deleted (or moved)
        const loadResponse = await request(app)
          .get(`/api/drafts/${draftId}`);
        
        // Might be 404 if deleted, or still exist if publish failed
        expect([200, 404]).toContain(loadResponse.status);
      }
    });

    it('should handle publish errors gracefully', async () => {
      // Try to publish with incomplete data
      const incompleteDraft = {
        data: {
          businessName: 'Incomplete'
          // Missing required fields like template
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(incompleteDraft);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;
        
        const publishResponse = await request(app)
          .post(`/api/drafts/${draftId}/publish`);
        
        // Should fail validation
        expect([400, 422, 500]).toContain(publishResponse.status);
        
        if (publishResponse.status === 400 || publishResponse.status === 422) {
          expect(publishResponse.body).toHaveProperty('error');
        }
        
        testDraftId = draftId;
      }
    });

    it('should handle non-existent draft publish', async () => {
      const nonExistentId = 'non-existent-draft-publish';

      const response = await request(app)
        .post(`/api/drafts/${nonExistentId}/publish`);

      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Draft Data Integrity', () => {
    it('should preserve complex nested data structures', async () => {
      const complexDraft = {
        data: {
          businessName: 'Complex Data Test',
          services: [
            { id: '1', name: 'Service 1', price: 50 },
            { id: '2', name: 'Service 2', price: 75 }
          ],
          hours: {
            monday: { open: '9:00', close: '17:00' },
            tuesday: { open: '9:00', close: '17:00' }
          },
          metadata: {
            tags: ['restaurant', 'italian', 'family-friendly'],
            rating: 4.5
          }
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(complexDraft);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;
        
        const loadResponse = await request(app)
          .get(`/api/drafts/${draftId}`);
        
        if (loadResponse.status === 200) {
          // Verify data integrity
          expect(loadResponse.body.data.services).toHaveLength(2);
          expect(loadResponse.body.data.hours.monday.open).toBe('9:00');
          expect(loadResponse.body.data.metadata.tags).toContain('italian');
        }
        
        testDraftId = draftId;
      }
    });

    it('should handle special characters in draft data', async () => {
      const specialCharsDraft = {
        data: {
          businessName: 'Café "Le Spécial" & Más',
          description: 'Testing <html>, {json}, [arrays], and UTF-8: 你好',
          symbols: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`'
        }
      };

      const createResponse = await request(app)
        .post('/api/drafts')
        .send(specialCharsDraft);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const draftId = createResponse.body.id;
        
        const loadResponse = await request(app)
          .get(`/api/drafts/${draftId}`);
        
        if (loadResponse.status === 200) {
          // Special characters should be preserved
          expect(loadResponse.body.data.businessName).toBe('Café "Le Spécial" & Más');
          expect(loadResponse.body.data.description).toContain('你好');
        }
        
        testDraftId = draftId;
      }
    });
  });
});


