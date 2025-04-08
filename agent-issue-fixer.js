/**
 * Agent Issue Fixer
 * 
 * This script analyzes the issues found in agent-api-scan-results.json
 * and attempts to fix the most critical issues automatically.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current script's directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for issue fixing
const config = {
  // Prioritize issues by severity
  issuePriority: [
    "Hardcoded credentials",            // High risk: security issue
    "Logging sensitive information",     // High risk: security issue
    "Empty catch block",                 // Medium risk: error silencing
    "Only logging errors without handling", // Medium risk: insufficient error handling
    "Minimal error handling",            // Medium risk: insufficient error handling
    "WebSocket connection",              // Medium risk: possible connection issues
    "Hardcoded timeout",                 // Low risk: inefficient code
    "Rethrowing errors without processing", // Low risk: error handling issue
    "Environment variable checking without fallback" // Low risk: potential runtime errors
  ],
  
  // Maximum number of files to fix per issue type
  maxFilesPerIssue: 5,
  
  // Skip directories for fixing
  skipDirectories: [
    'node_modules', '.git', 'dist', 'build',
    'client/dist', 'client/build',
    'public/vendor', '.cache', '.local',
    '.config', '.pythonlibs'
  ],
  
  // Fix strategies for different issue types
  fixStrategies: {
    "Hardcoded credentials": {
      // Look for pattern: apiKey: "abcd1234", token: "xyz", etc.
      pattern: /(?:password|apiKey|secret|key|token)\s*:\s*["']([^"']+)["']/g,
      // Replace with environment variable reference
      replacement: (match, value, key) => {
        const varName = match.split(':')[0].trim().toUpperCase();
        return `${match.split(':')[0]}: process.env.${varName} || ""`;
      }
    },
    "Empty catch block": {
      // Look for pattern: catch(err) {}
      pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
      // Replace with error logging
      replacement: (match) => {
        const param = match.match(/catch\s*\(([^)]*)\)/) ? 
          match.match(/catch\s*\(([^)]*)\)/)[1] : 
          'error';
        return `catch(${param}) { console.error("Error occurred:", ${param}); }`;
      }
    },
    "Only logging errors without handling": {
      // This is more complex and requires reviewing the file context
      // Just mark for manual review for now
      pattern: null,
      replacement: null,
      manualReview: true
    }
  }
};

/**
 * Load and parse the API scan results
 * @returns {Object} The parsed scan results
 */
function loadScanResults() {
  try {
    const resultsPath = path.join(__dirname, 'agent-api-scan-results.json');
    const data = fs.readFileSync(resultsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading scan results: ${error.message}`);
    return null;
  }
}

/**
 * Check if a file should be skipped based on path
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file should be skipped
 */
function shouldSkipFile(filePath) {
  for (const dir of config.skipDirectories) {
    if (filePath.startsWith(dir) || filePath.includes(`/${dir}/`)) {
      return true;
    }
  }
  
  // Skip library/vendor files
  if (filePath.includes('/vendor/') || 
      filePath.includes('/lib/') || 
      filePath.endsWith('.min.js')) {
    return true;
  }
  
  return false;
}

/**
 * Attempt to fix issues in a file using the appropriate strategy
 * @param {string} filePath - Path to the file
 * @param {string} issueType - Type of issue to fix
 * @returns {Object} Results of the fix attempt
 */
function fixIssuesInFile(filePath, issueType) {
  if (shouldSkipFile(filePath)) {
    return { 
      file: filePath, 
      status: 'skipped', 
      reason: 'File in skipped directory' 
    };
  }
  
  const strategy = config.fixStrategies[issueType];
  if (!strategy) {
    return { 
      file: filePath, 
      status: 'skipped', 
      reason: 'No fix strategy available' 
    };
  }
  
  if (strategy.manualReview) {
    return { 
      file: filePath, 
      status: 'flagged', 
      reason: 'Needs manual review' 
    };
  }
  
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!strategy.pattern.test(content)) {
      return { 
        file: filePath, 
        status: 'skipped', 
        reason: 'No matching patterns found' 
      };
    }
    
    // Apply fix strategy
    const modifiedContent = content.replace(strategy.pattern, strategy.replacement);
    
    if (content === modifiedContent) {
      return { 
        file: filePath, 
        status: 'unchanged', 
        reason: 'No changes made' 
      };
    }
    
    // Write fixed content back to file
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    
    return { 
      file: filePath, 
      status: 'fixed', 
      reason: `Fixed ${issueType}` 
    };
  } catch (error) {
    return { 
      file: filePath, 
      status: 'error', 
      reason: error.message 
    };
  }
}

/**
 * Process all issues and attempt to fix them
 * @param {Object} scanResults - The API scan results
 * @returns {Object} Results of the fix attempts
 */
function processIssues(scanResults) {
  const results = {
    fixAttempts: 0,
    successfulFixes: 0,
    skippedFiles: 0,
    errorFiles: 0,
    flaggedForReview: 0,
    issueResults: {}
  };
  
  // Go through prioritized issue types
  for (const issueType of config.issuePriority) {
    const filesWithIssue = scanResults.issuesByType[issueType]?.files || [];
    
    if (filesWithIssue.length === 0) {
      continue;
    }
    
    // Limit number of files to fix per issue type
    const filesToFix = filesWithIssue.slice(0, config.maxFilesPerIssue);
    
    console.log(`Processing issue type: ${issueType} (${filesToFix.length} files)`);
    
    const issueResults = [];
    
    // Attempt to fix each file
    for (const file of filesToFix) {
      const fixResult = fixIssuesInFile(file, issueType);
      issueResults.push(fixResult);
      
      results.fixAttempts++;
      
      if (fixResult.status === 'fixed') {
        results.successfulFixes++;
      } else if (fixResult.status === 'skipped') {
        results.skippedFiles++;
      } else if (fixResult.status === 'error') {
        results.errorFiles++;
      } else if (fixResult.status === 'flagged') {
        results.flaggedForReview++;
      }
      
      console.log(`  - ${file}: ${fixResult.status} (${fixResult.reason})`);
    }
    
    results.issueResults[issueType] = issueResults;
  }
  
  return results;
}

/**
 * Update the agent memory with fix results
 * @param {Object} fixResults - Results of the fix attempts
 */
function updateAgentMemory(fixResults) {
  try {
    const memoryPath = path.join(__dirname, 'agent-memory.json');
    const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    
    // Update memory
    memory.currentStep = 4;
    memory.completedSteps.push("Identify any bugs, connection issues, or misconfigurations");
    memory.pendingSteps.shift();
    
    // Add fix report
    memory.fixReport = {
      timestamp: new Date().toISOString(),
      ...fixResults
    };
    
    // Log the actions
    memory.lastActivation = new Date().toISOString();
    if (!memory.sessionHistory) {
      memory.sessionHistory = [];
    }
    
    memory.sessionHistory.push({
      sessionId: `issue-fixer-${Date.now()}`,
      startTime: memory.lastActivation,
      endTime: memory.lastActivation,
      actions: [
        `Identified bugs, connection issues, and misconfigurations`,
        `Attempted to fix ${fixResults.fixAttempts} issues`,
        `Successfully fixed ${fixResults.successfulFixes} issues`,
        `Flagged ${fixResults.flaggedForReview} files for manual review`
      ]
    });
    
    // Save updated memory
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    console.log('Updated agent memory with fix results');
    
    // Also save a separate fix report
    fs.writeFileSync(
      path.join(__dirname, 'agent-fix-report.json'), 
      JSON.stringify(fixResults, null, 2)
    );
    
    return true;
  } catch (error) {
    console.error(`Error updating agent memory: ${error.message}`);
    return false;
  }
}

/**
 * Generate a summary of the issues for a human-readable report
 * @param {Object} scanResults - The API scan results
 * @param {Object} fixResults - Results of the fix attempts
 * @returns {string} Markdown-formatted summary
 */
function generateSummary(scanResults, fixResults) {
  let summary = `# Agent Issue Scan and Fix Report\n\n`;
  summary += `*Generated on ${new Date().toISOString()}*\n\n`;
  
  // Overall statistics
  summary += `## Overall Statistics\n\n`;
  summary += `- Total files scanned: ${scanResults.totalFilesScanned}\n`;
  summary += `- Files with API usage: ${Object.keys(scanResults.apiUsageByType).length}\n`;
  summary += `- Issues identified: ${Object.keys(scanResults.issuesByType).length} types\n`;
  summary += `- Fix attempts: ${fixResults.fixAttempts}\n`;
  summary += `- Successful fixes: ${fixResults.successfulFixes}\n`;
  summary += `- Files flagged for review: ${fixResults.flaggedForReview}\n\n`;
  
  // API usage summary
  summary += `## API Usage Summary\n\n`;
  const apiUsageTypes = Object.keys(scanResults.apiUsageByType);
  for (const apiType of apiUsageTypes) {
    const usage = scanResults.apiUsageByType[apiType];
    summary += `- **${apiType}**: ${usage.totalOccurrences} occurrences in ${usage.files.length} files\n`;
  }
  summary += `\n`;
  
  // Issue summary
  summary += `## Issue Summary\n\n`;
  for (const issueType of config.issuePriority) {
    if (scanResults.issuesByType[issueType]) {
      const issue = scanResults.issuesByType[issueType];
      const fixAttempts = fixResults.issueResults[issueType] || [];
      const fixCount = fixAttempts.filter(r => r.status === 'fixed').length;
      
      summary += `### ${issueType}\n\n`;
      summary += `- Found in ${issue.files.length} files\n`;
      summary += `- Fix attempts: ${fixAttempts.length}\n`;
      summary += `- Successfully fixed: ${fixCount}\n\n`;
      
      // List some example files
      const exampleCount = Math.min(5, issue.files.length);
      if (exampleCount > 0) {
        summary += `Example files:\n`;
        for (let i = 0; i < exampleCount; i++) {
          summary += `- \`${issue.files[i]}\`\n`;
        }
        summary += `\n`;
      }
    }
  }
  
  // Recommendations
  summary += `## Recommendations\n\n`;
  summary += `1. Review and fix the ${fixResults.flaggedForReview} files marked for manual review\n`;
  summary += `2. Implement consistent error handling across the codebase\n`;
  summary += `3. Remove any remaining hardcoded credentials and use environment variables\n`;
  summary += `4. Add retry logic for WebSocket connections in critical services\n`;
  summary += `5. Establish a code quality standard for future development\n`;
  
  return summary;
}

/**
 * Main function to execute the issue fixing process
 */
async function main() {
  console.log('Starting agent issue fixing process...');
  
  // Load scan results
  const scanResults = loadScanResults();
  if (!scanResults) {
    console.error('Unable to load scan results. Please run the scan first.');
    return;
  }
  
  // Process and fix issues
  const fixResults = processIssues(scanResults);
  
  // Update agent memory
  updateAgentMemory(fixResults);
  
  // Generate report
  const summary = generateSummary(scanResults, fixResults);
  fs.writeFileSync('agent-issue-summary.md', summary);
  
  console.log(`
Issue fixing process completed:
- Attempted to fix ${fixResults.fixAttempts} issues
- Successfully fixed ${fixResults.successfulFixes} issues
- Skipped ${fixResults.skippedFiles} files
- Encountered errors in ${fixResults.errorFiles} files
- Flagged ${fixResults.flaggedForReview} files for manual review

A detailed report has been saved to agent-issue-summary.md
`);
}

// Run the main function
main();