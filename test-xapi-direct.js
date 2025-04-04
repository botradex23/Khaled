/**
 * Test script for the X-Direct API endpoints
 * 
 * This script tests the X-Direct API endpoints that bypass Vite middleware.
 */

async function testXDirectAPI() {
  try {
    console.log('1. Creating admin user with X-Direct API...');
    
    const createResponse = await fetch('http://localhost:5000/xapi/create-admin', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!createResponse.ok) {
      throw new Error(`HTTP error! status: ${createResponse.status}`);
    }
    
    const createData = await createResponse.json();
    console.log('Admin creation response:', createData);
    
    if (!createData.success) {
      console.error('Failed to create admin user');
      return;
    }
    
    const adminEmail = createData.admin.email;
    const adminPassword = createData.admin.password;
    
    // Wait a moment for the changes to propagate
    console.log('Waiting for changes to propagate...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check admin user
    console.log(`\n2. Checking admin user with X-Direct API: ${adminEmail}`);
    const checkResponse = await fetch(`http://localhost:5000/xapi/admin-check?email=${adminEmail}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!checkResponse.ok) {
      throw new Error(`HTTP error! status: ${checkResponse.status}`);
    }
    
    const checkData = await checkResponse.json();
    console.log('Admin check response:', checkData);
    
    if (checkData.success && checkData.user) {
      console.log('✅ Admin check successful!');
      console.log('Admin user details:', {
        id: checkData.user.id,
        email: checkData.user.email,
        isAdmin: checkData.user.isAdmin,
        firstName: checkData.user.firstName,
        lastName: checkData.user.lastName
      });
    } else {
      console.log('❌ Admin check failed');
    }
    
    // Test login with admin credentials
    console.log(`\n3. Testing admin login with X-Direct API: ${adminEmail}`);
    const loginResponse = await fetch('http://localhost:5000/xapi/admin-login', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`HTTP error! status: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('Admin login response:', loginData);
    
    if (loginData.success) {
      console.log('✅ Admin login successful!');
      console.log('Logged in admin user details:', {
        id: loginData.user.id,
        email: loginData.user.email,
        isAdmin: loginData.user.isAdmin,
        firstName: loginData.user.firstName,
        lastName: loginData.user.lastName
      });
    } else {
      console.log('❌ Admin login failed');
    }
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

// Run the test
testXDirectAPI();