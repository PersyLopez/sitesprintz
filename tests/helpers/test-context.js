/**
 * Test Context Helper - Manages test setup/teardown with transaction rollback
 * Inspired by Antigravity patterns for Prisma isolated tests
 */

import { chromium } from '@playwright/test';

export class TestContext {
  constructor(browser, options = {}) {
    this.browser = browser;
    this.context = null;
    this.page = null;
    this.options = options;
    this.transactionId = null;
  }

  async setup() {
    // Create browser context with storage state for auth
    this.context = await this.browser.newContext({
      storageState: this.options.storageState,
      baseURL: this.options.baseURL || 'http://localhost:5173'
    });

    this.page = await this.context.newPage();

    // Start transaction for test isolation (if using DB)
    if (this.options.startTransaction) {
      this.transactionId = await this.startDatabaseTransaction();
    }

    // Pre-authenticate if needed
    if (this.options.user) {
      await this.authenticateUser(this.options.user);
    }

    return this;
  }

  async authenticateUser(userInfo) {
    // Simulate authentication by setting auth token in localStorage
    const token = await this.generateTestToken(userInfo);
    await this.page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-' + Math.random(),
        email: userInfo.email,
        plan: userInfo.tier,
        tier: userInfo.tier
      }));
    }, token);
  }

  async generateTestToken(userInfo) {
    // In real test, would call backend to generate token
    // For now, return mock token
    return `test-token-${userInfo.tier}-${Date.now()}`;
  }

  async startDatabaseTransaction() {
    // Call backend to start transaction
    try {
      const response = await fetch('http://localhost:3000/api/test/transaction/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return data.transactionId;
    } catch (e) {
      console.warn('Transaction management not available');
      return null;
    }
  }

  async rollbackTransaction() {
    // Rollback transaction for test isolation
    if (this.transactionId) {
      try {
        await fetch('http://localhost:3000/api/test/transaction/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: this.transactionId })
        });
      } catch (e) {
        console.warn('Transaction rollback failed');
      }
    }
  }

  page() {
    return this.page;
  }

  async close() {
    await this.rollbackTransaction();
    if (this.context) await this.context.close();
  }
}

export async function createTestContext(browser, options) {
  const ctx = new TestContext(browser, options);
  await ctx.setup();
  return ctx;
}

export async function cleanupTestContext(context) {
  if (context && context.close) {
    await context.close();
  }
}
