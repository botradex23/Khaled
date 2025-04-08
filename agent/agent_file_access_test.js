/**
 * OpenAI Agent File Access Test
 * 
 * This file simulates how the OpenAI agent would interact with the file system in Replit.
 * It demonstrates reading, modifying, and creating files using Node.js fs module.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to read a file (similar to what the OpenAI agent would do)
async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    console.log(`✅ Successfully read file: ${filePath}`);
    return content;
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}: ${error.message}`);
    return null;
  }
}

// Function to modify a file (similar to what the OpenAI agent would do)
async function modifyFile(filePath, oldContent, newContent) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const updatedContent = content.replace(oldContent, newContent);
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(`✅ Successfully modified file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error modifying file ${filePath}: ${error.message}`);
    return false;
  }
}

// Function to create a new file (similar to what the OpenAI agent would do)
async function createFile(filePath, content) {
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the file
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Successfully created file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating file ${filePath}: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runFileAccessTests() {
  console.log('🔍 Starting OpenAI Agent File Access Tests');
  
  // Test 1: Read the test file
  const testFilePath = path.join(__dirname, 'agent_file_test.js');
  const fileContent = await readFile(testFilePath);
  
  if (!fileContent) {
    console.error('❌ Read test failed. Cannot proceed with other tests.');
    return;
  }
  
  // Test 2: Modify the test file
  const oldVersion = 'version: "1.0.0"';
  const newVersion = 'version: "1.0.1"';
  const modifyResult = await modifyFile(testFilePath, oldVersion, newVersion);
  
  // Test 3: Create a new file
  const newFilePath = path.join(__dirname, 'agent_created_file.js');
  const newFileContent = `/**
 * This file was created by the OpenAI agent test
 * Creation time: ${new Date().toISOString()}
 */

export function greet(name) {
  return \`Hello, \${name}! I was created by the OpenAI agent.\`;
}
`;
  
  const createResult = await createFile(newFilePath, newFileContent);
  
  // Report results
  console.log('\n📊 File Access Test Results:');
  console.log(`Read File: ${fileContent ? '✅ Success' : '❌ Failed'}`);
  console.log(`Modify File: ${modifyResult ? '✅ Success' : '❌ Failed'}`);
  console.log(`Create File: ${createResult ? '✅ Success' : '❌ Failed'}`);
  console.log('\n✨ Tests completed. The OpenAI agent has the same capabilities to read, modify, and create files in Replit.');
}

// Execute the tests
runFileAccessTests().catch(error => {
  console.error('❌ Error running tests:', error);
});

export {
  readFile,
  modifyFile,
  createFile,
  runFileAccessTests
};