/**
 * Autonomous Agent Example Script
 * 
 * This script demonstrates how to use the autonomous agent API
 * to execute complex tasks and modify code automatically.
 */

const axios = require('axios');

// Base URL for the API
const baseUrl = 'http://localhost:5000';

/**
 * Execute an autonomous task
 * @param {string} task - The natural language task to execute
 * @returns {Promise<Object>} - Task execution results
 */
async function executeTask(task) {
  try {
    console.log(`Executing task: ${task}`);
    const response = await axios.post(`${baseUrl}/api/agent/api/autonomous-task`, { task });
    return response.data;
  } catch (error) {
    console.error('Error executing task:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Analyze code for a specific file or find relevant files automatically
 * @param {string} task - The natural language task to analyze
 * @param {string|null} filePath - Optional file path to analyze
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeCode(task, filePath = null) {
  try {
    console.log(`Analyzing code${filePath ? ` for file ${filePath}` : ''} with task: ${task}`);
    const response = await axios.post(`${baseUrl}/api/agent/api/analyze-code`, { task, filePath });
    return response.data;
  } catch (error) {
    console.error('Error analyzing code:', error.message);
    return { success: false, analysis: error.message };
  }
}

/**
 * Find relevant files for a task
 * @param {string} task - The natural language task
 * @returns {Promise<Array>} - Relevant files with relevance scores
 */
async function findRelevantFiles(task) {
  try {
    console.log(`Finding relevant files for task: ${task}`);
    const response = await axios.post(`${baseUrl}/api/agent/api/find-relevant-files`, { task });
    return response.data.result || [];
  } catch (error) {
    console.error('Error finding relevant files:', error.message);
    return [];
  }
}

/**
 * Modify a file based on a task
 * @param {string} path - Path to the file
 * @param {string} task - Natural language task description
 * @returns {Promise<Object>} - Modification results
 */
async function modifyFile(path, task) {
  try {
    console.log(`Modifying file ${path} with task: ${task}`);
    const response = await axios.post(`${baseUrl}/api/agent/api/modify-file`, { path, task });
    return response.data.result || { success: false, message: 'No result returned' };
  } catch (error) {
    console.error('Error modifying file:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Create a new file based on a task
 * @param {string} path - Path where the file should be created
 * @param {string} task - Natural language task description
 * @returns {Promise<Object>} - Creation results
 */
async function createFile(path, task) {
  try {
    console.log(`Creating file ${path} with task: ${task}`);
    const response = await axios.post(`${baseUrl}/api/agent/api/create-file`, { path, task });
    return response.data.result || { success: false, message: 'No result returned' };
  } catch (error) {
    console.error('Error creating file:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Run an example scenario
 */
async function runExample() {
  console.log('=== AUTONOMOUS AGENT EXAMPLE ===');
  
  // 1. First, let's analyze the codebase to find relevant files for a task
  const task = 'Improve error handling in the file operations code';
  
  console.log('\n--- Finding relevant files ---');
  const relevantFiles = await findRelevantFiles(task);
  console.log('Relevant files:', relevantFiles);
  
  if (relevantFiles.length > 0) {
    const topFile = relevantFiles[0].path;
    
    // 2. Analyze the specific file
    console.log(`\n--- Analyzing ${topFile} ---`);
    const analysis = await analyzeCode(task, topFile);
    console.log('Analysis:', analysis.analysis);
    
    // 3. Modify the file based on the analysis
    console.log(`\n--- Modifying ${topFile} ---`);
    const modifyResult = await modifyFile(topFile, task);
    console.log('Modification result:', modifyResult);
  }
  
  // 4. Create a new utility file
  console.log('\n--- Creating a new utility file ---');
  const createResult = await createFile(
    'server/utils/error-handler.ts', 
    'Create a utility file for standardized error handling across the application'
  );
  console.log('Creation result:', createResult);
  
  // 5. Execute a complex task that affects multiple files
  console.log('\n--- Executing complex task ---');
  const complexTask = 'Add better error logging throughout the application';
  const taskResult = await executeTask(complexTask);
  console.log('Task execution result:', taskResult);
}

// Run the example
runExample().catch(err => {
  console.error('Example failed:', err);
});