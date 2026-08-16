/**
 * Admin Templates Routes
 * CRUD + duplicate + reset for templates
 */

import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { validateTemplateSections } from '../utils/templateValidator.js';
import {
  extractSections,
  extractMetadata,
  getTemplateName,
  getTemplateIndustry,
  getTemplateLayout,
  getTemplateCharacter,
} from '../utils/templateJsonUtils.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET /api/admin/templates — list with filters
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, industry, search, limit = 50, offset = 0 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (industry) where.industry = industry;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const [templates, total] = await Promise.all([
      prisma.templates.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          description: true,
          layout_key: true,
          character: true,
          status: true,
          version: true,
          is_default: true,
          created_at: true,
          updated_at: true,
          created_by: true,
          updated_by: true,
        },
      }),
      prisma.templates.count({ where }),
    ]);
    
    await prisma.$disconnect();
    
    res.json({ templates, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/admin/templates/:id — get single template
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const template = await prisma.templates.findUnique({
      where: { id: req.params.id },
    });
    
    await prisma.$disconnect();
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/admin/templates — create new template
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, slug, industry, description, layout_key, character, sections, metadata } = req.body;
    
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    
    // Validate sections
    const validation = validateTemplateSections(sections || []);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid sections', details: validation.errors });
    }
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Check slug uniqueness
    const existing = await prisma.templates.findUnique({ where: { slug } });
    if (existing) {
      await prisma.$disconnect();
      return res.status(409).json({ error: 'Slug already exists' });
    }
    
    const template = await prisma.templates.create({
      data: {
        name,
        slug,
        industry,
        description,
        layout_key: layout_key || 'craftsman',
        character: character || 'refined',
        sections: sections || [],
        metadata: metadata || {},
        status: 'draft',
        version: 1,
        is_default: false,
        created_by: req.user?.id,
        updated_by: req.user?.id,
      },
    });
    
    await prisma.$disconnect();
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/admin/templates/:id — update template (with optimistic locking)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { version, name, slug, industry, description, layout_key, character, sections, metadata, status } = req.body;
    
    // Validate required fields
    if (!version || typeof version !== 'number') {
      return res.status(400).json({ error: 'Version number is required for optimistic locking' });
    }
    
    // Validate sections if provided
    if (sections !== undefined) {
      const validation = validateTemplateSections(sections);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid sections', details: validation.errors });
      }
    }
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Check current version
    const current = await prisma.templates.findUnique({
      where: { id: req.params.id },
      select: { version: true, slug: true },
    });
    
    if (!current) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (current.version !== version) {
      await prisma.$disconnect();
      return res.status(409).json({ 
        error: 'Template has been modified by another user', 
        currentVersion: current.version,
        providedVersion: version,
      });
    }
    
    // Check slug uniqueness if changed
    if (slug && slug !== current.slug) {
      const existing = await prisma.templates.findUnique({ where: { slug } });
      if (existing) {
        await prisma.$disconnect();
        return res.status(409).json({ error: 'Slug already exists' });
      }
    }
    
    const updateData = {
      version: version + 1,
      updated_by: req.user?.id,
    };
    
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (industry) updateData.industry = industry;
    if (description) updateData.description = description;
    if (layout_key) updateData.layout_key = layout_key;
    if (character) updateData.character = character;
    if (sections) updateData.sections = sections;
    if (metadata) updateData.metadata = metadata;
    if (status) updateData.status = status;
    
    const template = await prisma.templates.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    await prisma.$disconnect();
    
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/admin/templates/:id — soft delete (archive)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const template = await prisma.templates.update({
      where: { id: req.params.id },
      data: { status: 'archived', updated_by: req.user?.id },
    });
    
    await prisma.$disconnect();
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ success: true, message: 'Template archived' });
  } catch (error) {
    console.error('Error archiving template:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to archive template' });
  }
});

// POST /api/admin/templates/:id/duplicate — duplicate template
router.post('/:id/duplicate', requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const original = await prisma.templates.findUnique({
      where: { id: req.params.id },
    });
    
    if (!original) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Generate unique slug
    let newSlug = `${original.slug}-copy`;
    let counter = 1;
    while (true) {
      const existing = await prisma.templates.findUnique({ where: { slug: newSlug } });
      if (!existing) break;
      counter++;
      newSlug = `${original.slug}-copy-${counter}`;
    }
    
    const duplicate = await prisma.templates.create({
      data: {
        name: `${original.name} (Copy)`,
        slug: newSlug,
        industry: original.industry,
        description: original.description,
        layout_key: original.layout_key,
        character: original.character,
        sections: original.sections,
        metadata: original.metadata,
        status: 'draft',
        version: 1,
        is_default: false,
        created_by: req.user?.id,
        updated_by: req.user?.id,
      },
    });
    
    await prisma.$disconnect();
    
    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating template:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Could not generate unique slug' });
    }
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// POST /api/admin/templates/:id/reset — reset to JSON file defaults
router.post('/:id/reset', requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const template = await prisma.templates.findUnique({
      where: { id: req.params.id },
    });
    
    if (!template) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Only allow reset for default templates
    if (!template.is_default) {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'Can only reset default (seeded) templates' });
    }
    
    // Read the JSON file
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'data', 'templates', `${template.slug}.json`);
    
    if (!fs.existsSync(filePath)) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Original JSON file not found' });
    }
    
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    // Extract sections and metadata using shared utils
    const sections = extractSections(jsonData, template.slug);
    const metadata = extractMetadata(jsonData, template.slug);
    
    const updated = await prisma.templates.update({
      where: { id: req.params.id },
      data: {
        version: template.version + 1,
        sections,
        metadata,
        status: 'active',
        updated_by: req.user?.id,
      },
    });
    
    await prisma.$disconnect();
    
    res.json({ success: true, message: 'Template reset to defaults', template: updated });
  } catch (error) {
    console.error('Error resetting template:', error);
    res.status(500).json({ error: 'Failed to reset template' });
  }
});export default router;