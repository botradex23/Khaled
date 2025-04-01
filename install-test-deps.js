/**
 * Install dependencies for the test script
 */

const { execSync } = require('child_process');

console.log('Installing node-fetch for testing...');
execSync('npm install --save-dev node-fetch@2', { stdio: 'inherit' });
console.log('Dependencies installed successfully!');