/**
 * Run Agent Example
 * 
 * This script demonstrates the direct file operations without HTTP.
 * It uses AgentApiClient to read, write and list files directly.
 */

import { AgentApiClient } from './agent-client';

async function main() {
  console.log('===== Direct Agent Example =====');
  
  // Create the client (without OpenAI key as we're using a mock)
  const client = new AgentApiClient('mock-key');
  
  try {
    // Example 1: Read a file
    console.log('\n1. Reading README.md...');
    const readResult = await client.readFile('README.md');
    if (readResult.success) {
      console.log(`✅ File read successfully (${readResult.content?.length} bytes)`);
      console.log(`First 100 characters: ${readResult.content?.substring(0, 100)}...`);
    } else {
      console.error(`❌ Error: ${readResult.message}`);
    }
    
    // Example 2: Write a file
    console.log('\n2. Writing to test-file.txt...');
    const content = `This is a test file.
Generated at: ${new Date().toISOString()}
Using direct AgentApiClient.`;
    
    const writeResult = await client.writeFile('test-file.txt', content);
    if (writeResult.success) {
      console.log('✅ File written successfully');
    } else {
      console.error(`❌ Error: ${writeResult.message}`);
    }
    
    // Example 3: List files
    console.log('\n3. Listing files in src directory...');
    const listResult = await client.listFiles('src');
    if (listResult.success && listResult.files) {
      console.log(`✅ Found ${listResult.files.length} files/directories`);
      
      // Display first 5 files
      console.log('First 5 items:');
      listResult.files.slice(0, 5).forEach(file => {
        console.log(`- ${file.name} (${file.isDirectory ? 'Directory' : 'File'})`);
      });
    } else {
      console.error(`❌ Error: ${listResult.message}`);
    }
    
    console.log('\n===== All tests completed successfully =====');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the examples
main().catch(console.error);