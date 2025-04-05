/**
 * Enhanced OpenAI service with conversation memory
 * Uses MongoDB for storing conversation history
 * Note: This is a simplified version that uses fetch directly instead of the OpenAI SDK
 */

import { Message, ConversationStorage } from './conversationService';

export class EnhancedOpenAIService {
  private apiKey: string | null = null;
  private conversationStorage: ConversationStorage;
  
  // Default system prompt for our trading assistant
  private defaultSystemPrompt = `You are a trading assistant powered by OpenAI for an advanced cryptocurrency trading platform. 
Your goal is to help users with their crypto trading strategy, market analysis, and portfolio management. 
You can access the platform's data and features through the admin interface.
Be concise, accurate, and helpful.`;
  
  constructor(conversationStorage: ConversationStorage) {
    this.conversationStorage = conversationStorage;
    console.log('🤖 Enhanced OpenAI service initialized with conversation memory');
  }
  
  /**
   * Initialize the API key (or retrieve it from env)
   */
  public initialize(): boolean {
    try {
      // Get API key from environment variable
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        console.error('❌ OpenAI API key not found in environment variables');
        return false;
      }
      
      this.apiKey = apiKey;
      console.log('✅ OpenAI service initialized with API key');
      return true;
    } catch (error) {
      console.error('❌ Error initializing OpenAI service:', error);
      return false;
    }
  }
  
  /**
   * Validate the OpenAI API key by sending a minimal request
   */
  public async validateKey(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apiKey) {
        return { 
          success: false, 
          message: 'OpenAI API key is not initialized' 
        };
      }
      
      // Send a minimal request to check if the API key is valid
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // If we get here, the key is valid
      return { 
        success: true, 
        message: `OpenAI API key is valid. Available models: ${data.data.length}` 
      };
    } catch (error) {
      console.error('❌ Error validating OpenAI API key:', error);
      return { 
        success: false, 
        message: `Invalid OpenAI API key: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  /**
   * Send a chat completion request using message history from a specific session
   * @param sessionId Unique identifier for the conversation session
   * @param userMessage The user's message content
   * @param systemPrompt Optional custom system prompt. If not provided, uses the default.
   */
  public async getChatCompletionWithMemory(
    sessionId: string,
    userMessage: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key is not initialized');
      }
      
      // Get message history for this session
      const messageHistory = await this.conversationStorage.getMessages(sessionId);
      console.log(`📚 Retrieved ${messageHistory.length} previous messages for session ${sessionId}`);
      
      // Check if we have a system message already
      const hasSystemMessage = messageHistory.some(msg => msg.role === 'system');
      
      // If a new system prompt is provided, replace the existing one or add a new one
      if (systemPrompt) {
        if (hasSystemMessage) {
          // Remove the existing system message
          const systemMessageIndex = messageHistory.findIndex(msg => msg.role === 'system');
          if (systemMessageIndex !== -1) {
            messageHistory.splice(systemMessageIndex, 1);
          }
        }
        
        // Add the new system message
        const systemMessage: Message = {
          role: 'system',
          content: systemPrompt
        };
        
        // Save to storage
        await this.conversationStorage.saveMessage(sessionId, systemMessage);
        
        // Add to the current message history
        messageHistory.unshift(systemMessage);
      } 
      // If no system message exists and no custom one is provided, add the default
      else if (!hasSystemMessage) {
        // Add default system message
        const systemMessage: Message = {
          role: 'system',
          content: this.defaultSystemPrompt
        };
        
        // Save to storage
        await this.conversationStorage.saveMessage(sessionId, systemMessage);
        
        // Add to the current message history
        messageHistory.unshift(systemMessage);
      }
      
      // Create the user message
      const newUserMessage: Message = {
        role: 'user',
        content: userMessage
      };
      
      // Save user message to storage
      await this.conversationStorage.saveMessage(sessionId, newUserMessage);
      
      // Add the new user message to the history
      const fullHistory = [...messageHistory, newUserMessage];
      
      console.log(`🔄 Sending ${fullHistory.length} messages to OpenAI`);
      
      // Send the full conversation to OpenAI using fetch API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: fullHistory,
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Get the response content
      const assistantMessage = data.choices[0].message.content;
      
      if (!assistantMessage) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Save the assistant's response to storage
      const newAssistantMessage: Message = {
        role: 'assistant',
        content: assistantMessage
      };
      
      await this.conversationStorage.saveMessage(sessionId, newAssistantMessage);
      
      return assistantMessage;
    } catch (error) {
      console.error('❌ Error getting chat completion with memory:', error);
      throw new Error(`Failed to get response from OpenAI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clear the conversation history for a specific session
   */
  public async clearConversationHistory(sessionId: string): Promise<void> {
    try {
      await this.conversationStorage.clearMessages(sessionId);
      console.log(`🧹 Cleared conversation history for session ${sessionId}`);
    } catch (error) {
      console.error('❌ Error clearing conversation history:', error);
      throw new Error(`Failed to clear conversation history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}