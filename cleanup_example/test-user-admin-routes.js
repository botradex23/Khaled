/**
 * Test script for user admin status endpoints
 * 
 * This script tests both the GET /api/user/admin-status and POST /api/user/set-admin endpoints
 */
// Using built-in fetch API

// Use the Replit host directly
const BASE_URL = 'https://19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev';

async function testAdminStatus() {
  try {
    console.log('=== Testing GET /api/user/admin-status ===');
    
    // Test with a valid email that should exist
    const email = 'admin@example.com';
    const response = await fetch(`${BASE_URL}/api/user/admin-status?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    
    console.log(`Status code: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`✅ Successfully retrieved admin status for ${email}`);
      console.log(`   Is admin: ${data.user.isAdmin}`);
    } else {
      console.log(`❌ Failed to retrieve admin status: ${data.message}`);
    }
    
    // Test with a non-existent email
    const nonExistentEmail = 'nonexistent-user@example.com';
    const nonExistentResponse = await fetch(`${BASE_URL}/api/user/admin-status?email=${encodeURIComponent(nonExistentEmail)}`);
    const nonExistentData = await nonExistentResponse.json();
    
    console.log(`\nNon-existent user test - Status code: ${nonExistentResponse.status}`);
    console.log('Response:', JSON.stringify(nonExistentData, null, 2));
    
    if (nonExistentResponse.status === 404) {
      console.log(`✅ Correctly returned 404 for non-existent user`);
    } else {
      console.log(`❌ Expected 404 for non-existent user, got ${nonExistentResponse.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error testing admin status:', error);
    return null;
  }
}

async function testSetAdminStatus(email, isAdmin) {
  try {
    console.log(`\n=== Testing POST /api/user/set-admin (setting isAdmin=${isAdmin}) ===`);
    
    const response = await fetch(`${BASE_URL}/api/user/set-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, isAdmin })
    });
    
    const data = await response.json();
    
    console.log(`Status code: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`✅ Successfully set admin status to ${isAdmin} for ${email}`);
      console.log(`   Current admin status: ${data.user.isAdmin}`);
    } else {
      console.log(`❌ Failed to set admin status: ${data.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error setting admin status:', error);
    return null;
  }
}

async function testBothDirections(email) {
  // First get current status
  const initialStatus = await testAdminStatus();
  
  if (!initialStatus || !initialStatus.success) {
    console.log('❌ Could not retrieve initial admin status, aborting further tests');
    return;
  }
  
  const initialIsAdmin = initialStatus.user.isAdmin;
  
  // Set to the opposite of current status
  await testSetAdminStatus(email, !initialIsAdmin);
  
  // Verify it changed
  const midStatus = await testAdminStatus();
  
  if (!midStatus || !midStatus.success) {
    console.log('❌ Could not retrieve updated admin status, aborting further tests');
    return;
  }
  
  if (midStatus.user.isAdmin === !initialIsAdmin) {
    console.log(`✅ Successfully verified admin status changed to ${!initialIsAdmin}`);
  } else {
    console.log(`❌ Failed to change admin status, still ${midStatus.user.isAdmin}`);
  }
  
  // Set back to original status
  await testSetAdminStatus(email, initialIsAdmin);
  
  // Verify it changed back
  const finalStatus = await testAdminStatus();
  
  if (!finalStatus || !finalStatus.success) {
    console.log('❌ Could not retrieve final admin status');
    return;
  }
  
  if (finalStatus.user.isAdmin === initialIsAdmin) {
    console.log(`✅ Successfully verified admin status restored to ${initialIsAdmin}`);
  } else {
    console.log(`❌ Failed to restore admin status, got ${finalStatus.user.isAdmin} instead of ${initialIsAdmin}`);
  }
}

async function main() {
  const email = 'admin@example.com';
  
  console.log('Starting test of user admin status endpoints');
  console.log(`Testing with email: ${email}`);
  
  await testBothDirections(email);
  
  console.log('\nTest completed');
}

main().catch(err => console.error('Test failed with error:', err));