/**
 * Agent Example Task Executor
 * 
 * This script demonstrates how an OpenAI agent could:
 * 1. Understand a feature request or bug report
 * 2. Search for relevant files in the codebase
 * 3. Make targeted changes to implement the fix
 * 4. Test the changes
 * 
 * This script simulates what the agent would do if asked to implement 
 * a simple feature or fix a small bug.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Call OpenAI API for code understanding or generation
 */
async function callOpenAI(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  try {
    if (!OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found in environment variables.');
      return 'ERROR: OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.';
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    return null;
  }
}

/**
 * Search for files that match a specific pattern or contain specific content
 */
async function searchFiles(rootDir, searchPattern, isContentSearch = false) {
  const results = [];
  
  async function searchDirectory(dir) {
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        // Skip node_modules, .git, etc.
        if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') {
          continue;
        }
        
        if (item.isDirectory()) {
          // Recursively search subdirectories
          await searchDirectory(fullPath);
        } else if (item.isFile()) {
          if (isContentSearch) {
            // Search file content
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              if (content.includes(searchPattern)) {
                results.push(fullPath);
              }
            } catch (error) {
              // Skip files that can't be read as text
            }
          } else {
            // Search file name
            if (item.name.match(searchPattern)) {
              results.push(fullPath);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching directory ${dir}:`, error.message);
    }
  }
  
  await searchDirectory(rootDir);
  return results;
}

/**
 * Read a file from the codebase
 */
async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Write changes to a file
 */
async function writeFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Successfully updated file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error writing to file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Create a backup of a file before modifying it
 */
async function backupFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const backupPath = `${filePath}.bak`;
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`✅ Created backup: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating backup for ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Create a summary of the code in a file to understand its purpose
 */
async function summarizeCode(filePath) {
  const content = await readFile(filePath);
  if (!content) return null;
  
  const prompt = `
I need a brief summary of what this code does. Be concise but thorough. 
Here's the code:

\`\`\`
${content}
\`\`\`
  `;
  
  const systemPrompt = 'You are an expert programmer who can quickly identify the main purpose and structure of code. Provide concise, technical summaries.';
  
  return callOpenAI(prompt, systemPrompt);
}

/**
 * Implement a specific change or fix to a file
 */
async function implementChange(filePath, taskDescription) {
  // 1. Read the current file content
  const content = await readFile(filePath);
  if (!content) return false;
  
  // 2. Create a backup
  await backupFile(filePath);
  
  // 3. Ask OpenAI to implement the change
  const prompt = `
I need to implement the following task in this file:
${taskDescription}

Here's the current code:
\`\`\`
${content}
\`\`\`

Please provide the updated code after implementing the change. 
Return the FULL file content with the changes implemented.
Only return the code without explanations or formatting.
  `;
  
  const systemPrompt = 'You are an expert programmer tasked with implementing changes to code. You must provide the complete updated code after making the specified changes.';
  
  const updatedCode = await callOpenAI(prompt, systemPrompt);
  if (!updatedCode) return false;
  
  // 4. Write the updated code back to the file
  return writeFile(filePath, updatedCode);
}

/**
 * Run an example agent task implementation
 */
async function runExampleTask() {
  console.log('\n🤖 Starting Agent Example Task\n');
  
  // Example task: "Add a new utility function to format dates in the app"
  const task = "Add a new utility function called formatCurrency that takes a number and returns a string formatted as currency with 2 decimal places and the appropriate currency symbol ($)";
  
  console.log(`📋 Task: ${task}\n`);
  
  // Step 1: Find relevant files
  console.log('🔍 Searching for relevant files...');
  const projectRoot = path.resolve(__dirname, '..');
  const relevantFiles = await searchFiles(projectRoot, /utils\.js|helpers\.js|format\.js/, false);
  
  console.log(`   Found ${relevantFiles.length} potentially relevant files:`);
  relevantFiles.forEach(file => console.log(`   - ${file}`));
  
  // Step in flow: create a new utility file if none exists
  if (relevantFiles.length === 0) {
    console.log('\n📝 No utility files found. Creating a new one...');
    
    const newUtilFilePath = path.join(projectRoot, 'client/src/lib/format-utils.js');
    
    const initialContent = `/**
 * Format utilities for the application
 * This file contains utility functions for formatting values for display
 */

/**
 * Format a value as currency with 2 decimal places
 * @param {number} value - The number to format
 * @param {string} currencySymbol - The currency symbol to use (default: $)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currencySymbol = '$') {
  return \`\${currencySymbol}\${value.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')}\`;
}
`;
    
    const createResult = await writeFile(newUtilFilePath, initialContent);
    if (createResult) {
      console.log(`✅ Created new utility file with currency formatting function: ${newUtilFilePath}`);
    }
  } else {
    // Example showing how agent would modify an existing file
    const fileToModify = relevantFiles[0];
    console.log(`\n📝 Modifying file: ${fileToModify}`);
    
    // Get summary of the file to understand context
    console.log('📃 Analyzing file content...');
    const summary = await summarizeCode(fileToModify);
    console.log(`   Summary: ${summary}\n`);
    
    // Implement the change
    console.log('🔄 Implementing change...');
    const implementResult = await implementChange(fileToModify, task);
    
    if (implementResult) {
      console.log(`✅ Successfully implemented the format currency function in ${fileToModify}`);
    } else {
      console.log(`❌ Failed to implement the change in ${fileToModify}`);
    }
  }
  
  console.log('\n✨ Agent task execution completed!');
}

// Run the example task
runExampleTask().catch(error => {
  console.error('❌ Error executing agent task:', error);
});

export {
  callOpenAI,
  searchFiles,
  readFile,
  writeFile,
  backupFile,
  summarizeCode,
  implementChange
};