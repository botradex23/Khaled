/**
 * Project Analyzer
 * 
 * This module provides utilities for analyzing the project structure.
 */

import fs from 'fs';
import path from 'path';

/**
 * Analyzes the project structure and returns a summary
 * @param projectRoot The root directory of the project
 * @returns Project structure summary
 */
export function analyzeProjectStructure(projectRoot: string): any {
  try {
    // Get a simplified structure of the project (top-level dirs only)
    const dirContents = fs.readdirSync(projectRoot)
      .filter(item => !item.startsWith('.') && item !== 'node_modules')
      .map(item => {
        const itemPath = path.join(projectRoot, item);
        const stats = fs.statSync(itemPath);
        return {
          name: item,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size
        };
      });
    
    return {
      success: true,
      rootDirectory: projectRoot,
      structure: dirContents,
      totalItems: dirContents.length,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error analyzing project structure: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Counts the lines of code in the project
 * @param projectRoot The root directory of the project
 * @param extensions Array of file extensions to include (e.g., ['.js', '.ts'])
 * @returns Lines of code statistics
 */
export function countLinesOfCode(projectRoot: string, extensions: string[] = ['.js', '.ts']): any {
  try {
    let totalLines = 0;
    let totalFiles = 0;
    
    // Function to recursively process directories
    function processDir(dirPath: string) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        // Skip hidden files/directories and node_modules
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Recursively process subdirectory
          processDir(itemPath);
        } else if (stats.isFile()) {
          // Check if file has one of the specified extensions
          const ext = path.extname(item).toLowerCase();
          if (extensions.includes(ext)) {
            // Count lines in the file
            const content = fs.readFileSync(itemPath, 'utf-8');
            const lines = content.split('\n').length;
            totalLines += lines;
            totalFiles++;
          }
        }
      }
    }
    
    // Start processing from the project root
    processDir(projectRoot);
    
    return {
      success: true,
      totalFiles,
      totalLines,
      extensions,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error counting lines of code: ${error.message}`,
      error: error.message
    };
  }
}

export default {
  analyzeProjectStructure,
  countLinesOfCode
};