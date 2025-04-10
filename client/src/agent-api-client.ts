/**
 * Agent API Client
 * 
 * This module provides a direct client for accessing the agent API functionalities
 * without going through the Express routes that are affected by Vite middleware.
 * 
 * This is the ES module version for use with import in TypeScript/ES modules.
 * For CommonJS usage, use agent-api-client.cjs instead.
 */

import { agent } from './controllers';
import { logInfo, logError } from './utils/logger';

/**
 * Class that provides direct access to agent controller functions
 */
export class AgentApiClient {
  /**
   * Get the current status of the agent
   * @returns The agent status object with timestamp
   */
  getStatus() {
    try {
      return agent.getAgentStatus();
    } catch (error: any) {
      logError('AgentApiClient', `Error getting status: ${error.message}`);
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verify the OpenAI API key
   * @returns Promise resolving to the verification result
   */
  async verifyOpenAIKey() {
    try {
      return await agent.verifyOpenAIKey();
    } catch (error: any) {
      logError('AgentApiClient', `Error verifying OpenAI key: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get a chat response from the agent
   * @param prompt The user prompt
   * @param systemPrompt Optional system prompt
   * @returns Promise resolving to the chat response
   */
  async getChatResponse(prompt: string, systemPrompt?: string) {
    try {
      return await agent.getAgentChatResponse(prompt, systemPrompt);
    } catch (error: any) {
      logError('AgentApiClient', `Error getting chat response: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Execute a task with the agent
   * @param prompt The task prompt
   * @param systemPrompt Optional system prompt
   * @returns Promise resolving to the task result
   */
  async executeTask(prompt: string, systemPrompt?: string) {
    try {
      return await agent.executeAgentTask(prompt, systemPrompt);
    } catch (error: any) {
      logError('AgentApiClient', `Error executing task: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Execute a file operation
   * @param operation Operation name
   * @param params Operation parameters
   * @returns Promise resolving to the operation result
   */
  async executeFileOperation(operation: string, params: any) {
    try {
      return await agent.executeFileOperation(operation, params);
    } catch (error: any) {
      logError('AgentApiClient', `Error executing file operation: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Smart analyze and edit functionality
   * @param task The editing task description
   * @returns Promise resolving to the smart edit result
   */
  async smartAnalyzeAndEdit(task: string) {
    try {
      return await agent.smartAnalyzeAndEdit(task);
    } catch (error: any) {
      logError('AgentApiClient', `Error with smart analyze and edit: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Create singleton instance
const agentApiClient = new AgentApiClient();

// Export for ES modules
export { AgentApiClient, agentApiClient };
export default agentApiClient;