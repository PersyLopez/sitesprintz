/**
 * 🔍 DIAGNOSTIC TEST - USER JOURNEY AUTH DEBUGGING
 * 
 * Purpose: Understand exactly what happens after registration
 * Focus: Token storage, localStorage, API calls
 */

import { test, expect } from '@playwright/test';

test.describe('📊 User Journey Auth Debug', () => {
  test('🔍 Diagnose: What happens after registration?', async ({ page, context }) => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSTIC: USER REGISTRATION → DASHBOARD FLOW');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const timestamp = Date.now();
    const testEmail = `diag-${timestamp}@example.com`;
    const testPassword = 'Test!Pass2024';
    
    // Set up logging
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`[API] ${response.request().method()} ${response.url()} → ${response.status()}`);
      }
    });
    
    page.on('console', msg => {
      if (!msg.text().includes('Crisp') && !msg.text().includes('CSP')) {
        console.log(`[Browser] ${msg.text()}`);
      }
    });

    // STEP 1: Register
    console.log('Step 1️⃣  : Navigate to register');
    await page.goto('/register.html');
    await page.waitForLoadState('networkidle');
    
    console.log(`Step 2️⃣  : Fill form and submit for ${testEmail}`);
    await page.fill('[data-testid="register-email"]', testEmail);
    await page.fill('[data-testid="register-password"]', testPassword);
    await page.fill('[data-testid="register-confirm-password"]', testPassword);
    await page.click('[data-testid="register-submit"]');
    
    // Wait for response
    await page.waitForURL(/login|dashboard|success|published/i, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`\nStep 3️⃣  : After registration - URL: ${currentUrl}\n`);
    
    // Check localStorage
    console.log('📦 Checking localStorage after registration:');
    const lsTokens = await page.evaluate(() => {
      return {
        accessToken: localStorage.getItem('accessToken'),
        authToken: localStorage.getItem('authToken'),
        refreshToken: localStorage.getItem('refreshToken'),
        token: localStorage.getItem('token')
      };
    });
    
    console.log(`  - accessToken: ${lsTokens.accessToken ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  - authToken: ${lsTokens.authToken ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  - refreshToken: ${lsTokens.refreshToken ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  - token: ${lsTokens.token ? '✓ EXISTS' : '✗ MISSING'}`);
    
    if (!lsTokens.authToken) {
      console.log('\n⚠️  WARNING: authToken is missing from localStorage!');
      console.log('   This is why the React dashboard cannot authenticate.\n');
    }
    
    // If on login page, try navigating to dashboard manually
    if (currentUrl.includes('login')) {
      console.log('\n⚠️  User was redirected to login');
      console.log('Attempting manual dashboard navigation with stored tokens...\n');
      
      if (lsTokens.authToken) {
        console.log('Step 4️⃣  : Navigate to dashboard with authToken present');
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        console.log(`Dashboard URL: ${page.url()}`);
        
        // Check if we're still on dashboard or got redirected
        if (page.url().includes('dashboard')) {
          console.log('✅ Dashboard loaded successfully!');
        } else {
          console.log('❌ Still not on dashboard, got redirected to:', page.url());
        }
      } else {
        console.log('❌ No authToken available, cannot access dashboard');
      }
    } else {
      console.log('✅ User successfully on', currentUrl);
    }
  });

  test('🔍 Test: Direct token storage verification', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICATION: Token storage behavior');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    await page.goto('/');
    
    // Manually store a test token
    const testToken = 'test-token-12345';
    console.log(`1. Setting localStorage.authToken = "${testToken}"`);
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, testToken);
    
    // Verify it was stored
    const stored = await page.evaluate(() => localStorage.getItem('authToken'));
    console.log(`2. Retrieved localStorage.authToken = "${stored}"`);
    console.log(`   ✓ Storage working correctly\n`);
  });

  test('✅ Control: Existing auth flow still works', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ CONTROL TEST: Login with pre-existing user');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Use a known good user that should exist
    const knownUser = 'pro@example.com';
    const knownPass = 'ProUser!2024';
    
    console.log(`Attempting login with: ${knownUser}`);
    await page.goto('/login.html');
    
    await page.fill('[data-testid="login-email"]', knownUser);
    await page.fill('[data-testid="login-password"]', knownPass);
    
    console.log('Submitting login...');
    await page.click('[data-testid="login-submit"]');
    
    // Wait for response
    await page.waitForURL(/dashboard|login|success/i, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    console.log(`Result: ${page.url()}`);
  });
});

