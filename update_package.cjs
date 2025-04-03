#!/usr/bin/env node

// Script to update package.json with a minimal script
const fs = require('fs');
const path = require('path');

// Path to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');

try {
  // Read the current package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add the minimal script if it doesn't exist
  if (!packageJson.scripts.minimal) {
    packageJson.scripts.minimal = 'node npm-run-minimal.js';
    console.log('Added "minimal" script to package.json');
  } else {
    console.log('"minimal" script already exists in package.json');
  }
  
  // Write the updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Successfully updated package.json');
} catch (error) {
  console.error('Error updating package.json:', error);
  process.exit(1);
}