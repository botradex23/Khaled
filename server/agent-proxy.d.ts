/**
 * Type definitions for the Agent API Proxy
 */

import { Express } from 'express';

/**
 * Initialize the agent proxy middleware
 * @param app - Express application
 * @param targetPort - Port where the standalone agent server is running
 */
export function initializeAgentProxy(app: Express, targetPort?: number): void;

export default {
  initializeAgentProxy: typeof initializeAgentProxy
};