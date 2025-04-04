/**
 * Update Admin User Password
 * 
 * This script directly updates the admin user's password in MongoDB
 * to match the expected password (Ameena123) for login.
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');

// Read environment variables from .env file manually
function loadEnv() {
  console.log('Reading .env file...');
  const envFile = fs.readFileSync('.env', 'utf8');
  const envVars = {};
  
  envFile.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;
    
    // Find the first equals sign
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      envVars[key] = value;
      console.log(`Found environment variable: ${key}`);
    }
  });
  
  return envVars;
}

// Hash password using SHA-256 (matches the application's hashing method)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Main function to update the admin password
async function updateAdminPassword() {
  const env = loadEnv();
  const uri = env.MONGO_URI;
  
  if (!uri) {
    console.error('🔴 MONGO_URI environment variable not found in .env file');
    return;
  }
  
  // Admin credentials
  const ADMIN_EMAIL = 'admin@example.com';
  const NEW_PASSWORD = 'Ameena123';
  
  console.log('🔄 Connecting to MongoDB...');
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('Saas');
    const users = db.collection('users');
    
    console.log(`🔍 Looking for admin user with email: ${ADMIN_EMAIL}`);
    
    const adminUser = await users.findOne({ email: ADMIN_EMAIL });
    
    if (adminUser) {
      console.log('✅ Found admin user:');
      console.log('--------------------------------------');
      console.log(`ID: ${adminUser._id}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`Username: ${adminUser.username}`);
      console.log(`Is Admin: ${adminUser.isAdmin}`);
      console.log(`Is Super Admin: ${adminUser.isSuperAdmin}`);
      console.log('--------------------------------------');
      
      // Hash the new password
      const hashedPassword = hashPassword(NEW_PASSWORD);
      console.log(`Hashed password: ${hashedPassword.substring(0, 10)}...`);
      
      // Update the password
      const updateResult = await users.updateOne(
        { email: ADMIN_EMAIL },
        { $set: { password: hashedPassword } }
      );
      
      if (updateResult.modifiedCount === 1) {
        console.log(`✅ Successfully updated password for ${ADMIN_EMAIL}`);
        console.log(`New login credentials:`);
        console.log(`- Email: ${ADMIN_EMAIL}`);
        console.log(`- Password: ${NEW_PASSWORD}`);
      } else {
        console.log(`⚠️ No changes made to password (might already be set)`);
      }
    } else {
      console.error('❌ Admin user not found!');
    }
    
    await client.close();
    console.log('✅ MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error.message);
  }
}

// Run the function
updateAdminPassword();