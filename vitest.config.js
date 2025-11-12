import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    // Don't automatically apply jsdom setup to node environment tests
    environmentMatchGlobs: [
      ['**/tests/unit/utils/**', 'node'],
      ['**/tests/unit/middleware/**', 'node'],
      ['**/tests/integration/**', 'node'],
      ['**/*.node.test.js', 'node']
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**', // Exclude E2E tests (run with Playwright)
      '**/.{idea,git,cache,output,temp}/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'public/',
        '*.config.js',
        '*.config.ts',
        'database/migrations/'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, './server'),
      '@database': path.resolve(__dirname, './database')
    }
  }
});

