/**
 * Agent Controller
 * 
 * This module provides a central controller for the Agent functionality.
 * It integrates the OpenAI service and file service into a single interface.
 */

import openaiService from './openai-service';
import fileService from './file-service';

/**
 * Log information message
 */
function logInfo(message: string): void {
  console.log(`[Agent Controller] ${message}`);
}

/**
 * Log error message
 */
function logError(message: string, error?: any): void {
  console.error(`[Agent Controller] ERROR: ${message}`, error);
}

/**
 * Get health status of the agent services
 */
export function getAgentStatus(): any {
  try {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        file: true
      }
    };
  } catch (error: any) {
    logError('Error getting agent status', error);
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Get a chat completion from OpenAI
 */
export async function getAgentChatResponse(prompt: string, systemPrompt?: string): Promise<any> {
  try {
    logInfo(`Getting chat response for prompt: ${prompt.substring(0, 50)}...`);
    const response = await openaiService.getChatCompletion(prompt, systemPrompt);
    return response;
  } catch (error: any) {
    logError('Error getting chat response', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Execute a complex agent task with file operations
 */
export async function executeAgentTask(prompt: string, systemPrompt?: string): Promise<any> {
  try {
    logInfo(`Executing agent task for prompt: ${prompt.substring(0, 50)}...`);
    const response = await openaiService.executeAgentTask(prompt, systemPrompt);
    return response;
  } catch (error: any) {
    logError('Error executing agent task', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Execute a file operation
 */
export async function executeFileOperation(operation: string, params: any): Promise<any> {
  try {
    logInfo(`Executing file operation: ${operation}`);
    
    // Execute the requested operation based on which one it is
    let result: any;
    
    switch (operation) {
      case 'readFile':
        result = fileService.readFile(params.path);
        break;
      case 'listFiles':
        result = fileService.listFiles(params.directory);
        break;
      case 'listFilesRecursive':
        result = fileService.listFilesRecursive(params.directory, params.options);
        break;
      case 'findFilesContainingText':
        result = await fileService.findFilesContainingText(params.text, params.options);
        break;
      case 'fileExists':
        result = fileService.fileExists(params.filePath);
        break;
      default:
        throw new Error(`Unsupported file operation: ${operation}`);
    }
    
    return {
      success: true,
      result
    };
  } catch (error: any) {
    logError(`Error executing file operation ${operation}`, error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Verify that the OpenAI API key is valid
 */
export async function verifyOpenAIKey(): Promise<any> {
  try {
    logInfo('Verifying OpenAI API key');
    const result = await openaiService.verifyOpenAIKey();
    return result;
  } catch (error: any) {
    logError('Error verifying OpenAI API key', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    };
  }
}

export default {
  getAgentStatus,
  getAgentChatResponse,
  executeAgentTask,
  executeFileOperation,
  verifyOpenAIKey
};