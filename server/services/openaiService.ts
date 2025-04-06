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
  timeout: 15000,
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
const PROXY_ENCODING_METHOD = process.env.PROXY_ENCODING_METHOD || 'quote_plus';
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
      let encodedUsername = encodeURIComponent(PROXY_USERNAME).replace(/%20/g, '+');
      let encodedPassword = encodeURIComponent(PROXY_PASSWORD).replace(/%20/g, '+');
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
    await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello' },
        ],
        max_tokens: 5,
      },
      config
    );
    return { success: true, message: 'API key is valid and working' };
  } catch (error: any) {
    if (FALLBACK_TO_DIRECT) {
      try {
        await directAxios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: 'Say hello' },
            ],
            max_tokens: 5,
          }
        );
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
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
      },
      config
    );
    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    if (FALLBACK_TO_DIRECT) {
      try {
        const response = await directAxios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 2000,
          }
        );
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

  const fileContents = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return `File: ${filePath}\n\`\`\`\n${content}\n\`\`\``;
      } catch {
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