/**
 * Admin Authentication Test Script
 * 
 * This script tests creating and logging in as an admin user
 */

import axios from 'axios';
import crypto from 'crypto';

const API_BASE = 'http://localhost:5000';

async function testAdminAuth() {
  try {
    console.log('1. Creating default admin user...');
    const createResponse = await axios.post(`${API_BASE}/api/auth/create-default-admin`);
    console.log('Create admin response:', createResponse.data);
    
    if (!createResponse.data.success) {
      console.error('Failed to create admin user');
      return;
    }
    
    const adminEmail = createResponse.data.admin.email;
    const adminPassword = createResponse.data.admin.password;
    
    console.log(`Created admin: ${adminEmail} with password: ${adminPassword}`);
    
    // Wait a moment for the database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n2. Testing login with admin credentials...');
    // Try login with the admin credentials
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login-as-admin`, {
      email: adminEmail,
      password: adminPassword
    });
    
    console.log('Login response:', loginResponse.data);
    
    console.log('\n3. Testing login with hashed password...');
    // Hash the password as done in the auth system
    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
    console.log(`Original password: ${adminPassword}`);
    console.log(`Hashed password: ${hashedPassword}`);
    
    // Try login with hashed password (this should fail, as the API endpoint should hash it again)
    try {
      const loginWithHashResponse = await axios.post(`${API_BASE}/api/auth/login-as-admin`, {
        email: adminEmail,
        password: hashedPassword
      });
      console.log('Login with hash response:', loginWithHashResponse.data);
    } catch (error) {
      console.log('Expected error when using hashed password:', error.response?.data || error.message);
    }
    
    console.log('\n4. Testing regular login endpoint with admin credentials...');
    // Try the regular login endpoint
    try {
      const regularLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: adminEmail,
        password: adminPassword
      });
      console.log('Regular login response:', regularLoginResponse.data);
    } catch (error) {
      console.log('Error with regular login:', error.response?.data || error.message);
    }
    
    console.log('\n5. Testing regular login with email and hashed password...');
    // Try login with email and hashed password
    try {
      const regularLoginWithHashResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: adminEmail,
        password: hashedPassword
      });
      console.log('Regular login with hash response:', regularLoginWithHashResponse.data);
    } catch (error) {
      console.log('Error with regular login using hash:', error.response?.data || error.message);
    }
    
    console.log('\n6. Testing direct database query for admin user...');
    // Test getting the user directly from the database
    const userCheckResponse = await axios.get(`${API_BASE}/api/admin/user/${adminEmail}`);
    console.log('User check response:', userCheckResponse.data);
    
  } catch (error) {
    console.error('Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testAdminAuth();