/**
 * Fix React Imports
 * 
 * This script adds 'import React from "react"' to all .tsx files that use JSX but don't already 
 * import React directly. It handles both the case where there is no React import and where there
 * is a destructured import like 'import { useState } from "react"'.
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
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

// Fix React imports in a file
function fixReactImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains JSX syntax (simplified check)
    const containsJSX = /<[A-Za-z][^>]*>/.test(content);
    
    if (!containsJSX) {
      return { status: 'skipped', reason: 'No JSX detected' };
    }
    
    // Check for existing React imports
    const hasDefaultReactImport = /import\s+React\b.*\s+from\s+['"]react['"]/.test(content);
    
    if (hasDefaultReactImport) {
      return { status: 'skipped', reason: 'Already imports React' };
    }
    
    // Check for destructured React import
    const hasDestructuredReactImport = /import\s+{[^}]*}\s+from\s+['"]react['"]/.test(content);
    
    let newContent;
    
    if (hasDestructuredReactImport) {
      // Replace destructured import with one that includes React default import
      newContent = content.replace(
        /(import\s+)({[^}]*})\s+(from\s+['"]react['"])/g,
        'import React, $2 $3'
      );
    } else {
      // Add React import at the top of the file
      newContent = 'import React from "react";\n' + content;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, newContent);
    
    return { status: 'fixed', type: hasDestructuredReactImport ? 'destructured' : 'added' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// Main function
function main() {
  console.log('Starting React import fix...');
  
  // Get all .tsx files in the client/src directory
  const clientSrcDir = path.join(__dirname, 'client', 'src');
  const tsxFiles = walk(clientSrcDir);
  
  console.log(`Found ${tsxFiles.length} .tsx/.jsx files to process`);
  
  // Stats counters
  let fixed = 0;
  let alreadyCorrect = 0;
  let skipped = 0;
  let errors = 0;
  
  // Process each file
  tsxFiles.forEach(filePath => {
    const result = fixReactImports(filePath);
    
    switch (result.status) {
      case 'fixed':
        console.log(`✅ Fixed: ${path.relative(__dirname, filePath)} (${result.type})`);
        fixed++;
        break;
      case 'skipped':
        if (result.reason === 'Already imports React') {
          alreadyCorrect++;
        } else {
          skipped++;
        }
        break;
      case 'error':
        console.error(`❌ Error processing ${path.relative(__dirname, filePath)}: ${result.error}`);
        errors++;
        break;
    }
  });
  
  // Print summary
  console.log('\nSummary:');
  console.log(`Total files processed: ${tsxFiles.length}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Skipped (no JSX): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('React import fix complete.');
}

// Run the main function
main();