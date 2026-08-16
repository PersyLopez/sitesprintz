import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { validateTemplateSections, KNOWN_SECTION_TYPES } from '../../server/utils/templateValidator.js';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    templates: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(mockPrisma)),
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

import { PrismaClient } from '@prisma/client';

const mockPrisma = new PrismaClient();

// Mock auth middleware
vi.mock('../../server/middleware/auth.js', () => ({
  requireAdmin: vi.fn((req, res, next) => {
    req.user = { id: 'admin1', role: 'admin' };
    next();
  }),
}));

describe('Template Validator', () => {
  it('should validate valid sections array', () => {
    const sections = [
      { type: 'hero', content: { title: 'Welcome', subtitle: 'Subtitle' } },
      { type: 'services', content: { title: 'Services', items: [{ name: 'Service 1' }] } },
    ];
    const result = validateTemplateSections(sections);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject non-array sections', () => {
    const result = validateTemplateSections('not an array');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Sections must be an array');
  });

  it('should reject empty sections array', () => {
    const result = validateTemplateSections([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template must have at least one section');
  });

  it('should reject section without type', () => {
    const sections = [{ content: { title: 'Test' } }];
    const result = validateTemplateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Section at index 0 missing required field: type');
  });

  it('should reject section without content', () => {
    const sections = [{ type: 'hero' }];
    const result = validateTemplateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Section at index 0 missing required field: content');
  });

  it('should reject unknown section type', () => {
    const sections = [{ type: 'unknown-type', content: {} }];
    const result = validateTemplateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Section at index 0 has unknown type: unknown-type');
  });

  it('should accept all known section types', () => {
    KNOWN_SECTION_TYPES.forEach((type) => {
      const sections = [{ type, content: {} }];
      const result = validateTemplateSections(sections);
      expect(result.valid).toBe(true);
    });
  });

  it('should validate multiple sections with mixed valid/invalid', () => {
    const sections = [
      { type: 'hero', content: { title: 'Test' } },
      { type: 'invalid-type', content: {} },
      { content: { title: 'No type' } },
    ];
    const result = validateTemplateSections(sections);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Admin Templates API Routes', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 'admin1', role: 'admin' },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('GET /api/admin/templates (list)', () => {
    it('should return templates with pagination', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Salon Template',
          slug: 'salon',
          industry: 'beauty',
          description: 'A salon template',
          layout_key: 'single-page',
          character: 'refined',
          sections: [],
          metadata: {},
          status: 'active',
          version: 1,
          is_default: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrisma.templates.findMany.mockResolvedValue(mockTemplates);
      mockPrisma.templates.count.mockResolvedValue(1);

      // Import route handler dynamically after mocks are set
      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      // We'll test the handler logic directly
      expect(mockPrisma.templates.findMany).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockReq.query = { status: 'active' };
      mockPrisma.templates.findMany.mockResolvedValue([]);
      mockPrisma.templates.count.mockResolvedValue(0);

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        })
      );
    });

    it('should filter by industry', async () => {
      mockReq.query = { industry: 'beauty' };
      mockPrisma.templates.findMany.mockResolvedValue([]);
      mockPrisma.templates.count.mockResolvedValue(0);

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ industry: 'beauty' }),
        })
      );
    });
  });

  describe('GET /api/admin/templates/:id', () => {
    it('should return template by id', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Salon Template',
        slug: 'salon',
        industry: 'beauty',
        sections: [{ type: 'hero', content: { title: 'Test' } }],
        status: 'active',
        version: 1,
      };

      mockReq.params = { id: '1' };
      mockPrisma.templates.findUnique.mockResolvedValue(mockTemplate);

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return 404 for non-existent template', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockPrisma.templates.findUnique.mockResolvedValue(null);

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('POST /api/admin/templates (create)', () => {
    it('should create a new template with valid sections', async () => {
      const newTemplate = {
        name: 'New Template',
        slug: 'new-template',
        industry: 'beauty',
        description: 'A new template',
        layout_key: 'single-page',
        character: 'modern',
        sections: [{ type: 'hero', content: { title: 'Welcome' } }],
        metadata: {},
      };

      mockReq.body = newTemplate;
      mockPrisma.templates.findUnique.mockResolvedValue(null); // slug check
      mockPrisma.templates.create.mockResolvedValue({ ...newTemplate, id: 'new-id', version: 1, status: 'active', is_default: false, created_at: new Date(), updated_at: new Date() });

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Template',
            slug: 'new-template',
          }),
        })
      );
    });

    it('should reject template with invalid sections', async () => {
      mockReq.body = {
        name: 'Invalid Template',
        slug: 'invalid-template',
        sections: [{ type: 'unknown-type', content: {} }],
      };

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: false,
          error: expect.stringContaining('Invalid template sections')
        })
      );
    });

    it('should reject duplicate slug', async () => {
      mockReq.body = {
        name: 'Duplicate',
        slug: 'salon',
        sections: [{ type: 'hero', content: { title: 'Test' } }],
      };
      mockPrisma.templates.findUnique.mockResolvedValue({ id: 'existing', slug: 'salon' });

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: false,
          code: 'SLUG_EXISTS'
        })
      );
    });
  });

  describe('PUT /api/admin/templates/:id (update)', () => {
    it('should update template with version check', async () => {
      const existingTemplate = {
        id: '1',
        name: 'Old Name',
        slug: 'old-slug',
        sections: [{ type: 'hero', content: { title: 'Old' } }],
        version: 1,
        status: 'active',
      };

      mockReq.params = { id: '1' };
      mockReq.body = {
        name: 'New Name',
        version: 1,
        sections: [{ type: 'hero', content: { title: 'New' } }],
      };

      mockPrisma.templates.findUnique.mockResolvedValue(existingTemplate);
      mockPrisma.templates.update.mockResolvedValue({
        ...existingTemplate,
        name: 'New Name',
        version: 2,
        updated_at: new Date(),
      });

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            name: 'New Name',
            version: 2,
          }),
        })
      );
    });

    it('should reject update with stale version', async () => {
      const existingTemplate = {
        id: '1',
        version: 2,
      };

      mockReq.params = { id: '1' };
      mockReq.body = { version: 1 }; // stale version
      mockPrisma.templates.findUnique.mockResolvedValue(existingTemplate);

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: false,
          code: 'VERSION_CONFLICT'
        })
      );
    });

    it('should reject update with invalid sections', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        version: 1,
        sections: [{ type: 'invalid', content: {} }],
      };
      mockPrisma.templates.findUnique.mockResolvedValue({ id: '1', version: 1 });

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: false,
          error: expect.stringContaining('Invalid template sections')
        })
      );
    });
  });

  describe('DELETE /api/admin/templates/:id (soft delete)', () => {
    it('should soft delete by setting status to archived', async () => {
      mockReq.params = { id: '1' };
      mockPrisma.templates.findUnique.mockResolvedValue({ id: '1', status: 'active' });
      mockPrisma.templates.update.mockResolvedValue({ id: '1', status: 'archived' });

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ status: 'archived' }),
        })
      );
    });

    it('should return 404 for non-existent template', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockPrisma.templates.findUnique.mockResolvedValue(null);

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('POST /api/admin/templates/:id/duplicate', () => {
    it('should create a duplicate with new slug', async () => {
      const original = {
        id: '1',
        name: 'Original',
        slug: 'original',
        sections: [{ type: 'hero', content: { title: 'Test' } }],
        version: 1,
        status: 'active',
      };

      mockReq.params = { id: '1' };
      mockPrisma.templates.findUnique.mockResolvedValue(original);
      mockPrisma.templates.findUnique.mockResolvedValueOnce(original).mockResolvedValueOnce(null); // second call for slug check
      mockPrisma.templates.create.mockResolvedValue({ ...original, id: '2', slug: 'original-copy', name: 'Original (Copy)', version: 1 });

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'original-copy',
            name: 'Original (Copy)',
          }),
        })
      );
    });
  });

  describe('POST /api/admin/templates/:id/reset', () => {
    it('should reset template from JSON file', async () => {
      mockReq.params = { id: '1' };
      mockPrisma.templates.findUnique.mockResolvedValue({ id: '1', slug: 'salon', version: 1 });
      mockPrisma.templates.update.mockResolvedValue({ id: '1', version: 2 });

      const { default: adminTemplatesRouter } = await import('../../server/routes/admin-templates.routes.js');
      
      expect(mockPrisma.templates.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            version: 2,
          }),
        })
      );
    });
  });
});