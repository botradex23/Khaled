/**
 * Direct Admin User Check Test
 * 
 * This script tests the direct admin check endpoint for debugging authentication issues.
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

async function testDirectAdminCheck() {
  try {
    // Create a default admin first
    console.log('1. Creating default admin user...');
    const createResponse = await axios.post(`${API_BASE}/api/auth/create-default-admin`);
    console.log('Create admin response:', createResponse.data);
    
    if (!createResponse.data.success) {
      console.error('Failed to create admin user');
      return;
    }
    
    const adminEmail = createResponse.data.admin.email;
    
    // Wait a moment for the changes to propagate
    console.log('Waiting for changes to propagate...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to check the admin user directly
    console.log(`\n2. Checking admin user using direct API: ${adminEmail}`);
    try {
      // Use our direct endpoint that bypasses Vite middleware
      const response = await axios.get(`${API_BASE}/direct-api/admin/user?email=${adminEmail}`);
      console.log('Direct admin user check response:', response.data);
      
      if (response.data.success && response.data.user) {
        console.log('✅ Direct admin check succeeded!');
        console.log('Admin user details:', {
          id: response.data.user.id,
          email: response.data.user.email,
          isAdmin: response.data.user.isAdmin,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName
        });
      } else {
        console.log('❌ Direct admin check failed');
      }
    } catch (error) {
      console.error('Error checking admin user via direct API:', error.response?.data || error.message);
    }
    
    // Compare with standard admin check route
    console.log(`\n3. Comparing with standard admin check route: ${adminEmail}`);
    try {
      const standardResponse = await axios.get(`${API_BASE}/api/admin/user/${adminEmail}`);
      console.log('Standard admin user check response:', standardResponse.data);
    } catch (error) {
      console.error('Error with standard admin check route:', error.response?.data || error.message);
    }
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

// Run the test
testDirectAdminCheck();