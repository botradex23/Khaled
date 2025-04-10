/**
 * Utils Module Index
 * 
 * This file exports all utility components.
 */

import * as loggerUtils from './logger';
import * as projectAnalyzer from './project-analyzer';
import * as httpUtils from './http-utils';

// Re-export all utility functions
export { loggerUtils, projectAnalyzer, httpUtils };

// Export individual utilities for convenience
export const { 
  logInfo, 
  logError, 
  logWarning, 
  logDebug 
} = loggerUtils;

export const { 
  analyzeProjectStructure, 
  countLinesOfCode 
} = projectAnalyzer;

export const {
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  errorMiddleware
} = httpUtils;

// Export all utilities as default
export default {
  logger: loggerUtils,
  projectAnalyzer,
  http: httpUtils
};