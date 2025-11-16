# 🎯 Quick Start Guide - M1 Pro Optimized Setup

## Getting Started

### 1. Check System Health
```bash
npm run health-check
```
This validates:
- CPU & Memory
- Node.js version
- PostgreSQL connection
- Port availability
- Dependencies

### 2. Start Development
```bash
# Terminal 1: Backend + Frontend
npm run dev:all

# Or separately:
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev
```

### 3. Monitor Performance (Optional)
```bash
# Terminal 3: Real-time monitoring
npm run monitor

# Or single snapshot
npm run monitor:once

# Watch database pool
npm run db:stats:watch
```

---

## Running Tests

### Unit & Integration Tests
```bash
# Run all tests
npm test

# Watch mode (auto-rerun)
npm run test:watch

# With coverage
npm run test:coverage

# With UI
npm run test:ui
```

### E2E Tests (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# With UI
npm run test:e2e:ui
```

### All Tests
```bash
npm run test:all
```

---

## M1 Optimizations Applied

### ✅ PostgreSQL Connection Pool
- **Dev:** 10 connections max
- **Test:** 5 connections max
- **Prod:** 20 connections max
- Idle timeout: 30s
- Query timeout: 30s

### ✅ Vitest Configuration
- **Workers:** 4 (optimized for M1 Pro 10 cores)
- **Memory:** ~4-6GB usage
- **Speed:** 10s timeouts (M1 is fast!)
- Thread pool with atomics support

### ✅ Playwright Configuration
- **Dev Mode:** Chromium + WebKit + Mobile (3 browsers)
- **Prod Mode:** All browsers (5 browsers)
- **Workers:** 3 in dev, 2 in CI
- **Memory:** ~4-6GB usage
- No video recording in dev (saves RAM)

### ✅ Vite Build
- **Target:** ES2022 (modern)
- **esbuild:** ARM64 native
- **Minification:** esbuild (fastest)
- Code splitting for vendors
- Persistent cache enabled

---

## Memory Usage Estimates

| Process | Memory Usage |
|---------|--------------|
| Node Backend | 150-300 MB |
| Vite Dev Server | 200-400 MB |
| Vitest (4 workers) | 2-4 GB |
| Playwright (3 browsers) | 3-6 GB |
| PostgreSQL | 200-500 MB |
| **Total Development** | **~6-10 GB** |
| **Available for IDE/Browser** | **~22 GB** |

---

## Monitoring Commands

```bash
# Real-time performance monitoring (updates every 5s)
npm run monitor

# Single snapshot
npm run monitor:once

# Database connection pool stats
npm run db:stats

# Watch database pool (updates every 3s)
npm run db:stats:watch

# System health check
npm run health-check

# Monitor while testing
npm run monitor:test
```

---

## Troubleshooting

### High Memory Usage?
```bash
# Check what's running
npm run monitor

# Kill processes
pkill -f node
```

### Ports Already in Use?
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill

# Find process using port 5173
lsof -ti:5173 | xargs kill
```

### Tests Running Slow?
- Reduce Vitest workers in `vitest.config.js`
- Reduce Playwright workers in `playwright.config.js`
- Close other applications

### Database Connection Issues?
```bash
# Check connection
npm run db:stats

# Verify PostgreSQL is running
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql
```

---

## Development Workflow

### Standard Development
```bash
# 1. Check health
npm run health-check

# 2. Start dev servers
npm run dev:all

# 3. (Optional) Monitor in another terminal
npm run monitor
```

### Testing Workflow
```bash
# 1. Run tests in watch mode
npm run test:watch

# 2. (Optional) Monitor in another terminal
npm run monitor

# 3. Check coverage when done
npm run test:coverage
```

### Before Commit
```bash
# 1. Health check
npm run health-check

# 2. Run all tests
npm run test:all

# 3. Build check
npm run build
```

---

## Files Modified for M1 Optimization

1. **`vite.config.js`** - Build optimizations, esbuild ARM64
2. **`vitest.config.js`** - Worker limits, thread pool, timeouts
3. **`playwright.config.js`** - Browser matrix, worker limits
4. **`database/db.optimized.js`** - Connection pool configuration
5. **`scripts/performance-monitor.js`** - Real-time monitoring
6. **`scripts/db-stats.js`** - Database pool monitoring
7. **`scripts/health-check.js`** - System health validation
8. **`package.json`** - New monitoring scripts

---

## Next Steps

1. Review `M1-OPTIMIZATION-GUIDE.md` for detailed information
2. Run `npm run health-check` to verify setup
3. Start development with `npm run dev:all`
4. Monitor performance with `npm run monitor`

---

**Optimized for:** MacBook M1 Pro (32GB RAM)  
**Last Updated:** January 2025  
**Status:** ✅ Ready for Development

