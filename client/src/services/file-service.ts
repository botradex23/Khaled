/**
 * File Service
 * 
 * This service handles all file system operations.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { logInfo, logError } from '../utils/logger';

// Promisify file system functions
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);
const unlinkAsync = promisify(fs.unlink);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Safely normalize a path with appropriate error handling
 * @param inputPath Path to normalize (relative or absolute)
 * @returns Normalized path
 */
function safePath(inputPath: string): string {
  try {
    // Don't allow paths outside of the project root
    const normPath = path.normalize(inputPath);
    return normPath;
  } catch (error: any) {
    logError('FileService', `Path normalization error: ${error.message}`);
    throw new Error(`Invalid path: ${error.message}`);
  }
}

/**
 * Read a file with proper error handling
 * @param filePath Path to the file
 * @returns File contents
 */
async function readFile(filePath: string): Promise<string> {
  try {
    const normalizedPath = safePath(filePath);
    const content = await readFileAsync(normalizedPath, 'utf-8');
    return content;
  } catch (error: any) {
    logError('FileService', `Error reading file ${filePath}: ${error.message}`);
    throw new Error(`Could not read file ${filePath}: ${error.message}`);
  }
}

/**
 * Write to a file with proper error handling
 * @param filePath Path to the file
 * @param content Content to write
 * @returns Success status
 */
async function writeFile(filePath: string, content: string): Promise<boolean> {
  try {
    const normalizedPath = safePath(filePath);
    await writeFileAsync(normalizedPath, content, 'utf-8');
    return true;
  } catch (error: any) {
    logError('FileService', `Error writing to file ${filePath}: ${error.message}`);
    throw new Error(`Could not write to file ${filePath}: ${error.message}`);
  }
}

/**
 * Append to a file with proper error handling
 * @param filePath Path to the file
 * @param content Content to append
 * @returns Success status
 */
async function appendFile(filePath: string, content: string): Promise<boolean> {
  try {
    const normalizedPath = safePath(filePath);
    await appendFileAsync(normalizedPath, content, 'utf-8');
    return true;
  } catch (error: any) {
    logError('FileService', `Error appending to file ${filePath}: ${error.message}`);
    throw new Error(`Could not append to file ${filePath}: ${error.message}`);
  }
}

/**
 * Delete a file with proper error handling
 * @param filePath Path to the file
 * @returns Success status
 */
async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const normalizedPath = safePath(filePath);
    await unlinkAsync(normalizedPath);
    return true;
  } catch (error: any) {
    logError('FileService', `Error deleting file ${filePath}: ${error.message}`);
    throw new Error(`Could not delete file ${filePath}: ${error.message}`);
  }
}

/**
 * Check if a file exists
 * @param filePath Path to the file
 * @returns Whether the file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const normalizedPath = safePath(filePath);
    await statAsync(normalizedPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * List files in a directory with proper error handling (non-recursive)
 * @param directory Directory path
 * @returns Array of file information objects
 */
async function listFiles(directory: string): Promise<any[]> {
  try {
    const normalizedPath = safePath(directory);
    const files = await readdirAsync(normalizedPath);
    
    // Get detailed information for each file
    const fileInfoPromises = files.map(async (file) => {
      const filePath = path.join(normalizedPath, file);
      try {
        const stats = await statAsync(filePath);
        return {
          name: file,
          path: filePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      } catch (error) {
        return {
          name: file,
          path: filePath,
          error: 'Could not get file stats'
        };
      }
    });
    
    return Promise.all(fileInfoPromises);
  } catch (error: any) {
    logError('FileService', `Error listing files in ${directory}: ${error.message}`);
    throw new Error(`Could not list files in ${directory}: ${error.message}`);
  }
}

/**
 * Create a directory if it doesn't exist
 * @param dirPath Path to the directory
 * @returns Success status
 */
async function ensureDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    const normalizedPath = safePath(dirPath);
    try {
      await statAsync(normalizedPath);
      // Directory already exists
      return true;
    } catch (error) {
      // Directory doesn't exist, create it
      await mkdirAsync(normalizedPath, { recursive: true });
      return true;
    }
  } catch (error: any) {
    logError('FileService', `Error creating directory ${dirPath}: ${error.message}`);
    throw new Error(`Could not create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Get file metadata
 * @param filePath Path to the file
 * @returns File metadata
 */
async function getFileMetadata(filePath: string): Promise<any> {
  try {
    const normalizedPath = safePath(filePath);
    const stats = await statAsync(normalizedPath);
    
    return {
      path: normalizedPath,
      name: path.basename(normalizedPath),
      directory: path.dirname(normalizedPath),
      extension: path.extname(normalizedPath),
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime
    };
  } catch (error: any) {
    logError('FileService', `Error getting file metadata for ${filePath}: ${error.message}`);
    throw new Error(`Could not get file metadata for ${filePath}: ${error.message}`);
  }
}

// Helper function to process a directory recursively (defined outside to avoid strict mode issues)
async function processDirRecursively(
  currentPath: string, 
  depth: number = 0,
  maxDepth: number,
  exclude: string[],
  include: string[],
  results: any[]
): Promise<void> {
  // Check depth limit
  if (maxDepth >= 0 && depth > maxDepth) return;
  
  // Check if this path should be excluded
  if (exclude.some((pattern: string) => currentPath.includes(pattern))) return;
  
  // Get all items in the directory
  const items = await readdirAsync(currentPath);
  
  // Process each item
  for (const item of items) {
    // Skip hidden files/folders
    if (item.startsWith('.')) continue;
    
    const itemPath = path.join(currentPath, item);
    const stats = await statAsync(itemPath);
    
    // Process file
    if (stats.isFile()) {
      // Check if file extension is in the include list (if there is an include list)
      const ext = path.extname(item).toLowerCase();
      if (include.length === 0 || include.includes(ext)) {
        results.push({
          name: item,
          path: itemPath,
          isDirectory: false,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }
    } 
    // Process directory
    else if (stats.isDirectory()) {
      // Add directory to results
      results.push({
        name: item,
        path: itemPath,
        isDirectory: true,
        created: stats.birthtime,
        modified: stats.mtime
      });
      
      // Recursively process subdirectory
      await processDirRecursively(itemPath, depth + 1, maxDepth, exclude, include, results);
    }
  }
}

/**
 * List files recursively in a directory with proper error handling
 * @param directory Directory path
 * @param options Options for listing
 * @returns Array of file information objects
 */
async function listFilesRecursive(directory: string, options: any = {}): Promise<any[]> {
  try {
    const normalizedPath = safePath(directory);
    const maxDepth = options.maxDepth || -1; // -1 for unlimited depth
    const exclude = options.exclude || [];
    const include = options.include || []; // File extensions to include
    
    let results: any[] = [];
    
    // Start recursive processing
    await processDirRecursively(normalizedPath, 0, maxDepth, exclude, include, results);
    
    return results;
  } catch (error: any) {
    logError('FileService', `Error recursively listing files in ${directory}: ${error.message}`);
    throw new Error(`Could not recursively list files in ${directory}: ${error.message}`);
  }
}

/**
 * Find files containing specific text
 * @param text Text to search for
 * @param options Search options
 * @returns Array of file matches with context
 */
async function findFilesContainingText(text: string, options: any = {}): Promise<any[]> {
  try {
    const startDir = options.startDir || '.';
    const extensions = options.extensions || ['.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt'];
    const caseSensitive = options.caseSensitive || false;
    
    // Get all files recursively
    const allFiles = await listFilesRecursive(startDir, {
      maxDepth: options.maxDepth || -1,
      exclude: options.exclude || ['node_modules', '.git'],
      include: extensions
    });
    
    // Filter for files only
    const files = allFiles.filter(item => !item.isDirectory);
    
    // Search for the text in each file
    const matches: any[] = [];
    
    for (const file of files) {
      try {
        const content = await readFile(file.path);
        
        // Perform the search
        const searchText = caseSensitive ? text : text.toLowerCase();
        const fileContent = caseSensitive ? content : content.toLowerCase();
        
        if (fileContent.includes(searchText)) {
          // Find all occurrences of the text
          const lines = content.split('\n');
          const matchingLines: any[] = [];
          
          lines.forEach((line, index) => {
            const lineToSearch = caseSensitive ? line : line.toLowerCase();
            if (lineToSearch.includes(searchText)) {
              matchingLines.push({
                line: index + 1,
                content: line.trim(),
                highlight: searchText
              });
            }
          });
          
          matches.push({
            file: file.path,
            matches: matchingLines,
            matchCount: matchingLines.length
          });
        }
      } catch (error: any) {
        logError('FileService', `Error searching in file ${file.path}: ${error.message}`);
        // Continue with other files even if one fails
      }
    }
    
    return matches;
  } catch (error: any) {
    logError('FileService', `Error searching for text: ${error.message}`);
    throw new Error(`Could not search for text: ${error.message}`);
  }
}

// Export named functions
export {
  readFile,
  writeFile,
  appendFile,
  deleteFile,
  fileExists,
  listFiles,
  listFilesRecursive,
  ensureDirectoryExists,
  getFileMetadata,
  findFilesContainingText
};

// Export default object for backwards compatibility
export default {
  readFile,
  writeFile,
  appendFile,
  deleteFile,
  fileExists,
  listFiles,
  listFilesRecursive,
  ensureDirectoryExists,
  getFileMetadata,
  findFilesContainingText
};