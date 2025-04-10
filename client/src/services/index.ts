/**
 * Services Module Index
 * 
 * This file exports all service components.
 */

import openaiService, * as openaiNamedExports from './openai-service';
import fileService, * as fileNamedExports from './file-service';
import dbService, * as dbNamedExports from './db-service';
import configService, * as configNamedExports from './config-service';
import marketDataService, * as marketDataNamedExports from './market-data-service';

// Re-export services
export { 
  openaiService, 
  fileService, 
  dbService, 
  configService,
  marketDataService 
};

// Re-export all named exports from individual service files
export const openai = {
  ...openaiNamedExports,
  default: openaiService
};

export const file = {
  ...fileNamedExports,
  default: fileService
};

export const db = {
  ...dbNamedExports,
  default: dbService
};

export const config = {
  ...configNamedExports,
  default: configService
};

export const marketData = {
  ...marketDataNamedExports,
  default: marketDataService
};

// Export a combined services object as default
export default {
  openai: openaiService,
  file: fileService,
  db: dbService,
  config: configService,
  marketData: marketDataService
};