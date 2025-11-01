/**
 * AUTHENTICATION TEST SCRIPT
 * 
 * Purpose: Test that registration, login, and protected routes work with database
 * 
 * Tests:
 * 1. Register new user
 * 2. Login with that user
 * 3. Access protected route with token
 * 4. Try to access protected route without token (should fail)
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'testpassword123';

let authToken = null;

async function testRegistration() {
  console.log('\n🧪 TEST 1: User Registration');
  console.log('=====================================');
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD}`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success && data.token) {
      console.log('✅ Registration successful!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      authToken = data.token;
      return true;
    } else {
      console.log('❌ Registration failed!');
      console.log(`   Error: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🧪 TEST 2: User Login');
  console.log('=====================================');
  console.log(`Email: ${TEST_EMAIL}`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success && data.token) {
      console.log('✅ Login successful!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      authToken = data.token;
      return true;
    } else {
      console.log('❌ Login failed!');
      console.log(`   Error: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testProtectedRoute() {
  console.log('\n🧪 TEST 3: Protected Route (with token)');
  console.log('=====================================');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Protected route accessible!');
      console.log(`   User: ${data.user?.email || data.email}`);
      return true;
    } else {
      console.log('❌ Protected route failed!');
      console.log(`   Error: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Protected route error:', error.message);
    return false;
  }
}

async function testProtectedRouteNoToken() {
  console.log('\n🧪 TEST 4: Protected Route (without token)');
  console.log('=====================================');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/me`);
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✅ Correctly rejected (no token)!');
      console.log(`   Error: ${data.error}`);
      return true;
    } else {
      console.log('❌ Should have rejected access!');
      console.log(`   Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Request error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 AUTHENTICATION TESTS');
  console.log('=====================================');
  console.log('Testing database-backed authentication...\n');
  
  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results = {
    registration: await testRegistration(),
    login: await testLogin(),
    protectedWithToken: await testProtectedRoute(),
    protectedWithoutToken: await testProtectedRouteNoToken()
  };
  
  console.log('\n📊 TEST RESULTS');
  console.log('=====================================');
  console.log(`Registration:          ${results.registration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Login:                 ${results.login ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Protected (with token): ${results.protectedWithToken ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Protected (no token):   ${results.protectedWithoutToken ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Authentication is working with database!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check server logs for details.');
    process.exit(1);
  }
}

runTests();

