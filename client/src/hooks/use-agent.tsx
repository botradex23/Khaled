// Agent API Hook
// This hook provides access to the OpenAI agent functionality
import { useState } from 'react';
import axios from 'axios';

type AgentResponse = {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
};

export function useAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<any | null>(null);

  // Check if the agent server is running
  const checkAgentStatus = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try the v2 agent first (new implementation)
      const response = await axios.get('/api/agent-v2/status');
      
      if (response.data.status === 'ok') {
        setIsLoading(false);
        return true;
      }
      
      // If v2 fails, try the legacy endpoint
      const legacyResponse = await axios.get('/api/agent-legacy-status');
      setIsLoading(false);
      return legacyResponse.data.status === 'ok';
    } catch (error) {
      console.error('Error checking agent status:', error);
      setError('Agent server is not available');
      setIsLoading(false);
      return false;
    }
  };
  
  // Send a chat message to the agent
  const sendChatMessage = async (prompt: string, systemPrompt?: string): Promise<AgentResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Attempt with v2 agent first
      try {
        const response = await axios.post('/api/agent-v2/chat', {
          prompt,
          systemPrompt: systemPrompt || 'You are a helpful AI assistant.'
        });
        
        setResponse(response.data);
        setIsLoading(false);
        return {
          success: true,
          message: 'Chat message sent successfully',
          data: response.data
        };
      } catch (v2Error) {
        console.log('V2 agent failed, trying legacy endpoint:', v2Error);
        
        // Fall back to legacy agent
        const legacyResponse = await axios.post('/api/agent/agent-chat', {
          prompt,
          systemPrompt: systemPrompt || 'You are a helpful AI assistant.'
        });
        
        setResponse(legacyResponse.data);
        setIsLoading(false);
        return {
          success: true,
          message: 'Chat message sent successfully (legacy)',
          data: legacyResponse.data
        };
      }
    } catch (error: any) {
      console.error('Error sending chat message to agent:', error);
      setError(error.message || 'Failed to send message to agent');
      setIsLoading(false);
      return {
        success: false,
        message: 'Failed to send message to agent',
        error: error.message
      };
    }
  };
  
  // Perform a specific task with the agent
  const performTask = async (task: string, context?: string): Promise<AgentResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Attempt with v2 agent first
      try {
        const response = await axios.post('/api/agent-v2/task', {
          task,
          context: context || ''
        });
        
        setResponse(response.data);
        setIsLoading(false);
        return {
          success: true,
          message: 'Task executed successfully',
          data: response.data
        };
      } catch (v2Error) {
        console.log('V2 agent task failed, trying legacy endpoint:', v2Error);
        
        // Fall back to legacy agent
        const legacyResponse = await axios.post('/api/agent/agent-task', {
          task,
          context: context || ''
        });
        
        setResponse(legacyResponse.data);
        setIsLoading(false);
        return {
          success: true,
          message: 'Task executed successfully (legacy)',
          data: legacyResponse.data
        };
      }
    } catch (error: any) {
      console.error('Error performing task with agent:', error);
      setError(error.message || 'Failed to perform task with agent');
      setIsLoading(false);
      return {
        success: false,
        message: 'Failed to perform task with agent',
        error: error.message
      };
    }
  };
  
  // Search for files containing specific content
  const searchContent = async (content: string): Promise<AgentResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/agent-v2/search-content', {
        text: content
      });
      
      setResponse(response.data);
      setIsLoading(false);
      return {
        success: true,
        message: 'Content search completed',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error searching content with agent:', error);
      setError(error.message || 'Failed to search content');
      setIsLoading(false);
      return {
        success: false,
        message: 'Failed to search content',
        error: error.message
      };
    }
  };
  
  return {
    isLoading,
    error,
    response,
    checkAgentStatus,
    sendChatMessage,
    performTask,
    searchContent
  };
}