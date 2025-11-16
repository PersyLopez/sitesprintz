# 🚀 M1 Pro Optimization Guide (32GB RAM)

## Current Configuration Audit

### ✅ What's Already Good
- **Vite** - Already using native esbuild (ARM64 optimized)
- **React 19** - Modern and efficient
- **PostgreSQL** - ARM64 native support available
- **Node.js** - Excellent M1 performance

### ⚠️ Issues Found

1. **PostgreSQL Connection Pool** - No configuration limits
   - Default pool size can be too large
   - No connection timeouts set
   - Missing idle client cleanup

2. **Playwright** - Running all 5 browsers in parallel
   - Can consume 8-10GB RAM when all running
   - No worker limit for local development

3. **Vitest** - No thread/worker limits
   - May spawn too many workers (default: CPU cores - 1)
   - M1 Pro has 10 cores, could spawn 9 workers

4. **Vite Dev Server** - Missing memory optimizations
   - No chunk size limits
   - Missing caching strategies

5. **No Performance Monitoring** - Can't track resource usage

---

## Optimization Plan

### 1. PostgreSQL Connection Pool (M1 Optimized)
**Recommended:** 10-15 connections for dev, 20-25 for production

### 2. Test Configuration
- **Vitest:** 4 workers max (balanced for M1)
- **Playwright:** 3 workers, chromium + webkit only for dev

### 3. Vite Build
- Enable persistent cache
- Optimize chunk sizes
- Use native M1 optimizations

### 4. Performance Monitoring
- Real-time memory tracking
- CPU usage monitoring
- Database connection pool stats
- Test execution metrics

---

## Applied Optimizations

See individual configuration files:
- `database/db.optimized.js` - PostgreSQL pool config
- `vitest.config.js` - Updated with M1 limits
- `playwright.config.js` - Updated with M1 limits
- `vite.config.js` - M1 build optimizations
- `scripts/performance-monitor.js` - New monitoring tool
- `package.json` - New monitoring scripts

---

## Expected Performance

### Before Optimization
- Test suite: ~8-12GB RAM usage
- All Playwright browsers: ~15GB RAM
- Total potential: ~20-25GB (80% of available)

### After Optimization
- Test suite: ~4-6GB RAM usage
- Playwright (dev mode): ~4-6GB RAM
- Total: ~10-12GB (30-40% of available)
- **Remaining:** ~20GB for other apps/browser/IDE

---

## Monitoring Commands

```bash
# Real-time performance monitoring
npm run monitor

# Monitor during tests
npm run monitor:test

# Full system health check
npm run health-check

# Database pool statistics
npm run db:stats
```

---

## M1 Pro Specific Tips

1. **Always prefer ARM64 packages** - Check with `npm list <package>`
2. **PostgreSQL** - Use Postgres.app or Homebrew (both M1 native)
3. **Docker** - If using, ensure ARM64 images
4. **Node Version** - v18+ has best M1 support
5. **Memory Pressure** - Monitor with Activity Monitor

---

## Troubleshooting

### High Memory Usage?
```bash
# Check what's using memory
npm run monitor

# Kill zombie processes
pkill -f node
pkill -f postgres

# Clear caches
rm -rf node_modules/.vite
rm -rf .vitest
```

### Slow Tests?
```bash
# Run tests with timing info
npm run test -- --reporter=verbose

# Run single test file
npm run test tests/unit/specific.test.js
```

### Database Issues?
```bash
# Check connection pool
npm run db:stats

# Test connection
node database/test-connection.js
```

---

**Last Updated:** January 2025  
**System:** M1 Pro (32GB RAM)  
**Status:** ✅ Optimized

