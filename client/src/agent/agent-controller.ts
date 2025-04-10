import { openai, file } from '../services';
import { logInfo, logError } from '../utils/logger';

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

function getAgentStatus(): any {
  return {
    ...agentStatus,
    timestamp: new Date().toISOString()
  };
}

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

async function smartAnalyzeAndEdit(task: string): Promise<any> {
  try {
    const result = await openai.smartAnalyzeAndEdit(task);
    return result;
  } catch (error: any) {
    return { success: false, message: `Smart edit error: ${error.message}` };
  }
}

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