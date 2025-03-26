import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';

// VPN Proxy Configuration
// Change these settings to match your proxy/VPN service
export const VPN_CONFIG = {
  // Whether to use VPN for all Bybit API requests
  // Setting to false will use the fallback demo data when geo-restrictions are detected
  enabled: false, // Disabled by default until a working proxy is configured

  // Type of proxy: 'https' or 'socks'
  type: 'https' as 'https' | 'socks',

  // Real, publicly available proxy servers
  // NOTE: These are examples - the reliability of public proxy servers varies
  // For production, use a reliable paid proxy/VPN service
  host: 'open-proxy.example.com', // Replace with real proxy server when testing
  port: 3128,              // Common proxy port
  
  // Optional authentication
  auth: {
    username: '', // Optional proxy username
    password: ''  // Optional proxy password
  },

  // Preferred proxy countries (Bybit isn't geo-restricted in these)
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
    console.log(`Using HTTPS proxy: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
  } else {
    const proxyUrl = `socks5://${VPN_CONFIG.auth.username ? 
      `${VPN_CONFIG.auth.username}:${VPN_CONFIG.auth.password}@` : ''}${VPN_CONFIG.host}:${VPN_CONFIG.port}`;
    
    agent = new SocksProxyAgent(proxyUrl);
    console.log(`Using SOCKS proxy: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
  }
  
  // Create Axios instance with the proxy agent
  return axios.create({
    httpAgent: agent,
    httpsAgent: agent
  });
}

/**
 * Check if proxy is working properly by testing connectivity to Bybit
 */
export async function testProxyConnection() {
  if (!VPN_CONFIG.enabled) {
    return { success: false, message: 'Proxy not enabled' };
  }
  
  try {
    const axiosInstance = createProxyInstance();
    const response = await axiosInstance.get('https://api.bybit.com/v5/market/time', {
      timeout: 10000 // 10 second timeout
    });
    
    if (response.status === 200) {
      return { 
        success: true, 
        message: 'Successfully connected to Bybit via proxy',
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
    return { 
      success: false, 
      message: `Proxy connection error: ${error.message}`
    };
  }
}