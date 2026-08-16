/**
 * Phase 3 Diagnostic - Check if products exist
 * Run this to debug why checkout tests are failing
 */

import { test, expect } from '@playwright/test';

test('DIAGNOSTIC: Check test site and products', async ({ page }) => {
  console.log('\n🔍 Phase 3 Diagnostic: Checking test site...\n');

  try {
    // Navigate to test restaurant
    await page.goto('/sites/test-restaurant/', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('✅ Successfully navigated to /sites/test-restaurant/');

    // Check what's on the page
    const pageContent = await page.content();
    console.log(`\n📄 Page title: ${await page.title()}`);
    console.log(`📄 Page URL: ${page.url()}`);

    // Look for any product indicators
    const productSelectors = [
      '[data-testid="product-card"]',
      '.product-card',
      '[class*="product"][class*="card"]',
      '.products-section',
      '.products-grid'
    ];

    console.log('\n🔎 Checking for product elements:');
    for (const selector of productSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ✅ Found ${count}x ${selector}`);
      }
    }

    // Check for any product names
    const productNames = ['Pizza', 'Burger', 'Salad', 'Fries', 'Milkshake', 'Carbonara'];
    console.log('\n🔎 Checking for product names:');
    for (const name of productNames) {
      if (await page.getByText(name).first().isVisible().catch(() => false)) {
        console.log(`  ✅ Found product: ${name}`);
      }
    }

    // Check network errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('\n⚠️  Console errors found:');
      errors.forEach(e => console.log(`  - ${e}`));
    }

    // Check if site data exists
    const siteData = await page.evaluate(() => window.__siteData || {});
    console.log(`\n📊 Site data: ${Object.keys(siteData).join(', ')}`);

    expect(true).toBeTruthy();
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
    expect(true).toBeTruthy();
  }
});


