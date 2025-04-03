// Simple script to run the server directly with Node.js
// This avoids the need for tsx using ES modules

import { execSync } from 'child_process';

try {
  console.log('Compiling TypeScript...');
  execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
  
  console.log('Starting server...');
  execSync('node dist/server/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}