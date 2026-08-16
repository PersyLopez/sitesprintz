#!/usr/bin/env node
/**
 * Seed templates table from JSON files in public/data/templates/
 * Run with: node prisma/seed-templates.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  extractSections,
  extractMetadata,
  getTemplateName,
  getTemplateIndustry,
  getTemplateLayout,
  getTemplateCharacter,
  LAYOUT_MAP,
  EMOJI_MAP,
} from './server/utils/templateJsonUtils.js';

const prisma = new PrismaClient();

async function seedTemplates() {
  const templatesDir = path.join(process.cwd(), 'public', 'data', 'templates');
  const files = fs.readdirSync(templatesDir).filter(f => 
    f.endsWith('.json') && 
    f !== 'index.json' && 
    f !== 'index-unified.json' && 
    !f.startsWith('backup')
  );
  
  console.log(`Found ${files.length} template files`);
  
  for (const file of files) {
    const slug = file.replace('.json', '');
    const filePath = path.join(templatesDir, file);
    
    try {
      const jsonContent = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);
      
      const sections = extractSections(jsonData, slug);
      const metadata = extractMetadata(jsonData, slug);
      const emoji = EMOJI_MAP[slug] || '📄';
      const layoutInfo = LAYOUT_MAP[slug] || { layout: 'craftsman', character: 'refined', industry: 'service' };
      
      // Check if template already exists
      const existing = await prisma.templates.findUnique({
        where: { slug },
      });
      
      if (existing) {
        console.log(`⏭️  ${slug} already exists, skipping`);
        continue;
      }
      
      // Create template
      await prisma.templates.create({
        data: {
          name: getTemplateName(slug),
          slug,
          industry: getTemplateIndustry(slug),
          description: jsonData.description || `Professional ${slug.replace('-', ' ')} website template`,
          layout_key: getTemplateLayout(slug),
          character: getTemplateCharacter(slug),
          sections,
          metadata,
          status: 'active',
          version: 1,
          is_default: true,
        },
      });
      
      console.log(`✅ Seeded: ${slug} (${sections.length} sections, layout: ${layoutInfo.layout})`);
      
    } catch (error) {
      console.error(`❌ Error seeding ${slug}:`, error.message);
    }
  }
  
  console.log('\n🎉 Template seeding complete!');
}

seedTemplates()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });