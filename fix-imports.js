/**
 * Import Path Fixer Script
 * 
 * This script replaces all @/ imports with relative paths in the client/src directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to recursively walk through directories
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // Recurse into subdirectory
      results = results.concat(walk(filePath));
    } else {
      // Check if this is a .tsx or .jsx or .ts file
      if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

// Create relative path between source and target
function createRelativePath(sourcePath, targetPath) {
  // Get the directory containing the source file
  const sourceDir = path.dirname(sourcePath);
  
  // Create a relative path from the source directory to the target path
  let relativePath = path.relative(sourceDir, targetPath);
  
  // If the relative path doesn't start with a dot, add ./
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

// Fix all imports in files
function fixImports() {
  console.log('Starting import path fixes...');
  
  // Client source directory
  const clientSrcDir = path.join(__dirname, 'client', 'src');
  
  // Get all .tsx/.jsx/.ts files in client/src
  const tsxFiles = walk(clientSrcDir);
  
  console.log(`Found ${tsxFiles.length} files to process`);
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Process each file
  tsxFiles.forEach(filePath => {
    try {
      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if file contains imports with @/
      const importRegex = /from\s+['"]@\/([^'"]+)['"]/g;
      let match;
      let hasImports = false;
      let newContent = content;
      
      // Find all imports with @/
      while ((match = importRegex.exec(content)) !== null) {
        hasImports = true;
        const importPath = match[1];
        
        // Determine the target path
        const targetPath = path.join(clientSrcDir, importPath);
        
        // If the import path doesn't end with .ts, .tsx, or .jsx, try to resolve it
        let resolvedPath = targetPath;
        if (!importPath.endsWith('.ts') && !importPath.endsWith('.tsx') && !importPath.endsWith('.jsx')) {
          // Check if it's a directory with an index file
          if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
            if (fs.existsSync(path.join(targetPath, 'index.ts'))) {
              resolvedPath = path.join(targetPath, 'index.ts');
            } else if (fs.existsSync(path.join(targetPath, 'index.tsx'))) {
              resolvedPath = path.join(targetPath, 'index.tsx');
            } else if (fs.existsSync(path.join(targetPath, 'index.jsx'))) {
              resolvedPath = path.join(targetPath, 'index.jsx');
            }
          } else {
            // Try to resolve as a file
            if (fs.existsSync(`${targetPath}.ts`)) {
              resolvedPath = `${targetPath}.ts`;
            } else if (fs.existsSync(`${targetPath}.tsx`)) {
              resolvedPath = `${targetPath}.tsx`;
            } else if (fs.existsSync(`${targetPath}.jsx`)) {
              resolvedPath = `${targetPath}.jsx`;
            }
          }
        }
        
        // Create relative path
        const relativePath = createRelativePath(filePath, resolvedPath);
        
        // Replace all imports with this path
        const pathImportRegex = new RegExp(`from\\s+['"]@/${importPath}['"]`, 'g');
        
        // Remove extension for the import
        const importWithoutExt = relativePath.replace(/\.(ts|tsx|jsx)$/, '');
        
        newContent = newContent.replace(pathImportRegex, `from "${importWithoutExt}"`);
      }
      
      // If no changes needed, skip
      if (!hasImports) {
        skipped++;
        return;
      }
      
      // Write updated content back to file
      fs.writeFileSync(filePath, newContent);
      fixed++;
      console.log(`✅ Fixed imports in: ${path.relative(__dirname, filePath)}`);
    } catch (error) {
      console.error(`❌ Error processing ${path.relative(__dirname, filePath)}: ${error.message}`);
      errors++;
    }
  });
  
  // Print summary
  console.log('\nSummary:');
  console.log(`Total files processed: ${tsxFiles.length}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('Import path fix complete.');
}

// Run the function
fixImports();