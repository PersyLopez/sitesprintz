#!/usr/bin/env node

/**
 * API Endpoint Verification Script
 * 
 * Verifies that all frontend API calls have corresponding backend endpoints.
 * 
 * Usage:
 *   node scripts/verify-api-endpoints.js
 * 
 * Output:
 *   - Lists all frontend API calls
 *   - Lists all backend routes
 *   - Identifies missing endpoints
 *   - Identifies potential mismatches
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Colors for terminal output
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

/**
 * Extract API calls from frontend files
 */
function extractFrontendApiCalls() {
  const frontendFiles = [];
  const srcDir = path.join(projectRoot, 'src');
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !filePath.includes('node_modules')) {
        walkDir(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
        frontendFiles.push(filePath);
      }
    }
  }
  
  walkDir(srcDir);
  
  const apiCalls = [];
  
  for (const file of frontendFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Match api.get/post/put/delete/upload calls
    const patterns = [
      /api\.(get|post|put|delete|upload)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /api\.(get|post|put|delete|upload)\s*\(\s*`([^`]+)`/g,
      /api\.(get|post|put|delete|upload)\s*\(\s*['"]([^'"]+)['"]/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let endpoint = match[2];
        
        // Remove template literals and variables
        endpoint = endpoint.replace(/\$\{[^}]+\}/g, ':param');
        endpoint = endpoint.replace(/\$\{.*?\}/g, ':param');
        
        apiCalls.push({
          file: path.relative(projectRoot, file),
          method,
          endpoint,
          raw: match[0]
        });
      }
    }
  }
  
  return apiCalls;
}

/**
 * Extract routes from backend files
 */
function extractBackendRoutes() {
  const routeFiles = [];
  const routesDir = path.join(projectRoot, 'server', 'routes');
  
  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.js')) {
        routeFiles.push(filePath);
      }
    }
  }
  
  walkDir(routesDir);
  
  const routes = [];
  
  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Match router.get/post/put/delete/patch calls
    const pattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];
      
      routes.push({
        file: path.relative(projectRoot, file),
        method,
        endpoint
      });
    }
  }
  
  // Also check server.js for route mounting
  const serverFile = path.join(projectRoot, 'server.js');
  if (fs.existsSync(serverFile)) {
    const content = fs.readFileSync(serverFile, 'utf-8');
    
    // Match app.use('/api/...', routes)
    const mountPattern = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+Routes)/g;
    let match;
    const mounts = {};
    while ((match = mountPattern.exec(content)) !== null) {
      const mountPath = match[1];
      const routeVar = match[2];
      mounts[routeVar] = mountPath;
    }
    
    // Map route files to mount paths
    for (const route of routes) {
      const routeFile = path.basename(route.file, '.js');
      const routeVar = routeFile.replace(/-/g, '') + 'routes';
      
      // Try to find mount path
      for (const [varName, mountPath] of Object.entries(mounts)) {
        if (varName.toLowerCase().includes(routeFile.replace('.routes', '').replace('-', ''))) {
          route.mountPath = mountPath;
          route.fullPath = mountPath + route.endpoint;
          break;
        }
      }
      
      // If no mount found, try common patterns
      if (!route.mountPath) {
        const routeName = routeFile.replace('.routes', '').replace('-', '');
        if (routeName === 'auth') route.mountPath = '/api/auth';
        else if (routeName === 'payment') route.mountPath = '/api';
        else if (routeName === 'stripe') route.mountPath = '/api/stripe';
        else route.mountPath = `/api/${routeName}`;
        
        route.fullPath = route.mountPath + route.endpoint;
      }
    }
  }
  
  return routes;
}

/**
 * Normalize endpoint for comparison
 */
function normalizeEndpoint(endpoint) {
  // Remove leading slash
  endpoint = endpoint.replace(/^\//, '');
  
  // Replace :param, {param}, ${param} with :param
  endpoint = endpoint.replace(/:\w+|\{[^}]+\}|\$\{[^}]+\}/g, ':param');
  
  // Remove query strings
  endpoint = endpoint.split('?')[0];
  
  return endpoint.toLowerCase();
}

/**
 * Check if frontend call matches backend route
 */
function matchesRoute(apiCall, routes) {
  const normalizedCall = normalizeEndpoint(apiCall.endpoint);
  
  for (const route of routes) {
    if (route.method !== apiCall.method) continue;
    
    const normalizedRoute = normalizeEndpoint(route.fullPath || route.endpoint);
    
    // Exact match
    if (normalizedCall === normalizedRoute) {
      return { match: true, route };
    }
    
    // Pattern match (e.g., /api/sites/:id matches /api/sites/:param)
    const callParts = normalizedCall.split('/');
    const routeParts = normalizedRoute.split('/');
    
    if (callParts.length === routeParts.length) {
      let matches = true;
      for (let i = 0; i < callParts.length; i++) {
        if (routeParts[i] !== ':param' && callParts[i] !== routeParts[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return { match: true, route };
      }
    }
  }
  
  return { match: false };
}

/**
 * Main verification function
 */
function verifyEndpoints() {
  log('cyan', '\n🔍 API Endpoint Verification\n');
  log('cyan', '='.repeat(60));
  
  log('blue', '\n📥 Extracting frontend API calls...');
  const apiCalls = extractFrontendApiCalls();
  log('green', `Found ${apiCalls.length} API calls in frontend`);
  
  log('blue', '\n📤 Extracting backend routes...');
  const routes = extractBackendRoutes();
  log('green', `Found ${routes.length} routes in backend`);
  
  log('blue', '\n🔗 Verifying matches...\n');
  
  const matched = [];
  const unmatched = [];
  const warnings = [];
  
  for (const apiCall of apiCalls) {
    const result = matchesRoute(apiCall, routes);
    
    if (result.match) {
      matched.push({ apiCall, route: result.route });
    } else {
      // Check if it's a common pattern that might be handled differently
      const endpoint = apiCall.endpoint.toLowerCase();
      
      if (endpoint.startsWith('/api/')) {
        unmatched.push({ apiCall, reason: 'No matching backend route found' });
      } else {
        warnings.push({ apiCall, reason: 'Endpoint does not start with /api/' });
      }
    }
  }
  
  // Print results
  log('green', `\n✅ Matched: ${matched.length}/${apiCalls.length}`);
  if (matched.length > 0) {
    log('green', '\nMatched endpoints:');
    matched.slice(0, 10).forEach(({ apiCall, route }) => {
      console.log(`  ${apiCall.method.padEnd(6)} ${apiCall.endpoint.padEnd(40)} → ${route.fullPath || route.endpoint}`);
    });
    if (matched.length > 10) {
      log('cyan', `  ... and ${matched.length - 10} more`);
    }
  }
  
  if (unmatched.length > 0) {
    log('red', `\n❌ Unmatched: ${unmatched.length}`);
    log('red', '\nUnmatched endpoints (need verification):');
    unmatched.forEach(({ apiCall }) => {
      console.log(`  ${apiCall.method.padEnd(6)} ${apiCall.endpoint.padEnd(40)} (${apiCall.file})`);
    });
  }
  
  if (warnings.length > 0) {
    log('yellow', `\n⚠️  Warnings: ${warnings.length}`);
    log('yellow', '\nEndpoints that may need attention:');
    warnings.forEach(({ apiCall }) => {
      console.log(`  ${apiCall.method.padEnd(6)} ${apiCall.endpoint.padEnd(40)} (${apiCall.file})`);
    });
  }
  
  // Summary
  log('cyan', '\n' + '='.repeat(60));
  log('cyan', '\n📊 Summary:');
  console.log(`  Total API calls:     ${apiCalls.length}`);
  console.log(`  Matched:             ${matched.length} (${Math.round(matched.length / apiCalls.length * 100)}%)`);
  console.log(`  Unmatched:           ${unmatched.length}`);
  console.log(`  Warnings:            ${warnings.length}`);
  
  if (unmatched.length === 0 && warnings.length === 0) {
    log('green', '\n✅ All API endpoints verified!');
    process.exit(0);
  } else {
    log('yellow', '\n⚠️  Some endpoints need attention. Review the list above.');
    process.exit(1);
  }
}

// Run verification
verifyEndpoints();

