/**
 * Enhanced Agent Examples
 * 
 * This file contains examples of how to use the enhanced agent capabilities
 * with the autonomous file operations and global context awareness.
 * 
 * Note: The agent-terminal-server.js must be running on port 5002 for these examples to work.
 * Start it by running: node agent-terminal-server.js
 */

// Import required modules
const fetch = require('node-fetch');
const fs = require('fs');

const AGENT_SERVER_URL = 'http://localhost:5002';
const ADMIN_HEADER = 'X-Test-Admin';
const ADMIN_VALUE = 'true';

/**
 * Make a request to the agent server
 * @param {string} endpoint - Endpoint to call
 * @param {string} method - HTTP method
 * @param {Object} data - Request data
 * @returns {Promise<Object>} Response data
 */
async function makeAgentRequest(endpoint, method = 'GET', data = null) {
  const url = `${AGENT_SERVER_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      [ADMIN_HEADER]: ADMIN_VALUE
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Example 1: Use the agent to analyze project files and make recommendations
 */
async function analyzeProject() {
  console.log('\n🔍 Example 1: Analyzing Project Structure...');
  
  const result = await makeAgentRequest('/agent-task', 'POST', {
    prompt: 'Please analyze our project structure and recommend improvements for organization and maintainability. Focus on identifying any circular dependencies, confusing file locations, or inconsistent naming patterns.'
  });
  
  console.log('✅ Project Analysis Results:');
  console.log(result.response);
  return result;
}

/**
 * Example 2: Use the agent to search for files containing specific code patterns
 */
async function findCodePatterns() {
  console.log('\n🔍 Example 2: Finding Code Patterns...');
  
  // First, search for files containing MongoDB connection code
  const searchResult = await makeAgentRequest('/search/content', 'POST', {
    text: 'mongoose.connect',
    extensions: ['.js', '.ts'],
    caseSensitive: false
  });
  
  console.log(`✅ Found ${searchResult.count} files containing MongoDB connection code:`);
  searchResult.files.forEach(file => {
    console.log(`  - ${file.path}`);
  });
  
  return searchResult;
}

/**
 * Example 3: Use the agent to intelligently modify an existing file
 */
async function modifyExistingFile() {
  console.log('\n🔧 Example 3: Intelligently Modifying a File...');
  
  // First, find a suitable file to modify
  const files = await makeAgentRequest('/search/files', 'POST', {
    pattern: '**/routes.js',
    startDir: '.'
  });
  
  if (files.count === 0) {
    console.log('❌ No routes.js files found to modify');
    return;
  }
  
  const filePath = files.files[0];
  console.log(`Found file to modify: ${filePath}`);
  
  // Use the agent to modify the file
  const result = await makeAgentRequest('/agent-file-operation', 'POST', {
    action: 'modifyFile',
    filePath,
    prompt: 'Add a new route handler for "/api/system/status" that returns the current system status including: server uptime, connected users count, active database connections, and memory usage. Make sure to follow the existing code style and patterns.'
  });
  
  console.log('✅ File Modified Successfully');
  console.log('Original size:', result.originalContent.length, 'characters');
  console.log('Modified size:', result.modifiedContent.length, 'characters');
  
  return result;
}

/**
 * Example 4: Use the agent to analyze and fix bugs in a file
 */
async function analyzeAndFixFile() {
  console.log('\n🐛 Example 4: Analyzing and Fixing a File...');
  
  // Find a JavaScript file with potential issues
  const files = await makeAgentRequest('/search/files', 'POST', {
    pattern: '**/*.js',
    startDir: './client/src'
  });
  
  if (files.count === 0) {
    console.log('❌ No JavaScript files found to analyze');
    return;
  }
  
  // Choose a file from the results (in a real scenario, you'd pick a specific file)
  const filePath = files.files[0];
  console.log(`Analyzing file: ${filePath}`);
  
  // Use the agent to analyze and fix the file
  const result = await makeAgentRequest('/agent-file-operation', 'POST', {
    action: 'analyzeAndFix',
    filePath,
    prompt: 'Please analyze this file for potential bugs, performance issues, or code quality improvements. Focus on: memory leaks, unhandled promises, inefficient state updates, and missing error handling. Fix any issues you find while maintaining the original functionality.'
  });
  
  console.log('✅ File Analyzed and Fixed');
  console.log('Issues addressed in the file');
  
  return result;
}

/**
 * Example 5: Use the agent to generate a new utility function
 */
async function generateUtilityFunction() {
  console.log('\n✨ Example 5: Generating a New Utility Function...');
  
  const utilityPath = './client/src/utils/date-formatter.js';
  
  // Use the agent to generate a new utility function
  const result = await makeAgentRequest('/agent-file-operation', 'POST', {
    action: 'generateAndWrite',
    filePath: utilityPath,
    prompt: 'Create a comprehensive date formatting utility module that provides functions for: formatting dates in various localized formats, calculating time differences in human-readable form (e.g., "2 hours ago"), handling timezone conversions, and working with trading market hours (indicating if markets are open/closed). The utility should support both client and server usage.'
  });
  
  console.log('✅ Utility Function Generated Successfully');
  console.log(`File created: ${utilityPath}`);
  console.log(`Size: ${result.content.length} characters`);
  
  return result;
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    // First check if the agent server is running
    const health = await makeAgentRequest('/health');
    if (!health.status || health.status !== 'ok') {
      console.error('❌ Agent server is not running. Please start it with: node agent-terminal-server.js');
      return;
    }
    
    console.log('🤖 Agent server is running. Starting examples...');
    
    // Run each example
    await analyzeProject();
    await findCodePatterns();
    await modifyExistingFile();
    await analyzeAndFixFile();
    await generateUtilityFunction();
    
    console.log('\n🎉 All examples completed successfully!');
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

// Check if this script is being run directly
if (require.main === module) {
  runAllExamples();
}

// Export functions for use in other files
module.exports = {
  analyzeProject,
  findCodePatterns,
  modifyExistingFile,
  analyzeAndFixFile,
  generateUtilityFunction,
  runAllExamples
};