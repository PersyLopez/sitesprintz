/**
 * Content Management Service
 * Handles CRUD operations for menu items, services, and products
 */

import { query } from '../../database/db.js';
import sanitizeHtml from 'sanitize-html';

class ContentService {
  /**
   * Menu Items
   */
  static async getMenuItems(subdomain, grouped = false) {
    const result = await query(
      'SELECT * FROM menu_items WHERE subdomain = $1 ORDER BY display_order ASC, id ASC',
      [subdomain]
    );

    if (grouped) {
      return this.groupByCategory(result.rows);
    }

    return result.rows;
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

    const result = await query(
      `INSERT INTO menu_items (subdomain, name, description, price, category, image, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [subdomain, sanitized.name, sanitized.description, sanitized.price, 
       sanitized.category || 'Uncategorized', sanitized.image || null, sanitized.order || 0]
    );

    return result.rows[0];
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

    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['name', 'description', 'price', 'category', 'image', 'display_order'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(subdomain, itemId);
    const result = await query(
      `UPDATE menu_items SET ${fields.join(', ')}
       WHERE subdomain = $${paramCount} AND id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Item not found');
    }

    return result.rows[0];
  }

  static async deleteMenuItem(subdomain, itemId) {
    const result = await query(
      'DELETE FROM menu_items WHERE subdomain = $1 AND id = $2 RETURNING id',
      [subdomain, itemId]
    );

    if (result.rows.length === 0) {
      throw new Error('Item not found');
    }

    return { success: true, id: itemId };
  }

  static async reorderMenuItems(subdomain, items) {
    // Verify all items belong to this subdomain
    const ids = items.map(i => i.id);
    const check = await query(
      'SELECT id FROM menu_items WHERE subdomain = $1 AND id = ANY($2)',
      [subdomain, ids]
    );

    if (check.rows.length !== ids.length) {
      throw new Error('Some items do not belong to this site');
    }

    // Update order for each item
    for (const item of items) {
      await query(
        'UPDATE menu_items SET display_order = $1 WHERE id = $2',
        [item.order, item.id]
      );
    }

    return { success: true, updated: items.length };
  }

  /**
   * Services
   */
  static async getServices(subdomain) {
    const result = await query(
      'SELECT * FROM services WHERE subdomain = $1 ORDER BY display_order ASC, id ASC',
      [subdomain]
    );

    // Fetch pricing tiers for each service
    for (const service of result.rows) {
      const pricing = await query(
        'SELECT * FROM service_pricing WHERE service_id = $1 ORDER BY price ASC',
        [service.id]
      );
      service.pricing = pricing.rows;
    }

    return result.rows;
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

    const result = await query(
      `INSERT INTO services (subdomain, name, description, duration, price, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [subdomain, sanitized.name, sanitized.description, 
       sanitized.duration || null, sanitized.price || null, sanitized.category || 'Services']
    );

    const newService = result.rows[0];

    // Add pricing tiers if provided
    if (service.pricing && Array.isArray(service.pricing)) {
      newService.pricing = [];
      for (const tier of service.pricing) {
        const pricingResult = await query(
          `INSERT INTO service_pricing (service_id, tier, price, duration, description)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [newService.id, tier.tier, tier.price, tier.duration || null, tier.description || null]
        );
        newService.pricing.push(pricingResult.rows[0]);
      }
    }

    return newService;
  }

  static async updateService(subdomain, serviceId, updates) {
    if (updates.description) {
      updates.description = sanitizeHtml(updates.description, {
        allowedTags: ['b', 'i', 'em', 'strong', 'br'],
        allowedAttributes: {}
      });
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['name', 'description', 'duration', 'price', 'category'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    values.push(subdomain, serviceId);
    const result = await query(
      `UPDATE services SET ${fields.join(', ')}
       WHERE subdomain = $${paramCount} AND id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Service not found');
    }

    return result.rows[0];
  }

  static async deleteService(subdomain, serviceId) {
    const result = await query(
      'DELETE FROM services WHERE subdomain = $1 AND id = $2 RETURNING id',
      [subdomain, serviceId]
    );

    if (result.rows.length === 0) {
      throw new Error('Service not found');
    }

    return { success: true, id: serviceId };
  }

  /**
   * Products
   */
  static async getProducts(subdomain, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM products WHERE subdomain = $1 
       ORDER BY display_order ASC, id ASC
       LIMIT $2 OFFSET $3`,
      [subdomain, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM products WHERE subdomain = $1',
      [subdomain]
    );

    return {
      products: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
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

    const result = await query(
      `INSERT INTO products (subdomain, name, description, price, inventory, images, variants)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [subdomain, sanitized.name, sanitized.description, sanitized.price,
       sanitized.inventory || 0, JSON.stringify(sanitized.images || []), 
       JSON.stringify(sanitized.variants || [])]
    );

    return result.rows[0];
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

