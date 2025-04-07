/**
 * Import Path Fixer Script
 * 
 * This script replaces all @/ imports with relative paths in the client/src directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The root directory of the client source files
const ROOT_DIR = path.join(__dirname, 'client', 'src');

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
function fixImports() {
  // Get all TypeScript and TSX files
  const files = walk(ROOT_DIR);
  
  // Create a filemap to resolve import paths later
  const fileMap = new Map();
  
  // Build a map of all files with their paths relative to ROOT_DIR
  files.forEach(filePath => {
    const relativePath = path.relative(ROOT_DIR, filePath);
    // Create entries without extensions for easier lookup
    const key = relativePath.replace(/\.(ts|tsx)$/, '');
    fileMap.set(key, filePath);
  });
  
  let totalChanges = 0;
  
  // Process each file
  files.forEach(file => {
    // Read file content
    let content = fs.readFileSync(file, 'utf8');
    
    // Keep track if we're making changes to this file
    let changed = false;
    
    // Replace imports that use @/ with relative paths
    const newContent = content.replace(/import\s+(.+?)\s+from\s+['"]@\/(.+?)['"]/g, (match, importSpecifier, importPath) => {
      // Remove file extensions from the import path if present
      const importPathWithoutExt = importPath.replace(/\.(ts|tsx)$/, '');
      
      // Try to find the target file in our map
      let targetFile = fileMap.get(importPathWithoutExt);
      
      // If not found directly, try some common conventions
      if (!targetFile) {
        // Try with .tsx extension
        const tsxVariant = importPathWithoutExt + '.tsx';
        targetFile = fileMap.get(tsxVariant);
        
        // If still not found, try with .ts extension
        if (!targetFile) {
          const tsVariant = importPathWithoutExt + '.ts';
          targetFile = fileMap.get(tsVariant);
          
          // Last resort: try with /index.tsx
          if (!targetFile) {
            const indexVariant = importPathWithoutExt + '/index.tsx';
            targetFile = fileMap.get(indexVariant);
            
            // One more try: /index.ts
            if (!targetFile) {
              const indexTsVariant = importPathWithoutExt + '/index.ts';
              targetFile = fileMap.get(indexTsVariant);
            }
          }
        }
      }
      
      if (targetFile) {
        changed = true;
        totalChanges++;
        
        // Create relative path from source file to target file
        const relativePath = createRelativePath(file, targetFile);
        
        return `import ${importSpecifier} from "${relativePath}"`;
      } else {
        console.log(`Could not resolve path: @/${importPath} in file ${file}`);
        return match; // Keep the original if we can't resolve
      }
    });
    
    // Save the file if changes were made
    if (changed) {
      console.log(`Updated imports in ${file}`);
      fs.writeFileSync(file, newContent, 'utf8');
    }
  });
  
  console.log(`Import paths fixed successfully! Made ${totalChanges} changes.`);
}

// Run the fixer
fixImports();