/**
 * Autonomous Agent Client
 * 
 * This module provides a TypeScript client for the autonomous agent API,
 * allowing seamless integration with the frontend.
 */

import axios from 'axios';

interface AgentRequestOptions {
  headers?: Record<string, string>;
}

interface TaskResult {
  success: boolean;
  taskId?: string;
  message: string;
  results?: any[];
}

interface CodeAnalysisResult {
  success: boolean;
  analysis: string;
  filePath?: string;
}

interface FileOperationResult {
  success: boolean;
  message: string;
}

interface TaskHistory {
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

interface RelevantFile {
  path: string;
  relevance: number;
}

/**
 * Autonomous Agent Client class for interacting with the agent API
 */
export class AutonomousAgentClient {
  private baseUrl: string;
  private defaultOptions: AgentRequestOptions;

  /**
   * Create a new agent client
   * @param baseUrl Base URL for the API (default: '')
   * @param options Additional options
   */
  constructor(baseUrl: string = '', options: AgentRequestOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = options;
  }

  /**
   * Execute a fully autonomous task
   * @param task Natural language task description
   * @returns Task execution result
   */
  async executeTask(task: string): Promise<TaskResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/agent/api/autonomous-task`, { task }, this.defaultOptions);
      return response.data;
    } catch (error: any) {
      console.error('Error executing task:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Analyze code for a specific file or find relevant files automatically
   * @param task Natural language task description
   * @param filePath Optional file path to analyze (if null, relevant files will be found automatically)
   * @returns Code analysis result
   */
  async analyzeCode(task: string, filePath?: string): Promise<CodeAnalysisResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/agent/api/analyze-code`, 
        { task, filePath }, 
        this.defaultOptions
      );
      return response.data;
    } catch (error: any) {
      console.error('Error analyzing code:', error);
      return {
        success: false,
        analysis: error.response?.data?.message || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Find relevant files for a task
   * @param task Natural language task description
   * @returns List of relevant files with relevance scores
   */
  async findRelevantFiles(task: string): Promise<RelevantFile[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/agent/api/find-relevant-files`, 
        { task }, 
        this.defaultOptions
      );
      return response.data.result || [];
    } catch (error: any) {
      console.error('Error finding relevant files:', error);
      return [];
    }
  }

  /**
   * Modify a file based on a task
   * @param path Path to the file to modify
   * @param task Natural language task description
   * @returns File operation result
   */
  async modifyFile(path: string, task: string): Promise<FileOperationResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/agent/api/modify-file`, 
        { path, task }, 
        this.defaultOptions
      );
      return response.data.result || { success: false, message: 'No result returned' };
    } catch (error: any) {
      console.error('Error modifying file:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Create a new file based on a task
   * @param path Path where the file should be created
   * @param task Natural language task description
   * @returns File operation result
   */
  async createFile(path: string, task: string): Promise<FileOperationResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/agent/api/create-file`, 
        { path, task }, 
        this.defaultOptions
      );
      return response.data.result || { success: false, message: 'No result returned' };
    } catch (error: any) {
      console.error('Error creating file:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get task execution history
   * @param taskId Optional task ID to filter history
   * @returns Task execution history
   */
  async getTaskHistory(taskId?: string): Promise<TaskHistory[]> {
    try {
      let url = `${this.baseUrl}/api/agent/api/task-history`;
      if (taskId) {
        url += `?taskId=${encodeURIComponent(taskId)}`;
      }
      const response = await axios.get(url, this.defaultOptions);
      return response.data.result || [];
    } catch (error: any) {
      console.error('Error getting task history:', error);
      return [];
    }
  }
}

// Create and export default instance with browser-appropriate base URL
const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:5000';
export const autonomousAgent = new AutonomousAgentClient(baseUrl);

export default autonomousAgent;