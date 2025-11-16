#!/usr/bin/env node

/**
 * Validate All Starter Templates
 * Runs validation on all template JSON files
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateTemplate } from '../server/utils/templateValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, '../public/data/templates');

console.log('🧪 VALIDATING ALL STARTER TEMPLATES');
console.log('====================================\n');

// Get all JSON files (skip index.json as it's the template registry)
const files = readdirSync(TEMPLATES_DIR)
  .filter(f => f.endsWith('.json') && f !== 'index.json')
  .sort();

console.log(`📊 Found ${files.length} template files\n`);

let totalValid = 0;
let totalInvalid = 0;
const failedTemplates = [];

// Validate each template
for (const file of files) {
  const filePath = join(TEMPLATES_DIR, file);
  
  try {
    const content = readFileSync(filePath, 'utf8');
    const template = JSON.parse(content);
    
    // Skip Premium templates (they have a different structure with meta field)
    if (template.plan === 'Premium' || file.includes('-premium')) {
      console.log(`⏭️  ${file} (Premium - different structure, skipped)`);
      continue;
    }
    
    // Determine tier from filename or template data
    const tier = template.plan || (file.includes('-pro') ? 'Pro' : 'Starter');
    
    const result = validateTemplate(template, tier);
    
    if (result.valid) {
      console.log(`✅ ${file}`);
      totalValid++;
    } else {
      console.log(`❌ ${file}`);
      result.errors.forEach(err => {
        console.log(`   └─ ${err}`);
      });
      totalInvalid++;
      failedTemplates.push({ file, errors: result.errors });
    }
  } catch (error) {
    console.log(`❌ ${file}`);
    console.log(`   └─ ${error.message}`);
    totalInvalid++;
    failedTemplates.push({ file, errors: [error.message] });
  }
}

console.log('\n====================================');
console.log('📊 VALIDATION SUMMARY');
console.log('====================================');
console.log(`✅ Valid templates:   ${totalValid}`);
console.log(`❌ Invalid templates: ${totalInvalid}`);
console.log(`📈 Success rate:      ${((totalValid / files.length) * 100).toFixed(1)}%`);

if (failedTemplates.length > 0) {
  console.log('\n⚠️  FAILED TEMPLATES:');
  console.log('====================');
  failedTemplates.forEach(({ file, errors }) => {
    console.log(`\n${file}:`);
    errors.forEach(err => console.log(`  - ${err}`));
  });
  process.exit(1);
} else {
  console.log('\n🎉 All templates are valid!');
  process.exit(0);
}

