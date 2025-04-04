// Universal Start Script with Fallbacks (ES Module version)

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 5000; // Primary port for the application
const DEBUG = true; // Set to true for verbose logging

// Helper for logging
function log(message) {
  console.log(`[StartScript] ${message}`);
}

function runCommand(command, args = [], options = {}) {
  const defaultOptions = { stdio: 'inherit', shell: true };
  const fullOptions = { ...defaultOptions, ...options };
  
  log(`Running command: ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, fullOptions);
  
  child.on('error', (err) => {
    log(`Error executing ${command}: ${err.message}`);
  });
  
  return child;
}

// Check if a package is installed
function isPackageInstalled(packageName) {
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    return (
      (packageJson.dependencies && packageJson.dependencies[packageName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[packageName])
    );
  } catch (err) {
    log(`Error checking if package is installed: ${err.message}`);
    return false;
  }
}

// Try to install a package
function installPackage(packageName, isDev = true) {
  try {
    log(`Installing ${packageName}...`);
    const devFlag = isDev ? '--save-dev' : '--save';
    execSync(`npm install ${devFlag} ${packageName}`, { stdio: 'inherit' });
    return true;
  } catch (err) {
    log(`Failed to install ${packageName}: ${err.message}`);
    return false;
  }
}

// Install required packages if they're not already installed
function ensurePackagesInstalled() {
  const requiredPackages = [
    { name: 'tsx', dev: true },
    { name: 'typescript', dev: true },
    { name: 'esbuild', dev: true },
    { name: 'express', dev: false }
  ];
  
  for (const pkg of requiredPackages) {
    if (!isPackageInstalled(pkg.name)) {
      log(`${pkg.name} not found, attempting to install...`);
      installPackage(pkg.name, pkg.dev);
    }
  }
}

// Check if a file exists
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    log(`Error checking if file exists: ${err.message}`);
    return false;
  }
}

// Find a local executable
function findLocalExecutable(name) {
  try {
    const possiblePaths = [
      path.join(__dirname, 'node_modules', '.bin', name),
      path.join(__dirname, 'node_modules', name, 'dist', 'cli.js')
    ];
    
    for (const binPath of possiblePaths) {
      if (fs.existsSync(binPath)) {
        log(`Found ${name} at ${binPath}`);
        return binPath;
      }
    }
    
    return null;
  } catch (err) {
    log(`Error finding ${name}: ${err.message}`);
    return null;
  }
}

// The main entry point file to run
const entryFile = 'server/index.ts';

// Main function to start the server
async function startServer() {
  log('Starting server...');
  
  // Ensure required packages are installed
  ensurePackagesInstalled();
  
  // Check if our TypeScript entry file exists
  if (!checkFileExists(entryFile)) {
    log(`Entry file ${entryFile} not found. Looking for alternatives...`);
    
    // Try finding a JavaScript version
    const jsEntryFile = entryFile.replace('.ts', '.js');
    if (checkFileExists(jsEntryFile)) {
      log(`Found JavaScript version: ${jsEntryFile}. Using that instead.`);
      return runCommand('node', [jsEntryFile]);
    }
    
    log('No server entry files found. Trying Python fallback...');
    
    // Try Python fallback
    if (checkFileExists('run.py')) {
      log('Found run.py. Starting Python server...');
      return runCommand('python3', ['run.py']);
    }
    
    if (checkFileExists('python_app/app.py')) {
      log('Found python_app/app.py. Starting Python server...');
      return runCommand('python3', ['python_app/app.py']);
    }
    
    log('No server entry files found. Aborting.');
    process.exit(1);
  }
  
  // Try to find tsx
  const tsxPath = findLocalExecutable('tsx');
  if (tsxPath) {
    log('Found tsx. Starting server with tsx...');
    return runCommand('node', [tsxPath, entryFile]);
  }
  
  // Try using npx tsx as fallback
  log('tsx not found locally. Trying npx tsx...');
  return runCommand('npx', ['tsx', entryFile]);
}

// Main execution
try {
  await startServer();
} catch (err) {
  log(`Failed to start server: ${err.message}`);
  process.exit(1);
}