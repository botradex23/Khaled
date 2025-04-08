/**
 * Agent File Utilities
 * 
 * This module provides enhanced file system operations for the Agent
 * with full access to the entire workspace, enabling complete autonomy.
 * 
 * Features:
 * - Recursive file listing and directory traversal
 * - Glob pattern file search
 * - Content-based file search
 * - Full file system access with proper error handling
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

// Promisify exec for async/await
const execAsync = promisify(exec);

// Root directory - set to the workspace root
const ROOT_DIR = process.cwd();

/**
 * Safely normalize a path with appropriate error handling
 * @param {string} inputPath - Path to normalize (relative or absolute)
 * @returns {string} Normalized path
 */
function safePath(inputPath) {
  try {
    return path.resolve(inputPath);
  } catch (error) {
    console.error(`Error normalizing path ${inputPath}:`, error);
    throw new Error(`Invalid path: ${error.message}`);
  }
}

/**
 * Read a file with proper error handling
 * @param {string} filePath - Path to the file
 * @returns {string} File contents
 */
export function readFile(filePath) {
  try {
    const normalizedPath = safePath(filePath);
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
    const normalizedPath = safePath(filePath);
    
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
    const normalizedPath = safePath(filePath);
    
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
    const normalizedPath = safePath(filePath);
    
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
 * List files in a directory with proper error handling (non-recursive)
 * @param {string} directory - Directory path
 * @returns {Array} Array of file information objects
 */
export function listFiles(directory) {
  try {
    const normalizedPath = safePath(directory);
    
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
 * List files recursively in a directory with proper error handling
 * @param {string} directory - Directory path
 * @param {Object} options - Options for listing
 * @param {number} options.maxDepth - Maximum depth for recursion (default: -1 for unlimited)
 * @param {Array<string>} options.exclude - Paths to exclude
 * @param {Array<string>} options.include - File extensions to include (e.g., ['.js', '.ts'])
 * @returns {Array} Array of file information objects
 */
export function listFilesRecursive(directory, options = {}) {
  const { 
    maxDepth = -1, 
    exclude = ['node_modules', '.git', 'dist'], 
    include = null
  } = options;
  
  const results = [];
  
  function processDir(currentPath, depth) {
    if (maxDepth !== -1 && depth > maxDepth) {
      return;
    }
    
    try {
      const normalizedPath = safePath(currentPath);
      const items = fs.readdirSync(normalizedPath, { withFileTypes: true });
      
      for (const item of items) {
        // Skip excluded directories and hidden files
        if (exclude.includes(item.name) || item.name.startsWith('.')) {
          continue;
        }
        
        const fullPath = path.join(normalizedPath, item.name);
        
        if (item.isDirectory()) {
          results.push({
            name: item.name,
            isDirectory: true,
            path: fullPath,
            depth
          });
          
          // Recursively process subdirectories
          processDir(fullPath, depth + 1);
        } else {
          // If include filter is provided, check file extension
          if (include && include.length) {
            const ext = path.extname(item.name);
            if (!include.includes(ext)) {
              continue;
            }
          }
          
          results.push({
            name: item.name,
            isDirectory: false,
            path: fullPath,
            depth
          });
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${currentPath}:`, error);
      // Continue with other directories instead of throwing
    }
  }
  
  processDir(directory, 0);
  return results;
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {boolean} Whether the file exists
 */
export function fileExists(filePath) {
  try {
    const normalizedPath = safePath(filePath);
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
    const normalizedPath = safePath(dirPath);
    
    if (!fs.existsSync(normalizedPath)) {
      fs.mkdirSync(normalizedPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw new Error(`Failed to create directory: ${error.message}`);
  }
}

/**
 * Find files across the workspace using a glob pattern
 * @param {string} pattern - Glob pattern to match
 * @param {string} startDir - Directory to start from (default: workspace root)
 * @returns {Promise<Array>} Array of file paths matching the pattern
 */
export async function findFilesByPattern(pattern, startDir = ROOT_DIR) {
  try {
    // Use find command for efficient pattern matching
    const { stdout } = await execAsync(`find ${startDir} -type f -name "${pattern}" | grep -v "node_modules\\|.git"`);
    
    return stdout.trim().split('\n').filter(Boolean).map(file => ({
      path: file,
      name: path.basename(file),
      isDirectory: false
    }));
  } catch (error) {
    console.error(`Error finding files by pattern ${pattern}:`, error);
    // Fall back to recursive search if find fails
    return findFilesByWalk(pattern, startDir);
  }
}

/**
 * Find files by walking the directory tree (fallback for findFilesByPattern)
 * @param {string} pattern - Simple pattern to match (supports * wildcard)
 * @param {string} startDir - Directory to start from
 * @returns {Array} Array of file paths matching the pattern
 */
function findFilesByWalk(pattern, startDir) {
  // Convert simple glob pattern to regex
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  const results = [];
  
  function walk(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item.startsWith('.')) {
          continue;
        }
        
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          walk(fullPath);
        } else if (regex.test(item)) {
          results.push({
            path: fullPath,
            name: item,
            isDirectory: false
          });
        }
      }
    } catch (error) {
      console.error(`Error walking directory ${dir}:`, error);
      // Continue with other directories
    }
  }
  
  walk(startDir);
  return results;
}

/**
 * Find files containing specific text
 * @param {string} text - Text to search for
 * @param {Object} options - Search options
 * @param {string} options.startDir - Directory to start from (default: workspace root)
 * @param {Array<string>} options.extensions - File extensions to search (e.g., ['.js', '.ts'])
 * @param {boolean} options.caseSensitive - Whether the search is case sensitive
 * @returns {Promise<Array>} Array of file matches with context
 */
export async function findFilesContainingText(text, options = {}) {
  const {
    startDir = ROOT_DIR,
    extensions = [],
    caseSensitive = false
  } = options;
  
  try {
    // Build grep command
    let extensionPattern = '';
    if (extensions && extensions.length) {
      extensionPattern = `-name "*${extensions.join('" -o -name "*')}"`;
    } else {
      extensionPattern = '-type f';
    }
    
    // Build grep flags
    const grepFlags = caseSensitive ? '' : '-i';
    
    // Use find + grep for efficient text search
    const command = `find ${startDir} ${extensionPattern} | grep -v "node_modules\\|.git" | xargs grep ${grepFlags} -l "${text}"`;
    const { stdout } = await execAsync(command);
    
    // Process the results
    const filePaths = stdout.trim().split('\n').filter(Boolean);
    
    return Promise.all(filePaths.map(async (filePath) => {
      try {
        // Get context around the match using grep
        const { stdout: contextOutput } = await execAsync(`grep ${grepFlags} -n -A 2 -B 2 "${text}" "${filePath}"`);
        
        return {
          path: filePath,
          name: path.basename(filePath),
          isDirectory: false,
          matches: contextOutput.trim()
        };
      } catch (error) {
        return {
          path: filePath,
          name: path.basename(filePath),
          isDirectory: false,
          matches: 'Error getting context'
        };
      }
    }));
  } catch (error) {
    console.error(`Error finding files containing text "${text}":`, error);
    // Fallback to manual search
    return findFilesContainingTextManual(text, options);
  }
}

/**
 * Find files containing specific text using manual file reading (fallback)
 * @param {string} text - Text to search for
 * @param {Object} options - Search options
 * @returns {Array} Array of file matches
 */
function findFilesContainingTextManual(text, options = {}) {
  const {
    startDir = ROOT_DIR,
    extensions = [],
    caseSensitive = false
  } = options;
  
  const results = [];
  const searchText = caseSensitive ? text : text.toLowerCase();
  
  // Get all files
  const files = listFilesRecursive(startDir, {
    exclude: ['node_modules', '.git', 'dist'],
    include: extensions.length ? extensions : null
  }).filter(file => !file.isDirectory);
  
  // Check each file
  for (const file of files) {
    try {
      let content = fs.readFileSync(file.path, 'utf-8');
      
      if (!caseSensitive) {
        content = content.toLowerCase();
      }
      
      if (content.includes(searchText)) {
        // Get some context around the match
        const lines = content.split('\n');
        const matches = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = caseSensitive ? lines[i] : lines[i].toLowerCase();
          if (line.includes(searchText)) {
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length - 1, i + 2);
            const context = lines.slice(start, end + 1).join('\n');
            matches.push(`Lines ${start + 1}-${end + 1}: ${context}`);
          }
        }
        
        results.push({
          path: file.path,
          name: file.name,
          isDirectory: false,
          matches: matches.join('\n---\n')
        });
      }
    } catch (error) {
      console.error(`Error reading file ${file.path}:`, error);
      // Continue with other files
    }
  }
  
  return results;
}

/**
 * Get file metadata
 * @param {string} filePath - Path to the file
 * @returns {Object} File metadata
 */
export function getFileMetadata(filePath) {
  try {
    const normalizedPath = safePath(filePath);
    
    if (!fs.existsSync(normalizedPath)) {
      return null;
    }
    
    const stats = fs.statSync(normalizedPath);
    return {
      path: normalizedPath,
      name: path.basename(normalizedPath),
      size: stats.size,
      isDirectory: stats.isDirectory(),
      created: stats.birthtime,
      modified: stats.mtime,
      extension: path.extname(normalizedPath)
    };
  } catch (error) {
    console.error(`Error getting file metadata for ${filePath}:`, error);
    return null;
  }
}