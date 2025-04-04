/**
 * Direct test script for testing the admin authentication flow
 */

import axios from 'axios';

async function testAdminAuthentication() {
  try {
    console.log('Step 1: Create a new test admin account');
    const adminEmail = `admin-test-${Date.now()}@example.com`;
    const adminPassword = 'test-password123';
    
    console.log(`Creating test admin with email: ${adminEmail}`);
    
    // First create a test admin using the test-auth endpoint
    const createAdminResponse = await axios.post('http://localhost:5000/api/test-auth/create-admin');
    console.log('Create admin response:', createAdminResponse.data);
    
    if (!createAdminResponse.data.success) {
      throw new Error('Failed to create test admin');
    }
    
    // Now login with the admin-login endpoint to test if authentication works directly
    console.log('\nStep 2: Login as admin via /api/test-auth/login-as-admin');
    const loginResponse = await axios.post('http://localhost:5000/api/test-auth/login-as-admin');
    console.log('Direct test login response:', loginResponse.data);
    
    // Try logging in with the standard login-as-admin endpoint that isn't working
    console.log('\nStep 3: Login with the problematic endpoint /api/auth/login-as-admin');
    try {
      const standardLoginResponse = await axios.post('http://localhost:5000/api/auth/login-as-admin', {
        email: 'admin@example.com',
        password: '' // Empty to trigger auto-login
      });
      console.log('Standard login response:', standardLoginResponse.data);
    } catch (loginError) {
      console.error('Standard login error:', loginError.response ? loginError.response.data : loginError.message);
    }
    
    // Add a check for the isAdmin flag in MongoDB
    console.log('\nStep 4: Checking admin status via storage API');
    try {
      const checkAdminResponse = await axios.get('http://localhost:5000/api/user/admin-status?email=admin@example.com');
      console.log('Admin status check response:', checkAdminResponse.data);
    } catch (checkError) {
      console.error('Admin status check error:', checkError.response ? checkError.response.data : checkError.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAdminAuthentication();