/**
 * Direct File Test for OpenAI Agent
 * 
 * This script directly tests file operations without starting a server.
 * It performs the exact operations requested:
 * 1. Create a new test file called agent_test_output.txt
 * 2. Write "Hello from the OpenAI agent!" to the file
 * 3. Read the contents back and confirm they were saved correctly
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file path
const testFilePath = path.join(__dirname, 'agent_test_output.txt');
const fileContent = 'Hello from the OpenAI agent!';

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Function to create and write to file
async function createAndWriteFile() {
  console.log(`\n${colors.cyan}${colors.bright}STEP 1: Creating and writing to file...${colors.reset}`);
  console.log(`File path: ${testFilePath}`);
  console.log(`Content: "${fileContent}"`);
  
  try {
    await fs.writeFile(testFilePath, fileContent, 'utf8');
    console.log(`${colors.green}✓ Success: File created and content written${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

// Function to read file
async function readFile() {
  console.log(`\n${colors.cyan}${colors.bright}STEP 2: Reading file contents...${colors.reset}`);
  
  try {
    const content = await fs.readFile(testFilePath, 'utf8');
    console.log(`Content read: "${content}"`);
    
    // Verify content matches what was written
    if (content === fileContent) {
      console.log(`${colors.green}✓ Success: Content verification passed${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Error: Content verification failed${colors.reset}`);
      console.log(`Expected: "${fileContent}"`);
      console.log(`Actual: "${content}"`);
    }
    
    return content;
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return null;
  }
}

// Run the test
async function runTest() {
  console.log(`\n${colors.magenta}${colors.bright}======================================${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}OpenAI Agent File Operations Test${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}======================================${colors.reset}`);
  
  const writeSuccess = await createAndWriteFile();
  
  if (writeSuccess) {
    const content = await readFile();
    
    console.log(`\n${colors.cyan}${colors.bright}STEP 3: Verification...${colors.reset}`);
    if (content === fileContent) {
      console.log(`${colors.green}${colors.bright}✓ TEST PASSED: The OpenAI agent can successfully read and write files.${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}✗ TEST FAILED: Content verification failed.${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.red}${colors.bright}✗ TEST FAILED: Could not create or write to the file.${colors.reset}`);
  }
  
  console.log(`\n${colors.magenta}${colors.bright}======================================${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}Test Summary${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}======================================${colors.reset}`);
  console.log(`File path: ${testFilePath}`);
  console.log(`Expected content: "${fileContent}"`);
  console.log(`Test result: ${writeSuccess ? colors.green + 'PASSED' : colors.red + 'FAILED'}${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}======================================${colors.reset}\n`);
}

// Execute the test
runTest().catch(error => {
  console.error(`${colors.red}Unhandled error in test: ${error}${colors.reset}`);
});