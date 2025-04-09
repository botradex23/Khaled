/**
 * OpenAI Agent Service
 * 
 * This module provides OpenAI API integration for the Tradeliy platform.
 * It handles chat completions and specialized trading agent tasks.
 */

import fetch from 'node-fetch';
// Use native AbortController if available, otherwise will be polyfilled by node-fetch
const AbortController = global.AbortController || require('abort-controller');

// Constants
const OPENAI_API_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-3.5-turbo';
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Log information message
 */
function logInfo(message: string): void {
  console.log(`[OpenAI Service] ${message}`);
}

/**
 * Log error message
 */
function logError(message: string, error?: any): void {
  console.error(`[OpenAI Service] ERROR: ${message}`, error);
}

/**
 * Make a request to the OpenAI API
 */
async function makeOpenAIRequest(endpoint: string, data: any): Promise<any> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    // Log the first 5 characters of the API key for debugging
    const apiKeyPreview = apiKey.substring(0, 5) + '...';
    logInfo(`Making OpenAI API request to ${endpoint} with API key starting with ${apiKeyPreview}`);
    
    // Set up fetch options with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(data),
      signal: controller.signal as any
    };
    
    // Log the request data (with sensitive info redacted)
    const redactedData = { ...data };
    if (redactedData.model) {
      logInfo(`Using model: ${redactedData.model}`);
    }
    
    // Make the actual fetch request
    const response = await fetch(`${OPENAI_API_URL}/${endpoint}`, fetchOptions);
    clearTimeout(timeoutId); // Clear the timeout if request completes before timeout
    
    if (!response.ok) {
      const errorText = await response.text();
      logError(`OpenAI API Error (${response.status})`, errorText);
      throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
    }
    
    logInfo(`OpenAI API request to ${endpoint} successful`);
    return await response.json();
  } catch (error: any) {
    // Check for specific errors
    if (error.name === 'AbortError') {
      logError('OpenAI API request timed out after 15 seconds', error);
      throw new Error('OpenAI API request timed out after 15 seconds. Please try again.');
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      logError('OpenAI API network error', error);
      throw new Error(`Network error connecting to OpenAI: ${error.message}`);
    } else {
      logError('OpenAI API request failed', error);
      throw error;
    }
  }
}

/**
 * Get a chat completion from OpenAI
 */
export async function getChatCompletion(prompt: string, systemPrompt = 'You are a helpful AI assistant.'): Promise<any> {
  try {
    logInfo(`Making chat completion request with prompt: ${prompt.substring(0, 50)}...`);
    
    // Enhance system prompt with domain-specific knowledge if not already provided
    let enhancedSystemPrompt = systemPrompt;
    
    // If no custom system prompt is provided, use an enhanced one for the trading platform
    if (systemPrompt === 'You are a helpful AI assistant.') {
      enhancedSystemPrompt = `You are an expert cryptocurrency trading assistant for the Tradeliy platform.
      
You specialize in:
1. Cryptocurrency trading strategies and market analysis
2. Technical indicators and chart patterns
3. Machine learning models for price prediction
4. Trading automation and bot configuration
5. Crypto exchange APIs and integration
6. Risk management and portfolio optimization
7. Market data analysis and visualization
8. Binance and OKX exchange features

Tradeliy platform features:
- Advanced AI-driven price prediction models using XGBoost and neural networks
- Dual-broker architecture supporting Binance (primary) and OKX (fallback)
- Paper trading capabilities for strategy testing
- Automated trading bots with customizable parameters
- Real-time market data visualization
- Machine learning model performance tracking
- User permission management system
- Multi-currency support with comprehensive internationalization

Always provide accurate, helpful information about cryptocurrency trading and the Tradeliy platform features.`;
    }
    
    // Set a timeout for the OpenAI request (extended to 30 seconds for more complex responses)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API request timed out after 30 seconds')), 30000);
    });
    
    // Create the actual API request
    const apiRequestPromise = makeOpenAIRequest('chat/completions', {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800 // Increased token limit for more comprehensive responses
    });
    
    // Race between the timeout and the API request
    const response = await Promise.race([apiRequestPromise, timeoutPromise]);
    
    logInfo('Chat completion successful');
    return {
      success: true,
      message: response.choices[0].message.content,
      full_response: response
    };
  } catch (error: any) {
    logError('Error getting chat completion', error);
    return {
      success: false,
      message: `Error getting chat completion: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Execute a complex agent task with file operations
 */
export async function executeAgentTask(prompt: string, systemPrompt?: string): Promise<any> {
  try {
    // If no custom system prompt is provided, use a specialized one for the platform
    const defaultSystemPrompt = `You are an expert cryptocurrency trading assistant and system agent for the Tradeliy platform.

You specialize in:
1. Cryptocurrency trading strategies and market analysis
2. Technical indicators and chart patterns
3. Machine learning models for price prediction
4. Trading automation and bot configuration
5. Crypto exchange APIs and integration
6. Risk management and portfolio optimization
7. Market data analysis and visualization
8. System administration and debugging

Tradeliy platform features:
- Advanced AI-driven price prediction models using XGBoost and neural networks
- Dual-broker architecture supporting Binance (primary) and OKX (fallback)
- Paper trading capabilities for strategy testing
- Automated trading bots with customizable parameters
- Real-time market data visualization
- Machine learning model performance tracking
- User permission management system
- Multi-currency support with comprehensive internationalization

Always provide accurate, helpful information about cryptocurrency trading and the Tradeliy platform's features and systems.`;

    // Use the provided system prompt or our default if none was provided
    const baseSystemPrompt = systemPrompt || defaultSystemPrompt;
    
    // Enhanced system prompt that mentions file operation capabilities
    const enhancedSystemPrompt = `${baseSystemPrompt}

You have access to the file system. You can perform the following operations:
- Read files using readFile(path)
- List files in directories using listFiles(directory)
- List files recursively using listFilesRecursive(directory, options)
- Find files containing specific text using findFilesContainingText(text, options)

When referring to files, use relative paths from the project root or provide clear file names.
To examine code, first search for relevant files that might contain the information you need.
Key directories:
- /server - Server-side code including API routes and services
- /client - Frontend React application
- /shared - Shared code and schemas used by both client and server
- /ml_models - Machine learning model definitions and utilities
- /python_app - Python-based ML prediction and data processing systems`;
    
    // Get chat completion with the enhanced system prompt
    return await getChatCompletion(prompt, enhancedSystemPrompt);
    
  } catch (error: any) {
    return {
      success: false,
      message: `Error executing agent task: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Verify the OpenAI API key is valid and working
 */
export async function verifyOpenAIKey(): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        message: 'OPENAI_API_KEY is not set in environment variables'
      };
    }
    
    // Use the chat completions endpoint instead of models for verification
    // (models endpoint requires GET which our makeOpenAIRequest doesn't support)
    const response = await makeOpenAIRequest('chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "This is a test to verify your API key."
        },
        {
          role: "user",
          content: "Just respond with 'valid' if you receive this message."
        }
      ],
      max_tokens: 10
    });
    
    // If we get here, the key is valid
    return {
      success: true,
      message: 'OpenAI API key is valid',
      response_content: response.choices && response.choices[0] ? response.choices[0].message.content : 'unknown'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Invalid OpenAI API key: ${error.message}`,
      error: error.message
    };
  }
}

export default {
  getChatCompletion,
  executeAgentTask,
  verifyOpenAIKey
};