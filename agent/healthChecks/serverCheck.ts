/**
 * Server Health Check
 * 
 * Checks if all server components are running and responsive.
 */

import axios from 'axios';
import { ServerCheckResult, Issue } from '../types';
import { logger } from '../logger';

// Server check configuration
interface ServerCheckConfig {
  frontend: string;
  backend: string;
  python: string;
}

/**
 * Check if a server is running at the given URL
 */
async function checkServerEndpoint(name: string, url: string): Promise<{ 
  status: 'online' | 'offline' | 'degraded';
  responseTime?: number;
  error?: string;
}> {
  logger.info(`Checking server: ${name} at ${url}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(url, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    const responseTime = Date.now() - startTime;
    
    // Determine status based on response code and time
    if (response.status >= 200 && response.status < 300) {
      if (responseTime > 2000) {
        logger.warn(`Server ${name} is slow: ${responseTime}ms`);
        return { status: 'degraded', responseTime, error: 'High latency' };
      } else {
        logger.info(`Server ${name} is online: ${responseTime}ms`);
        return { status: 'online', responseTime };
      }
    } else {
      logger.warn(`Server ${name} returned error status: ${response.status}`);
      return { 
        status: 'degraded', 
        responseTime,
        error: `Error status: ${response.status}`
      };
    }
  } catch (error) {
    logger.error(`Failed to connect to server ${name}`, { error });
    return { 
      status: 'offline',
      error: error.code === 'ECONNREFUSED' 
        ? 'Connection refused - Server not running'
        : error.code === 'ECONNABORTED'
          ? 'Connection timeout'
          : error.message
    };
  }
}

/**
 * Check all server components
 */
export async function checkServerStatus(config: ServerCheckConfig): Promise<ServerCheckResult> {
  logger.info('Starting server health checks', { endpoints: config });
  
  const issues: Issue[] = [];
  const servers = [];
  
  // Check frontend server
  const frontendResult = await checkServerEndpoint('frontend', config.frontend);
  servers.push({
    name: 'frontend',
    url: config.frontend,
    ...frontendResult
  });
  
  if (frontendResult.status !== 'online') {
    issues.push({
      type: 'server',
      severity: frontendResult.status === 'offline' ? 'critical' : 'high',
      component: 'frontend',
      message: `Frontend server ${frontendResult.status}: ${config.frontend}`,
      details: frontendResult,
      timestamp: new Date().toISOString()
    });
  }
  
  // Check backend server
  const backendResult = await checkServerEndpoint('backend', config.backend);
  servers.push({
    name: 'backend',
    url: config.backend,
    ...backendResult
  });
  
  if (backendResult.status !== 'online') {
    issues.push({
      type: 'server',
      severity: backendResult.status === 'offline' ? 'critical' : 'high',
      component: 'backend',
      message: `Backend server ${backendResult.status}: ${config.backend}`,
      details: backendResult,
      timestamp: new Date().toISOString()
    });
  }
  
  // Check Python API server
  const pythonResult = await checkServerEndpoint('python', config.python);
  servers.push({
    name: 'python',
    url: config.python,
    ...pythonResult
  });
  
  if (pythonResult.status !== 'online') {
    issues.push({
      type: 'server',
      severity: pythonResult.status === 'offline' ? 'critical' : 'high',
      component: 'python',
      message: `Python API server ${pythonResult.status}: ${config.python}`,
      details: pythonResult,
      timestamp: new Date().toISOString()
    });
  }
  
  // Determine overall health
  const healthy = issues.length === 0;
  
  const result: ServerCheckResult = {
    healthy,
    issues,
    servers
  };
  
  logger.info('Server health check completed', { result });
  return result;
}