import express from 'express';
import agentController from '../agent/agent-controller';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Direct implementation of agent client for file operations
class DirectAgentClient {
  /**
   * Read a file directly from the filesystem
   * @param filePath Path to the file (relative to project root)
   * @returns Response with file content or error
   */
  async readFile(filePath: string): Promise<any> {
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
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error reading file: ${errorMessage}`
      };
    }
  }
  
  /**
   * Write content to a file
   * @param filePath Path to the file (relative to project root)
   * @param content Content to write
   * @returns Response with success status or error
   */
  async writeFile(filePath: string, content: string): Promise<any> {
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
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error writing file: ${errorMessage}`
      };
    }
  }
  
  /**
   * List files in a directory
   * @param directory Directory path (relative to project root)
   * @returns Response with list of files or error
   */
  async listFiles(directory: string): Promise<any> {
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
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error listing files: ${errorMessage}`
      };
    }
  }
}

// Create an instance of our direct agent client
const agentClient = new DirectAgentClient();
console.log('[Agent Routes] Direct file access client initialized');

function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
  console.log(`[Agent Routes] [${level}] ${message}`);
}

router.get('/health', async (req, res) => {
  try {
    const status = agentController.getAgentStatus();
    res.json(status);
  } catch (error: any) {
    log(`Error in health check: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/verify-openai-key', async (req, res) => {
  try {
    const result = await agentController.verifyOpenAIKey();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    log(`Error verifying OpenAI API key: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    log(`Processing chat request: ${prompt.substring(0, 50)}...`);
    const result = await agentController.getAgentChatResponse(prompt, systemPrompt);
    res.json(result);
  } catch (error: any) {
    log(`Error in chat endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/task', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    log(`Processing task request: ${prompt.substring(0, 50)}...`);
    const result = await agentController.executeAgentTask(prompt, systemPrompt);
    res.json(result);
  } catch (error: any) {
    log(`Error in task endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/file-op', async (req, res) => {
  try {
    const { operation, params } = req.body;
    if (!operation) return res.status(400).json({ success: false, message: 'Operation is required' });

    log(`Processing file operation: ${operation}`);
    const result = await agentController.executeFileOperation(operation, params);
    res.json(result);
  } catch (error: any) {
    log(`Error in file operation endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/search-files', async (req, res) => {
  try {
    const { directory, options } = req.body;
    if (!directory) return res.status(400).json({ success: false, message: 'Directory is required' });

    const result = await agentController.executeFileOperation('listFilesRecursive', { directory, options });
    res.json(result);
  } catch (error: any) {
    log(`Error in search files endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/search-content', async (req, res) => {
  try {
    const { text, options } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

    const result = await agentController.executeFileOperation('findFilesContainingText', { text, options });
    res.json(result);
  } catch (error: any) {
    log(`Error in search content endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/analyze-project', async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) return res.status(400).json({ success: false, message: 'Task is required' });

    const result = await agentController.analyzeEntireProject(task);
    res.json({ success: true, result });
  } catch (error: any) {
    log(`Error in analyze-project endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/status', (req, res) => {
  try {
    res.json({
      status: 'ok',
      message: 'Integrated agent routes are registered and active',
      timestamp: new Date().toISOString(),
      integratedMode: true
    });
  } catch (error: any) {
    log(`Error in status endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

// Direct file operation endpoints for compatibility with the agent-terminal-server.js approach
// These endpoints are used for direct file access without requiring a standalone server
// Important: Using '/api/' prefix in the route to avoid being caught by Vite middleware

router.get('/api/direct-read-file', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'Path parameter is required'
      });
    }
    
    log(`Direct read file: ${filePath}`);
    const result = await agentClient.readFile(filePath);
    res.json(result);
  } catch (error: any) {
    log(`Error in direct-read-file endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/api/direct-write-file', async (req, res) => {
  try {
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
    
    log(`Direct write file: ${filePath}`);
    const result = await agentClient.writeFile(filePath, content);
    res.json(result);
  } catch (error: any) {
    log(`Error in direct-write-file endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/api/direct-list-files', async (req, res) => {
  try {
    const directory = (req.query.directory as string) || '.';
    
    log(`Direct list files: ${directory}`);
    const result = await agentClient.listFiles(directory);
    res.json(result);
  } catch (error: any) {
    log(`Error in direct-list-files endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;