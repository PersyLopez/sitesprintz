#!/usr/bin/env node

/**
 * Update SiteSprintz templates to Design 2.0 standard
 * Adds premium themeVars and split hero layouts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRESETS = {
  A: {
    name: 'Midnight Luxury',
    themeVars: {
      "color-primary": "#0f172a",
      "color-primary-light": "#334155",
      "color-accent": "#d4af37",
      "color-surface": "rgba(255, 255, 255, 0.03)",
      "color-card": "rgba(255, 255, 255, 0.06)",
      "color-text": "#f8fafc",
      "color-muted": "#94a3b8",
      "color-bg": "#020617"
    }
  },
  B: {
    name: 'Neon Tech',
    themeVars: {
      "color-primary": "#3b82f6",
      "color-primary-light": "#60a5fa",
      "color-accent": "#ec4899",
      "color-bg": "#0F172A",
      "color-surface": "rgba(30, 41, 59, 0.5)",
      "color-card": "rgba(30, 41, 59, 0.3)",
      "color-text": "#f1f5f9",
      "color-muted": "#94a3b8"
    }
  },
  C: {
    name: 'Clean Scandinavian',
    themeVars: {
      "color-primary": "#475569",
      "color-primary-light": "#94a3b8",
      "color-accent": "#e2e8f0",
      "color-bg": "#ffffff",
      "color-surface": "#f8fafc",
      "color-card": "#ffffff",
      "color-text": "#1e293b",
      "color-muted": "#64748b"
    }
  }
};

// Template to preset mapping
const TEMPLATE_PRESETS = {
  // Preset A - Midnight Luxury
  'consultant': 'A',
  'consultant-corporate': 'A',
  'consultant-executive-coach': 'A',
  'consultant-small-business': 'A',
  'restaurant-fine-dining': 'A',
  
  // Preset B - Neon Tech
  'gym': 'B',
  'gym-boutique': 'B',
  'gym-family': 'B',
  'gym-strength': 'B',
  'tech-repair': 'B',
  'tech-repair-phone-repair': 'B',
  'tech-repair-computer': 'B',
  'tech-repair-gaming': 'B',
  'freelancer-developer': 'B',
  
  // Preset C - Clean Scandinavian (default for most)
  'starter': 'C',
  'starter-basic': 'C',
  'starter-enhanced': 'C',
  'salon': 'C',
  'salon-luxury-spa': 'C',
  'salon-modern-studio': 'C',
  'salon-neighborhood': 'C',
  'cleaning': 'C',
  'cleaning-residential': 'C',
  'cleaning-commercial': 'C',
  'cleaning-eco-friendly': 'C',
  'pet-care': 'C',
  'pet-care-dog-grooming': 'C',
  'pet-care-full-service': 'C',
  'pet-care-mobile': 'C',
  'product-showcase': 'C',
  'product-showcase-artisan': 'C',
  'product-showcase-fashion': 'C',
  'product-showcase-home-goods': 'C',
  'restaurant': 'C',
  'restaurant-casual': 'C',
  'restaurant-fast-casual': 'C',
  'freelancer': 'C',
  'freelancer-designer': 'C',
  'freelancer-writer': 'C',
  'electrician': 'C',
  'electrician-residential': 'C',
  'electrician-commercial': 'C',
  'electrician-smart-home': 'C',
  'auto-repair': 'C',
  'auto-repair-quick-service': 'C',
  'auto-repair-full-service': 'C',
  'auto-repair-performance': 'C',
  'plumbing': 'C',
  'plumbing-emergency': 'C',
  'plumbing-renovation': 'C',
  'plumbing-commercial': 'C',
};

function updateTemplate(filePath, presetKey) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const template = JSON.parse(content);
    const preset = PRESETS[presetKey];
    
    if (!preset) {
      console.error(`Unknown preset: ${presetKey}`);
      return false;
    }
    
    // Update themeVars
    template.themeVars = { ...preset.themeVars };
    
    // Ensure hero has split layout
    if (template.hero && !template.hero.layout) {
      template.hero.layout = 'split';
    }
    
    // Write back
    const updated = JSON.stringify(template, null, 2) + '\n';
    fs.writeFileSync(filePath, updated, 'utf8');
    
    return true;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  const templatesDir = path.join(__dirname, '../public/data/templates');
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log(`Found ${files.length} template files\n`);
  
  for (const file of files) {
    const templateId = file.replace('.json', '');
    const presetKey = TEMPLATE_PRESETS[templateId];
    
    if (!presetKey) {
      console.log(`⚠️  Skipping ${file} (no preset mapping)`);
      skipped++;
      continue;
    }
    
    const filePath = path.join(templatesDir, file);
    const success = updateTemplate(filePath, presetKey);
    
    if (success) {
      console.log(`✅ Updated ${file} → Preset ${presetKey} (${PRESETS[presetKey].name})`);
      updated++;
    } else {
      errors++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main();

