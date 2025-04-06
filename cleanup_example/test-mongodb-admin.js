/**
 * Test MongoDB Admin User Lookup
 * 
 * This script tests directly looking up the admin user in MongoDB
 */

import { storage } from './server/storage.js';

async function testAdminLookup() {
  try {
    console.log('Testing direct admin user lookup by username...');
    
    // Check if storage is initialized
    if (!storage) {
      console.error('Storage not properly initialized');
      return;
    }

    // Try to find admin user
    console.log('Looking for admin user by username...');
    const adminUser = await storage.getUserByUsername('admin');
    
    if (adminUser) {
      console.log('✅ Admin user found:', {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        isAdmin: adminUser.isAdmin,
        hasBinanceKeys: !!(adminUser.binanceApiKey && adminUser.binanceSecretKey)
      });
    } else {
      console.log('❌ Admin user not found by username');
      
      // Try to create admin user
      console.log('Creating a new admin user...');
      const newAdminUser = {
        username: "admin",
        email: "admin@example.com",
        password: "admin123", // Simple password for testing
        firstName: "Admin",
        lastName: "User",
        defaultBroker: "binance",
        useTestnet: true,
        isAdmin: true
      };
      
      const createdAdmin = await storage.createUser(newAdminUser);
      console.log('✅ Admin user created:', {
        id: createdAdmin.id,
        username: createdAdmin.username,
        email: createdAdmin.email,
        isAdmin: createdAdmin.isAdmin
      });
      
      // Verify the user was stored properly
      console.log('Verifying admin user was stored...');
      const verifyAdmin = await storage.getUserByUsername('admin');
      
      if (verifyAdmin) {
        console.log('✅ Admin user verified in storage:', verifyAdmin.id);
      } else {
        console.log('❌ Failed to verify admin user in storage');
      }
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testAdminLookup();