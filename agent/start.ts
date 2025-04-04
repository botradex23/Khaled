/**
 * Start the CryptoTrade AI Agent
 * 
 * This script starts the agent with the default configuration.
 * It monitors the health of the system and attempts to fix issues automatically.
 */

import * as dotenv from 'dotenv';
import { agent } from './agent';
import { logger } from './logger';

// Load environment variables
dotenv.config();

try {
  logger.info('Starting CryptoTrade AI Agent...');
  
  // Start the agent
  agent.start();
  
  // Handle process termination signals
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    agent.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    agent.stop();
    process.exit(0);
  });
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
  });
  
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
  
  logger.info('Agent started successfully');
} catch (error) {
  logger.error('Failed to start agent', { error });
  process.exit(1);
}