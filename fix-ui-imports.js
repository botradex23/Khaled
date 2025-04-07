/**
 * UI Component Import Path Fixer Script
 * 
 * This script specifically fixes imports for UI components that reference @/components/ui
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
      // Check if this is a .tsx or .jsx file
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

// Fix UI imports in files
function fixUIImports() {
  console.log('Starting UI import path fixes...');
  
  // Client source directory and UI components directory
  const clientSrcDir = path.join(__dirname, 'client', 'src');
  const uiComponentsDir = path.join(clientSrcDir, 'components', 'ui');
  
  // Get all .tsx/.jsx/.ts files in client/src
  const tsxFiles = walk(clientSrcDir);
  
  console.log(`Found ${tsxFiles.length} files to process`);
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Process each file
  tsxFiles.forEach(filePath => {
    try {
      // Skip files in the components/ui directory itself
      if (filePath.includes(path.join('components', 'ui'))) {
        skipped++;
        return;
      }
      
      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if file contains imports from @/components/ui
      const importRegex = /from\s+['"]@\/components\/ui\/([^'"]+)['"]/g;
      let match;
      let hasUIImports = false;
      let newContent = content;
      
      // Create a set to track component names that have been replaced
      const replacedComponents = new Set();
      
      // Find all UI component imports
      while ((match = importRegex.exec(content)) !== null) {
        hasUIImports = true;
        const componentName = match[1];
        
        // Skip if we've already replaced this component in this file
        if (replacedComponents.has(componentName)) {
          continue;
        }
        
        // Target component path
        const componentPath = path.join(uiComponentsDir, `${componentName}.tsx`);
        
        // Create relative path
        const relativePath = createRelativePath(filePath, componentPath);
        
        // Replace all imports of this component
        const componentImportRegex = new RegExp(`from\\s+['"]@/components/ui/${componentName}['"]`, 'g');
        newContent = newContent.replace(componentImportRegex, `from "${relativePath.replace(/\.tsx$/, '')}"`);
        
        // Mark as replaced
        replacedComponents.add(componentName);
      }
      
      // If no changes needed, skip
      if (!hasUIImports) {
        skipped++;
        return;
      }
      
      // Write updated content back to file
      fs.writeFileSync(filePath, newContent);
      fixed++;
      console.log(`✅ Fixed UI imports in: ${path.relative(__dirname, filePath)}`);
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
  console.log('UI import path fix complete.');
}

// Run the function
fixUIImports();