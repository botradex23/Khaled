/**
 * File System Health Check
 * 
 * Checks if all critical files exist and are accessible.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileCheckResult, Issue } from '../types';
import { logger } from '../logger';

/**
 * Check if critical files exist
 */
export async function checkCriticalFiles(filePaths: string[]): Promise<FileCheckResult> {
  logger.info('Checking critical files', { filePaths });
  
  const issues: Issue[] = [];
  const missingFiles: string[] = [];
  const existingFiles: string[] = [];
  
  // Loop through all critical files
  for (const filePath of filePaths) {
    try {
      // Check if file exists
      const exists = fs.existsSync(filePath);
      
      if (!exists) {
        // File doesn't exist
        logger.warn(`Critical file not found: ${filePath}`);
        missingFiles.push(filePath);
        
        issues.push({
          type: 'file',
          severity: 'high',
          component: filePath,
          message: `Critical file not found: ${filePath}`,
          timestamp: new Date().toISOString()
        });
      } else {
        // File exists, check if readable
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isFile()) {
            // It's a file, check if we can read it
            fs.accessSync(filePath, fs.constants.R_OK);
            existingFiles.push(filePath);
          } else {
            // It's not a file (maybe a directory)
            logger.warn(`Path exists but is not a file: ${filePath}`);
            
            issues.push({
              type: 'file',
              severity: 'medium',
              component: filePath,
              message: `Path exists but is not a file: ${filePath}`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (err) {
          // File exists but can't be read
          logger.warn(`File exists but can't be read: ${filePath}`, { error: err });
          
          issues.push({
            type: 'file',
            severity: 'high',
            component: filePath,
            message: `File exists but can't be read: ${filePath}`,
            details: { error: err.message },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      // Error during file check
      logger.error(`Error checking file: ${filePath}`, { error: err });
      
      issues.push({
        type: 'file',
        severity: 'high',
        component: filePath,
        message: `Error checking file: ${filePath}`,
        details: { error: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  const result: FileCheckResult = {
    healthy: missingFiles.length === 0 && issues.length === 0,
    issues,
    missingFiles,
    existingFiles
  };
  
  logger.info('File check completed', { result });
  return result;
}

/**
 * Get content of a file
 */
export async function getFileContent(filePath: string): Promise<string | null> {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  } catch (err) {
    logger.error(`Error reading file: ${filePath}`, { error: err });
    return null;
  }
}

/**
 * Create a directory if it doesn't exist
 */
export async function ensureDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
    return true;
  } catch (err) {
    logger.error(`Error creating directory: ${dirPath}`, { error: err });
    return false;
  }
}