/**
 * Admin Password Fix Utility
 * 
 * This utility script is used to directly fix the admin password in the MongoDB database
 * when the stored password hash doesn't match the expected value.
 */
import crypto from 'crypto';
import { connectToMongoDB } from '../storage/mongodb';

// SHA-256 hash of 'admin123'
const EXPECTED_ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

export async function fixAdminPassword() {
  try {
    // First make sure we're connected to MongoDB
    console.log('Attempting to connect to MongoDB...');
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Cannot fix admin password.');
      return { success: false, message: 'Failed to connect to MongoDB' };
    }
    
    // Now import the mongoClient which should be initialized
    const { mongoClient } = await import('../storage/mongodb');
    
    if (!mongoClient) {
      console.error('MongoDB client not initialized after connection.');
      return { success: false, message: 'MongoDB client not initialized' };
    }
    
    console.log('MongoDB connection established');
    const db = mongoClient.db('Saas');
    console.log('Using database:', db.databaseName);
    const users = db.collection('users');
    
    // Try finding the admin user by username
    console.log('Looking for admin user by username');
    let adminUser = await users.findOne({ username: 'admin' });
    
    // If not found by username, try by email
    if (!adminUser) {
      console.log('Admin not found by username, trying email');
      adminUser = await users.findOne({ email: 'admin@example.com' });
    }
    
    // If still not found, try by isAdmin flag
    if (!adminUser) {
      console.log('Admin not found by email, trying isAdmin flag');
      adminUser = await users.findOne({ isAdmin: true });
    }
    
    if (!adminUser) {
      console.error('Admin user not found in the database using any method.');
      return { success: false, message: 'Admin user not found' };
    }
    
    console.log('Found admin user:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email
    });
    
    console.log('Current admin password hash:', adminUser.password);
    console.log('Expected admin password hash:', EXPECTED_ADMIN_PASSWORD_HASH);
    
    if (adminUser.password === EXPECTED_ADMIN_PASSWORD_HASH) {
      console.log('Admin password hash is already correct.');
      return { 
        success: true, 
        message: 'Admin password hash is already correct',
        changed: false
      };
    }
    
    // Update the admin user's password using the _id field (most reliable)
    console.log(`Updating admin user with _id: ${adminUser._id}`);
    const updateResult = await users.updateOne(
      { _id: adminUser._id },
      { 
        $set: { 
          password: EXPECTED_ADMIN_PASSWORD_HASH,
          updatedAt: new Date()
        }
      }
    );
    
    if (updateResult.matchedCount === 0) {
      console.error('Failed to update admin password. User not found.');
      return { success: false, message: 'Failed to update admin password' };
    }
    
    if (updateResult.modifiedCount === 0) {
      console.error('Admin user found but password not updated.');
      return { success: false, message: 'Password not updated' };
    }
    
    console.log('✅ Admin password successfully updated!');
    
    return { 
      success: true, 
      message: 'Admin password successfully updated',
      changed: true,
      beforeHash: adminUser.password,
      afterHash: EXPECTED_ADMIN_PASSWORD_HASH,
      adminUser: { 
        id: adminUser.id, 
        email: adminUser.email,
        username: adminUser.username
      }
    };
  } catch (error: any) {
    console.error('Error fixing admin password:', error);
    return { 
      success: false, 
      message: `Error fixing admin password: ${error.message}`,
      error: error.message
    };
  }
}