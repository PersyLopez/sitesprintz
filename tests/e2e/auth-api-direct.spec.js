/**
 * 🔍 SIMPLE AUTH TEST - Direct API Testing
 */

import { test, expect } from '@playwright/test';

test.describe('🔐 Direct Auth API Test', () => {
  test('📝 Register user via API directly', async ({ request }) => {
    console.log('\n═════════════════════════════════════════════');
    console.log('📝 Test: Register via API');
    console.log('═════════════════════════════════════════════\n');
    
    const email = `apitest-${Date.now()}@example.com`;
    const password = 'TestPass!2024';
    
    // Step 0: Get CSRF token
    console.log(`0️⃣  Getting CSRF token`);
    const csrfRes = await request.get('/api/csrf-token');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    console.log(`   CSRF Token: ${csrfToken ? '✓' : '✗'}\n`);
    
    // Step 1: Register
    console.log(`1️⃣  Registering: ${email}`);
    const registerRes = await request.post('/api/auth/register', {
      data: { email, password, acceptedTerms: true },
      headers: {
        'x-csrf-token': csrfToken
      }
    });
    
    console.log(`   Status: ${registerRes.status()}`);
    const registerData = await registerRes.json();
    console.log(`   Response:`, JSON.stringify(registerData, null, 2));
    
    expect(registerRes.status()).toBe(200);
    expect(registerData.accessToken).toBeDefined();
    expect(registerData.refreshToken).toBeDefined();
    
    const { accessToken, refreshToken } = registerData;
    console.log(`   ✓ Tokens received: accessToken=${accessToken ? '✓' : '✗'}, refreshToken=${refreshToken ? '✓' : '✗'}\n`);
    
    // Step 2: Use token to call /api/auth/me
    console.log(`2️⃣  Calling /api/auth/me with token`);
    const meRes = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log(`   Status: ${meRes.status()}`);
    const meData = await meRes.json();
    console.log(`   Response:`, JSON.stringify(meData, null, 2));
    
    if (meRes.status() === 200) {
      console.log(`   ✓ /api/auth/me succeeded!\n`);
    } else {
      console.log(`   ✗ /api/auth/me failed with ${meRes.status()}\n`);
    }
    
    expect(meRes.status()).toBe(200);
  });
});

