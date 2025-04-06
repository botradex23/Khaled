/**
 * Custom script to run the server with the correct Node.js path
 * and environment variables loaded
 */

import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Starting server with custom Node.js path...');
console.log('Loading environment variables...');

// Set the PATH environment variable to include the correct Node.js path
process.env.PATH = '/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin:' + process.env.PATH;

// Verify MongoDB URI is available
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  console.log('MongoDB URI not found in environment. Reading from .env file directly...');
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const mongoUriMatch = envContent.match(/MONGO_URI=(.+)/);
    if (mongoUriMatch && mongoUriMatch[1]) {
      process.env.MONGO_URI = mongoUriMatch[1].trim();
      console.log('Successfully loaded MONGO_URI from .env file');
    } else {
      console.error('Could not find MONGO_URI in .env file');
    }
  } catch (err) {
    console.error('Error reading .env file:', err);
  }
}

// Verify DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL not found in environment. Reading from .env file directly...');
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const databaseUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
    if (databaseUrlMatch && databaseUrlMatch[1]) {
      process.env.DATABASE_URL = databaseUrlMatch[1].trim();
      console.log('Successfully loaded DATABASE_URL from .env file');
    } else {
      console.error('Could not find DATABASE_URL in .env file');
    }
  } catch (err) {
    console.error('Error reading .env file:', err);
  }
}

// Try to construct DATABASE_URL from PostgreSQL environment variables if not available
if (!process.env.DATABASE_URL && process.env.PGHOST && process.env.PGPORT && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  process.env.DATABASE_URL = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  console.log('Constructed DATABASE_URL from PostgreSQL environment variables');
}

// Log environment variables (without showing secret values)
console.log('Environment variables available:');
const envKeys = Object.keys(process.env).sort();
console.log(envKeys.join(', '));

// Run the dev command which is "tsx server/index.ts"
const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});