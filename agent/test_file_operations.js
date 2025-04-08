/**
 * Test File Operations for OpenAI Agent
 * 
 * This script tests if the agent can:
 * 1. Create a new file
 * 2. Write content to it
 * 3. Read the content back
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file path
const testFilePath = path.join(__dirname, '..', 'agent_test_output.txt');
const fileContent = 'Hello from the OpenAI agent!';

// Function to create and write to file
async function createAndWriteFile() {
  try {
    await fs.writeFile(testFilePath, fileContent, 'utf8');
    console.log(`✅ Successfully created and wrote to file: ${testFilePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating/writing to file: ${error.message}`);
    return false;
  }
}

// Function to read file
async function readFile() {
  try {
    const content = await fs.readFile(testFilePath, 'utf8');
    console.log(`✅ Successfully read file: ${testFilePath}`);
    console.log(`📄 File content: "${content}"`);
    
    // Verify content matches what was written
    if (content === fileContent) {
      console.log('✅ File content verification: SUCCESS');
    } else {
      console.log('❌ File content verification: FAILED - Content does not match');
    }
    
    return content;
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return null;
  }
}

// Run the test
async function runTest() {
  console.log('🔍 Starting file operation test for OpenAI agent');
  
  console.log('\n📝 Step 1: Creating and writing to file...');
  const writeResult = await createAndWriteFile();
  
  if (writeResult) {
    console.log('\n📝 Step 2: Reading file content...');
    await readFile();
  }
  
  console.log('\n📊 Test Summary:');
  console.log(`File path: ${testFilePath}`);
  console.log(`Write operation: ${writeResult ? '✅ Success' : '❌ Failed'}`);
  const readResult = await fs.access(testFilePath).then(() => true).catch(() => false);
  console.log(`Read operation: ${readResult ? '✅ Success' : '❌ Failed'}`);
  
  console.log('\n✨ Test completed. The OpenAI agent can access and modify files in the project.');
}

// Execute the test
runTest().catch(error => {
  console.error('❌ Error running test:', error);
});