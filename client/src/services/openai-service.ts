/**
 * OpenAI Service
 * 
 * This service handles all interactions with the OpenAI API.
 */

import axios from 'axios';
import { logInfo, logError } from '../utils/logger';

// Constants
const OPENAI_API_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4';
const FALLBACK_MODEL = 'gpt-3.5-turbo';

/**
 * Get the OpenAI API key from environment variables
 * @returns The OpenAI API key
 */
function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }
  return apiKey;
}

/**
 * Make a request to the OpenAI API
 * @param endpoint The API endpoint
 * @param data The request data
 * @returns The API response
 */
async function makeOpenAIRequest(endpoint: string, data: any): Promise<any> {
  try {
    const apiKey = getApiKey();
    const response = await axios.post(`${OPENAI_API_URL}${endpoint}`, data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    logError('OpenAI', `API error: ${error.message}`);
    if (error.response) {
      logError('OpenAI', `Response error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Verify that the OpenAI API key is valid
 * @returns Result of the verification
 */
async function verifyApiKey(): Promise<{ success: boolean, message: string }> {
  try {
    const apiKey = getApiKey();
    // Simple models endpoint to check if key is valid
    const response = await axios.get(`${OPENAI_API_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      return { 
        success: true, 
        message: `API key is valid. ${response.data.data.length} models available.` 
      };
    } else {
      return { 
        success: false, 
        message: `Unexpected response: ${response.status}` 
      };
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    return { 
      success: false, 
      message: `Invalid API key: ${errorMessage}` 
    };
  }
}

/**
 * Get a chat completion from the OpenAI API
 * @param prompt The user prompt
 * @param systemPrompt Optional system prompt
 * @returns The chat completion response
 */
async function getChatCompletion(prompt: string, systemPrompt: string = 'You are a helpful AI assistant.'): Promise<any> {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    logInfo('OpenAI', `Sending chat completion request with prompt: ${prompt.substring(0, 50)}...`);
    
    const data = {
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    };

    const response = await makeOpenAIRequest('/chat/completions', data);
    return {
      success: true,
      message: 'Chat completion successful',
      content: response.choices[0].message.content,
      rawResponse: response
    };
  } catch (error: any) {
    // Try fallback model if the primary model fails
    if (error.response?.data?.error?.message?.includes('not available')) {
      logInfo('OpenAI', `Primary model not available, falling back to ${FALLBACK_MODEL}`);
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ];
        
        const data = {
          model: FALLBACK_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2048
        };

        const response = await makeOpenAIRequest('/chat/completions', data);
        return {
          success: true,
          message: `Using fallback model ${FALLBACK_MODEL}`,
          content: response.choices[0].message.content,
          rawResponse: response
        };
      } catch (fallbackError: any) {
        logError('OpenAI', `Fallback model failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
    
    logError('OpenAI', `Chat completion error: ${error.message}`);
    throw error;
  }
}

/**
 * Smart analyze and edit functionality
 * @param task The editing task description
 * @returns Result of the edit operation
 */
async function smartAnalyzeAndEdit(task: string): Promise<any> {
  try {
    // First, analyze the task
    const systemPrompt = `You are an expert software developer specialized in analyzing code and making smart edits. 
    Analyze the task carefully and provide a plan for changes.`;
    
    const analysisResponse = await getChatCompletion(task, systemPrompt);
    
    logInfo('OpenAI', `Analyzed task: ${task.substring(0, 50)}...`);
    
    // Return the analysis result
    return {
      success: true,
      message: 'Smart analysis completed',
      analysis: analysisResponse.content,
      task
    };
  } catch (error: any) {
    logError('OpenAI', `Smart edit error: ${error.message}`);
    return { 
      success: false, 
      message: `Smart edit error: ${error.message}` 
    };
  }
}

// Export named functions
export { verifyApiKey, getChatCompletion, smartAnalyzeAndEdit };

// Export default object for backwards compatibility
export default {
  verifyApiKey,
  getChatCompletion,
  smartAnalyzeAndEdit
};