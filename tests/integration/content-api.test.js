/**
 * Content Management API Tests
 * TDD Approach: RED phase
 * 
 * CRUD operations for:
 * - Menu items (restaurants, cafes)
 * - Services (salons, consultants, repair shops)
 * - Products (retail, e-commerce)
 * 
 * Features:
 * - Create/Read/Update/Delete
 * - Validation & sanitization
 * - Image upload support
 * - Ordering/sorting
 * - Category management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

describe('Content Management API', () => {
  let app;

  beforeEach(async () => {
    // Mock database
    vi.mock('../../database/db.js', () => ({
      query: vi.fn(),
      transaction: vi.fn()
    }));

    // Import app
    const { default: server } = await import('../../server.js');
    app = server;
  });

  describe('Menu Items API', () => {
    describe('GET /api/content/:subdomain/menu', () => {
      it('should fetch all menu items for a site', async () => {
        const response = await request(app)
          .get('/api/content/test-site/menu')
          .expect(200);

        expect(response.body).toHaveProperty('items');
        expect(Array.isArray(response.body.items)).toBe(true);
      });

      it('should group menu items by category', async () => {
        const response = await request(app)
          .get('/api/content/test-site/menu?grouped=true')
          .expect(200);

        expect(response.body).toHaveProperty('categories');
      });

      it('should return 404 for non-existent site', async () => {
        await request(app)
          .get('/api/content/nonexistent/menu')
          .expect(404);
      });
    });

    describe('POST /api/content/:subdomain/menu', () => {
      it('should create new menu item', async () => {
        const newItem = {
          name: 'Burger',
          description: 'Delicious burger',
          price: 12.99,
          category: 'Main Course',
          image: 'burger.jpg'
        };

        const response = await request(app)
          .post('/api/content/test-site/menu')
          .send(newItem)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Burger');
      });

      it('should validate required fields', async () => {
        const invalidItem = {
          description: 'Missing name and price'
        };

        const response = await request(app)
          .post('/api/content/test-site/menu')
          .send(invalidItem)
          .expect(400);

        expect(response.body).toHaveProperty('errors');
      });

      it('should sanitize HTML in descriptions', async () => {
        const itemWithXSS = {
          name: 'Pizza',
          description: '<script>alert("xss")</script>Fresh pizza',
          price: 15.99
        };

        const response = await request(app)
          .post('/api/content/test-site/menu')
          .send(itemWithXSS)
          .expect(201);

        expect(response.body.description).not.toContain('<script>');
        expect(response.body.description).toContain('Fresh pizza');
      });

      it('should validate price is positive', async () => {
        const item = {
          name: 'Test',
          price: -5,
          description: 'Test'
        };

        await request(app)
          .post('/api/content/test-site/menu')
          .send(item)
          .expect(400);
      });

      it('should require authentication', async () => {
        await request(app)
          .post('/api/content/test-site/menu')
          .send({ name: 'Test', price: 10 })
          .expect(401);
      });
    });

    describe('PUT /api/content/:subdomain/menu/:itemId', () => {
      it('should update menu item', async () => {
        const updates = {
          name: 'Updated Burger',
          price: 13.99
        };

        const response = await request(app)
          .put('/api/content/test-site/menu/123')
          .send(updates)
          .expect(200);

        expect(response.body.name).toBe('Updated Burger');
        expect(response.body.price).toBe(13.99);
      });

      it('should return 404 for non-existent item', async () => {
        await request(app)
          .put('/api/content/test-site/menu/999999')
          .send({ name: 'Test' })
          .expect(404);
      });

      it('should prevent updating to invalid data', async () => {
        await request(app)
          .put('/api/content/test-site/menu/123')
          .send({ price: 'invalid' })
          .expect(400);
      });
    });

    describe('DELETE /api/content/:subdomain/menu/:itemId', () => {
      it('should delete menu item', async () => {
        await request(app)
          .delete('/api/content/test-site/menu/123')
          .expect(200);
      });

      it('should return 404 for non-existent item', async () => {
        await request(app)
          .delete('/api/content/test-site/menu/999999')
          .expect(404);
      });

      it('should require authentication', async () => {
        await request(app)
          .delete('/api/content/test-site/menu/123')
          .expect(401);
      });
    });

    describe('PATCH /api/content/:subdomain/menu/reorder', () => {
      it('should reorder menu items', async () => {
        const newOrder = [
          { id: '3', order: 0 },
          { id: '1', order: 1 },
          { id: '2', order: 2 }
        ];

        const response = await request(app)
          .patch('/api/content/test-site/menu/reorder')
          .send({ items: newOrder })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should validate all items belong to site', async () => {
        const invalidOrder = [
          { id: 'other-site-item', order: 0 }
        ];

        await request(app)
          .patch('/api/content/test-site/menu/reorder')
          .send({ items: invalidOrder })
          .expect(403);
      });
    });
  });

  describe('Services API', () => {
    describe('GET /api/content/:subdomain/services', () => {
      it('should fetch all services', async () => {
        const response = await request(app)
          .get('/api/content/test-site/services')
          .expect(200);

        expect(response.body).toHaveProperty('services');
        expect(Array.isArray(response.body.services)).toBe(true);
      });

      it('should include pricing tiers', async () => {
        const response = await request(app)
          .get('/api/content/test-site/services')
          .expect(200);

        const service = response.body.services[0];
        if (service) {
          expect(service).toHaveProperty('pricing');
        }
      });
    });

    describe('POST /api/content/:subdomain/services', () => {
      it('should create new service', async () => {
        const newService = {
          name: 'Haircut',
          description: 'Professional haircut',
          duration: 30,
          price: 25,
          category: 'Hair Services'
        };

        const response = await request(app)
          .post('/api/content/test-site/services')
          .send(newService)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Haircut');
      });

      it('should support pricing tiers', async () => {
        const service = {
          name: 'Consulting',
          description: 'Business consulting',
          pricing: [
            { tier: 'Basic', price: 100, duration: 30 },
            { tier: 'Premium', price: 200, duration: 60 }
          ]
        };

        const response = await request(app)
          .post('/api/content/test-site/services')
          .send(service)
          .expect(201);

        expect(response.body.pricing).toHaveLength(2);
      });

      it('should validate duration is positive', async () => {
        const service = {
          name: 'Test',
          duration: -10,
          price: 50
        };

        await request(app)
          .post('/api/content/test-site/services')
          .send(service)
          .expect(400);
      });
    });

    describe('PUT /api/content/:subdomain/services/:serviceId', () => {
      it('should update service', async () => {
        const updates = {
          name: 'Updated Service',
          price: 35
        };

        const response = await request(app)
          .put('/api/content/test-site/services/123')
          .send(updates)
          .expect(200);

        expect(response.body.name).toBe('Updated Service');
      });
    });

    describe('DELETE /api/content/:subdomain/services/:serviceId', () => {
      it('should delete service', async () => {
        await request(app)
          .delete('/api/content/test-site/services/123')
          .expect(200);
      });
    });
  });

  describe('Products API', () => {
    describe('GET /api/content/:subdomain/products', () => {
      it('should fetch all products', async () => {
        const response = await request(app)
          .get('/api/content/test-site/products')
          .expect(200);

        expect(response.body).toHaveProperty('products');
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/content/test-site/products?page=1&limit=10')
          .expect(200);

        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('total');
      });
    });

    describe('POST /api/content/:subdomain/products', () => {
      it('should create new product', async () => {
        const product = {
          name: 'T-Shirt',
          description: 'Cotton t-shirt',
          price: 19.99,
          inventory: 50,
          images: ['tshirt1.jpg', 'tshirt2.jpg']
        };

        const response = await request(app)
          .post('/api/content/test-site/products')
          .send(product)
          .expect(201);

        expect(response.body.name).toBe('T-Shirt');
      });

      it('should support product variants', async () => {
        const product = {
          name: 'Shoes',
          price: 79.99,
          variants: [
            { size: 'Small', color: 'Red', sku: 'SHOE-S-RED', inventory: 10 },
            { size: 'Medium', color: 'Blue', sku: 'SHOE-M-BLU', inventory: 15 }
          ]
        };

        const response = await request(app)
          .post('/api/content/test-site/products')
          .send(product)
          .expect(201);

        expect(response.body.variants).toHaveLength(2);
      });

      it('should validate inventory is non-negative', async () => {
        const product = {
          name: 'Test',
          price: 10,
          inventory: -5
        };

        await request(app)
          .post('/api/content/test-site/products')
          .send(product)
          .expect(400);
      });
    });
  });

  describe('Image Upload', () => {
    describe('POST /api/content/:subdomain/upload', () => {
      it('should upload image', async () => {
        const response = await request(app)
          .post('/api/content/test-site/upload')
          .attach('image', Buffer.from('fake image'), 'test.jpg')
          .expect(200);

        expect(response.body).toHaveProperty('url');
      });

      it('should validate file type', async () => {
        await request(app)
          .post('/api/content/test-site/upload')
          .attach('image', Buffer.from('fake'), 'test.exe')
          .expect(400);
      });

      it('should validate file size', async () => {
        const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB
        
        await request(app)
          .post('/api/content/test-site/upload')
          .attach('image', largeFile, 'large.jpg')
          .expect(413);
      });

      it('should generate unique filenames', async () => {
        const response1 = await request(app)
          .post('/api/content/test-site/upload')
          .attach('image', Buffer.from('fake1'), 'test.jpg')
          .expect(200);

        const response2 = await request(app)
          .post('/api/content/test-site/upload')
          .attach('image', Buffer.from('fake2'), 'test.jpg')
          .expect(200);

        expect(response1.body.url).not.toBe(response2.body.url);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/content/:subdomain/menu/bulk', () => {
      it('should import multiple items', async () => {
        const items = [
          { name: 'Item 1', price: 10, category: 'Cat A' },
          { name: 'Item 2', price: 15, category: 'Cat A' },
          { name: 'Item 3', price: 20, category: 'Cat B' }
        ];

        const response = await request(app)
          .post('/api/content/test-site/menu/bulk')
          .send({ items })
          .expect(200);

        expect(response.body.created).toBe(3);
      });

      it('should handle partial failures', async () => {
        const items = [
          { name: 'Valid Item', price: 10 },
          { name: 'Invalid', price: -5 }, // Invalid price
          { name: 'Another Valid', price: 15 }
        ];

        const response = await request(app)
          .post('/api/content/test-site/menu/bulk')
          .send({ items })
          .expect(207); // Multi-status

        expect(response.body.created).toBe(2);
        expect(response.body.failed).toBe(1);
        expect(response.body.errors).toHaveLength(1);
      });
    });

    describe('DELETE /api/content/:subdomain/menu/bulk', () => {
      it('should delete multiple items', async () => {
        const response = await request(app)
          .delete('/api/content/test-site/menu/bulk')
          .send({ ids: ['1', '2', '3'] })
          .expect(200);

        expect(response.body.deleted).toBe(3);
      });
    });
  });
});

