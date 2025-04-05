import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Internal cache of API key
 */
let openaiApiKey: string | null = null;

/**
 * Initialize OpenAI API key (used in health check route)
 */
export function initializeOpenAI(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 30) {
    console.error('[OpenAI] Missing or invalid API key.');
    return false;
  }
  openaiApiKey = apiKey;
  console.log('[OpenAI] API key initialized.');
  return true;
}

/**
 * Get the OpenAI API key (cached or from env)
 */
function getOpenAIApiKey(): string | null {
  if (!openaiApiKey) {
    initializeOpenAI();
  }
  return openaiApiKey;
}

/**
 * Validate the OpenAI API key by sending a minimal request
 */
export async function validateOpenAIKey(): Promise<{ success: boolean; message: string }> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return { success: false, message: 'Missing OpenAI API key' };

  try {
    await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello' },
        ],
        max_tokens: 5,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { success: true, message: 'API key is valid and working' };
  } catch (error: any) {
    console.error('[OpenAI] API validation failed:', error?.response?.data || error.message);
    return {
      success: false,
      message: error?.response?.data?.error?.message || error.message || 'Unknown error',
    };
  }
}

/**
 * Send a chat completion request to OpenAI
 */
export async function getChatCompletion(prompt: string, systemPrompt: string = 'You are a helpful assistant.') {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return 'Error: Missing OpenAI API key.';

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('[OpenAI] Chat error:', error?.response?.data || error.message);
    return `Error: ${error?.response?.data?.error?.message || error.message || 'Unknown error'}`;
  }
}

/**
 * Analyze code files
 */
export async function analyzeCodeFiles(task: string, filePaths: string[]): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return 'Error: Missing OpenAI API key.';

  const fileContents = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return `File: ${filePath}\n\`\`\`\n${content}\n\`\`\``;
      } catch (error) {
        console.warn(`Could not read file: ${filePath}`);
        return null;
      }
    })
  );

  const validFiles = fileContents.filter(Boolean).join('\n');

  const userPrompt = `
    Task: "${task}"
    Analyze the following files and provide insights:
    ${validFiles}
  `;

  return getChatCompletion(userPrompt, 'You are an expert developer that helps analyze code files.');
}

/**
 * Suggest changes to a code file
 */
export async function suggestCodeChanges(task: string, filePath: string): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return 'Error: Missing OpenAI API key.';

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const userPrompt = `
      Task: "${task}"
      File: ${filePath}
      Content:
      \`\`\`
      ${content}
      \`\`\`
      Suggest the changes needed to complete this task.
    `;
    return getChatCompletion(userPrompt, 'You are an expert developer assistant that suggests code changes.');
  } catch (error) {
    return `Error: Could not read file ${filePath}`;
  }
}

/**
 * Read a file
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read ${filePath}`, error);
    return null;
  }
}

/**
 * Write to a file
 */
export async function writeFile(filePath: string, content: string): Promise<boolean> {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content);
    return true;
  } catch (error) {
    console.error(`Failed to write to ${filePath}`, error);
    return false;
  }
}

/**
 * List files in a directory
 */
export async function listFiles(directoryPath: string): Promise<string[]> {
  try {
    const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    return files.map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
  } catch (error) {
    console.error(`Failed to list files in ${directoryPath}`, error);
    return [];
  }
}