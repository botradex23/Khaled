import * as openaiService from './openai-service';
import fileService from './file-service';

function logInfo(message: string): void {
  console.log(`[Agent Controller] ${message}`);
}

function logError(message: string, error?: any): void {
  console.error(`[Agent Controller] ERROR: ${message}`, error);
}

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

export async function executeFileOperation(operation: string, params: any): Promise<any> {
  try {
    logInfo(`Executing file operation: ${operation}`);

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
      case 'suggestCodeChanges':
        result = await openaiService.suggestCodeChanges(params.task, params.filePath);
        break;
      case 'applyChangesToFile':
        result = await openaiService.applySuggestedChanges(params.filePath, params.task);
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

export async function analyzeEntireProject(task: string): Promise<any> {
  try {
    logInfo(`Analyzing entire project for task: ${task}`);
    const result = await openaiService.analyzeEntireProject(process.cwd(), task);
    return result;
  } catch (error: any) {
    logError('Error analyzing entire project', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    };
  }
}

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
  analyzeEntireProject,
  verifyOpenAIKey
};