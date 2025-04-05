import fs from 'fs';
import path from 'path';
import axios from 'axios';
import https from 'https';

// Interface for message format expected by OpenAI API
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Interface for HTTPS request options
interface HttpsRequestOptions {
  hostname: string;
  path: string;
  method: string;
  headers: Record<string, string>;
}

// Initialize OpenAI API key for direct API calls
let openaiApiKey: string | null = null;

/**
 * Initialize the OpenAI API key from environment variables
 */
export function initializeOpenAI() {
  console.log('Initializing OpenAI API key');
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is not set');
    console.log('All env vars:', Object.keys(process.env).join(', '));
    return null;
  }
  
  try {
    console.log(`OpenAI API key found with length: ${apiKey.length}, starts with: ${apiKey.substring(0, 3)}...`);
    openaiApiKey = apiKey;
    console.log('OpenAI API key initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize OpenAI API:', error);
    return null;
  }
}

/**
 * Get the OpenAI API key, initializing it if necessary
 */
export function getOpenAIApiKey() {
  if (!openaiApiKey) {
    return initializeOpenAI() ? openaiApiKey : null;
  }
  return openaiApiKey;
}

/**
 * Make a simple HTTPS request
 * @param options HTTPS request options
 * @param data Request body data (optional)
 */
export function httpsRequest(options: HttpsRequestOptions, data: any = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      
      res.on('data', (chunk) => chunks.push(chunk));
      
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        let parsedBody;
        
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = body;
        }
        
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsedBody);
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${JSON.stringify(parsedBody)}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Check if OpenAI API key is valid by making a minimal test call
 */
export async function validateOpenAIKey(): Promise<{ success: boolean; message: string }> {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    return { 
      success: false, 
      message: 'OpenAI API key is not configured' 
    };
  }
  
  try {
    // Make a minimal API call to verify the key
    console.log('Testing OpenAI API with a minimal request');
    await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello" }
        ],
        max_tokens: 5, // Use minimal tokens to save quota
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    return {
      success: true,
      message: 'OpenAI API key is valid and working'
    };
  } catch (error: any) {
    console.error('Error validating OpenAI key:', error);
    return {
      success: false,
      message: `OpenAI API key validation failed: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Read the contents of a file
 * @param filePath Path to the file to read
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    const fileContents = await fs.promises.readFile(filePath, 'utf-8');
    return fileContents;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Write contents to a file
 * @param filePath Path to the file to write
 * @param content Content to write to the file
 */
export async function writeFile(filePath: string, content: string): Promise<boolean> {
  try {
    const dirPath = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    await fs.promises.mkdir(dirPath, { recursive: true });
    
    await fs.promises.writeFile(filePath, content);
    return true;
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    return false;
  }
}

/**
 * List files in a directory
 * @param directoryPath Path to the directory to list
 */
export async function listFiles(directoryPath: string): Promise<string[]> {
  try {
    const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    return files.map(file => {
      if (file.isDirectory()) {
        return `${file.name}/`;
      }
      return file.name;
    });
  } catch (error) {
    console.error(`Error listing files in directory ${directoryPath}:`, error);
    return [];
  }
}

/**
 * Send a chat completion request to OpenAI
 * @param prompt The user's prompt to send to OpenAI
 * @param systemPrompt Optional system prompt to provide context
 */
export async function getChatCompletion(
  prompt: string, 
  systemPrompt: string = "You are a helpful assistant that helps with software development tasks."
): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    return "Error: OpenAI API key is not initialized. Please check your environment variables.";
  }
  
  try {
    console.log('Sending request to OpenAI API with project-based key');
    
    // Prepare messages array - if systemPrompt is provided, include it, otherwise just the user prompt
    const messages = systemPrompt 
      ? [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ] 
      : [
          { role: "user", content: prompt }
        ];
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('OpenAI API response received successfully');
    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('Error getting chat completion:', error.response?.data || error.message);
    return `Error: ${error.response?.data?.error?.message || error.message || 'Unknown error'}`;
  }
}

/**
 * Analyze code files for a specific task
 * @param task Description of the task to analyze
 * @param filePaths List of file paths to analyze
 */
export async function analyzeCodeFiles(task: string, filePaths: string[]): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    return "Error: OpenAI API key is not initialized. Please check your environment variables.";
  }
  
  try {
    // Gather file contents
    const fileContents: { path: string; content: string | null }[] = [];
    
    for (const filePath of filePaths) {
      const content = await readFile(filePath);
      fileContents.push({ path: filePath, content });
    }
    
    // Filter out files that couldn't be read
    const validFileContents = fileContents.filter(
      (file): file is { path: string; content: string } => file.content !== null
    );
    
    // Create prompt with file contents
    const filesText = validFileContents
      .map(file => `File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n`)
      .join('\n');
    
    const systemPrompt = `You are an expert developer assistant who helps analyze code files and provide insights to solve problems.`;
    
    const userPrompt = `
      I need your help with the following task: "${task}"
      
      Here are the relevant files:
      
      ${filesText}
      
      Please analyze these files and provide your insights, focusing on:
      1. Understanding the current implementation
      2. Identifying any issues related to the task
      3. Suggesting improvements or solutions
    `;
    
    console.log('Sending code analysis request to OpenAI API with project-based key');
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('OpenAI API code analysis response received successfully');
    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('Error analyzing code files:', error.response?.data || error.message);
    return `Error: ${error.response?.data?.error?.message || error.message || 'Unknown error'}`;
  }
}

/**
 * Suggest code changes for a file based on a task
 * @param task Description of the task to implement
 * @param filePath Path to the file to modify
 */
export async function suggestCodeChanges(task: string, filePath: string): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    return "Error: OpenAI API key is not initialized. Please check your environment variables.";
  }
  
  try {
    const fileContent = await readFile(filePath);
    
    if (!fileContent) {
      return `Error: Could not read file ${filePath}.`;
    }
    
    const systemPrompt = `You are an expert developer assistant who helps implement code changes to accomplish specific tasks.`;
    
    const userPrompt = `
      I need to implement the following task: "${task}"
      
      Here is the current content of ${filePath}:
      
      \`\`\`
      ${fileContent}
      \`\`\`
      
      Please suggest the changes I should make to accomplish this task. Provide the full updated file content.
    `;
    
    console.log('Sending code suggestion request to OpenAI API with project-based key');
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('OpenAI API code suggestion response received successfully');
    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('Error suggesting code changes:', error.response?.data || error.message);
    return `Error: ${error.response?.data?.error?.message || error.message || 'Unknown error'}`;
  }
}