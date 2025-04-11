/**
 * Production Deployment Configuration Utility
 * 
 * This script helps configure the application for production deployment
 * on a VPS server like Hetzner. It generates appropriate config files
 * and prepares the environment for production use.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

// Setup paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to get user input with a prompt
const prompt = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => resolve(answer));
});

// Helper for platform detection
const isPlatform = {
  replit: Boolean(process.env.REPL_ID || process.env.REPLIT_ID || process.env.REPLIT),
  production: process.env.NODE_ENV === 'production'
};

// Helper for path manipulation
const paths = {
  root: __dirname,
  env: path.join(__dirname, '.env'),
  envExample: path.join(__dirname, '.env.example')
};

// Main configuration function
async function configureForProduction() {
  console.log('=== Tradeliy Production Deployment Configuration ===\n');
  
  // 1. Check for existing configuration
  if (fs.existsSync(paths.env)) {
    console.log('ℹ️ Existing .env file found');
    const overwrite = await prompt('Do you want to update the existing configuration? (y/n): ');
    
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Configuration update skipped. Using existing .env file.');
      rl.close();
      return;
    }
  } else {
    // If no .env exists, copy from example
    if (fs.existsSync(paths.envExample)) {
      fs.copyFileSync(paths.envExample, paths.env);
      console.log('ℹ️ Created new .env file from .env.example');
    } else {
      console.log('⚠️ No .env.example found. Creating a new .env file.');
      fs.writeFileSync(paths.env, '# Tradeliy Environment Configuration\n');
    }
  }
  
  // 2. Configure server settings
  console.log('\n=== Server Configuration ===');
  const serverPort = await prompt('Enter server port (default: 5000): ') || '5000';
  const mlApiPort = await prompt('Enter ML API port (default: 5001): ') || '5001';
  const domain = await prompt('Enter your domain (e.g., app.tradeliy.com, leave empty if no domain yet): ');
  const useSSL = await prompt('Will you use SSL/HTTPS? (y/n, default: y): ');
  const isHttps = useSSL.toLowerCase() !== 'n';
  
  // 3. Configure database settings
  console.log('\n=== Database Configuration ===');
  const mongoUri = await prompt('Enter your MongoDB URI: ');
  
  // 4. Configure OAuth settings
  console.log('\n=== OAuth Configuration ===');
  const googleClientId = await prompt('Enter your Google OAuth Client ID (optional): ');
  const googleClientSecret = await prompt('Enter your Google OAuth Client Secret (optional): ');
  
  // 5. Build the environment configuration
  const envConfig = {
    // Server config
    PORT: serverPort,
    NODE_ENV: 'production',
    SESSION_SECRET: process.env.SESSION_SECRET || `tradeliy-session-${Math.random().toString(36).slice(2)}`,
    
    // Database config
    MONGO_URI: mongoUri,
    
    // API config
    PYTHON_API_URL: `http://localhost:${mlApiPort}`,
    
    // OAuth config
    GOOGLE_CLIENT_ID: googleClientId,
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    
    // Domain configuration
    DOMAIN: domain || `localhost:${serverPort}`,
    PUBLIC_URL: domain ? (isHttps ? `https://${domain}` : `http://${domain}`) : `http://localhost:${serverPort}`,
    
    // Other existing variables from current .env
    ...parseEnvFile(paths.env)
  };
  
  // 6. Write updated .env file
  const envContent = Object.entries(envConfig)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(paths.env, envContent);
  console.log('\n✅ Environment configuration updated successfully');
  
  // 7. Generate ecosystem.config.cjs file for pm2
  const ecosystemConfig = `
module.exports = {
  apps: [
    {
      name: 'tradeliy-server',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: ${serverPort}
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'tradeliy-ml-api',
      script: 'python_app/run_flask_service.py',
      interpreter: 'python3',
      env: {
        PORT: ${mlApiPort}
      },
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
`;
  
  fs.writeFileSync(path.join(__dirname, 'ecosystem.config.cjs'), ecosystemConfig);
  console.log('✅ PM2 ecosystem configuration created (ecosystem.config.cjs)');
  
  // 8. Add deployment instructions
  console.log('\n=== Deployment Instructions ===');
  console.log('1. Build the application: npm run build');
  console.log('2. Start the application with PM2: pm2 start ecosystem.config.cjs');
  console.log('3. Save the PM2 process list: pm2 save');
  console.log('4. Setup PM2 to start on boot: pm2 startup');
  console.log('\nThank you for configuring Tradeliy for production!');
  
  rl.close();
}

// Helper function to parse existing .env file
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      result[key] = value;
    }
  });
  
  return result;
}

// Run the configuration
configureForProduction().catch(err => {
  console.error('Error during configuration:', err);
  process.exit(1);
});