/**
 * Fix Paths Script
 * 
 * This script ensures that @/ imports can be resolved by creating necessary symlinks
 * in the client/src directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to create required symlinks
function createSymlinks() {
  console.log('Creating symlinks for path resolution...');
  
  const clientSrcDir = path.join(__dirname, 'client', 'src');
  const sharedDir = path.join(__dirname, 'shared');
  const componentsDir = path.join(__dirname, 'client', 'src', 'components');
  const libDir = path.join(__dirname, 'client', 'src', 'lib');
  const assetsDir = path.join(__dirname, 'attached_assets');
  
  // Create @shared symlink
  const sharedSymlinkPath = path.join(clientSrcDir, '@shared');
  try {
    // Remove existing symlink if it exists
    if (fs.existsSync(sharedSymlinkPath)) {
      fs.unlinkSync(sharedSymlinkPath);
    }
    
    // Create relative symlink
    const targetPath = path.relative(clientSrcDir, sharedDir);
    fs.symlinkSync(targetPath, sharedSymlinkPath, 'junction');
    console.log(`✅ Created symlink: ${sharedSymlinkPath} -> ${targetPath}`);
  } catch (error) {
    console.error(`❌ Failed to create symlink for shared directory: ${error.message}`);
  }
  
  // Create @components symlink
  const componentsSymlinkPath = path.join(clientSrcDir, '@components');
  try {
    // Remove existing symlink if it exists
    if (fs.existsSync(componentsSymlinkPath)) {
      fs.unlinkSync(componentsSymlinkPath);
    }
    
    // Create relative symlink
    const targetPath = path.relative(clientSrcDir, componentsDir);
    fs.symlinkSync(targetPath, componentsSymlinkPath, 'junction');
    console.log(`✅ Created symlink: ${componentsSymlinkPath} -> ${targetPath}`);
  } catch (error) {
    console.error(`❌ Failed to create symlink for components directory: ${error.message}`);
  }
  
  // Create @lib symlink
  const libSymlinkPath = path.join(clientSrcDir, '@lib');
  try {
    // Remove existing symlink if it exists
    if (fs.existsSync(libSymlinkPath)) {
      fs.unlinkSync(libSymlinkPath);
    }
    
    // Create relative symlink
    const targetPath = path.relative(clientSrcDir, libDir);
    fs.symlinkSync(targetPath, libSymlinkPath, 'junction');
    console.log(`✅ Created symlink: ${libSymlinkPath} -> ${targetPath}`);
  } catch (error) {
    console.error(`❌ Failed to create symlink for lib directory: ${error.message}`);
  }
  
  // Create @assets symlink
  const assetsSymlinkPath = path.join(clientSrcDir, '@assets');
  try {
    // Remove existing symlink if it exists
    if (fs.existsSync(assetsSymlinkPath)) {
      fs.unlinkSync(assetsSymlinkPath);
    }
    
    // Create relative symlink
    const targetPath = path.relative(clientSrcDir, assetsDir);
    fs.symlinkSync(targetPath, assetsSymlinkPath, 'junction');
    console.log(`✅ Created symlink: ${assetsSymlinkPath} -> ${targetPath}`);
  } catch (error) {
    console.error(`❌ Failed to create symlink for assets directory: ${error.message}`);
  }
  
  console.log('Symlink creation complete.');
}

// Run the symlink creation
createSymlinks();