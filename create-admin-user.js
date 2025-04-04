/**
 * Create Super Admin User Script - Ultra Simplified Version
 * 
 * This script directly modifies the MongoDB to update the admin user with super admin permissions,
 * using the mongoose models directly from the server.
 */

// Import crypto for password hashing
import crypto from 'crypto';

// Import the mongoose models directly from the server path
import { UserModel } from './server/utils/mongodb.js';

// Constants for admin creation
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Ameena123';

// Create a hash of the password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Function to create or update the admin user
async function createSuperAdmin() {
  try {
    console.log('Creating or updating super admin user with email:', ADMIN_EMAIL);
    
    // Check if user exists
    const existingUser = await UserModel.findOne({ email: ADMIN_EMAIL });
    
    if (existingUser) {
      console.log('✅ Admin user already exists, updating super admin privileges');
      
      // Update the user to have admin and super admin privileges
      existingUser.isAdmin = true;
      existingUser.isSuperAdmin = true;
      
      await existingUser.save();
      
      console.log('✅ Updated admin user with super admin privileges');
      console.log('Admin user details:');
      console.log(`- ID: ${existingUser._id}`);
      console.log(`- Email: ${existingUser.email}`);
      console.log(`- Admin: ${existingUser.isAdmin}`);
      console.log(`- Super Admin: ${existingUser.isSuperAdmin}`);
    } else {
      console.log('Creating new admin user...');
      
      // Hash the password
      const hashedPassword = hashPassword(ADMIN_PASSWORD);
      
      // Create a new admin user
      const newUser = new UserModel({
        username: 'admin',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultBroker: 'binance',
        useTestnet: true
      });
      
      await newUser.save();
      
      console.log('✅ Created new super admin user:');
      console.log(`- ID: ${newUser._id}`);
      console.log(`- Email: ${newUser.email}`);
      console.log(`- Admin: ${newUser.isAdmin}`);
      console.log(`- Super Admin: ${newUser.isSuperAdmin}`);
    }
    
    // Reminder about credentials
    console.log('\nCredentials to use:');
    console.log(`- Email: ${ADMIN_EMAIL}`);
    console.log(`- Password: ${ADMIN_PASSWORD}`);
    console.log('\nThis user can now access the admin-my-agent interface with full permissions.');
    
    return true;
  } catch (error) {
    console.error('❌ Error creating/updating super admin user:', error);
    return false;
  }
}

// Run the main function
createSuperAdmin()
  .then(() => console.log('✅ Script completed'))
  .catch(err => console.error('❌ Script error:', err));