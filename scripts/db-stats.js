#!/usr/bin/env node

/**
 * Database Pool Statistics Monitor
 * Displays real-time PostgreSQL connection pool stats
 */

import { getPoolStats, pool } from '../database/db.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function printBar(current, max, width = 20) {
  const percent = (current / max) * 100;
  const filled = Math.floor((current / max) * width);
  const empty = width - filled;
  
  let color = colors.green;
  if (percent > 80) color = colors.red;
  else if (percent > 60) color = colors.yellow;
  
  return `${color}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset} ${color}${current}/${max}${colors.reset}`;
}

async function displayStats() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║  📊 PostgreSQL Connection Pool Statistics        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const stats = getPoolStats();
  const activeConnections = stats.total - stats.idle;
  
  console.log(`${colors.bright}Connection Pool:${colors.reset}`);
  console.log(`  Active:  ${printBar(activeConnections, stats.maxSize)}`);
  console.log(`  Idle:    ${printBar(stats.idle, stats.maxSize)}`);
  console.log(`  Total:   ${stats.total} / ${stats.maxSize} (max)`);
  console.log(`  Waiting: ${stats.waiting > 0 ? colors.yellow : colors.green}${stats.waiting}${colors.reset}`);
  
  console.log(`\n${colors.bright}Configuration:${colors.reset}`);
  console.log(`  Max Size:     ${stats.maxSize}`);
  console.log(`  Min Size:     ${stats.minSize}`);
  
  console.log(`\n${colors.bright}Query Performance:${colors.reset}`);
  console.log(`  Total Queries: ${stats.queries}`);
  console.log(`  Errors:        ${stats.errors > 0 ? colors.red : colors.green}${stats.errors}${colors.reset}`);
  console.log(`  Avg Time:      ${stats.avgQueryTime}ms`);
  console.log(`  Error Rate:    ${stats.queries > 0 ? ((stats.errors / stats.queries) * 100).toFixed(2) : 0}%`);
  
  console.log(`\n${colors.bright}System:${colors.reset}`);
  console.log(`  Uptime:        ${(stats.uptime / 60).toFixed(1)} minutes`);
  
  // Health status
  const healthColor = stats.waiting > 3 ? colors.red : 
                      stats.waiting > 0 ? colors.yellow : colors.green;
  const healthStatus = stats.waiting > 3 ? 'CRITICAL' :
                       stats.waiting > 0 ? 'WARNING' : 'HEALTHY';
  
  console.log(`\n${colors.bright}Health Status: ${healthColor}${healthStatus}${colors.reset}`);
  
  if (stats.waiting > 3) {
    console.log(`\n${colors.red}⚠️  WARNING: High connection pool pressure!${colors.reset}`);
    console.log(`${colors.dim}   ${stats.waiting} clients waiting for connections${colors.reset}`);
  }
  
  console.log(`\n${colors.dim}Last updated: ${new Date().toLocaleTimeString()}${colors.reset}`);
  console.log(`${colors.dim}Press Ctrl+C to exit${colors.reset}\n`);
}

// Watch mode
const args = process.argv.slice(2);
const watchMode = args.includes('--watch') || args.includes('-w');
const interval = parseInt(args.find(arg => !arg.startsWith('-'))) || 3;

if (watchMode) {
  displayStats();
  setInterval(displayStats, interval * 1000);
  
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Monitoring stopped.${colors.reset}\n`);
    pool.end().then(() => process.exit(0));
  });
} else {
  displayStats().then(() => {
    pool.end().then(() => process.exit(0));
  });
}

