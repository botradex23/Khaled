/**
 * Binance API Health Check
 * 
 * Checks if the Binance API keys are valid and have the required permissions.
 */

import axios from 'axios';
import * as crypto from 'crypto';
import { HealthCheckResult, Issue } from '../types';
import { logger } from '../logger';
import { ProxyCheckResult, checkProxyHealth } from './proxyCheck';

// Binance API check result
export interface BinanceApiCheckResult extends HealthCheckResult {
  apiKeyValid: boolean;
  publicEndpointsAccessible: boolean;
  privateEndpointsAccessible: boolean;
  responseTime?: number;
}

// Binance API configuration
interface BinanceApiConfig {
  apiKey: string;
  secretKey: string;
  useProxy: boolean;
  proxyFilePath?: string;
  baseUrl?: string;
}

/**
 * Create request signature for Binance API
 */
function createSignature(queryString: string, secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

/**
 * Make a request to Binance API with proper authentication
 */
async function makeBinanceRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  params: Record<string, any> = {},
  config: BinanceApiConfig,
  isPrivate: boolean = false,
  proxyCheckResult?: ProxyCheckResult
): Promise<any> {
  try {
    // Prepare base URL
    const baseUrl = config.baseUrl || 'https://api.binance.com';
    const url = `${baseUrl}${endpoint}`;
    
    // Prepare headers
    const headers: Record<string, string> = {
      'X-MBX-APIKEY': config.apiKey
    };
    
    // Prepare query parameters
    let queryString = '';
    
    if (isPrivate) {
      // For private endpoints, add timestamp and signature
      const timestamp = Date.now();
      params.timestamp = timestamp;
      
      // Convert params to query string
      queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      
      // Create signature
      const signature = createSignature(queryString, config.secretKey);
      
      // Add signature to query string
      queryString = `${queryString}&signature=${signature}`;
    } else if (Object.keys(params).length > 0) {
      // For public endpoints with params
      queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    }
    
    // Full URL with query string
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    // Prepare request config
    const requestConfig: any = {
      method,
      url: fullUrl,
      headers,
      timeout: 10000
    };
    
    // Add proxy if enabled
    if (config.useProxy && proxyCheckResult && proxyCheckResult.workingProxies.length > 0) {
      // Get the first working proxy
      const workingProxy = proxyCheckResult.workingProxies[0];
      const [ip, port] = workingProxy.split(':');
      
      // Get proxy credentials from environment variables
      const username = process.env.PROXY_USERNAME || '';
      const password = process.env.PROXY_PASSWORD || '';
      
      if (username && password) {
        requestConfig.proxy = {
          host: ip,
          port: parseInt(port),
          auth: {
            username,
            password
          }
        };
        
        logger.info(`Using proxy for Binance request: ${ip}:${port}`);
      } else {
        logger.warn('Proxy credentials not found in environment variables');
      }
    }
    
    // Make the request
    const startTime = Date.now();
    const response = await axios(requestConfig);
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      data: response.data,
      status: response.status,
      responseTime
    };
  } catch (error) {
    logger.error(`Error making Binance API request to ${endpoint}`, { error });
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
      code: error.response?.data?.code
    };
  }
}

/**
 * Check Binance API health
 */
export async function checkBinanceApiHealth(config: BinanceApiConfig): Promise<BinanceApiCheckResult> {
  logger.info('Checking Binance API health');
  
  const issues: Issue[] = [];
  
  // Check if API key and secret key are configured
  if (!config.apiKey || !config.secretKey) {
    logger.error('Binance API keys not configured');
    
    return {
      healthy: false,
      issues: [
        {
          type: 'other',
          severity: 'critical',
          component: 'binance',
          message: 'Binance API keys not configured',
          timestamp: new Date().toISOString()
        }
      ],
      apiKeyValid: false,
      publicEndpointsAccessible: false,
      privateEndpointsAccessible: false
    };
  }
  
  // Check proxy health if using proxy
  let proxyCheckResult: ProxyCheckResult | undefined;
  
  if (config.useProxy && config.proxyFilePath) {
    proxyCheckResult = await checkProxyHealth(config.proxyFilePath);
    
    if (!proxyCheckResult.healthy) {
      // Add proxy issues to our issues list
      issues.push(...proxyCheckResult.issues);
    }
  }
  
  // Check public API endpoint (serverTime)
  logger.info('Testing Binance public API endpoint');
  const publicResult = await makeBinanceRequest('/api/v3/time', 'GET', {}, config, false, proxyCheckResult);
  
  const publicEndpointsAccessible = publicResult.success;
  let responseTime = publicResult.responseTime;
  
  if (!publicEndpointsAccessible) {
    logger.error('Cannot access Binance public API endpoints', { result: publicResult });
    
    issues.push({
      type: 'other',
      severity: 'critical',
      component: 'binance',
      message: 'Cannot access Binance public API endpoints',
      details: { error: publicResult.error },
      timestamp: new Date().toISOString()
    });
  }
  
  // Check private API endpoint (account)
  logger.info('Testing Binance private API endpoint');
  const privateResult = await makeBinanceRequest('/api/v3/account', 'GET', {}, config, true, proxyCheckResult);
  
  const privateEndpointsAccessible = privateResult.success;
  
  // Use the API key validation result to determine if the API key is valid
  const apiKeyValid = privateResult.success || 
    (privateResult.code !== -2015 && privateResult.code !== -2014); // Invalid API key or signature
  
  if (!apiKeyValid) {
    logger.error('Binance API key is invalid', { result: privateResult });
    
    issues.push({
      type: 'other',
      severity: 'critical',
      component: 'binance',
      message: 'Binance API key is invalid',
      details: { error: privateResult.error },
      timestamp: new Date().toISOString()
    });
  } else if (!privateEndpointsAccessible) {
    logger.error('Cannot access Binance private API endpoints', { result: privateResult });
    
    issues.push({
      type: 'other',
      severity: 'high',
      component: 'binance',
      message: 'Cannot access Binance private API endpoints',
      details: { error: privateResult.error },
      timestamp: new Date().toISOString()
    });
  }
  
  // Check if response time is too high
  if (publicEndpointsAccessible && responseTime && responseTime > 2000) {
    logger.warn(`Binance API response time is high: ${responseTime}ms`);
    
    issues.push({
      type: 'other',
      severity: 'medium',
      component: 'binance',
      message: `Binance API response time is high: ${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
  
  const result: BinanceApiCheckResult = {
    healthy: apiKeyValid && publicEndpointsAccessible,
    issues,
    apiKeyValid,
    publicEndpointsAccessible,
    privateEndpointsAccessible,
    responseTime
  };
  
  logger.info('Binance API health check completed', { result });
  return result;
}