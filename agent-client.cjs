/**
 * Agent Client (CommonJS Version)
 * 
 * This module provides a direct client for accessing the agent API functionalities
 * without going through the Express routes that are affected by Vite middleware.
 * 
 * This is the CommonJS version for use with require() in Node.js scripts.
 */

// Import required components
// The project structure is a bit unusual - controllers are either in src/ or server/
// so we need to try different paths
let agent, logError;

// Define a helper for safer imports
function safeRequire(paths) {
  for (const path of paths) {
    try {
      return require(path);
    } catch (err) {
      console.log(`Module not found at ${path}`);
    }
  }
  return null;
}

// Try to find the controllers module
const controllers = safeRequire([
  './src/controllers/index.js',    // Built JS file in src
  './src/controllers',             // Source in src
  './server/controllers/index.js', // Built JS in server
  './server/controllers',          // Source in server
  './controllers'                  // Fallback to root
]);

// Try to find the logger module
const logger = safeRequire([
  './src/utils/logger.js',    // Built JS file in src
  './src/utils/logger',       // Source in src
  './server/utils/logger.js', // Built JS in server
  './server/utils/logger',    // Source in server
  './utils/logger'            // Fallback to root
]);

if (controllers && controllers.agent) {
  agent = controllers.agent;
  console.log('Successfully loaded agent controller');
} else {
  console.log('Could not load agent controller, using stub implementation');
  agent = {
    getAgentStatus: () => ({ status: 'error', message: 'Agent controller not loaded' }),
    verifyOpenAIKey: async () => ({ success: false, message: 'Agent controller not loaded' }),
    getAgentChatResponse: async () => ({ success: false, message: 'Agent controller not loaded' }),
    executeAgentTask: async () => ({ success: false, message: 'Agent controller not loaded' }),
    executeFileOperation: async () => ({ success: false, message: 'Agent controller not loaded' }),
    smartAnalyzeAndEdit: async () => ({ success: false, message: 'Agent controller not loaded' })
  };
}

if (logger && logger.logError) {
  logError = logger.logError;
  console.log('Successfully loaded logger');
} else {
  console.log('Could not load logger, using stub implementation');
  logError = (component, message) => console.error(`[${component}]`, message);
}

/**
 * Class that provides direct access to agent controller functions
 */
class AgentClient {
  /**
   * Get the current status of the agent
   * @returns The agent status object with timestamp
   */
  getStatus() {
    try {
      return agent.getAgentStatus();
    } catch (error) {
      logError('AgentClient', `Error getting status: ${error.message}`);
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
    } catch (error) {
      logError('AgentClient', `Error verifying OpenAI key: ${error.message}`);
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
  async getChatResponse(prompt, systemPrompt) {
    try {
      return await agent.getAgentChatResponse(prompt, systemPrompt);
    } catch (error) {
      logError('AgentClient', `Error getting chat response: ${error.message}`);
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
  async executeTask(prompt, systemPrompt) {
    try {
      return await agent.executeAgentTask(prompt, systemPrompt);
    } catch (error) {
      logError('AgentClient', `Error executing task: ${error.message}`);
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
  async executeFileOperation(operation, params) {
    try {
      return await agent.executeFileOperation(operation, params);
    } catch (error) {
      logError('AgentClient', `Error executing file operation: ${error.message}`);
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
  async smartAnalyzeAndEdit(task) {
    try {
      return await agent.smartAnalyzeAndEdit(task);
    } catch (error) {
      logError('AgentClient', `Error with smart analyze and edit: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Create singleton instance
const agentClient = new AgentClient();

// Export for CommonJS
module.exports = {
  AgentClient, 
  agentClient
};