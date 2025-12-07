/**
 * Content Management Service
 * Handles CRUD operations for menu items, services, and products
 */

import { prisma } from '../../database/db.js';
import sanitizeHtml from 'sanitize-html';

class ContentService {
  /**
   * Menu Items
   */
  static async getMenuItems(subdomain, grouped = false) {
    const items = await prisma.menu_items.findMany({
      where: { subdomain },
      orderBy: [
        { display_order: 'asc' },
        { id: 'asc' }
      ]
    });

    if (grouped) {
      return this.groupByCategory(items);
    }

    return items;
  }

  static async createMenuItem(subdomain, item) {
    this.validateMenuItem(item);

    const sanitized = {
      ...item,
      description: sanitizeHtml(item.description, {
        allowedTags: ['b', 'i', 'em', 'strong', 'br'],
        allowedAttributes: {}
      })
    };

    const newItem = await prisma.menu_items.create({
      data: {
        subdomain,
        name: sanitized.name,
        description: sanitized.description,
        price: sanitized.price,
        category: sanitized.category || 'Uncategorized',
        image: sanitized.image || null,
        display_order: sanitized.order || 0
      }
    });

    return newItem;
  }

  static async updateMenuItem(subdomain, itemId, updates) {
    if (updates.description) {
      updates.description = sanitizeHtml(updates.description, {
        allowedTags: ['b', 'i', 'em', 'strong', 'br'],
        allowedAttributes: {}
      });
    }

    if (updates.price !== undefined) {
      this.validatePrice(updates.price);
    }

    const allowedFields = ['name', 'description', 'price', 'category', 'image', 'display_order'];
    const data = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Verify ownership and update
    const updatedItem = await prisma.menu_items.update({
      where: {
        id: itemId,
        subdomain: subdomain // Ensure subdomain matches (Prisma composite unique or check first)
      },
      data
    }).catch(err => {
      // Prisma throws if record not found
      if (err.code === 'P2025') {
        throw new Error('Item not found');
      }
      throw err;
    });

    // Since we can't easily add subdomain to where clause in update if it's not part of unique identifier,
    // we should ideally check existence first or rely on ID being unique globally (which it is usually).
    // However, to be safe and match original logic:
    // Original: WHERE subdomain = $1 AND id = $2
    // If ID is unique globally, just updating by ID is fine, but we should verify subdomain.
    // Let's do a check first if we want to be strict, or just trust the ID.
    // But wait, if we update by ID, we might update someone else's item if we don't check subdomain.
    // The original code enforced subdomain check.
    // Prisma `update` only allows unique where input. `id` is likely unique.
    // To enforce subdomain, we can use `updateMany` (returns count) or `findFirst` then `update`.

    // Let's use updateMany to enforce subdomain check and get count
    /*
    const result = await prisma.menu_items.updateMany({
      where: { id: itemId, subdomain },
      data
    });
    if (result.count === 0) throw new Error('Item not found');
    return await prisma.menu_items.findUnique({ where: { id: itemId } });
    */

    // Actually, simpler: findFirst to verify, then update.
    const existing = await prisma.menu_items.findFirst({
      where: { id: itemId, subdomain }
    });

    if (!existing) {
      throw new Error('Item not found');
    }

    return await prisma.menu_items.update({
      where: { id: itemId },
      data
    });
  }

  static async deleteMenuItem(subdomain, itemId) {
    // Verify existence and ownership
    const existing = await prisma.menu_items.findFirst({
      where: { id: itemId, subdomain }
    });

    if (!existing) {
      throw new Error('Item not found');
    }

    await prisma.menu_items.delete({
      where: { id: itemId }
    });

    return { success: true, id: itemId };
  }

  static async reorderMenuItems(subdomain, items) {
    // Verify all items belong to this subdomain
    const ids = items.map(i => i.id);
    const count = await prisma.menu_items.count({
      where: {
        subdomain,
        id: { in: ids }
      }
    });

    if (count !== ids.length) {
      throw new Error('Some items do not belong to this site');
    }

    // Update order for each item
    // Use transaction for atomicity
    await prisma.$transaction(
      items.map(item =>
        prisma.menu_items.update({
          where: { id: item.id },
          data: { display_order: item.order }
        })
      )
    );

    return { success: true, updated: items.length };
  }

  /**
   * Services
   */
  static async getServices(subdomain) {
    const services = await prisma.services.findMany({
      where: { subdomain },
      orderBy: [
        { display_order: 'asc' },
        { id: 'asc' }
      ],
      include: {
        service_pricing: {
          orderBy: { price: 'asc' }
        }
      }
    });

    // Map to match original structure (service.pricing)
    return services.map(service => ({
      ...service,
      pricing: service.service_pricing
    }));
  }

  static async createService(subdomain, service) {
    this.validateService(service);

    const sanitized = {
      ...service,
      description: sanitizeHtml(service.description || '', {
        allowedTags: ['b', 'i', 'em', 'strong', 'br'],
        allowedAttributes: {}
      })
    };

    const serviceData = {
      subdomain,
      name: sanitized.name,
      description: sanitized.description,
      duration: sanitized.duration || null,
      price: sanitized.price || null,
      category: sanitized.category || 'Services'
    };

    // Add pricing tiers if provided
    if (service.pricing && Array.isArray(service.pricing)) {
      serviceData.service_pricing = {
        create: service.pricing.map(tier => ({
          tier: tier.tier,
          price: tier.price,
          duration: tier.duration || null,
          description: tier.description || null
        }))
      };
    }

    const newService = await prisma.services.create({
      data: serviceData,
      include: {
        service_pricing: true
      }
    });

    return {
      ...newService,
      pricing: newService.service_pricing
    };
  }

  static async updateService(subdomain, serviceId, updates) {
    if (updates.description) {
      updates.description = sanitizeHtml(updates.description, {
        allowedTags: ['b', 'i', 'em', 'strong', 'br'],
        allowedAttributes: {}
      });
    }

    const allowedFields = ['name', 'description', 'duration', 'price', 'category'];
    const data = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        data[key] = value;
      }
    }

    // Verify existence and ownership
    const existing = await prisma.services.findFirst({
      where: { id: serviceId, subdomain }
    });

    if (!existing) {
      throw new Error('Service not found');
    }

    const updatedService = await prisma.services.update({
      where: { id: serviceId },
      data
    });

    return updatedService;
  }

  static async deleteService(subdomain, serviceId) {
    // Verify existence and ownership
    const existing = await prisma.services.findFirst({
      where: { id: serviceId, subdomain }
    });

    if (!existing) {
      throw new Error('Service not found');
    }

    await prisma.services.delete({
      where: { id: serviceId }
    });

    return { success: true, id: serviceId };
  }

  /**
   * Products
   */
  static async getProducts(subdomain, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const [products, total] = await prisma.$transaction([
      prisma.products.findMany({
        where: { subdomain },
        orderBy: [
          { display_order: 'asc' },
          { id: 'asc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.products.count({
        where: { subdomain }
      })
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async createProduct(subdomain, product) {
    this.validateProduct(product);

    const sanitized = {
      ...product,
      description: sanitizeHtml(product.description || '', {
        allowedTags: ['b', 'i', 'em', 'strong', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {}
      })
    };

    const newProduct = await prisma.products.create({
      data: {
        subdomain,
        name: sanitized.name,
        description: sanitized.description,
        price: sanitized.price,
        inventory: sanitized.inventory || 0,
        images: JSON.stringify(sanitized.images || []),
        variants: JSON.stringify(sanitized.variants || [])
      }
    });

    return newProduct;
  }

  /**
   * Validation helpers
   */
  static validateMenuItem(item) {
    if (!item.name || item.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (item.price === undefined || item.price === null) {
      throw new Error('Price is required');
    }
    this.validatePrice(item.price);
  }

  static validateService(service) {
    if (!service.name || service.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (service.duration !== undefined && service.duration < 0) {
      throw new Error('Duration must be positive');
    }
    if (service.price !== undefined) {
      this.validatePrice(service.price);
    }
  }

  static validateProduct(product) {
    if (!product.name || product.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (product.price === undefined || product.price === null) {
      throw new Error('Price is required');
    }
    this.validatePrice(product.price);
    if (product.inventory !== undefined && product.inventory < 0) {
      throw new Error('Inventory cannot be negative');
    }
  }

  static validatePrice(price) {
    const num = parseFloat(price);
    if (isNaN(num) || num < 0) {
      throw new Error('Price must be a positive number');
    }
  }

  /**
   * Utility helpers
   */
  static groupByCategory(items) {
    const categories = {};
    for (const item of items) {
      const cat = item.category || 'Uncategorized';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(item);
    }
    return { categories };
  }

  /**
   * Bulk operations
   */
  static async bulkCreateMenuItems(subdomain, items) {
    let created = 0;
    let failed = 0;
    const errors = [];

    for (const item of items) {
      try {
        await this.createMenuItem(subdomain, item);
        created++;
      } catch (error) {
        failed++;
        errors.push({ item: item.name, error: error.message });
      }
    }

    return { created, failed, errors: errors.length > 0 ? errors : undefined };
  }

  static async bulkDeleteMenuItems(subdomain, ids) {
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.deleteMenuItem(subdomain, id);
        deleted++;
      } catch (error) {
        // Continue with other deletions
      }
    }

    return { deleted };
  }
}

export default ContentService;
export { ContentService };
