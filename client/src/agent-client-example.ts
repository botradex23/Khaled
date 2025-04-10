/**
 * Agent Client Example
 * 
 * This example demonstrates how to use the AgentApiClient to perform
 * file operations and OpenAI interactions directly without HTTP.
 * This bypasses any Vite middleware issues completely.
 */

import { AgentApiClient } from './agent-client';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables (for OPENAI_API_KEY)
config();

async function runExample() {
  console.log('===== Agent Client Example =====');
  console.log('Demonstrating direct file operations without HTTP\n');
  
  // Initialize the client
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  const client = new AgentApiClient(apiKey);
  console.log('✅ AgentApiClient initialized with OpenAI API key');
  
  // Example 1: Read a file
  console.log('\n--- Example 1: Reading a file ---');
  const readResult = await client.readFile('README.md');
  
  if (readResult.success) {
    const previewLength = 150;
    const contentPreview = readResult.content?.substring(0, previewLength) + '...';
    console.log(`✅ Successfully read README.md (${readResult.content?.length} bytes)`);
    console.log(`Content preview: ${contentPreview}`);
  } else {
    console.error(`❌ Failed to read file: ${readResult.message}`);
  }
  
  // Example 2: Write a file
  console.log('\n--- Example 2: Writing a file ---');
  const testOutputPath = 'test-output.txt';
  const testContent = `This is a test file created by AgentApiClient
Date: ${new Date().toISOString()}
This demonstrates writing files directly without using HTTP requests.`;
  
  const writeResult = await client.writeFile(testOutputPath, testContent);
  
  if (writeResult.success) {
    console.log(`✅ Successfully wrote to ${testOutputPath}`);
    
    // Verify by reading it back
    const verifyResult = await client.readFile(testOutputPath);
    if (verifyResult.success) {
      console.log(`✅ Verified content (${verifyResult.content?.length} bytes)`);
    }
  } else {
    console.error(`❌ Failed to write file: ${writeResult.message}`);
  }
  
  // Example 3: List files in a directory
  console.log('\n--- Example 3: Listing files in a directory ---');
  const listResult = await client.listFiles('src');
  
  if (listResult.success && listResult.files) {
    console.log(`✅ Found ${listResult.files.length} files in src directory`);
    console.log('First 5 files:');
    listResult.files.slice(0, 5).forEach(file => {
      console.log(`- ${file.name} (${file.isDirectory ? 'Directory' : 'File'})`);
    });
  } else {
    console.error(`❌ Failed to list files: ${listResult.message}`);
  }
  
  // Example 4: Using OpenAI
  console.log('\n--- Example 4: Using OpenAI API ---');
  const openaiResult = await client.getChatCompletion(
    'Explain the concept of middleware in web applications in one paragraph.'
  );
  
  if (openaiResult.success) {
    console.log('✅ OpenAI API response:');
    console.log(openaiResult.completion);
  } else {
    console.error(`❌ Failed to get OpenAI completion: ${openaiResult.message}`);
  }
  
  console.log('\n===== All examples completed successfully =====');
}

// Execute the example
runExample().catch(error => {
  console.error('Error running example:', error);
});