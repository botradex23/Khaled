/**
 * UI Component Import Path Fixer Script
 * 
 * This script specifically fixes imports for UI components that reference @/components/ui
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The root directory of the client source files
const ROOT_DIR = path.join(__dirname, 'client', 'src');
const UI_COMPONENTS_DIR = path.join(ROOT_DIR, 'components', 'ui');

// Function to walk through directories recursively
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Recursive case: it's a directory
      results = results.concat(walk(filePath));
    } else {
      // Base case: it's a file
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Function to create relative path from a source file to a target path
function createRelativePath(sourcePath, targetPath) {
  // Get the directory of the source file
  const sourceDir = path.dirname(sourcePath);
  
  // Calculate relative path from source to target
  let relativePath = path.relative(sourceDir, targetPath);
  
  // Ensure it starts with "./"
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

// Main function to fix imports
function fixUIImports() {
  // Get all TypeScript and TSX files
  const files = walk(ROOT_DIR);
  
  // Get a list of all UI component files
  const uiComponentFiles = fs.readdirSync(UI_COMPONENTS_DIR).filter(
    file => file.endsWith('.tsx') || file.endsWith('.ts')
  );
  
  // Create a mapping of component name to file path
  const uiComponentMap = {};
  for (const file of uiComponentFiles) {
    const name = file.replace(/\.(ts|tsx)$/, '');
    uiComponentMap[name] = path.join(UI_COMPONENTS_DIR, file);
  }
  
  let totalChanges = 0;
  
  // Process each file
  for (const file of files) {
    // Read file content
    let content = fs.readFileSync(file, 'utf8');
    
    // Keep track if we're making changes to this file
    let changed = false;
    
    // Replace imports that use @/components/ui with relative paths
    const newContent = content.replace(/from\s+["']@\/components\/ui\/([^"']+)["']/g, (match, componentName) => {
      const targetComponentPath = uiComponentMap[componentName];
      
      if (targetComponentPath) {
        changed = true;
        totalChanges++;
        
        // Create relative path from source file to UI component
        const relativePath = createRelativePath(file, targetComponentPath);
        
        return `from "${relativePath}"`;
      } else {
        console.log(`Could not resolve UI component: ${componentName} in file ${file}`);
        return match; // Keep the original if we can't resolve
      }
    });
    
    // Fix more generalized @/ imports for hooks and other parts of the codebase
    const evenNewerContent = newContent.replace(/from\s+["']@\/([^"']+)["']/g, (match, importPath) => {
      // Only process if it wasn't already processed as a UI component
      if (match.includes('@/components/ui/')) {
        return match;
      }
      
      // Build the target path
      const targetPath = path.join(ROOT_DIR, importPath);
      
      // Try different variations (with extensions, with /index, etc.)
      const possiblePaths = [
        targetPath + '.tsx',
        targetPath + '.ts',
        path.join(targetPath, 'index.tsx'),
        path.join(targetPath, 'index.ts')
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          changed = true;
          totalChanges++;
          
          // Create relative path 
          const relativePath = createRelativePath(file, possiblePath);
          
          return `from "${relativePath}"`;
        }
      }
      
      console.log(`Could not resolve path: @/${importPath} in file ${file}`);
      return match; // Keep the original if we can't resolve
    });
    
    // Save the file if changes were made
    if (changed) {
      console.log(`Updated imports in ${file}`);
      fs.writeFileSync(file, evenNewerContent, 'utf8');
    }
  }
  
  console.log(`UI import paths fixed successfully! Made ${totalChanges} changes.`);
}

// Run the fixer
fixUIImports();