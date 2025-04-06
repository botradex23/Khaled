/**
 * Direct Admin Test Server
 * 
 * This is a standalone Express server for testing admin user creation and verification.
 * It bypasses the Vite middleware completely.
 */

const express = require('express');
const { crypto } = require('crypto');
const { PgStorage } = require('./server/storage/postgres'); // Import your storage

// Initialize the app
const app = express();
app.use(express.json());

// Initialize the storage
const storage = new PgStorage();

// Helper function to mask sensitive values
function maskSecret(secret) {
  if (!secret) return '';
  if (secret.length <= 8) return '********';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

// Direct route to create a default admin
app.post('/direct-admin/create', async (req, res) => {
  try {
    // Generate a random password
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
    
    // Create the admin user
    const adminEmail = 'admin@example.com';
    
    // Check if admin already exists
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    
    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin user already exists',
        admin: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          isAdmin: existingAdmin.isAdmin,
          password: maskSecret(password) // Don't show actual password for existing admin
        }
      });
    }
    
    // Hash the password using SHA-256
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // Create the admin user in the database
    const admin = await storage.createUser({
      username: adminEmail,
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      isAdmin: true,
      defaultBroker: 'okx',
      useTestnet: true
    });
    
    res.json({
      success: true,
      message: 'Default admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        isAdmin: admin.isAdmin,
        password: password // Return the non-hashed password for testing purposes
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
});

// Direct route to check admin by email
app.get('/direct-admin/check', async (req, res) => {
  try {
    const email = req.query.email;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }
    
    console.log(`Direct admin check - looking up user with email: ${email}`);
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Mask sensitive data
    const maskedUser = {
      ...user,
      password: user.password ? `${user.password.substring(0, 10)}...` : null,
      binanceApiKey: user.binanceApiKey ? maskSecret(user.binanceApiKey) : null,
      binanceSecretKey: user.binanceSecretKey ? maskSecret(user.binanceSecretKey) : null,
      okxApiKey: user.okxApiKey ? maskSecret(user.okxApiKey) : null,
      okxSecretKey: user.okxSecretKey ? maskSecret(user.okxSecretKey) : null,
      okxPassphrase: user.okxPassphrase ? maskSecret(user.okxPassphrase) : null,
    };
    
    return res.json({
      success: true,
      user: maskedUser
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Start the server
async function startServer() {
  try {
    // Connect to the database
    await storage.connect();
    console.log('Connected to PostgreSQL database');
    
    // Start the server
    const port = 5001; // Different port than the main app
    app.listen(port, '0.0.0.0', () => {
      console.log(`Direct admin test server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start direct admin test server:', error);
    process.exit(1);
  }
}

// Run the server
startServer();