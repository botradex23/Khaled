/**
 * Agent API Usage Scanner
 * 
 * This script scans all relevant files for Binance or API usage,
 * identifies potential issues, and updates the agent memory file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current script's directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for API scanning
const config = {
  // Keywords to look for in files
  apiKeywords: [
    'binance', 'api.binance.com', 'Binance API',
    'okx', 'okx.com', 'OKX API',
    'PROXY_IP', 'PROXY_PORT', 'PROXY_USERNAME', 'PROXY_PASSWORD',
    'axios.get', 'axios.post', 'fetch\\(', '\\.fetch\\(',
    'mongoose.connect', 'MongoClient',
    'OpenAI', 'OPENAI_API_KEY',
    'API_KEY', 'API_SECRET', 'SECRET_KEY',
    'Websocket', 'WebSocket', 'ws://', 'wss://'
  ],
  // Potential issue indicators
  issueIndicators: [
    { pattern: 'catch\\s*\\([^)]*\\)\\s*{\\s*}', description: 'Empty catch block' },
    { pattern: 'console\\.log\\(.*(?:password|apiKey|secret|key|token).*\\)', description: 'Logging sensitive information' },
    { pattern: 'setTimeout\\s*\\(\\s*[^,]+,\\s*\\d+\\s*\\)', description: 'Hardcoded timeout' },
    { pattern: '\\.then\\s*\\(.*\\)\\s*\\.catch\\s*\\(\\s*console\\.error\\s*\\)', description: 'Minimal error handling' },
    { pattern: 'new WebSocket\\([^)]*\\)', description: 'WebSocket connection' },
    { pattern: '(?:password|apiKey|secret|key|token)\\s*:\\s*["\'][^"\']+["\']', description: 'Hardcoded credentials' },
    { pattern: 'catch\\s*\\([^)]*\\)\\s*{[^}]*console\\.error', description: 'Only logging errors without handling' },
    { pattern: 'try\\s*{[^}]*}\\s*catch\\s*\\([^)]*\\)\\s*{[^}]*throw', description: 'Rethrowing errors without processing' },
    { pattern: 'if\\s*\\([^)]*process\\.env\\.[^)]*\\s*===\\s*undefined\\s*\\)', description: 'Environment variable checking without fallback' },
    { pattern: '\\.env\\.BINANCE_API_KEY', description: 'Direct Binance API key reference' },
    { pattern: '\\.env\\.OKX_API_KEY', description: 'Direct OKX API key reference' },
    { pattern: 'status code 451', description: 'Binance geo-restriction error' },
    { pattern: 'Service unavailable from a restricted location', description: 'Binance geo-restriction error message' },
    { pattern: 'Eligibility', description: 'Binance eligibility constraint reference' }
  ],
  // File extensions to focus on for code scanning
  relevantExtensions: [
    '.js', '.jsx', '.ts', '.tsx', // JavaScript/TypeScript
    '.py',                        // Python
    '.json',                      // JSON config
    '.env', '.env.example',       // Environment configs
  ],
  // Directories to skip
  skipDirectories: [
    '.git', '.local', '.config', '.cache', '.pythonlibs', 
    'node_modules', 'public/fonts', 'public/vendor',
    'client/dist', 'client/build', 'attached_assets'
  ],
  // Maximum file size to scan (in bytes)
  maxFileSize: 1024 * 1024, // 1MB
  // Maximum number of files to process at once to avoid memory issues
  batchSize: 100,
  // Maximum number of total files to scan
  maxFilesToScan: 2000
};

// Function to load the file listing
function loadFileListing() {
  try {
    const listingData = fs.readFileSync('agent-file-listing.json', 'utf8');
    return JSON.parse(listingData);
  } catch (error) {
    console.error(`Error loading file listing: ${error.message}`);
    return { files: [] };
  }
}

// Function to check if a file contains API keywords
function checkFileForApiUsage(filePath, content) {
  const findings = [];
  
  // Check for each keyword
  for (const keyword of config.apiKeywords) {
    const regex = new RegExp(keyword, 'i');
    if (regex.test(content)) {
      findings.push({
        keyword,
        count: (content.match(new RegExp(keyword, 'gi')) || []).length
      });
    }
  }
  
  return findings.length > 0 ? findings : null;
}

// Function to check for potential issues
function checkForIssues(filePath, content) {
  const issues = [];
  
  // Check for each issue pattern
  for (const indicator of config.issueIndicators) {
    try {
      const regex = new RegExp(indicator.pattern, 'gi');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0) {
        issues.push({
          type: indicator.description,
          count: matches.length,
          pattern: indicator.pattern
        });
      }
    } catch (error) {
      console.error(`Error with regex pattern "${indicator.pattern}": ${error.message}`);
    }
  }
  
  return issues.length > 0 ? issues : null;
}

// Function to process a batch of files
async function processBatch(files, startIndex, batchSize) {
  const results = [];
  const endIndex = Math.min(startIndex + batchSize, files.length);
  
  console.log(`Processing batch ${startIndex} to ${endIndex} of ${files.length} files...`);
  
  for (let i = startIndex; i < endIndex; i++) {
    const file = files[i];
    
    // Skip non-relevant file extensions
    if (!config.relevantExtensions.includes(file.extension)) {
      continue;
    }
    
    // Skip files that are too large
    if (file.size > config.maxFileSize) {
      console.log(`Skipping large file: ${file.path} (${file.size} bytes)`);
      continue;
    }
    
    try {
      // Read file content
      const content = fs.readFileSync(file.fullPath, 'utf8');
      
      // Check for API usage
      const apiUsage = checkFileForApiUsage(file.path, content);
      
      // Check for potential issues
      const issues = checkForIssues(file.path, content);
      
      // If we found API usage or issues, add to results
      if (apiUsage || issues) {
        results.push({
          path: file.path,
          extension: file.extension,
          size: file.size,
          lastModified: file.lastModified,
          apiUsage,
          issues
        });
      }
    } catch (error) {
      console.error(`Error processing file ${file.path}: ${error.message}`);
    }
  }
  
  return results;
}

// Function to update the agent memory file
function updateAgentMemory(scanResults) {
  try {
    // Read current memory
    const memoryPath = 'agent-memory.json';
    const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    
    // Update memory with scan results
    memory.currentStep = 3;
    memory.completedSteps.push("Scan all relevant text/code files for Binance or API usage");
    memory.pendingSteps.shift(); // Remove first pending step
    
    // Group and categorize the findings
    const apiUsageByType = {};
    const issuesByType = {};
    
    // Extract and organize issues
    scanResults.forEach(result => {
      if (result.apiUsage) {
        result.apiUsage.forEach(usage => {
          if (!apiUsageByType[usage.keyword]) {
            apiUsageByType[usage.keyword] = {
              files: [],
              totalOccurrences: 0
            };
          }
          apiUsageByType[usage.keyword].files.push(result.path);
          apiUsageByType[usage.keyword].totalOccurrences += usage.count;
        });
      }
      
      if (result.issues) {
        result.issues.forEach(issue => {
          if (!issuesByType[issue.type]) {
            issuesByType[issue.type] = {
              files: [],
              totalOccurrences: 0
            };
          }
          issuesByType[issue.type].files.push(result.path);
          issuesByType[issue.type].totalOccurrences += issue.count;
        });
      }
    });
    
    // Add the organized data to memory
    memory.apiUsage = apiUsageByType;
    memory.foundIssues = issuesByType;
    
    // Add session info
    const now = new Date().toISOString();
    memory.lastActivation = now;
    
    // Initialize sessionHistory if it doesn't exist
    if (!memory.sessionHistory) {
      memory.sessionHistory = [];
    }
    
    memory.sessionHistory.push({
      sessionId: `api-scan-${Date.now()}`,
      startTime: now,
      endTime: now,
      actions: [
        "Scanned relevant files for API usage and potential issues",
        `Found API usage in ${scanResults.length} files`,
        `Identified ${Object.keys(issuesByType).length} types of potential issues`
      ]
    });
    
    // Save updated memory
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    console.log(`Updated agent memory with API scan results`);
    
    // Also save a separate file with detailed scan results for easier review
    fs.writeFileSync(
      'agent-api-scan-results.json', 
      JSON.stringify({
        timestamp: now,
        totalFilesScanned: scanResults.length,
        apiUsageByType,
        issuesByType,
        detailedResults: scanResults
      }, null, 2)
    );
    
    return true;
  } catch (error) {
    console.error(`Error updating agent memory: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log("Starting API usage and issues scan...");
  const startTime = Date.now();
  
  // Load the file listing
  const fileListing = loadFileListing();
  
  // Filter files based on extension and directories
  const relevantFiles = fileListing.files.filter(file => {
    // Check if file has relevant extension
    if (!config.relevantExtensions.includes(file.extension)) {
      return false;
    }
    
    // Check if file is in a directory that should be skipped
    for (const skipDir of config.skipDirectories) {
      if (file.path.startsWith(skipDir + '/') || file.path === skipDir) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort files by modification date (newest first) and limit to maxFilesToScan
  const sortedFiles = relevantFiles
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    .slice(0, config.maxFilesToScan);
  
  console.log(`Found ${relevantFiles.length} relevant files, scanning the ${sortedFiles.length} most recently modified ones`);
  
  // Process files in batches
  const allResults = [];
  for (let i = 0; i < sortedFiles.length; i += config.batchSize) {
    const batchResults = await processBatch(sortedFiles, i, config.batchSize);
    allResults.push(...batchResults);
    
    // Progress update
    const progress = Math.min(100, Math.round((i + config.batchSize) / sortedFiles.length * 100));
    console.log(`Progress: ${progress}% (${i + config.batchSize}/${sortedFiles.length})`);
  }
  
  // Update the agent memory file
  updateAgentMemory(allResults);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Completed API usage and issues scan in ${duration}s`);
  console.log(`Found API usage or issues in ${allResults.length} files`);
}

// Run the main function
main();