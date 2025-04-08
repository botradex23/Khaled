/**
 * Direct OpenAI Agent File Test
 * 
 * This script demonstrates how to use OpenAI's API directly to instruct
 * a model to perform file operations through a Node.js script.
 */

import { promises as fs } from 'fs';
import { config } from 'dotenv';
import https from 'https';

// Load environment variables
config();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEST_FILE_PATH = 'agent_openai_output.txt';
const TEST_CONTENT = 'Hello from the OpenAI agent!';

// Function to call OpenAI API
async function callOpenAI(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 2048
    });
    
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode === 200) {
            resolve(parsedData.choices[0].message.content);
          } else {
            reject(new Error(`OpenAI API returned status code ${res.statusCode}: ${JSON.stringify(parsedData)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Error calling OpenAI API: ${error.message}`));
    });
    
    req.write(data);
    req.end();
  });
}

// Function to create a file with content
async function createFileWithContent() {
  console.log(`Creating file: ${TEST_FILE_PATH}`);
  console.log(`Content: "${TEST_CONTENT}"`);
  
  try {
    await fs.writeFile(TEST_FILE_PATH, TEST_CONTENT, 'utf8');
    console.log('File created successfully');
    return true;
  } catch (error) {
    console.error(`Error creating file: ${error.message}`);
    return false;
  }
}

// Function to read file content
async function readFileContent() {
  console.log(`Reading file: ${TEST_FILE_PATH}`);
  
  try {
    const content = await fs.readFile(TEST_FILE_PATH, 'utf8');
    console.log(`File content: "${content}"`);
    return content;
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    return null;
  }
}

// Function to ask OpenAI to verify the file operation
async function askOpenAIToVerify() {
  console.log('\nAsking OpenAI to verify the file operation...');
  
  const prompt = `
I just performed the following file operations in a Node.js script:
1. Created a file named "${TEST_FILE_PATH}"
2. Wrote the text "${TEST_CONTENT}" to the file
3. Read the content back from the file

The read content was: "${await readFileContent()}"

Please verify if the operation was successful by comparing what was written with what was read back.
Also, provide me with a sample script that could perform these operations directly.
`;

  const systemPrompt = `
You are an AI assistant with expertise in Node.js file operations.
Analyze file operations and verify their success or failure.
When requested, provide sample code for file operations.
`;

  try {
    const response = await callOpenAI(prompt, systemPrompt);
    console.log('\nOpenAI Response:');
    console.log('----------------------------------------');
    console.log(response);
    console.log('----------------------------------------');
    return response;
  } catch (error) {
    console.error(`Error getting OpenAI verification: ${error.message}`);
    return null;
  }
}

// Main function to run the test
async function runTest() {
  console.log('======================================');
  console.log('Direct OpenAI Agent File Test');
  console.log('======================================');
  
  if (!OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is not set in environment variables');
    console.error('Please set it in your .env file and try again');
    return;
  }
  
  // Step 1: Create a file with content
  const fileCreated = await createFileWithContent();
  
  if (fileCreated) {
    // Step 2: Read the file content
    const content = await readFileContent();
    
    if (content) {
      // Step 3: Verify the content matches
      if (content === TEST_CONTENT) {
        console.log('\nContent verification passed!');
        
        // Step 4: Ask OpenAI to verify the operation
        await askOpenAIToVerify();
      } else {
        console.error('\nContent verification failed!');
        console.error(`Expected: "${TEST_CONTENT}"`);
        console.error(`Actual: "${content}"`);
      }
    }
  }
  
  console.log('\n======================================');
}

// Run the test
runTest().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
});