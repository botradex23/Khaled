/**
 * HTTP Utilities
 * 
 * This module provides utilities for HTTP response formatting and error handling.
 */

import { Response } from 'express';
import { logError } from './logger';

/**
 * Send a success response
 * @param res Express response object
 * @param data Data to include in the response
 * @param statusCode HTTP status code (default: 200)
 */
export function sendSuccess(res: Response, data: any, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send an error response
 * @param res Express response object
 * @param message Error message
 * @param statusCode HTTP status code (default: 500)
 * @param error Optional error object for logging
 */
export function sendError(
  res: Response, 
  message: string, 
  statusCode: number = 500, 
  error?: any
): void {
  // Log the error if provided
  if (error) {
    logError('HTTP', `${message}: ${error.message || error}`);
  }
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: statusCode
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Send a "Not Found" response
 * @param res Express response object
 * @param message Error message (default: 'Resource not found')
 */
export function sendNotFound(res: Response, message: string = 'Resource not found'): void {
  sendError(res, message, 404);
}

/**
 * Send a "Bad Request" response
 * @param res Express response object
 * @param message Error message (default: 'Invalid request parameters')
 */
export function sendBadRequest(res: Response, message: string = 'Invalid request parameters'): void {
  sendError(res, message, 400);
}

/**
 * Send an "Unauthorized" response
 * @param res Express response object
 * @param message Error message (default: 'Unauthorized access')
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized access'): void {
  sendError(res, message, 401);
}

/**
 * Send a "Forbidden" response
 * @param res Express response object
 * @param message Error message (default: 'Access forbidden')
 */
export function sendForbidden(res: Response, message: string = 'Access forbidden'): void {
  sendError(res, message, 403);
}

/**
 * Send a "Server Error" response
 * @param res Express response object
 * @param message Error message (default: 'Internal server error')
 * @param error Optional error object for logging
 */
export function sendServerError(
  res: Response, 
  message: string = 'Internal server error',
  error?: any
): void {
  sendError(res, message, 500, error);
}

/**
 * Create error handling middleware
 * @param errorFormatter Optional function to format error messages
 * @returns Express middleware function
 */
export function errorMiddleware(
  errorFormatter?: (err: any) => string
): (err: any, req: any, res: Response, next: any) => void {
  return (err, req, res, next) => {
    const message = errorFormatter ? errorFormatter(err) : (err.message || 'Unknown error');
    const statusCode = err.status || err.statusCode || 500;
    
    logError('HTTP', `Error in request ${req.method} ${req.path}: ${message}`);
    sendError(res, message, statusCode, err);
  };
}

// Export all functions as default object
export default {
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  errorMiddleware
};