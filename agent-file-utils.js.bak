/**
 * Agent File Utilities
 * 
 * This module provides enhanced file system operations for the Agent
 * to ensure proper functionality in both Replit and VPS environments.
 */

import fs from 'fs';
import path from 'path';

/**
 * Read a file with proper error handling
 * @param {string} filePath - Path to the file
 * @returns {string} File contents
 */
export function readFile(filePath) {
  try {
    // Normalize the path to handle both relative and absolute paths
    const normalizedPath = path.resolve(filePath);
    return fs.readFileSync(normalizedPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Write to a file with proper error handling
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @returns {boolean} Success status
 */
export function writeFile(filePath, content) {
  try {
    // Normalize the path to handle both relative and absolute paths
    const normalizedPath = path.resolve(filePath);
    
    // Ensure directory exists
    const directory = path.dirname(normalizedPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    fs.writeFileSync(normalizedPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

/**
 * Append to a file with proper error handling
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to append
 * @returns {boolean} Success status
 */
export function appendFile(filePath, content) {
  try {
    // Normalize the path to handle both relative and absolute paths
    const normalizedPath = path.resolve(filePath);
    
    // Ensure directory exists
    const directory = path.dirname(normalizedPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    fs.appendFileSync(normalizedPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error appending to file ${filePath}:`, error);
    throw new Error(`Failed to append to file: ${error.message}`);
  }
}

/**
 * Delete a file with proper error handling
 * @param {string} filePath - Path to the file
 * @returns {boolean} Success status
 */
export function deleteFile(filePath) {
  try {
    // Normalize the path to handle both relative and absolute paths
    const normalizedPath = path.resolve(filePath);
    
    if (fs.existsSync(normalizedPath)) {
      fs.unlinkSync(normalizedPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * List files in a directory with proper error handling
 * @param {string} directory - Directory path
 * @returns {Array} Array of file information objects
 */
export function listFiles(directory) {
  try {
    // Normalize the path to handle both relative and absolute paths
    const normalizedPath = path.resolve(directory);
    
    const files = fs.readdirSync(normalizedPath, { withFileTypes: true })
      .filter(dirent => !dirent.name.startsWith('.'))
      .map(dirent => ({
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
        path: path.resolve(normalizedPath, dirent.name)
      }));
    
    return files;
  } catch (error) {
    console.error(`Error listing files in ${directory}:`, error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} Whether the file exists
 */
export function fileExists(filePath) {
  try {
    // Normalize the path to handle both relative and absolute paths
    const normalizedPath = path.resolve(filePath);
    return fs.existsSync(normalizedPath);
  } catch (error) {
    console.error(`Error checking if file exists ${filePath}:`, error);
    return false;
  }
}

/**
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Path to the directory
 * @returns {boolean} Success status
 */
export function ensureDirectoryExists(dirPath) {
  try {
    // Normalize the path to handle both relative and absolute paths
    const normalizedPath = path.resolve(dirPath);
    
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw new Error(`Failed to create directory: ${error.message}`);
  }
}