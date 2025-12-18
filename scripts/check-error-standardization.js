#!/usr/bin/env node

/**
 * Error Response Standardization Checker
 * 
 * Identifies routes that need error response standardization.
 * 
 * Usage:
 *   node scripts/check-error-standardization.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color] || colors.reset, ...args, colors.reset);
}

function checkRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  // Check if file imports apiResponse helpers
  const hasImports = /import.*apiResponse|from.*apiResponse/.test(content);
  
  // Count different response patterns
  const patterns = {
    sendSuccess: (content.match(/sendSuccess\(/g) || []).length,
    sendError: (content.match(/sendError\(/g) || []).length,
    sendBadRequest: (content.match(/sendBadRequest\(/g) || []).length,
    sendNotFound: (content.match(/sendNotFound\(/g) || []).length,
    resStatusJson: (content.match(/res\.status\(\d+\)\.json\(/g) || []).length,
    resJson: (content.match(/res\.json\(/g) || []).length - (content.match(/sendSuccess\(/g) || []).length - (content.match(/sendError\(/g) || []).length,
    asyncHandler: (content.match(/asyncHandler\(/g) || []).length,
  };
  
  const totalStandardized = patterns.sendSuccess + patterns.sendError + patterns.sendBadRequest + patterns.sendNotFound;
  const totalRaw = patterns.resStatusJson + patterns.resJson;
  const totalRoutes = (content.match(/router\.(get|post|put|delete|patch)\(/g) || []).length;
  
  return {
    fileName,
    hasImports,
    patterns,
    totalStandardized,
    totalRaw,
    totalRoutes,
    needsWork: totalRaw > 0 || !hasImports || patterns.asyncHandler < totalRoutes * 0.5
  };
}

function main() {
  log('cyan', '\n🔍 Error Response Standardization Checker\n');
  log('cyan', '='.repeat(60));
  
  const routesDir = path.join(projectRoot, 'server', 'routes');
  const files = fs.readdirSync(routesDir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(routesDir, f));
  
  const results = files.map(checkRouteFile);
  
  const needsWork = results.filter(r => r.needsWork);
  const good = results.filter(r => !r.needsWork);
  
  log('green', `\n✅ Standardized: ${good.length}/${results.length}`);
  if (good.length > 0) {
    good.forEach(r => {
      console.log(`  ${r.fileName.padEnd(35)} ${r.totalStandardized} standardized, ${r.totalRaw} raw`);
    });
  }
  
  log('yellow', `\n⚠️  Needs Work: ${needsWork.length}/${results.length}`);
  if (needsWork.length > 0) {
    needsWork.forEach(r => {
      const issues = [];
      if (!r.hasImports) issues.push('missing imports');
      if (r.totalRaw > 0) issues.push(`${r.totalRaw} raw responses`);
      if (r.patterns.asyncHandler < r.totalRoutes * 0.5) issues.push('missing asyncHandler');
      
      console.log(`  ${r.fileName.padEnd(35)} ${issues.join(', ')}`);
      console.log(`    ${' '.repeat(35)} ${r.totalStandardized} standardized, ${r.totalRaw} raw, ${r.totalRoutes} routes`);
    });
  }
  
  log('cyan', '\n' + '='.repeat(60));
  log('cyan', '\n📊 Summary:');
  console.log(`  Total route files:  ${results.length}`);
  console.log(`  Standardized:       ${good.length} (${Math.round(good.length / results.length * 100)}%)`);
  console.log(`  Needs work:         ${needsWork.length}`);
  
  if (needsWork.length === 0) {
    log('green', '\n✅ All routes are standardized!');
    process.exit(0);
  } else {
    log('yellow', '\n⚠️  Some routes need standardization.');
    process.exit(1);
  }
}

main();

