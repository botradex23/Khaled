/**
 * Agent Integration for Tradeliy
 * 
 * This module integrates the AgentApiClient directly into the server code
 * for file operations without requiring an HTTP server on port 3099.
 */

const fs = require('fs');
const path = require('path');

// Custom AgentApiClient implementation in CommonJS format
class AgentApiClient {
  constructor() {
    // No OpenAI integration needed for server-side file operations
  }
  
  /**
   * Read a file directly from the filesystem
   * @param {string} filePath - Path to the file (relative to project root)
   * @returns {Promise<Object>} - Response with file content or error
   */
  async readFile(filePath) {
    try {
      // Safely resolve path relative to project root
      const fullPath = path.resolve(process.cwd(), filePath);
      
      // Security check
      if (!fullPath.startsWith(process.cwd())) {
        return {
          success: false,
          message: 'Access denied. Path is outside project root.'
        };
      }
      
      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          message: `File not found: ${filePath}`
        };
      }
      
      // Check if it's a directory
      if (fs.statSync(fullPath).isDirectory()) {
        return {
          success: false,
          message: 'Path is a directory, not a file'
        };
      }
      
      // Read file content
      const content = fs.readFileSync(fullPath, 'utf8');
      
      return {
        success: true,
        content
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error reading file: ${errorMessage}`
      };
    }
  }
  
  /**
   * Write content to a file
   * @param {string} filePath - Path to the file (relative to project root)
   * @param {string} content - Content to write
   * @returns {Promise<Object>} - Response with success status or error
   */
  async writeFile(filePath, content) {
    try {
      // Safely resolve path relative to project root
      const fullPath = path.resolve(process.cwd(), filePath);
      
      // Security check
      if (!fullPath.startsWith(process.cwd())) {
        return {
          success: false,
          message: 'Access denied. Path is outside project root.'
        };
      }
      
      // Create directory if it doesn't exist
      const directory = path.dirname(fullPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      // Write to file
      fs.writeFileSync(fullPath, content, 'utf8');
      
      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error writing file: ${errorMessage}`
      };
    }
  }
  
  /**
   * List files in a directory
   * @param {string} directory - Directory path (relative to project root)
   * @returns {Promise<Object>} - Response with list of files or error
   */
  async listFiles(directory) {
    try {
      // Safely resolve path relative to project root
      const fullPath = path.resolve(process.cwd(), directory);
      
      // Security check
      if (!fullPath.startsWith(process.cwd())) {
        return {
          success: false,
          message: 'Access denied. Path is outside project root.'
        };
      }
      
      // Check if directory exists
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          message: `Directory not found: ${directory}`
        };
      }
      
      // Check if it's a directory
      if (!fs.statSync(fullPath).isDirectory()) {
        return {
          success: false,
          message: 'Path is a file, not a directory'
        };
      }
      
      // Read directory
      const items = fs.readdirSync(fullPath);
      
      // Get file information for each item
      const files = items.map(item => {
        const itemPath = path.join(fullPath, item);
        const stats = fs.statSync(itemPath);
        
        return {
          name: item,
          path: path.relative(process.cwd(), itemPath),
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      });
      
      return {
        success: true,
        files
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error listing files: ${errorMessage}`
      };
    }
  }
}

// Create an instance of the client for server-side use
const agentClient = new AgentApiClient();

// Export the agent client for other modules to use
module.exports = {
  agentClient,
  
  // Add Express route handlers for backward compatibility with existing API routes
  setupAgentRoutes(app) {
    // Setup agent routes for backward compatibility with existing code
    app.get('/api/my-agent/direct-read-file', async (req, res) => {
      const filePath = req.query.path;
      
      if (!filePath) {
        return res.status(400).json({
          success: false,
          message: 'Path parameter is required'
        });
      }
      
      const result = await agentClient.readFile(filePath);
      res.json(result);
    });
    
    app.post('/api/my-agent/direct-write-file', async (req, res) => {
      const { path: filePath, content } = req.body;
      
      if (!filePath) {
        return res.status(400).json({
          success: false,
          message: 'Path parameter is required'
        });
      }
      
      if (content === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Content parameter is required'
        });
      }
      
      const result = await agentClient.writeFile(filePath, content);
      res.json(result);
    });
    
    app.get('/api/my-agent/direct-list-files', async (req, res) => {
      const directory = req.query.directory || '.';
      
      const result = await agentClient.listFiles(directory);
      res.json(result);
    });
    
    console.log('Agent API routes initialized with direct file access (no standalone server needed)');
  }
};