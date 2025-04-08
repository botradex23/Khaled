/**
 * Test Agent File System Capabilities
 * 
 * This script demonstrates the enhanced file system access capabilities
 * of the OpenAI agent running in the Replit environment.
 * 
 * It tests:
 * 1. Recursive file system traversal across the workspace
 * 2. Finding files by pattern using glob syntax
 * 3. Finding files containing specific text
 * 4. Getting file metadata
 * 
 * Note: This script assumes that agent-terminal-server.js is running on port 5002.
 * Start it with: node agent-terminal-server.js
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

// Server configuration
const SERVER_URL = 'http://localhost:5002';
const ADMIN_HEADER = { 'X-Test-Admin': 'true' };

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...ADMIN_HEADER
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, options);
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${responseData.message}`);
    }
    
    return responseData;
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    throw error;
  }
}

// Test 1: Server health check
async function testServerHealth() {
  console.log('\n🧪 Test 1: Server Health Check');
  console.log('---------------------------');
  
  try {
    const result = await makeRequest('/health');
    console.log('✅ Server is running:', result);
    return true;
  } catch (error) {
    console.error('❌ Server health check failed. Is the agent-terminal-server.js running?');
    console.error('   Start it with: node agent-terminal-server.js');
    return false;
  }
}

// Test 2: Recursive file listing with depth control
async function testRecursiveFileListing() {
  console.log('\n🧪 Test 2: Recursive File Listing');
  console.log('---------------------------');
  
  try {
    // Test with limited depth (1 level)
    const resultLimitedDepth = await makeRequest('/list-recursive', 'POST', {
      directory: '.',
      maxDepth: 1,
      exclude: ['node_modules', '.git', 'dist', 'logs']
    });
    
    console.log(`✅ Found ${resultLimitedDepth.count} files at depth 1`);
    console.log('📂 Sample directories:', resultLimitedDepth.files
      .filter(f => f.isDirectory)
      .slice(0, 5)
      .map(f => f.path)
      .join(', '));
    
    // Test with file type filtering
    const resultJsFiles = await makeRequest('/file-op', 'POST', {
      operation: 'list-recursive',
      directory: './server',
      include: ['.js', '.ts'],
      maxDepth: 2
    });
    
    console.log(`✅ Found ${resultJsFiles.files.length} JavaScript/TypeScript files in ./server`);
    console.log('📄 Sample files:', resultJsFiles.files
      .filter(f => !f.isDirectory)
      .slice(0, 5)
      .map(f => f.path)
      .join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Recursive file listing failed:', error.message);
    return false;
  }
}

// Test 3: File search by pattern
async function testFilePatternSearch() {
  console.log('\n🧪 Test 3: File Pattern Search');
  console.log('---------------------------');
  
  try {
    // Search for JavaScript files in the server directory
    const result = await makeRequest('/search/files', 'POST', {
      pattern: 'server/**/*.js',
      startDir: '.'
    });
    
    console.log(`✅ Found ${result.count} files matching pattern 'server/**/*.js'`);
    if (result.files.length > 0) {
      console.log('📄 Sample matching files:');
      result.files.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ File pattern search failed:', error.message);
    return false;
  }
}

// Test 4: File content search
async function testFileContentSearch() {
  console.log('\n🧪 Test 4: File Content Search');
  console.log('---------------------------');
  
  try {
    // Search for files containing "OpenAI"
    const result = await makeRequest('/search/content', 'POST', {
      text: 'OpenAI',
      extensions: ['.js', '.ts', '.md'],
      caseSensitive: false
    });
    
    console.log(`✅ Found ${result.count} files containing 'OpenAI'`);
    if (result.files.length > 0) {
      console.log('📄 Sample matching files with context:');
      result.files.slice(0, 3).forEach(file => {
        console.log(`   - ${file.path} (${file.matches.length} matches)`);
        file.matches.slice(0, 1).forEach(match => {
          console.log(`     Line ${match.lineNumber}: ${match.line.trim()}`);
        });
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ File content search failed:', error.message);
    return false;
  }
}

// Test 5: Get file metadata
async function testFileMetadata() {
  console.log('\n🧪 Test 5: File Metadata');
  console.log('---------------------------');
  
  try {
    // Get metadata for the current file
    const result = await makeRequest('/file-op', 'POST', {
      operation: 'metadata',
      filePath: './agent-terminal-server.js'
    });
    
    console.log('✅ File metadata retrieved successfully:');
    console.log(`   - Size: ${result.metadata.size} bytes`);
    console.log(`   - Created: ${new Date(result.metadata.birthtime).toLocaleString()}`);
    console.log(`   - Modified: ${new Date(result.metadata.mtime).toLocaleString()}`);
    console.log(`   - File type: ${result.metadata.isDirectory ? 'Directory' : 'File'}`);
    
    return true;
  } catch (error) {
    console.error('❌ File metadata retrieval failed:', error.message);
    return false;
  }
}

// Test 6: Agent file operations
async function testAgentFileOperations() {
  console.log('\n🧪 Test 6: Agent File Operations');
  console.log('---------------------------');
  
  const testFilePath = './agent_fs_test_output.txt';
  
  try {
    // Use agent to generate and write content
    const result = await makeRequest('/agent-file-operation', 'POST', {
      action: 'generateAndWrite',
      filePath: testFilePath,
      prompt: 'Create a short markdown document that describes the enhanced file system capabilities of the OpenAI agent. Include code examples for how to use the file pattern search and content search APIs.'
    });
    
    console.log('✅ Agent successfully generated and wrote file content');
    console.log(`   - File created: ${testFilePath}`);
    console.log('   - Content preview:');
    console.log('   ---------------------------------------------------------');
    console.log(result.content.split('\n').slice(0, 10).join('\n'));
    console.log('   ---------------------------------------------------------');
    
    return true;
  } catch (error) {
    console.error('❌ Agent file operation failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Agent File System Capabilities Tests');
  console.log('================================================');
  
  // First check if server is running
  const serverRunning = await testServerHealth();
  if (!serverRunning) {
    console.error('\n❌ Tests aborted: Server is not running');
    return;
  }
  
  // Run the file system tests
  await testRecursiveFileListing();
  await testFilePatternSearch();
  await testFileContentSearch();
  await testFileMetadata();
  await testAgentFileOperations();
  
  console.log('\n🏁 All tests completed!');
  console.log('================================================');
}

// Run the tests
runAllTests().catch(error => {
  console.error('Error running tests:', error);
});