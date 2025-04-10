/**
 * Agent Controller
 * 
 * This controller handles all the logic related to the AI agent functionality.
 * It manages interactions with the OpenAI API and file operations.
 */

import { openai, file } from '../services';
import { logInfo, logError } from '../utils/logger';

// Agent status tracking
let agentStatus = {
  initialized: false,
  openAIKeyValid: false,
  lastCheck: null as Date | null,
  features: {
    chat: false,
    fileOperations: true,
    codeAnalysis: false
  }
};

/**
 * Get the current status of the agent
 * @returns The agent status object with timestamp
 */
function getAgentStatus(): any {
  return {
    ...agentStatus,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get a chat response from the agent
 * @param prompt The user prompt
 * @param systemPrompt Optional system prompt
 * @returns Promise resolving to the chat response
 */
async function getAgentChatResponse(prompt: string, systemPrompt?: string): Promise<any> {
  try {
    logInfo('AgentController', `Processing chat request: ${prompt.substring(0, 50)}...`);
    const response = await openai.getChatCompletion(prompt, systemPrompt);
    return {
      success: true,
      message: 'Chat response generated successfully',
      content: response.content
    };
  } catch (error: any) {
    logError('AgentController', `Error generating chat response: ${error.message}`);
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Execute a task with the agent
 * @param prompt The task prompt
 * @param systemPrompt Optional system prompt
 * @returns Promise resolving to the task result
 */
async function executeAgentTask(prompt: string, systemPrompt?: string): Promise<any> {
  try {
    const response = await openai.getChatCompletion(prompt, systemPrompt);
    return {
      success: true,
      message: 'Task executed successfully',
      content: response.content,
      taskId: Date.now().toString()
    };
  } catch (error: any) {
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Suggest code changes based on the provided context
 * @param codeContext Code context object
 * @returns Promise resolving to the suggestions
 */
async function suggestCodeChanges(codeContext: any): Promise<any> {
  try {
    const prompt = `Please suggest improvements for this code: ${JSON.stringify(codeContext)}`;
    const systemPrompt = 'You are an expert programmer. Suggest improvements.';
    const response = await openai.getChatCompletion(prompt, systemPrompt);
    return {
      success: true,
      suggestions: response.content
    };
  } catch (error: any) {
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Apply suggested changes to code
 * @param changes Changes to apply
 * @returns Promise resolving to the result of applying changes
 */
async function applySuggestedChanges(changes: any): Promise<any> {
  try {
    logInfo('AgentController', `Would apply changes: ${JSON.stringify(changes)}`);
    return {
      success: true,
      message: 'Changes would be applied (not implemented)',
      changes
    };
  } catch (error: any) {
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Execute a file operation
 * @param operation Operation name
 * @param params Operation parameters
 * @returns Promise resolving to the operation result
 */
async function executeFileOperation(operation: string, params: any): Promise<any> {
  try {
    if (typeof file[operation] === 'function') {
      const result = await file[operation](...Object.values(params));
      return {
        success: true,
        message: `Operation ${operation} executed successfully`,
        result
      };
    } else {
      return { success: false, message: `Operation ${operation} not supported` };
    }
  } catch (error: any) {
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Analyze the entire project
 * @param task Analysis task description
 * @returns Promise resolving to the analysis result
 */
async function analyzeEntireProject(task: string): Promise<any> {
  try {
    const systemPrompt = 'You are an expert code analyzer.';
    const response = await openai.getChatCompletion(task, systemPrompt);
    return {
      success: true,
      analysis: response.content
    };
  } catch (error: any) {
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Smart analyze and edit functionality
 * @param task The editing task description
 * @returns Promise resolving to the smart edit result
 */
async function smartAnalyzeAndEdit(task: string): Promise<any> {
  try {
    const result = await openai.smartAnalyzeAndEdit(task);
    return result;
  } catch (error: any) {
    return { success: false, message: `Smart edit error: ${error.message}` };
  }
}

/**
 * Verify the OpenAI API key
 * @returns Promise resolving to the verification result
 */
async function verifyOpenAIKey(): Promise<any> {
  try {
    const result = await openai.verifyApiKey();
    agentStatus.openAIKeyValid = result.success;
    agentStatus.lastCheck = new Date();
    agentStatus.initialized = true;
    agentStatus.features.chat = result.success;
    agentStatus.features.codeAnalysis = result.success;
    return result;
  } catch (error: any) {
    agentStatus.openAIKeyValid = false;
    agentStatus.initialized = true;
    return { success: false, message: `Error: ${error.message}` };
  }
}

// Export named functions
export {
  getAgentStatus,
  getAgentChatResponse,
  executeAgentTask,
  suggestCodeChanges,
  applySuggestedChanges,
  executeFileOperation,
  analyzeEntireProject,
  smartAnalyzeAndEdit,
  verifyOpenAIKey
};

// Export default object for backwards compatibility
export default {
  getAgentStatus,
  getAgentChatResponse,
  executeAgentTask,
  suggestCodeChanges,
  applySuggestedChanges,
  executeFileOperation,
  analyzeEntireProject,
  smartAnalyzeAndEdit,
  verifyOpenAIKey
};