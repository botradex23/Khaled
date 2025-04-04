/**
 * Update Admin User to Super Admin - Simple HTTP Request
 * 
 * This script makes a direct HTTP request to the API endpoint to update 
 * the admin user to have super admin privileges.
 */

const http = require('http');
const crypto = require('crypto');

// Constants
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Ameena123';

// Hash password function for verification
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Function to make HTTP request
function makeHttpRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Main function
async function updateAdminToSuperAdmin() {
  try {
    console.log(`Updating admin user (${ADMIN_EMAIL}) to have super admin privileges...`);

    // Create or update the admin user via the API
    const response = await makeHttpRequest('POST', '/api/auth/create-default-admin');

    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ Admin user updated successfully!');
      console.log('Details:');
      console.log(`- ID: ${response.data.admin.id}`);
      console.log(`- Email: ${response.data.admin.email}`);
      console.log(`- Admin: ${response.data.admin.isAdmin}`);
      console.log(`- Super Admin: ${response.data.admin.isSuperAdmin}`);
      
      console.log('\nCredentials to use:');
      console.log(`- Email: ${ADMIN_EMAIL}`);
      console.log(`- Password: ${ADMIN_PASSWORD}`);
      console.log('\nThis user can now access the admin-my-agent interface with full permissions.');
    } else {
      console.error('❌ Failed to update admin user:');
      console.error(response.data);
    }
  } catch (error) {
    console.error('❌ Error updating admin user:', error.message);
  }
}

// Run the function
updateAdminToSuperAdmin();