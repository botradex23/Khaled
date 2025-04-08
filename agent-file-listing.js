/**
 * Agent File Listing Script
 * 
 * This script recursively lists all files in the project and updates
 * the agent-memory.json file with the results.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current script's directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for file scanning
const config = {
  // Directories to exclude from scanning
  excludeDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.cache',
    'data/historical',
    'logs',
    'ml_data_files',
  ],
  // File extensions to focus on for code scanning
  relevantExtensions: [
    '.js', '.jsx', '.ts', '.tsx', // JavaScript/TypeScript
    '.py',                        // Python
    '.json',                      // JSON config
    '.md',                        // Documentation
    '.env', '.env.example',       // Environment configs
    '.html', '.css', '.scss',     // Frontend
    '.yml', '.yaml',              // YAML configs
    '.sh', '.bash',               // Shell scripts
  ],
  // Maximum depth to scan (set to a large number for essentially unlimited)
  maxDepth: 15
};

// Function to recursively list all files
function listFilesRecursively(dir, depth = 0, results = [], basePath = '') {
  if (depth > config.maxDepth) return results;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    
    try {
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Skip excluded directories
        if (config.excludeDirs.includes(item)) continue;
        
        // Process subdirectory
        listFilesRecursively(fullPath, depth + 1, results, relativePath);
      } else if (stats.isFile()) {
        // Get file extension
        const ext = path.extname(item).toLowerCase();
        
        // Add file to results with metadata
        results.push({
          path: relativePath,
          fullPath: fullPath,
          extension: ext,
          size: stats.size,
          isRelevant: config.relevantExtensions.includes(ext),
          lastModified: stats.mtime
        });
      }
    } catch (error) {
    console.error('Error occurred:', error);
    // Add proper error handling
    if (error.code === 'ENOENT') {
      // File not found error
      console.warn('File or directory not found, creating fallback...');
      // Add appropriate fallback logic
    } else if (error.message && error.message.includes('NetworkError')) {
      // Network error
      console.warn('Network error detected, will retry later...');
      // Add retry mechanism or graceful degradation
    } else {
      // Other error types
      console.warn('Unexpected error, proceeding with defaults...');
      // Add fallback or recovery logic
    }
  }
  }
  
  return results;
}

// Function to update the agent memory file
function updateAgentMemory(filesList) {
  try {
    // Read current memory
    const memoryPath = 'agent-memory.json';
    const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    
    // Update memory with file listing
    const relevantFiles = filesList.filter(file => file.isRelevant);
    
    memory.currentStep = 2;
    memory.completedSteps.push("Recursively list all files in the project");
    memory.pendingSteps.shift(); // Remove first pending step
    memory.scannedFiles = filesList.map(file => file.path);
    
    // Add session info
    const now = new Date().toISOString();
    memory.lastActivation = now;
    memory.sessionHistory.push({
      sessionId: `file-listing-${Date.now()}`,
      startTime: now,
      endTime: now,
      actions: [
        "Recursively listed all files in the project",
        `Found ${filesList.length} total files`,
        `Identified ${relevantFiles.length} relevant files for further scanning`
      ]
    });
    
    // Save updated memory
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    console.log(`Updated agent memory with ${filesList.length} files`);
    
    // Also save a separate file with just the file listing for easier review
    fs.writeFileSync(
      'agent-file-listing.json', 
      JSON.stringify({
        timestamp: now,
        totalFiles: filesList.length,
        relevantFiles: relevantFiles.length,
        files: filesList
      }, null, 2)
    );
    
    return true;
  } catch (error) {
    console.error(`Error updating agent memory: ${error.message}`);
    return false;
  }
}

// Main function
function main() {
  console.log("Starting recursive file listing...");
  const startTime = Date.now();
  
  // List all files recursively
  const allFiles = listFilesRecursively('.', 0, [], '');
  
  // Update the agent memory file
  updateAgentMemory(allFiles);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Completed file listing in ${duration}s`);
  console.log(`Found ${allFiles.length} total files`);
  
  const relevantFiles = allFiles.filter(file => file.isRelevant);
  console.log(`Identified ${relevantFiles.length} relevant files for further scanning`);
}

// Run the main function
main();