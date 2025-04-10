import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { 
  getChatCompletion, 
  analyzeCodeFiles, 
  suggestCodeChanges, 
  readFile, 
  writeFile, 
  listFiles,
  initializeOpenAI
} from '../services/openaiService';
import { ensureAuthenticated } from '../middleware/auth';

const router = Router();

// Middleware to ensure the user is an admin - simplified for testing
function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  const hasTestAdminHeader = req.headers['x-test-admin'] === 'true';
  if (hasTestAdminHeader) {
    return next();
  } else {
    return res.status(403).json({ success: false, message: 'Admin access required (missing header)' });
  }
}

// Initialize OpenAI when the routes are loaded
initializeOpenAI();

// Custom middleware to handle X-Test-Admin header for direct authentication
function ensureTestAdminAuthenticated(req: Request, res: Response, next: NextFunction) {
  const hasTestAdminHeader = req.headers['x-test-admin'] === 'true';
  if (hasTestAdminHeader) {
    return next();
  } else {
    return res.status(403).json({ success: false, message: 'Admin access required (missing header)' });
  }
}

// Simple health check endpoint to verify the agent is working
router.get('/health', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('=============================================');
    console.log('AI Agent health request received');
    console.log('Request IP:', req.ip);
    console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
    console.log('=============================================');
    
    // Simplified health check response
    return res.json({ 
      success: true, 
      message: 'My Agent health check endpoint is accessible',
      authentication: {
        xTestAdmin: !!req.headers['x-test-admin']
      }
    });
  } catch (error) {
    console.error('Error in health check:', error);
    // Ensure we send a response even if there's an error
    return res.status(500).json({ 
      success: false, 
      message: 'Error in my-agent health check',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Chat with the AI agent
router.post('/chat', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('AI Agent chat request received');
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
  try {
    const { prompt, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    
    const response = await getChatCompletion(prompt, systemPrompt);
    
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Analyze code files
router.post('/analyze', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('AI Agent analyze request received');
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
  try {
    const { task, filePaths } = req.body;
    
    if (!task || !filePaths || !Array.isArray(filePaths)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task and filePaths array are required' 
      });
    }
    
    const analysis = await analyzeCodeFiles(task, filePaths);
    
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Suggest code changes for a file
router.post('/suggest', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('AI Agent suggest request received');
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
  try {
    const { task, filePath } = req.body;
    
    if (!task || !filePath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task and filePath are required' 
      });
    }
    
    const suggestions = await suggestCodeChanges(task, filePath);
    
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error in suggest endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// List files in a directory
router.post('/files', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('AI Agent files request received');
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
  try {
    const { directory } = req.body;
    
    if (!directory) {
      return res.status(400).json({ success: false, message: 'Directory path is required' });
    }
    
    // Ensure the path is within the project
    const normalizedPath = path.normalize(directory);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid directory path. Must be relative to project root.' 
      });
    }
    
    const files = await listFiles(path.resolve(process.cwd(), normalizedPath));
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error in files endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Read a file - POST version (body params)
router.post('/read-file', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('AI Agent read-file request received');
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'File path is required' });
    }
    
    // Ensure the path is within the project
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid file path. Must be relative to project root.' 
      });
    }
    
    const content = await readFile(path.resolve(process.cwd(), normalizedPath));
    
    if (content === null) {
      return res.status(404).json({ success: false, message: 'File not found or could not be read' });
    }
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error in read-file endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Direct read file - GET with path param to avoid Vite intercept
router.get('/direct-read-file', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('AI Agent direct-read-file request received');
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('Request query:', req.query);
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'File path is required as a query parameter' });
    }
    
    // Ensure the path is within the project
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid file path. Must be relative to project root.' 
      });
    }
    
    // Add a Content-Type header to ensure browsers recognize this as JSON
    res.setHeader('Content-Type', 'application/json');
    
    const content = await readFile(path.resolve(process.cwd(), normalizedPath));
    
    if (content === null) {
      return res.status(404).json({ success: false, message: 'File not found or could not be read' });
    }
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error in direct-read-file endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Write to a file
router.post('/write-file', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('AI Agent write-file request received');
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
  try {
    const { filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'File path and content are required' 
      });
    }
    
    // Ensure the path is within the project
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid file path. Must be relative to project root.' 
      });
    }
    
    const success = await writeFile(path.resolve(process.cwd(), normalizedPath), content);
    
    if (!success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to write file' 
      });
    }
    
    res.json({ success: true, message: 'File written successfully' });
  } catch (error) {
    console.error('Error in write-file endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;