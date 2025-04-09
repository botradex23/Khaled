/**
 * Agent File Service
 * 
 * This module provides file system operations for the Agent.
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
 * Log information message
 */
function logInfo(message: string): void {
  console.log(`[File Service] ${message}`);
}

/**
 * Log error message
 */
function logError(message: string, error?: any): void {
  console.error(`[File Service] ERROR: ${message}`, error);
}

/**
 * Safely normalize a path with appropriate error handling
 */
function safePath(inputPath: string): string {
  try {
    return path.resolve(inputPath);
  } catch (error: any) {
    logError(`Error normalizing path ${inputPath}:`, error);
    throw new Error(`Invalid path: ${error.message}`);
  }
}

/**
 * Read a file with proper error handling
 */
export function readFile(filePath: string): string {
  try {
    const normalizedPath = safePath(filePath);
    return fs.readFileSync(normalizedPath, 'utf-8');
  } catch (error: any) {
    logError(`Error reading file ${filePath}:`, error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * List files in a directory with proper error handling (non-recursive)
 */
export function listFiles(directory: string): any[] {
  try {
    const normalizedPath = safePath(directory);
    const items = fs.readdirSync(normalizedPath);
    
    return items.map(item => {
      const itemPath = path.join(normalizedPath, item);
      const stats = fs.statSync(itemPath);
      
      return {
        name: item,
        path: itemPath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      };
    });
  } catch (error: any) {
    logError(`Error listing files in directory ${directory}:`, error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * List files recursively in a directory with proper error handling
 */
export function listFilesRecursive(directory: string, options: any = {}): any[] {
  try {
    const results: any[] = [];
    const normalizedPath = safePath(directory);
    
    // Set defaults for options
    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : -1; // -1 for unlimited
    const excludePaths = options.exclude || [];
    const includeExtensions = options.include || [];
    
    // Helper function to process each item
    const processItem = (item: string, currentPath: string, depth: number) => {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      
      // Skip hidden files/directories (starting with .)
      if (item.startsWith('.')) return;
      
      if (stats.isDirectory()) {
        // Add directory to results
        results.push({
          name: item,
          path: itemPath,
          isDirectory: true,
          size: stats.size,
          modified: stats.mtime
        });
        
        // Recursively process subdirectory if not at max depth
        if (maxDepth < 0 || depth < maxDepth) {
          processDir(itemPath, depth + 1);
        }
      } else if (stats.isFile()) {
        // Check if file extension should be included
        const ext = path.extname(item).toLowerCase();
        if (includeExtensions.length > 0 && !includeExtensions.includes(ext)) return;
        
        // Add file to results
        results.push({
          name: item,
          path: itemPath,
          isDirectory: false,
          size: stats.size,
          modified: stats.mtime,
          extension: ext
        });
      }
    };
    
    // Define the recursive directory processing function
    const processDir = (currentPath: string, depth: number) => {
      // Check if path should be excluded
      if (excludePaths.some((excludePath: string) => currentPath.includes(excludePath))) return;
      
      // Get all items in the current directory
      const items = fs.readdirSync(currentPath);
      
      // Process each item
      for (const item of items) {
        processItem(item, currentPath, depth);
      }
    };
    
    // Start processing from the specified directory
    processDir(normalizedPath, 0);
    return results;
  } catch (error: any) {
    logError(`Error recursively listing files in directory ${directory}:`, error);
    throw new Error(`Failed to list files recursively: ${error.message}`);
  }
}

/**
 * Find files containing specific text
 */
export async function findFilesContainingText(text: string, options: any = {}): Promise<any[]> {
  try {
    const startDir = options.startDir || ROOT_DIR;
    const extensions = options.extensions || [];
    const caseSensitive = options.caseSensitive || false;
    
    // Normalize start directory
    const normalizedStartDir = safePath(startDir);
    
    // Create grep options
    const grepOptions = caseSensitive ? '' : '-i';
    
    // Build extensions pattern for grep
    let filePattern = '';
    if (extensions.length > 0) {
      filePattern = `--include="*{${extensions.join(',')}}"`;
    }
    
    // Use recursive grep to find files containing the text
    const command = `grep ${grepOptions} -l ${filePattern} -r "${text}" ${normalizedStartDir}`;
    
    logInfo(`Executing search command: ${command}`);
    const { stdout } = await execAsync(command);
    
    // Parse results into array of matching files
    const matchingFiles = stdout.trim().split('\n').filter(Boolean);
    
    // For each matching file, get a snippet of context
    const results = await Promise.all(matchingFiles.map(async (filePath) => {
      try {
        const normalizedFilePath = filePath.trim();
        const grepForContext = `grep ${grepOptions} -n -A 2 -B 2 "${text}" "${normalizedFilePath}"`;
        const { stdout: contextStdout } = await execAsync(grepForContext);
        
        // Extract the context lines
        const snippets = contextStdout
          .split('--')
          .map(snippet => snippet.trim())
          .filter(Boolean);
        
        return {
          path: normalizedFilePath,
          matches: snippets.length,
          snippets: snippets
        };
      } catch (error) {
        logError(`Error getting context for ${filePath}:`, error);
        return {
          path: filePath,
          matches: 1,
          snippets: ['Context extraction failed']
        };
      }
    }));
    
    return results;
  } catch (error: any) {
    // If grep error (e.g. no matches), return empty array
    if (error.code === 1) {
      return [];
    }
    
    logError(`Error finding files containing text "${text}":`, error);
    throw new Error(`Failed to find files containing text: ${error.message}`);
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    const normalizedPath = safePath(filePath);
    return fs.existsSync(normalizedPath);
  } catch (error) {
    return false;
  }
}

export default {
  readFile,
  listFiles,
  listFilesRecursive,
  findFilesContainingText,
  fileExists
};