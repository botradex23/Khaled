/**
 * Direct MongoDB Check for Admin User
 * 
 * This script directly checks the MongoDB User collection
 * to verify the admin user exists and has super admin privileges.
 */

const { MongoClient } = require('mongodb');
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

// Main function to check admin user
async function checkAdminUser() {
  const env = loadEnv();
  const uri = env.MONGO_URI;
  
  if (!uri) {
    console.error('🔴 MONGO_URI environment variable not found in .env file');
    return;
  }
  
  console.log('🔄 Connecting to MongoDB...');
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('Saas');
    const users = db.collection('users');
    
    console.log('🔍 Looking for admin user with email: admin@example.com');
    
    const adminUser = await users.findOne({ email: 'admin@example.com' });
    
    if (adminUser) {
      console.log('✅ Found admin user:');
      console.log('--------------------------------------');
      console.log(`ID: ${adminUser._id}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`Username: ${adminUser.username}`);
      console.log(`Is Admin: ${adminUser.isAdmin}`);
      console.log(`Is Super Admin: ${adminUser.isSuperAdmin}`);
      console.log('--------------------------------------');
      
      if (adminUser.isSuperAdmin) {
        console.log('✅ Super admin privileges are ACTIVE');
      } else {
        console.log('⚠️ User is admin but does NOT have super admin privileges');
      }
    } else {
      console.error('❌ Admin user not found!');
    }
    
    await client.close();
    console.log('✅ MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
  }
}

// Run the function
checkAdminUser();