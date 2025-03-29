import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';

// VPN Proxy Configuration
// Configured with Webshare proxy service
export const VPN_CONFIG = {
  // Whether to use VPN for all Binance API requests
  // Setting to false will use the fallback demo data when geo-restrictions are detected
  enabled: true, // Enabled with Webshare proxy

  // Type of proxy: 'https' or 'socks'
  type: 'https' as 'https' | 'socks',

  // Webshare proxy server details
  host: '38.154.227.167', // Webshare proxy IP address
  port: 5868,             // Webshare proxy port
  
  // Webshare authentication credentials
  auth: {
    username: 'ahjqspco',     // Webshare username
    password: 'dzx3r1prpz9k'  // Webshare password
  },

  // Preferred proxy countries (Binance isn't geo-restricted in these)
  locations: [
    'us', // United States
    'de', // Germany
    'nl', // Netherlands
    'sg', // Singapore
    'gb'  // United Kingdom
  ],
  
  // Config for fallback to demo data
  fallbackToDemo: true, // Whether to use demo data when proxy fails
  retryCount: 2, // Number of times to retry the proxy before falling back to demo data
  retryDelay: 1000 // Delay between retries in ms
};

/**
 * Create an Axios instance with VPN proxy configuration
 * This will route all API requests through the configured proxy
 */
export function createProxyInstance() {
  let agent;
  
  if (!VPN_CONFIG.enabled) {
    return axios.create();
  }
  
  // Create the appropriate proxy agent based on config
  if (VPN_CONFIG.type === 'https') {
    const proxyUrl = `http://${VPN_CONFIG.auth.username ? 
      `${VPN_CONFIG.auth.username}:${VPN_CONFIG.auth.password}@` : ''}${VPN_CONFIG.host}:${VPN_CONFIG.port}`;
    
    agent = new HttpsProxyAgent(proxyUrl);
    console.log(`Using HTTPS proxy for Binance: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
  } else {
    const proxyUrl = `socks5://${VPN_CONFIG.auth.username ? 
      `${VPN_CONFIG.auth.username}:${VPN_CONFIG.auth.password}@` : ''}${VPN_CONFIG.host}:${VPN_CONFIG.port}`;
    
    agent = new SocksProxyAgent(proxyUrl);
    console.log(`Using SOCKS proxy for Binance: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
  }
  
  // Create Axios instance with the proxy agent and additional headers to mask our origin
  return axios.create({
    httpAgent: agent,
    httpsAgent: agent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://www.binance.com',
      'Referer': 'https://www.binance.com/'
    }
  });
}

/**
 * Check if proxy is working properly by testing connectivity to Binance
 */
export async function testProxyConnection() {
  if (!VPN_CONFIG.enabled) {
    return { success: false, message: 'Proxy not enabled' };
  }
  
  try {
    console.log('Testing proxy connection to Binance...');
    const axiosInstance = createProxyInstance();
    
    // Log proxy configuration details
    if (VPN_CONFIG.type === 'https') {
      console.log(`Using HTTPS proxy for Binance test: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
    } else {
      console.log(`Using SOCKS proxy for Binance test: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
    }
    
    console.log('Attempting to connect to Binance main API endpoint...');
    // Try the main API endpoint
    const response = await axiosInstance.get('https://api.binance.com/api/v3/ping', {
      timeout: 10000 // 10 second timeout
    });
    
    if (response.status === 200) {
      return { 
        success: true, 
        message: 'Successfully connected to Binance via proxy',
        data: response.data
      };
    } else {
      return { 
        success: false, 
        message: `Proxy connection failed with status: ${response.status}`
      };
    }
  } catch (error: any) {
    console.error('Proxy connection test failed:', error.message);
    
    // Log more detailed error information
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      console.error('Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
      console.error('No response received, this could be a network or proxy connectivity issue');
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    if (error.code) {
      console.error(`Network error code: ${error.code}`);
    }
    
    return { 
      success: false, 
      message: `Proxy connection error: ${error.message}`,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText
      } : {
        code: error.code
      }
    };
  }
}