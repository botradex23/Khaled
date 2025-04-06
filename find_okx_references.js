import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extensions to check
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next'];

// Find all files with specified extensions
async function findFiles(dir, fileList = []) {
  const files = await fs.promises.readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.promises.stat(filePath);
    
    if (stats.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        fileList = await findFiles(filePath, fileList);
      }
    } else if (extensions.includes(path.extname(file))) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Check if a file contains OKX references
async function checkFileForOkxReferences(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    
    // Check for OKX/OKEX references (case insensitive)
    const okxRegex = /\b(okx|okex)\b/i;
    
    if (okxRegex.test(content)) {
      return { 
        filePath, 
        hasReference: true,
        lineNumbers: content.split('\n')
          .map((line, i) => okxRegex.test(line) ? i + 1 : null)
          .filter(Boolean)
      };
    }
    
    return { filePath, hasReference: false };
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return { filePath, hasReference: false, error: error.message };
  }
}

// Main function
async function findOkxReferences() {
  try {
    console.log('Finding files...');
    const files = await findFiles('.');
    console.log(`Found ${files.length} files to check.`);
    
    // Check each file for OKX references
    const results = [];
    for (const filePath of files) {
      const result = await checkFileForOkxReferences(filePath);
      if (result.hasReference) {
        results.push(result);
        console.log(`Found OKX references in ${filePath} at lines: ${result.lineNumbers.join(', ')}`);
      }
    }
    
    console.log('\n--- Summary ---');
    console.log(`Total files with OKX references: ${results.length}`);
    
    // Save results to a file
    const outputFile = 'okx_references_report.json';
    await fs.promises.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${outputFile}`);
    
    return results;
  } catch (error) {
    console.error('Error finding OKX references:', error);
  }
}

// Run the main function
findOkxReferences();
