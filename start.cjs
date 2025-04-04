/**
 * Universal Start Script with Fallbacks
 * 
 * This script attempts to start the application using different methods,
 * falling back if one fails to ensure robustness in the Replit environment.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Try to install TSX if not found
function installTsx() {
  try {
    log('Installing tsx package...');
    execSync('npm install --save-dev tsx', { stdio: 'inherit' });
    return true;
  } catch (err) {
    log(`Failed to install tsx: ${err.message}`);
    return false;
  }
}

// Try to find the tsx executable
function findTsxPath() {
  try {
    // Look for tsx in common locations
    const possiblePaths = [
      './node_modules/.bin/tsx',
      './node_modules/tsx/dist/cli.js',
      '/home/runner/.bun/bin/tsx',
      '/home/runner/.nvm/versions/node/v16.20.1/bin/tsx'
    ];
    
    for (const tsxPath of possiblePaths) {
      if (fs.existsSync(tsxPath)) {
        log(`Found tsx at ${tsxPath}`);
        return tsxPath;
      }
    }
    
    // Try to find it using which
    const tsxPathFromWhich = execSync('which tsx 2>/dev/null || echo ""').toString().trim();
    if (tsxPathFromWhich) {
      log(`Found tsx using which: ${tsxPathFromWhich}`);
      return tsxPathFromWhich;
    }
    
    // If we can't find tsx, try to install it
    if (installTsx()) {
      // Check for tsx again after installation
      for (const tsxPath of possiblePaths) {
        if (fs.existsSync(tsxPath)) {
          log(`Found tsx at ${tsxPath} after installation`);
          return tsxPath;
        }
      }
    }
    
    return null;
  } catch (err) {
    log(`Error finding tsx: ${err.message}`);
    return null;
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

// Find JavaScript files in the server directory
function findJsServerFiles() {
  try {
    const serverDir = path.join(process.cwd(), 'server');
    if (!fs.existsSync(serverDir)) {
      return [];
    }
    
    const files = fs.readdirSync(serverDir);
    return files.filter(file => file.endsWith('.js'));
  } catch (err) {
    log(`Error finding JS server files: ${err.message}`);
    return [];
  }
}

// Check for esbuild
function hasEsbuild() {
  try {
    execSync('which esbuild', { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}

// The main entry point file to run
const entryFile = 'server/index.ts';

// Try to bundle the TypeScript file to JS
function bundleWithEsbuild() {
  try {
    if (!hasEsbuild()) {
      log('esbuild not found, skipping bundle fallback');
      return false;
    }
    
    log('Trying to bundle with esbuild...');
    const bundleCommand = 'npx esbuild server/index.ts --bundle --platform=node --outfile=.temp-server-bundle.js';
    execSync(bundleCommand, { stdio: 'inherit' });
    
    if (fs.existsSync('.temp-server-bundle.js')) {
      return true;
    }
    return false;
  } catch (err) {
    log(`esbuild bundle failed: ${err.message}`);
    return false;
  }
}

// Main function to start the server with multiple fallbacks
async function startServer() {
  log('Starting server with fallbacks...');
  
  // Check if our TypeScript entry file exists
  if (!checkFileExists(entryFile)) {
    log(`Entry file ${entryFile} not found. Looking for alternatives...`);
    
    // Look for JS files in server directory
    const jsFiles = findJsServerFiles();
    if (jsFiles.length > 0) {
      log(`Found JS files in server directory: ${jsFiles.join(', ')}`);
      const mainJsFile = jsFiles.find(file => file === 'index.js') || jsFiles[0];
      log(`Using ${mainJsFile} as entry point`);
      return runCommand('node', [`server/${mainJsFile}`]);
    } else {
      log('No alternative entry files found. Aborting.');
      process.exit(1);
    }
  }
  
  // First try with tsx if available
  const tsxPath = findTsxPath();
  if (tsxPath) {
    log('Found tsx, using it to start the server...');
    return runCommand('node', [tsxPath, entryFile]);
  }
  
  // Fallback 1: Try using ts-node
  try {
    log('Trying ts-node as fallback...');
    return runCommand('npx', ['ts-node', entryFile]);
  } catch (err) {
    log(`ts-node fallback failed: ${err.message}`);
  }
  
  // Fallback 2: Try bundling with esbuild
  if (bundleWithEsbuild()) {
    log('Successfully bundled with esbuild, running the bundle...');
    return runCommand('node', ['.temp-server-bundle.js']);
  }
  
  // Fallback 3: Try compiling TypeScript and running the JS
  try {
    log('Trying tsc compile fallback...');
    execSync('npx tsc --outDir .temp-server', { stdio: 'inherit' });
    if (fs.existsSync('.temp-server/server/index.js')) {
      return runCommand('node', ['.temp-server/server/index.js']);
    }
  } catch (err) {
    log(`tsc compile fallback failed: ${err.message}`);
  }
  
  // Fallback 4: If we have a compiled JS version available, run that
  const jsEntryFile = entryFile.replace('.ts', '.js');
  if (checkFileExists(jsEntryFile)) {
    log('Using pre-compiled JS entry file...');
    return runCommand('node', [jsEntryFile]);
  }
  
  // Fallback 5: Try to start the Python server instead
  if (checkFileExists('run.py') || checkFileExists('python_app/app.py')) {
    log('Found Python server. Trying to start it...');
    return runCommand('python3', [checkFileExists('run.py') ? 'run.py' : 'python_app/app.py']);
  }
  
  // Fallback 6: Create a minimal server
  log('All methods failed. Creating a minimal express server...');
  
  const minimalServerCode = `
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 5000;
  
  app.use(express.json());
  app.use(express.static('public'));
  
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Server running in fallback mode' });
  });
  
  app.get('*', (req, res) => {
    res.send('Main server is starting... please wait or check logs for errors.');
  });
  
  app.listen(PORT, () => {
    console.log(\`Fallback server running on port \${PORT}\`);
  });
  `;
  
  fs.writeFileSync('minimal-server.js', minimalServerCode);
  return runCommand('node', ['minimal-server.js']);
}

// Kick off the server
startServer().catch(err => {
  log(`Failed to start server: ${err.message}`);
  process.exit(1);
});