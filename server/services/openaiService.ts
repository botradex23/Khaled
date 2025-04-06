import fs from 'fs';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// Create a shared direct axios instance for fallback connections
const directAxios: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  // Explicitly disable proxy
  proxy: false as any,
  // Set a longer timeout for better reliability
  timeout: 15000
});

// Set authorization header before each request
directAxios.interceptors.request.use(config => {
  // Add the OpenAI API key from process.env to every request
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && config.headers) {
    config.headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return config;
});

// Proxy configuration - load from environment variables for security
const USE_PROXY = process.env.USE_PROXY === 'true' || true; // Default to true

// In this environment, let's try a direct connection to OpenAI as fallback
// First try the proxy from the environment if available
const PROXY_USERNAME = process.env.PROXY_USERNAME || "xzwdlrlk"; 
const PROXY_PASSWORD = process.env.PROXY_PASSWORD || "yrv2cpbyo1oa";
const PROXY_IP = process.env.PROXY_IP || '185.199.229.156'; // Try alternative proxy
const PROXY_PORT = process.env.PROXY_PORT || '7492'; // Try alternative port
const PROXY_PROTOCOL = process.env.PROXY_PROTOCOL || 'http';
const PROXY_ENCODING_METHOD = process.env.PROXY_ENCODING_METHOD || 'quote_plus';
const FALLBACK_TO_DIRECT = true; // Try direct connection if proxy fails

/**
 * Internal cache of API key
 */
let openaiApiKey: string | null = null;

/**
 * Initialize OpenAI API key (used in health check route)
 */
export function initializeOpenAI(): boolean {
  // Always access the API key using the OPENAI_API_KEY environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 30) {
    console.error('[OpenAI] Missing or invalid API key.');
    return false;
  }
  openaiApiKey = apiKey;
  console.log('[OpenAI] API key initialized:', apiKey.slice(0, 5) + '...');
  return true;
}

/**
 * Create a proxy agent for OpenAI API requests
 * @returns Proxy agent or null if proxy is not configured
 */
function createProxyAgent(): any {
  try {
    if (USE_PROXY && PROXY_IP && PROXY_PORT) {
      console.log(`Using proxy connection to OpenAI API via ${PROXY_IP}:${PROXY_PORT}`);
      
      // Create proxy URL based on authentication requirements
      let proxyUrl = '';
      if (PROXY_USERNAME && PROXY_PASSWORD) {
        // Apply URL encoding based on the method specified
        let encodedUsername = PROXY_USERNAME;
        let encodedPassword = PROXY_PASSWORD;

        // Encode credentials based on encoding method
        if (PROXY_ENCODING_METHOD === 'none') {
          // No encoding
        } else if (PROXY_ENCODING_METHOD === 'quote') {
          encodedUsername = encodeURIComponent(PROXY_USERNAME);
          encodedPassword = encodeURIComponent(PROXY_PASSWORD);
        } else { // Default to quote_plus
          encodedUsername = encodeURIComponent(PROXY_USERNAME).replace(/%20/g, '+');
          encodedPassword = encodeURIComponent(PROXY_PASSWORD).replace(/%20/g, '+');
        }

        proxyUrl = `${PROXY_PROTOCOL}://${encodedUsername}:${encodedPassword}@${PROXY_IP}:${PROXY_PORT}`;
        console.log(`Configured authenticated proxy for OpenAI API via ${PROXY_IP}:${PROXY_PORT}`);
      } else {
        proxyUrl = `${PROXY_PROTOCOL}://${PROXY_IP}:${PROXY_PORT}`;
        console.log(`Configured unauthenticated proxy for OpenAI API via ${PROXY_IP}:${PROXY_PORT}`);
      }

      // Create proxy agent
      return PROXY_PROTOCOL.includes('socks') 
        ? new SocksProxyAgent(proxyUrl)
        : new HttpsProxyAgent(proxyUrl);
    }
  } catch (error) {
    console.error('[OpenAI] Failed to create proxy agent:', error);
  }
  
  return null;
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
    // Debug environment
    console.log('[OpenAI] Debug environment variables for proxy:');
    console.log(`- PROXY_IP from env: ${process.env.PROXY_IP || 'not set'}`);
    console.log(`- PROXY_PORT from env: ${process.env.PROXY_PORT || 'not set'}`);
    console.log(`- PROXY_USERNAME from env: ${process.env.PROXY_USERNAME ? '(set)' : 'not set'}`);
    console.log(`- PROXY_PASSWORD from env: ${process.env.PROXY_PASSWORD ? '(set)' : 'not set'}`);
    console.log(`- USE_PROXY from env: ${process.env.USE_PROXY || 'not set'}`);
    console.log(`- PROXY_PROTOCOL from env: ${process.env.PROXY_PROTOCOL || 'not set'}`);
    console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`- Using values: ${PROXY_IP}:${PROXY_PORT}, user: ${PROXY_USERNAME}`);
    console.log(`- Direct fallback enabled: ${FALLBACK_TO_DIRECT ? 'yes' : 'no'}`);
    
    // Get proxy agent
    const proxyAgent = createProxyAgent();
    
    // Build request config
    const requestConfig: any = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      // Disable proxy env var detection
      proxy: null as any 
    };
    
    // Add proxy configuration if available
    if (proxyAgent) {
      requestConfig.httpsAgent = proxyAgent;
      
      // Direct proxy configuration
      requestConfig.proxy = {
        host: PROXY_IP,
        port: parseInt(PROXY_PORT, 10),
        auth: {
          username: PROXY_USERNAME,
          password: PROXY_PASSWORD
        },
        protocol: PROXY_PROTOCOL
      };
    }
    
    try {
      // First try with proxy
      console.log('[OpenAI] Trying API validation with proxy');
      console.log('[OpenAI] Proxy config:', JSON.stringify({
        host: PROXY_IP,
        port: PROXY_PORT,
        username: PROXY_USERNAME ? 'CONFIGURED' : 'MISSING',
        password: PROXY_PASSWORD ? 'CONFIGURED' : 'MISSING',
        protocol: PROXY_PROTOCOL
      }));
      
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
        requestConfig
      );
    } catch (proxyError) {
      console.error('[OpenAI] Proxy attempt error details:', (proxyError as Error).message);
      if ((proxyError as any).response) {
        console.error('[OpenAI] Proxy error response:', (proxyError as any).response.status, (proxyError as any).response.statusText);
      }
      
      // If proxy fails and we're allowed to fallback to direct
      if (FALLBACK_TO_DIRECT) {
        console.log('[OpenAI] Proxy attempt failed, trying direct connection');
        
        try {
          // Add API key to the shared directAxios instance headers
          // Explicitly no proxy related env vars or setting
          process.env.HTTP_PROXY = '';
          process.env.HTTPS_PROXY = '';
          
          await directAxios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Say hello' },
              ],
              max_tokens: 5,
            }
          );
          
          console.log('[OpenAI] Direct connection successful');
        } catch (directError) {
          console.error('[OpenAI] Direct connection also failed:', (directError as Error).message);
          if ((directError as any).response) {
            console.error('[OpenAI] Direct error response:', (directError as any).response.status, (directError as any).response.statusText);
          }
          throw directError;
        }
      } else {
        // Re-throw if fallback is disabled
        throw proxyError;
      }
    }
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
    // Debug log call
    console.log(`[OpenAI] Processing chat completion request with model: gpt-4o-mini`);
    
    // Get proxy agent
    const proxyAgent = createProxyAgent();
    
    // Build request config
    const requestConfig: any = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      // Disable proxy env var detection
      proxy: null as any
    };
    
    // Add proxy configuration if available
    if (proxyAgent) {
      requestConfig.httpsAgent = proxyAgent;
      
      // Direct proxy configuration
      requestConfig.proxy = {
        host: PROXY_IP,
        port: parseInt(PROXY_PORT, 10),
        auth: {
          username: PROXY_USERNAME,
          password: PROXY_PASSWORD
        },
        protocol: PROXY_PROTOCOL
      };
    }
    
    let response;
    
    try {
      // First try with proxy
      console.log('[OpenAI] Trying chat completion with proxy');
      console.log('[OpenAI] Proxy config:', JSON.stringify({
        host: PROXY_IP,
        port: PROXY_PORT,
        username: PROXY_USERNAME ? 'CONFIGURED' : 'MISSING',
        password: PROXY_PASSWORD ? 'CONFIGURED' : 'MISSING',
        protocol: PROXY_PROTOCOL
      }));
      
      response = await axios.post(
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
        requestConfig
      );
    } catch (proxyError) {
      console.error('[OpenAI] Proxy attempt error details:', (proxyError as Error).message);
      if ((proxyError as any).response) {
        console.error('[OpenAI] Proxy error response:', (proxyError as any).response.status, (proxyError as any).response.statusText);
      }
      
      // If proxy fails and we're allowed to fallback to direct
      if (FALLBACK_TO_DIRECT) {
        console.log('[OpenAI] Proxy attempt failed, trying direct connection for chat completion');
        
        try {
          // Add authorization header to the shared directAxios instance
          // Explicitly no proxy related env vars or setting
          process.env.HTTP_PROXY = '';
          process.env.HTTPS_PROXY = '';
          
          response = await directAxios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }
          );
          
          console.log('[OpenAI] Direct connection successful for chat completion');
        } catch (directError) {
          console.error('[OpenAI] Direct connection also failed:', (directError as Error).message);
          if ((directError as any).response) {
            console.error('[OpenAI] Direct error response:', (directError as any).response.status, (directError as any).response.statusText);
          }
          throw directError;
        }
      } else {
        // Re-throw if fallback is disabled
        throw proxyError;
      }
    }
    
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