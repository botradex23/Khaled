#!/usr/bin/env node

/**
 * This script updates the package.json file to use our minimal server approach
 * instead of tsx which is failing to install properly
 */

const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');

// Read current package.json
console.log(`Reading package.json from ${packageJsonPath}`);
let packageJson;
try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
  console.log('Successfully read package.json');
} catch (err) {
  console.error('Error reading package.json:', err);
  process.exit(1);
}

// Update the dev script to use our new approach
console.log('Updating package.json scripts...');
const originalDev = packageJson.scripts.dev;
packageJson.scripts.dev = 'node dev.cjs';
console.log(`Changed dev script from '${originalDev}' to 'node dev.cjs'`);

// Write updated package.json
try {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Successfully updated package.json');
} catch (err) {
  console.error('Error writing package.json:', err);
  process.exit(1);
}

console.log('Package.json update complete');