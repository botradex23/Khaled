/**
 * Admin User Check Test
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

async function testAdminCheck() {
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
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to check the admin user directly
    console.log(`\n2. Checking admin user: ${adminEmail}`);
    try {
      // For direct API endpoint check, we'll use the /direct-api path to avoid Vite middleware
      const response = await axios.get(`${API_BASE}/direct-api/admin/user?email=${adminEmail}`);
      console.log('Admin user check response:', response.data);
    } catch (error) {
      console.error('Error checking admin user:', error.response?.data || error.message);
    }
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

// Run the test
testAdminCheck();