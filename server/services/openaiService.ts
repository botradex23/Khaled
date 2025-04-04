import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Interface for message format expected by OpenAI API
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Initialize OpenAI API key for direct API calls
let openaiApiKey: string | null = null;

/**
 * Initialize the OpenAI API key from environment variables
 */
export function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is not set');
    return null;
  }
  
  try {
    openaiApiKey = apiKey;
    console.log('OpenAI API key initialized');
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
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
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
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
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
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
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
    
    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('Error suggesting code changes:', error.response?.data || error.message);
    return `Error: ${error.response?.data?.error?.message || error.message || 'Unknown error'}`;
  }
}