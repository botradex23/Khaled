import * as openaiService from './openai-service';
import fileService from './file-service';
import autonomousAgent from './autonomous-agent-engine';

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
        file: true,
        autonomousAgent: true
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
      case 'findRelevantFile':
        result = await autonomousAgent.findRelevantFile(params.task);
        break;
      case 'modifyFile':
        result = await autonomousAgent.modifyFile(params.path, params.task);
        break;
      case 'createFile':
        result = await autonomousAgent.createFile(params.path, params.task);
        break;
      case 'deleteFile':
        result = await autonomousAgent.deleteFile(params.path);
        break;
      case 'executeTask':
        result = await autonomousAgent.executeTask(params.task);
        break;
      case 'getTaskExecutionHistory':
        result = autonomousAgent.getTaskExecutionHistory(params.taskId);
        break;
      case 'analyzeCode':
        result = await autonomousAgent.analyzeCode(params.filePath, params.task);
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
    const result = await openaiService.validateOpenAIKey();
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

/**
 * Execute a fully autonomous task with the agent
 */
export async function executeAutonomousTask(task: string): Promise<any> {
  try {
    logInfo(`Executing autonomous task: ${task.substring(0, 50)}...`);
    const result = await autonomousAgent.executeTask(task);
    return result;
  } catch (error: any) {
    logError('Error executing autonomous task', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Analyze code for a specific file or find relevant files automatically
 */
export async function analyzeCode(filePath: string | null, task: string): Promise<any> {
  try {
    logInfo(`Analyzing code for task: ${task.substring(0, 50)}...`);
    const result = await autonomousAgent.analyzeCode(filePath, task);
    return result;
  } catch (error: any) {
    logError('Error analyzing code', error);
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
  verifyOpenAIKey,
  executeAutonomousTask,
  analyzeCode
};