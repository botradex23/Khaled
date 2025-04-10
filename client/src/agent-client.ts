/**
 * Agent API Client (TypeScript Implementation)
 * 
 * This client provides methods for interacting with the integrated agent API
 * without requiring a standalone server. It uses direct API endpoints in Express.
 */

import axios from 'axios';

// Determine if we're running in a browser or Node.js
const isBrowser = typeof window !== 'undefined';

// Default API base URL for direct operations
// In browser: relative path, in Node.js: full URL
const API_BASE_URL = isBrowser 
  ? '/api/agent' 
  : 'http://localhost:5000/api/agent';

/**
 * Agent API Client for direct operations
 */
export class AgentClient {
  private apiBaseUrl: string;
  
  /**
   * Create a new AgentClient instance
   * @param baseUrl Optional base URL (defaults to '/api/agent')
   */
  constructor(baseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = baseUrl;
  }

  /**
   * Make a request to the agent API
   * @param endpoint API endpoint path
   * @param method HTTP method (GET, POST, etc.)
   * @param data Optional request data
   * @returns Promise with the response data
   */
  private async makeRequest(endpoint: string, method: string = 'GET', data: any = null): Promise<any> {
    try {
      const url = `${this.apiBaseUrl}${endpoint}`;
      const options: any = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (data) {
        options.data = data;
      }
      
      console.log(`[AgentClient] Making ${method} request to ${url}`);
      const response = await axios(options);
      return response.data;
    } catch (error: any) {
      console.error('[AgentClient] API request error:', error.message);
      if (error.response) {
        console.error('[AgentClient] Response status:', error.response.status);
        console.error('[AgentClient] Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get the status of the agent API
   * @returns Promise with the status information
   */
  async getStatus(): Promise<any> {
    return this.makeRequest('/status');
  }

  /**
   * Verify if the OpenAI API key is valid
   * @returns Promise with the verification result
   */
  async verifyOpenAIKey(): Promise<any> {
    return this.makeRequest('/verify-openai-key');
  }

  /**
   * Read a file from the filesystem
   * @param filePath Path to the file to read
   * @returns Promise with the file content
   */
  async readFile(filePath: string): Promise<any> {
    return this.makeRequest(`/api/direct-read-file?path=${encodeURIComponent(filePath)}`);
  }

  /**
   * Write content to a file
   * @param filePath Path to the file to write
   * @param content Content to write to the file
   * @returns Promise with the result
   */
  async writeFile(filePath: string, content: string): Promise<any> {
    return this.makeRequest('/api/direct-write-file', 'POST', {
      path: filePath,
      content
    });
  }

  /**
   * List files in a directory
   * @param directory Directory path to list (defaults to '.')
   * @returns Promise with the file listing
   */
  async listFiles(directory: string = '.'): Promise<any> {
    return this.makeRequest(`/api/direct-list-files?directory=${encodeURIComponent(directory)}`);
  }

  /**
   * Execute a chat completion with the agent
   * @param prompt User prompt
   * @param systemPrompt Optional system prompt
   * @returns Promise with the chat response
   */
  async chat(prompt: string, systemPrompt?: string): Promise<any> {
    return this.makeRequest('/chat', 'POST', {
      prompt,
      systemPrompt
    });
  }

  /**
   * Execute a task with the agent
   * @param prompt Task description
   * @param systemPrompt Optional system prompt
   * @returns Promise with the task result
   */
  async executeTask(prompt: string, systemPrompt?: string): Promise<any> {
    return this.makeRequest('/task', 'POST', {
      prompt,
      systemPrompt
    });
  }

  /**
   * Execute a file operation
   * @param operation Operation name
   * @param params Operation parameters
   * @returns Promise with the operation result
   */
  async executeFileOperation(operation: string, params: any): Promise<any> {
    return this.makeRequest('/file-op', 'POST', {
      operation,
      params
    });
  }

  /**
   * Search for files in the project
   * @param directory Base directory for search
   * @param options Search options
   * @returns Promise with the search results
   */
  async searchFiles(directory: string, options?: any): Promise<any> {
    return this.makeRequest('/search-files', 'POST', {
      directory,
      options
    });
  }

  /**
   * Search for content in files
   * @param text Text to search for
   * @param options Search options
   * @returns Promise with the search results
   */
  async searchContent(text: string, options?: any): Promise<any> {
    return this.makeRequest('/search-content', 'POST', {
      text,
      options
    });
  }

  /**
   * Analyze the entire project
   * @param task Analysis task description
   * @returns Promise with the analysis results
   */
  async analyzeProject(task: string): Promise<any> {
    return this.makeRequest('/analyze-project', 'POST', {
      task
    });
  }
}

// Export a singleton instance for convenience
export const agentClient = new AgentClient();

// Export default for ES module compatibility
export default agentClient;