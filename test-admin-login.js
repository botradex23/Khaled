/**
 * Test script to verify the admin login functionality across different endpoints
 */

import axios from 'axios';

// Simple test function to create admin user and login using different endpoints
async function testAdminLogin() {
  try {
    console.log('Step 1: Creating default admin user...');
    const createResponse = await axios.post('http://localhost:5000/api/auth/create-default-admin');
    console.log('Create admin response:', createResponse.data);
    
    // Try login via /api/auth/local/login first
    console.log('\nStep 2a: Trying to login via /api/auth/local/login...');
    try {
      const localLoginResponse = await axios.post('http://localhost:5000/api/auth/local/login', {
        email: 'admin@example.com',
        password: 'admin123'
      });
      console.log('Local login response:', localLoginResponse.data);
    } catch (localLoginError) {
      console.error('Local login failed:');
      if (localLoginError.response) {
        console.error('Response status:', localLoginError.response.status);
        console.error('Response data:', localLoginError.response.data);
      } else {
        console.error('Error:', localLoginError.message);
      }
    }
    
    // Try login via /api/auth/login-as-admin
    console.log('\nStep 2b: Trying to login via /api/auth/login-as-admin...');
    try {
      const adminLoginResponse = await axios.post('http://localhost:5000/api/auth/login-as-admin', {
        email: 'admin@example.com',
        password: 'admin123'
      });
      console.log('Admin login response:', adminLoginResponse.data);
    } catch (adminLoginError) {
      console.error('Admin login failed:');
      if (adminLoginError.response) {
        console.error('Response status:', adminLoginError.response.status);
        console.error('Response data:', adminLoginError.response.data);
      } else {
        console.error('Error:', adminLoginError.message);
      }
    }
    
    // Try login via test-auth route
    console.log('\nStep 2c: Trying to login via /api/test-auth/login-as-admin...');
    try {
      const testAuthLoginResponse = await axios.post('http://localhost:5000/api/test-auth/login-as-admin');
      console.log('Test auth login response:', testAuthLoginResponse.data);
    } catch (testAuthLoginError) {
      console.error('Test auth login failed:');
      if (testAuthLoginError.response) {
        console.error('Response status:', testAuthLoginError.response.status);
        console.error('Response data:', testAuthLoginError.response.data);
      } else {
        console.error('Error:', testAuthLoginError.message);
      }
    }
    
    console.log('\nAdmin login tests completed!');
  } catch (error) {
    console.error('Error during admin login test:');
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testAdminLogin();