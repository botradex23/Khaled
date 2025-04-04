/**
 * Direct Authentication Test Script
 * 
 * This script directly tests the login API endpoint with the admin credentials
 * and reports the results.
 */

import fetch from 'node-fetch';

async function testAdminLogin() {
  try {
    console.log('Testing admin login with email: admin@example.com and password: Ameena123');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Ameena123'
      }),
    });
    
    const data = await response.json();
    
    console.log('Status Code:', response.status);
    console.log('Response Headers:', response.headers);
    console.log('Response Body:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Login successful!');
      
      // Get user info
      const userResponse = await fetch('http://localhost:5000/api/auth/user', {
        headers: {
          Cookie: response.headers.get('set-cookie')
        }
      });
      
      const userData = await userResponse.json();
      console.log('User Data:', JSON.stringify(userData, null, 2));
      
      if (userData.isAuthenticated && userData.user) {
        console.log('✅ User session is authenticated');
        console.log(`Admin Status: ${userData.user.isAdmin ? 'Yes ✅' : 'No ❌'}`);
        console.log(`Super Admin Status: ${userData.user.isSuperAdmin ? 'Yes ✅' : 'No ❌'}`);
      } else {
        console.log('❌ User session is not authenticated');
      }
    } else {
      console.log('❌ Login failed');
      if (data.message) {
        console.log('Error message:', data.message);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAdminLogin();