import fs from 'fs';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const directAxios: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0',
  },
  proxy: false as any,
  timeout: 120000,
});

directAxios.interceptors.request.use(config => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && config.headers) {
    config.headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return config;
});

const USE_PROXY = process.env.USE_PROXY === 'true' || true;
const PROXY_USERNAME = process.env.PROXY_USERNAME || "xzwdlrlk";
const PROXY_PASSWORD = process.env.PROXY_PASSWORD || "yrv2cpbyo1oa";
const PROXY_IP = process.env.PROXY_IP || '185.199.229.156';
const PROXY_PORT = process.env.PROXY_PORT || '7492';
const PROXY_PROTOCOL = process.env.PROXY_PROTOCOL || 'http';
const FALLBACK_TO_DIRECT = true;

let openaiApiKey: string | null = null;

export function initializeOpenAI(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 30) {
    console.error('[OpenAI] Missing or invalid API key.');
    return false;
  }
  openaiApiKey = apiKey;
  console.log('[OpenAI] API key initialized:', apiKey.slice(0, 5) + '...');
  return true;
}

function createProxyAgent(): any {
  try {
    if (USE_PROXY && PROXY_IP && PROXY_PORT) {
      const encodedUsername = encodeURIComponent(PROXY_USERNAME).replace(/%20/g, '+');
      const encodedPassword = encodeURIComponent(PROXY_PASSWORD).replace(/%20/g, '+');
      const proxyUrl = `${PROXY_PROTOCOL}://${encodedUsername}:${encodedPassword}@${PROXY_IP}:${PROXY_PORT}`;
      return PROXY_PROTOCOL.includes('socks')
        ? new SocksProxyAgent(proxyUrl)
        : new HttpsProxyAgent(proxyUrl);
    }
  } catch (error) {
    console.error('[OpenAI] Failed to create proxy agent:', error);
  }
  return null;
}

function getOpenAIApiKey(): string | null {
  if (!openaiApiKey) {
    initializeOpenAI();
  }
  return openaiApiKey;
}

export async function validateOpenAIKey(): Promise<{ success: boolean; message: string }> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return { success: false, message: 'Missing OpenAI API key' };

  const proxyAgent = createProxyAgent();
  const config: any = {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    proxy: null,
  };

  if (proxyAgent) {
    config.httpsAgent = proxyAgent;
    config.proxy = {
      host: PROXY_IP,
      port: parseInt(PROXY_PORT),
      auth: { username: PROXY_USERNAME, password: PROXY_PASSWORD },
      protocol: PROXY_PROTOCOL,
    };
  }

  try {
    await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello' },
      ],
      max_tokens: 5,
    }, config);
    return { success: true, message: 'API key is valid and working' };
  } catch (error: any) {
    if (FALLBACK_TO_DIRECT) {
      try {
        await directAxios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say hello' },
          ],
          max_tokens: 5,
        });
        return { success: true, message: 'Fallback (direct) connection successful' };
      } catch (fallbackError: any) {
        return { success: false, message: fallbackError?.message || 'Unknown fallback error' };
      }
    }
    return { success: false, message: error?.message || 'Unknown error' };
  }
}

export async function getChatCompletion(prompt: string, systemPrompt = 'You are a helpful assistant.') {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return 'Error: Missing OpenAI API key.';

  const proxyAgent = createProxyAgent();
  const config: any = {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    proxy: null,
  };

  if (proxyAgent) {
    config.httpsAgent = proxyAgent;
    config.proxy = {
      host: PROXY_IP,
      port: parseInt(PROXY_PORT),
      auth: { username: PROXY_USERNAME, password: PROXY_PASSWORD },
      protocol: PROXY_PROTOCOL,
    };
  }

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    }, config);
    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    if (FALLBACK_TO_DIRECT) {
      try {
        const response = await directAxios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2000,
        });
        return response.data.choices[0]?.message?.content || null;
      } catch (directError: any) {
        return `Error: ${directError?.message || 'Unknown fallback error'}`;
      }
    }
    return `Error: ${error?.message || 'Unknown error'}`;
  }
}

export async function analyzeCodeFiles(task: string, filePaths: string[]): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return 'Error: Missing OpenAI API key.';

  const fileContents = await Promise.all(filePaths.map(async (filePath) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return `File: ${filePath}\n\`\`\`\n${content}\n\`\`\``;
    } catch {
      return null;
    }
  }));

  const validFiles = fileContents.filter(Boolean).join('\n');

  const userPrompt = `Task: "${task}"\nAnalyze the following files and provide insights:\n${validFiles}`;
  return getChatCompletion(userPrompt, 'You are an expert developer that helps analyze code files.');
}

export async function suggestCodeChanges(task: string, filePath: string): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return 'Error: Missing OpenAI API key.';

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const prompt = `
      Task: "${task}"
      File: ${filePath}
      Content:
      \`\`\`
      ${content}
      \`\`\`
      Suggest the changes needed to complete this task.
    `;
    return getChatCompletion(prompt, 'You are an expert developer assistant that suggests code changes.');
  } catch {
    return `Error: Could not read file ${filePath}`;
  }
}

export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function writeFile(filePath: string, content: string): Promise<boolean> {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content);
    return true;
  } catch {
    return false;
  }
}

export async function listFiles(directoryPath: string): Promise<string[]> {
  try {
    const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    return files.map(entry => entry.isDirectory() ? `${entry.name}/` : entry.name);
  } catch {
    return [];
  }
}

// ✅ פונקציה תומכת לקריאה כללית
export async function executeAgentTask(prompt: string, systemPrompt = 'You are a helpful assistant.') {
  return getChatCompletion(prompt, systemPrompt);
}

// ✅ פונקציה חדשה: סריקת פרויקט שלם
export async function analyzeEntireProject(rootDir: string, task: string): Promise<string | null> {
  const supportedExtensions = ['.ts', '.tsx', '.js', '.json'];

  async function listFilesRecursive(dir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(fullPath);
      else if (supportedExtensions.includes(path.extname(entry.name))) return [fullPath];
      else return [];
    }));
    return files.flat();
  }

  async function loadFilesContent(files: string[]): Promise<string> {
    const contents = await Promise.all(
      files.map(async (filePath) => {
        try {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          return `File: ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`;
        } catch {
          return '';
        }
      })
    );
    return contents.filter(Boolean).join('\n');
  }

  try {
    const allFiles = await listFilesRecursive(rootDir);
    const input = await loadFilesContent(allFiles);
    const prompt = `
      Task: ${task}
      Please analyze the following project files and report any problems, bugs, inconsistencies, or bad practices:
      ${input}
    `;
    return await getChatCompletion(prompt, 'You are a senior developer reviewing a full TypeScript backend project.');
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}
export async function applySuggestedChanges(filePath: string, task: string): Promise<{ success: boolean; newContent?: string; message?: string }> {
  try {
    const oldContent = await fs.promises.readFile(filePath, 'utf-8');

    const prompt = `
      You are an expert developer.
      Your task: ${task}
      Please modify the following code accordingly and return only the updated code.
      File: ${filePath}
      Code:
      \`\`\`
      ${oldContent}
      \`\`\`
    `;

    const newContent = await getChatCompletion(prompt, 'You are a code editor AI that only outputs updated code.');

    if (!newContent || typeof newContent !== 'string') {
      return { success: false, message: 'Failed to generate updated code' };
    }

    await fs.promises.writeFile(filePath, newContent, 'utf-8');
    return { success: true, newContent };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}