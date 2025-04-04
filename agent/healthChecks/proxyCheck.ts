/**
 * Proxy Health Check
 * 
 * Checks if the proxies used for Binance API are working correctly.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Issue, HealthCheckResult } from '../types';
import { logger } from '../logger';

// Proxy check result
export interface ProxyCheckResult extends HealthCheckResult {
  workingProxies: string[];
  failedProxies: string[];
  currentProxy?: string;
}

// Proxy configuration
interface ProxyConfig {
  ip: string;
  port: string;
  username: string;
  password: string;
}

/**
 * Load proxies from a file
 */
export function loadProxiesFromFile(filePath: string): ProxyConfig[] {
  try {
    if (!fs.existsSync(filePath)) {
      logger.error(`Proxy file not found: ${filePath}`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const proxies: ProxyConfig[] = [];
    
    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.trim() === '' || line.startsWith('#')) {
        continue;
      }
      
      // Try to parse the line as a proxy
      // Format: ip:port:username:password
      const parts = line.split(':');
      
      if (parts.length >= 4) {
        proxies.push({
          ip: parts[0],
          port: parts[1],
          username: parts[2],
          password: parts[3].trim()
        });
      }
    }
    
    logger.info(`Loaded ${proxies.length} proxies from ${filePath}`);
    return proxies;
  } catch (error) {
    logger.error(`Error loading proxies from ${filePath}`, { error });
    return [];
  }
}

/**
 * Format proxy URL for use with Axios
 */
function formatProxyUrl(proxy: ProxyConfig): string {
  return `http://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
}

/**
 * Test if a proxy works with Binance API
 */
export async function testProxy(proxy: ProxyConfig): Promise<boolean> {
  try {
    logger.info(`Testing proxy: ${proxy.ip}:${proxy.port}`);
    
    const proxyUrl = formatProxyUrl(proxy);
    
    // Try to connect to Binance API through the proxy
    const response = await axios.get('https://api.binance.com/api/v3/ping', {
      proxy: {
        host: proxy.ip,
        port: parseInt(proxy.port),
        auth: {
          username: proxy.username,
          password: proxy.password
        }
      },
      timeout: 10000
    });
    
    // If response is successful, the proxy works
    const success = response.status === 200;
    
    if (success) {
      logger.info(`Proxy ${proxy.ip}:${proxy.port} works!`);
    } else {
      logger.warn(`Proxy ${proxy.ip}:${proxy.port} returned status ${response.status}`);
    }
    
    return success;
  } catch (error) {
    logger.error(`Error testing proxy ${proxy.ip}:${proxy.port}`, { error });
    return false;
  }
}

/**
 * Check proxy health
 */
export async function checkProxyHealth(proxyFilePath: string): Promise<ProxyCheckResult> {
  logger.info(`Checking proxy health using file: ${proxyFilePath}`);
  
  const issues: Issue[] = [];
  const workingProxies: string[] = [];
  const failedProxies: string[] = [];
  
  try {
    // Load proxies from file
    const proxies = loadProxiesFromFile(proxyFilePath);
    
    if (proxies.length === 0) {
      // No proxies found
      issues.push({
        type: 'other',
        severity: 'high',
        component: 'proxies',
        message: `No proxies found in ${proxyFilePath}`,
        timestamp: new Date().toISOString()
      });
      
      return {
        healthy: false,
        issues,
        workingProxies,
        failedProxies
      };
    }
    
    // Test each proxy
    for (const proxy of proxies) {
      const proxyId = `${proxy.ip}:${proxy.port}`;
      
      const works = await testProxy(proxy);
      
      if (works) {
        workingProxies.push(proxyId);
      } else {
        failedProxies.push(proxyId);
        
        issues.push({
          type: 'other',
          severity: 'medium',
          component: 'proxy',
          message: `Proxy not working: ${proxyId}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Check if we have any working proxies
    if (workingProxies.length === 0) {
      // No working proxies
      issues.push({
        type: 'other',
        severity: 'critical',
        component: 'proxies',
        message: 'No working proxies found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get the current proxy from environment
    let currentProxy: string | undefined;
    
    if (process.env.PROXY_IP && process.env.PROXY_PORT) {
      currentProxy = `${process.env.PROXY_IP}:${process.env.PROXY_PORT}`;
      
      // Check if the current proxy is working
      if (!workingProxies.includes(currentProxy)) {
        issues.push({
          type: 'other',
          severity: 'high',
          component: 'proxy',
          message: `Current proxy is not working: ${currentProxy}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const result: ProxyCheckResult = {
      healthy: workingProxies.length > 0,
      issues,
      workingProxies,
      failedProxies,
      currentProxy
    };
    
    logger.info('Proxy health check completed', { result });
    return result;
  } catch (error) {
    logger.error('Error during proxy health check', { error });
    
    return {
      healthy: false,
      issues: [
        {
          type: 'other',
          severity: 'critical',
          component: 'proxy',
          message: `Error checking proxies: ${error.message}`,
          details: { error: error.message },
          timestamp: new Date().toISOString()
        }
      ],
      workingProxies: [],
      failedProxies: []
    };
  }
}

/**
 * Fix proxy configuration by updating the .env file
 */
export async function fixProxyConfiguration(
  proxyFilePath: string,
  envFilePath: string
): Promise<boolean> {
  try {
    logger.info('Attempting to fix proxy configuration');
    
    // Check proxy health
    const proxyCheckResult = await checkProxyHealth(proxyFilePath);
    
    if (proxyCheckResult.workingProxies.length === 0) {
      logger.error('No working proxies found, cannot fix configuration');
      return false;
    }
    
    // Get the first working proxy
    const workingProxy = proxyCheckResult.workingProxies[0];
    const [ip, port] = workingProxy.split(':');
    
    // Load the proxies again to get the username and password
    const proxies = loadProxiesFromFile(proxyFilePath);
    const matchingProxy = proxies.find(p => `${p.ip}:${p.port}` === workingProxy);
    
    if (!matchingProxy) {
      logger.error(`Could not find matching proxy for ${workingProxy}`);
      return false;
    }
    
    // Load current .env content
    if (!fs.existsSync(envFilePath)) {
      logger.error(`.env file not found: ${envFilePath}`);
      return false;
    }
    
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Update or add proxy variables
    envContent = updateEnvVar(envContent, 'PROXY_IP', ip);
    envContent = updateEnvVar(envContent, 'PROXY_PORT', port);
    envContent = updateEnvVar(envContent, 'PROXY_USERNAME', matchingProxy.username);
    envContent = updateEnvVar(envContent, 'PROXY_PASSWORD', matchingProxy.password);
    
    // Save the updated .env file
    fs.writeFileSync(envFilePath, envContent);
    
    logger.info(`Updated .env with working proxy: ${workingProxy}`);
    return true;
  } catch (error) {
    logger.error('Error fixing proxy configuration', { error });
    return false;
  }
}

/**
 * Update or add an environment variable in the .env content
 */
function updateEnvVar(content: string, name: string, value: string): string {
  const regex = new RegExp(`^${name}=.*$`, 'm');
  
  if (regex.test(content)) {
    // Variable exists, update it
    return content.replace(regex, `${name}=${value}`);
  } else {
    // Variable doesn't exist, add it
    return `${content}\n${name}=${value}`;
  }
}