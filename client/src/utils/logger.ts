/**
 * Logger Utility
 * 
 * This module provides consistent logging functions for the application.
 */

/**
 * Log an informational message with component prefix
 * @param component The component name (e.g., 'Agent', 'API', etc.)
 * @param message The message to log
 */
export function logInfo(component: string, message: string): void {
  console.log(`[${component}] ${message}`);
}

/**
 * Log an error message with component prefix
 * @param component The component name (e.g., 'Agent', 'API', etc.)
 * @param message The error message
 * @param error Optional error object to include
 */
export function logError(component: string, message: string, error?: any): void {
  console.error(`[${component}] ERROR: ${message}`, error || '');
}

/**
 * Log a warning message with component prefix
 * @param component The component name (e.g., 'Agent', 'API', etc.)
 * @param message The warning message
 */
export function logWarning(component: string, message: string): void {
  console.warn(`[${component}] WARNING: ${message}`);
}

/**
 * Log a debug message with component prefix (only if debug mode is enabled)
 * @param component The component name (e.g., 'Agent', 'API', etc.)
 * @param message The debug message
 */
export function logDebug(component: string, message: string): void {
  if (process.env.DEBUG === 'true') {
    console.debug(`[${component}] DEBUG: ${message}`);
  }
}

export default {
  logInfo,
  logError,
  logWarning,
  logDebug
};