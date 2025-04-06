/**
 * Simple direct admin check test
 * 
 * This script tests the direct admin check endpoint that bypasses Vite middleware.
 */

// First create a default admin
async function createDefaultAdmin() {
  try {
    console.log('1. Creating default admin user...');
    
    const createResponse = await fetch('http://localhost:5000/api/auth/create-default-admin', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const createData = await createResponse.json();
    console.log('Create admin response:', createData);
    
    if (!createData.success) {
      console.error('Failed to create admin user');
      return null;
    }
    
    return createData.admin.email;
  } catch (error) {
    console.error('Error creating admin:', error);
    return null;
  }
}

// Check admin user directly
async function checkAdminUser(email) {
  try {
    console.log(`\n2. Checking admin user with direct endpoint: ${email}`);
    
    const checkResponse = await fetch(`http://localhost:5000/admin-check?email=${email}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Check if we got JSON or HTML
    const contentType = checkResponse.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. Vite middleware is still intercepting the request.');
      return;
    }
    
    const checkData = await checkResponse.json();
    console.log('Admin user check response:', checkData);
    
    if (checkData.success && checkData.user) {
      console.log('✅ Admin check succeeded!');
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
  } catch (error) {
    console.error('Error checking admin user:', error);
  }
}

// Main test function
async function runTest() {
  const adminEmail = await createDefaultAdmin();
  if (adminEmail) {
    // Wait a moment for changes to propagate
    console.log('Waiting for changes to propagate...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await checkAdminUser(adminEmail);
  }
}

// Run the test
runTest();