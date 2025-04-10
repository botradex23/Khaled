/**
 * Autonomous Agent Engine
 * 
 * This module implements a fully autonomous agent capable of:
 * - Reading, editing, creating, and deleting project files
 * - Executing tasks and code directly
 * - Updating logic and structure across the codebase
 * - Processing natural language instructions and converting them into actions
 * - Managing server, API, middleware, config, routing, and build systems
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as openaiService from './openai-service';
import fileService from './file-service';

// Promisify exec for async/await
const execAsync = promisify(exec);

// Root directory - set to the workspace root
const ROOT_DIR = process.cwd();

// Logging utilities
function logInfo(message: string): void {
  console.log(`[Autonomous Agent] ${message}`);
}

function logError(message: string, error?: any): void {
  console.error(`[Autonomous Agent] ERROR: ${message}`, error);
}

/**
 * Task execution history for tracking changes and providing context
 */
interface TaskExecution {
  taskId: string;
  task: string;
  timestamp: string;
  files: {
    path: string;
    action: 'read' | 'write' | 'create' | 'delete' | 'analyze';
    status: 'success' | 'failure';
    message?: string;
  }[];
  status: 'completed' | 'failed' | 'in_progress';
  result?: string;
}

const executionHistory: TaskExecution[] = [];

/**
 * Generate a unique task ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Find the most relevant file for a given task using semantic search
 */
export async function findRelevantFile(task: string): Promise<{path: string, relevance: number}[]> {
  try {
    logInfo(`Finding relevant files for task: ${task}`);
    
    // Get all code files in the project
    const allFiles = fileService.listFilesRecursive(ROOT_DIR, {
      include: ['.ts', '.js', '.tsx', '.jsx', '.json', '.html', '.css', '.scss']
    });
    
    // Filter out node_modules, dist, and other build/cache directories
    const codeFiles = allFiles.filter((file: any) => {
      const relativePath = path.relative(ROOT_DIR, file.path);
      return !relativePath.includes('node_modules') && 
             !relativePath.includes('dist') && 
             !relativePath.includes('.git') &&
             !file.isDirectory;
    });
    
    // Use OpenAI to determine relevance
    const filePaths = codeFiles.map((file: any) => file.path);
    const prompt = `
Task: ${task}

I need to find the most relevant files in this project to accomplish this task.
Here are the files available:
${filePaths.join('\n')}

Please list the 5 most relevant files for this task in order of relevance, 
with a relevance score from 0-100 for each. Format your response as JSON:
[
  {"path": "file/path1.ts", "relevance": 95},
  {"path": "file/path2.ts", "relevance": 85},
  ...
]
`;
    
    const completion = await openaiService.getChatCompletion(
      prompt, 
      'You are a code expert that analyzes project structures and identifies the most relevant files for specific tasks. Respond with valid JSON only.'
    );
    
    // Parse the completion to get the relevant files
    try {
      const relevantFiles = JSON.parse(completion);
      return relevantFiles.slice(0, 5); // Return top 5 files
    } catch (error) {
      logError('Failed to parse relevant files from OpenAI response', error);
      // Fallback: return files that might be relevant based on keyword matching
      return codeFiles
        .map((file: any) => ({
          path: file.path,
          relevance: 50 // Default relevance score
        }))
        .slice(0, 5);
    }
  } catch (error: any) {
    logError(`Error finding relevant file: ${error.message}`, error);
    throw new Error(`Failed to find relevant file: ${error.message}`);
  }
}

/**
 * Modify a file based on a natural language task
 */
export async function modifyFile(filePath: string, task: string): Promise<{success: boolean; message: string}> {
  try {
    logInfo(`Modifying file ${filePath} for task: ${task}`);
    
    // Check if file exists
    if (!fileService.fileExists(filePath)) {
      return {
        success: false,
        message: `File not found: ${filePath}`
      };
    }
    
    // Read the original content
    const originalContent = fileService.readFile(filePath);
    
    // Get file extension
    const fileExt = path.extname(filePath);
    
    // Determine file type for better context
    let fileType = 'code';
    if (['.json', '.yaml', '.yml'].includes(fileExt)) {
      fileType = 'configuration';
    } else if (['.md', '.txt'].includes(fileExt)) {
      fileType = 'documentation';
    }
    
    // Create prompt for AI to modify the file
    const prompt = `
You are an expert developer modifying a ${fileType} file.

Task: ${task}

File: ${filePath}

Original content:
\`\`\`${fileExt}
${originalContent}
\`\`\`

Instructions:
1. Analyze the file content and its purpose
2. Implement all changes required to complete the task
3. Return ONLY the complete modified file content
4. Make sure your response can be directly written to the file, with no additional text or formatting

Modified content:
`;
    
    // Get completion from OpenAI
    const completion = await openaiService.getChatCompletion(
      prompt, 
      'You are an expert code editor that modifies files accurately based on task descriptions. Return only the modified file content.'
    );
    
    // Validate the result is not empty
    if (!completion || typeof completion !== 'string' || completion.trim().length === 0) {
      return {
        success: false,
        message: 'Failed to generate valid file content'
      };
    }
    
    // Clean up the response to get just the code content
    let newContent = completion;
    
    // Write the new content to the file
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return {
      success: true,
      message: `Successfully modified ${filePath}`
    };
  } catch (error: any) {
    logError(`Error modifying file ${filePath}: ${error.message}`, error);
    return {
      success: false,
      message: `Error modifying file: ${error.message}`
    };
  }
}

/**
 * Create a new file with AI-generated content based on a task
 */
export async function createFile(filePath: string, task: string): Promise<{success: boolean; message: string}> {
  try {
    logInfo(`Creating file ${filePath} for task: ${task}`);
    
    // Check if file already exists
    if (fileService.fileExists(filePath)) {
      return {
        success: false,
        message: `File already exists: ${filePath}`
      };
    }
    
    // Get file extension
    const fileExt = path.extname(filePath);
    
    // Determine the type of file to create
    let fileType = 'TypeScript code';
    let templateStructure = '';
    
    if (fileExt === '.ts' || fileExt === '.tsx') {
      fileType = 'TypeScript code';
      templateStructure = 'Include imports, interfaces/types, and well-documented functions';
    } else if (fileExt === '.js' || fileExt === '.jsx') {
      fileType = 'JavaScript code';
      templateStructure = 'Include imports and well-documented functions';
    } else if (fileExt === '.json') {
      fileType = 'JSON configuration';
      templateStructure = 'Create a valid JSON structure';
    } else if (fileExt === '.md') {
      fileType = 'Markdown documentation';
      templateStructure = 'Create comprehensive documentation with proper Markdown formatting';
    } else if (fileExt === '.html') {
      fileType = 'HTML';
      templateStructure = 'Create a valid HTML document with proper structure';
    } else if (fileExt === '.css' || fileExt === '.scss') {
      fileType = 'CSS/SCSS styles';
      templateStructure = 'Create well-organized and commented styles';
    }
    
    // Create prompt for AI to generate new file content
    const prompt = `
You are an expert developer creating a new ${fileType} file.

Task: ${task}

File to create: ${filePath}

Instructions:
1. Generate complete, production-ready content for this file
2. ${templateStructure}
3. Return ONLY the file content
4. Make sure your response can be directly written to the file, with no additional text or formatting

File content:
`;
    
    // Get completion from OpenAI
    const completion = await openaiService.getChatCompletion(
      prompt, 
      'You are an expert code generator that creates complete, well-structured files based on task descriptions. Return only the file content.'
    );
    
    // Validate the result is not empty
    if (!completion || typeof completion !== 'string' || completion.trim().length === 0) {
      return {
        success: false,
        message: 'Failed to generate valid file content'
      };
    }
    
    // Create directory if it doesn't exist
    const dirName = path.dirname(filePath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
    
    // Write the new file
    fs.writeFileSync(filePath, completion, 'utf8');
    
    return {
      success: true,
      message: `Successfully created ${filePath}`
    };
  } catch (error: any) {
    logError(`Error creating file ${filePath}: ${error.message}`, error);
    return {
      success: false,
      message: `Error creating file: ${error.message}`
    };
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<{success: boolean; message: string}> {
  try {
    logInfo(`Deleting file ${filePath}`);
    
    // Check if file exists
    if (!fileService.fileExists(filePath)) {
      return {
        success: false,
        message: `File not found: ${filePath}`
      };
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    return {
      success: true,
      message: `Successfully deleted ${filePath}`
    };
  } catch (error: any) {
    logError(`Error deleting file ${filePath}: ${error.message}`, error);
    return {
      success: false,
      message: `Error deleting file: ${error.message}`
    };
  }
}

/**
 * Main task execution loop that handles complex tasks
 */
export async function executeTask(task: string): Promise<{
  success: boolean;
  taskId: string;
  message: string;
  results?: any[];
}> {
  try {
    logInfo(`Executing task: ${task}`);
    
    // Generate a unique task ID
    const taskId = generateTaskId();
    
    // Initialize task execution record
    const execution: TaskExecution = {
      taskId,
      task,
      timestamp: new Date().toISOString(),
      files: [],
      status: 'in_progress',
    };
    
    // Add to history
    executionHistory.push(execution);
    
    // 1. Analyze the task to determine what files need to be modified
    logInfo(`Analyzing task: ${task}`);
    
    const prompt = `
You are an expert developer tasked with:
"${task}"

Break down this task into specific action steps. For each step, identify:
1. The action required (analyze, modify, create, delete)
2. Any specific files involved (if known)
3. The specific changes required

Format your response as JSON:
{
  "understanding": "Brief explanation of what the task requires",
  "steps": [
    {
      "action": "analyze|modify|create|delete",
      "file": "path/to/file.ts (or null if unknown)",
      "description": "What needs to be done"
    },
    ...
  ],
  "additionalNotes": "Any important considerations or context"
}
`;
    
    const completion = await openaiService.getChatCompletion(
      prompt, 
      'You are a code planning expert that breaks down tasks into actionable steps. Respond with valid JSON only.'
    );
    
    let taskPlan;
    try {
      taskPlan = JSON.parse(completion);
    } catch (error) {
      logError('Failed to parse task plan from OpenAI response', error);
      throw new Error('Failed to analyze task. Invalid response received.');
    }
    
    const results = [];
    
    // 2. Execute each step in the plan
    for (const step of taskPlan.steps) {
      let stepResult;
      
      switch (step.action) {
        case 'analyze':
          // Find relevant files if not specified
          if (!step.file) {
            const relevantFiles = await findRelevantFile(step.description);
            stepResult = { 
              action: 'analyze',
              relevantFiles,
              description: step.description
            };
            
            // Add to execution record
            for (const file of relevantFiles) {
              execution.files.push({
                path: file.path,
                action: 'analyze',
                status: 'success'
              });
            }
          } else {
            // Analyze the specific file
            const fileContent = fileService.fileExists(step.file) 
              ? fileService.readFile(step.file)
              : null;
              
            stepResult = {
              action: 'analyze',
              file: step.file,
              exists: !!fileContent,
              description: step.description
            };
            
            // Add to execution record
            execution.files.push({
              path: step.file,
              action: 'analyze',
              status: fileContent ? 'success' : 'failure',
              message: fileContent ? undefined : 'File not found'
            });
          }
          break;
          
        case 'modify':
          if (!step.file) {
            // Find the most relevant file to modify
            const relevantFiles = await findRelevantFile(step.description);
            
            if (relevantFiles.length > 0) {
              const fileToModify = relevantFiles[0].path;
              const modResult = await modifyFile(fileToModify, step.description);
              
              stepResult = {
                action: 'modify',
                file: fileToModify,
                success: modResult.success,
                message: modResult.message
              };
              
              // Add to execution record
              execution.files.push({
                path: fileToModify,
                action: 'write',
                status: modResult.success ? 'success' : 'failure',
                message: modResult.message
              });
            } else {
              stepResult = {
                action: 'modify',
                success: false,
                message: 'No relevant files found for modification'
              };
            }
          } else {
            // Modify the specific file
            const modResult = await modifyFile(step.file, step.description);
            
            stepResult = {
              action: 'modify',
              file: step.file,
              success: modResult.success,
              message: modResult.message
            };
            
            // Add to execution record
            execution.files.push({
              path: step.file,
              action: 'write',
              status: modResult.success ? 'success' : 'failure',
              message: modResult.message
            });
          }
          break;
          
        case 'create':
          if (!step.file) {
            // Generate an appropriate filename based on the description
            const fileNamePrompt = `
Based on this task description: "${step.description}", 
suggest a appropriate filename (with full path and extension) for a new file to be created.
Return only the filename, no other text.
`;
            
            const fileNameResponse = await openaiService.getChatCompletion(
              fileNamePrompt,
              'You generate appropriate filenames with paths for new code files. Respond with only the filename.'
            );
            
            const fileName = fileNameResponse.trim();
            const createResult = await createFile(fileName, step.description);
            
            stepResult = {
              action: 'create',
              file: fileName,
              success: createResult.success,
              message: createResult.message
            };
            
            // Add to execution record
            execution.files.push({
              path: fileName,
              action: 'create',
              status: createResult.success ? 'success' : 'failure',
              message: createResult.message
            });
          } else {
            // Create the specific file
            const createResult = await createFile(step.file, step.description);
            
            stepResult = {
              action: 'create',
              file: step.file,
              success: createResult.success,
              message: createResult.message
            };
            
            // Add to execution record
            execution.files.push({
              path: step.file,
              action: 'create',
              status: createResult.success ? 'success' : 'failure',
              message: createResult.message
            });
          }
          break;
          
        case 'delete':
          if (step.file) {
            // Delete the specific file
            const deleteResult = await deleteFile(step.file);
            
            stepResult = {
              action: 'delete',
              file: step.file,
              success: deleteResult.success,
              message: deleteResult.message
            };
            
            // Add to execution record
            execution.files.push({
              path: step.file,
              action: 'delete',
              status: deleteResult.success ? 'success' : 'failure',
              message: deleteResult.message
            });
          } else {
            stepResult = {
              action: 'delete',
              success: false,
              message: 'No file specified for deletion'
            };
          }
          break;
          
        default:
          stepResult = {
            action: step.action,
            success: false,
            message: `Unsupported action: ${step.action}`
          };
      }
      
      results.push(stepResult);
    }
    
    // 3. Generate a summary of all actions taken
    const summary = `
Task execution complete for: "${task}"

Task Understanding: ${taskPlan.understanding}

Actions taken:
${results.map((result, index) => {
  const stepInfo = taskPlan.steps[index];
  return `- Step ${index + 1}: ${stepInfo.action.toUpperCase()} ${result.file || ''} - ${result.success ? 'SUCCESS' : 'FAILED'} 
  ${result.message ? `  Message: ${result.message}` : ''}`;
}).join('\n')}

Additional Notes: ${taskPlan.additionalNotes}
`;
    
    // Update the execution status
    execution.status = 'completed';
    execution.result = summary;
    
    return {
      success: true,
      taskId,
      message: 'Task executed successfully',
      results
    };
  } catch (error: any) {
    logError(`Error executing task: ${error.message}`, error);
    
    // If we have a task in progress with this error, mark it as failed
    const failedExecution = executionHistory.find(e => e.status === 'in_progress');
    if (failedExecution) {
      failedExecution.status = 'failed';
      failedExecution.result = `Error: ${error.message}`;
    }
    
    return {
      success: false,
      taskId: failedExecution?.taskId || generateTaskId(),
      message: `Error executing task: ${error.message}`
    };
  }
}

/**
 * Get the execution history for a specific task or all tasks
 */
export function getTaskExecutionHistory(taskId?: string): TaskExecution[] {
  if (taskId) {
    return executionHistory.filter(execution => execution.taskId === taskId);
  }
  return executionHistory;
}

/**
 * Analyze a specific file or codebase for a given task
 */
export async function analyzeCode(filePath: string | null, task: string): Promise<{
  success: boolean;
  analysis: string;
  filePath?: string;
}> {
  try {
    if (filePath) {
      logInfo(`Analyzing specific file ${filePath} for task: ${task}`);
      
      // Check if file exists
      if (!fileService.fileExists(filePath)) {
        return {
          success: false,
          analysis: `File not found: ${filePath}`,
          filePath
        };
      }
      
      // Read the file content
      const fileContent = fileService.readFile(filePath);
      
      // Get file extension
      const fileExt = path.extname(filePath);
      
      // Create prompt for AI to analyze the file
      const prompt = `
You are an expert code analyst.

Task: ${task}

File: ${filePath}

File content:
\`\`\`${fileExt}
${fileContent}
\`\`\`

Instructions:
1. Analyze the file content in detail
2. Evaluate how well it fulfills the specified task
3. Identify any issues, bugs, or improvements
4. Suggest specific code changes or enhancements

Provide a comprehensive analysis.
`;
      
      // Get completion from OpenAI
      const analysis = await openaiService.getChatCompletion(
        prompt, 
        'You are an expert code analyst that provides detailed, actionable feedback on code quality and functionality.'
      );
      
      return {
        success: true,
        analysis,
        filePath
      };
    } else {
      // Find most relevant files for the task
      const relevantFiles = await findRelevantFile(task);
      
      // Analyze top 3 most relevant files
      const topFiles = relevantFiles.slice(0, 3);
      
      const fileAnalyses = await Promise.all(
        topFiles.map(async (file) => {
          const filePath = file.path;
          if (fileService.fileExists(filePath)) {
            const fileContent = fileService.readFile(filePath);
            return {
              path: filePath,
              content: fileContent,
              relevance: file.relevance
            };
          }
          return null;
        })
      );
      
      const validFiles = fileAnalyses.filter(file => file !== null);
      
      if (validFiles.length === 0) {
        return {
          success: false,
          analysis: 'No relevant files found for analysis'
        };
      }
      
      // Create prompt for AI to analyze multiple files
      const prompt = `
You are an expert code analyst.

Task: ${task}

Relevant files for analysis:
${validFiles.map(file => {
  return `
File: ${file!.path} (Relevance: ${file!.relevance}%)
\`\`\`
${file!.content}
\`\`\`
`;
}).join('\n')}

Instructions:
1. Analyze each file in relation to the task
2. Evaluate how well the current code addresses the task requirements
3. Identify any issues, bugs, or improvements
4. Suggest specific code changes or enhancements for each file
5. Recommend which file should be modified first and how

Provide a comprehensive multi-file analysis.
`;
      
      // Get completion from OpenAI
      const analysis = await openaiService.getChatCompletion(
        prompt, 
        'You are an expert code analyst that provides detailed, actionable feedback on code quality and functionality across multiple files.'
      );
      
      return {
        success: true,
        analysis
      };
    }
  } catch (error: any) {
    logError(`Error analyzing code: ${error.message}`, error);
    return {
      success: false,
      analysis: `Error analyzing code: ${error.message}`,
      filePath: filePath || undefined
    };
  }
}

export default {
  findRelevantFile,
  modifyFile,
  createFile,
  deleteFile,
  executeTask,
  getTaskExecutionHistory,
  analyzeCode
};