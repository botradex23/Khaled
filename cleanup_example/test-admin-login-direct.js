/**
 * Direct Admin Login Test
 * 
 * This script tests logging in directly with the admin credentials
 * and verifies that the user has super admin privileges.
 */

const axios = require('axios');

async function testAdminLogin() {
  console.log('🔍 Testing admin login with email: admin@example.com');
  
  try {
    // Attempt to login with admin credentials
    console.log('Sending login request...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'Ameena123'
    });
    
    console.log('📋 Login Response Status:', loginResponse.status);
    console.log('📋 Login Response Data:', JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.data.success) {
      console.log('✅ Admin login successful!');
      
      // Check user data/session
      try {
        const userResponse = await axios.get('http://localhost:5000/api/auth/user', {
          withCredentials: true,
          headers: {
            Cookie: loginResponse.headers['set-cookie']?.join('; ') || ''
          }
        });
        
        console.log('📋 User Data Response Status:', userResponse.status);
        console.log('📋 User Data:', JSON.stringify(userResponse.data, null, 2));
        
        if (userResponse.data.isAuthenticated && userResponse.data.user) {
          console.log('✅ User session active, authenticated as admin');
          
          if (userResponse.data.user.isAdmin) {
            console.log('✅ User has admin privileges');
          } else {
            console.log('❌ User does NOT have admin privileges');
          }
          
          if (userResponse.data.user.isSuperAdmin) {
            console.log('✅ User has SUPER ADMIN privileges');
          } else {
            console.log('❌ User does NOT have super admin privileges');
          }
        } else {
          console.log('❌ User session not authenticated');
        }
      } catch (userError) {
        console.error('❌ Error checking user data:', userError.message);
        if (userError.response) {
          console.error('Response Status:', userError.response.status);
          console.error('Response Data:', userError.response.data);
        }
      }
    } else {
      console.log('❌ Admin login failed');
      if (loginResponse.data.message) {
        console.log('Error message:', loginResponse.data.message);
      }
    }
  } catch (error) {
    console.error('❌ Error during login request:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

// Run the test
testAdminLogin();