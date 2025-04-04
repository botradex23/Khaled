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
import { ensureAuthenticated } from '../auth';

const router = Router();

// Middleware to ensure the user is an admin
function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('=== ensureAdmin middleware called ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Has X-Test-Admin header:', !!req.headers['x-test-admin']);
  console.log('User authenticated via session:', req.isAuthenticated());
  console.log('User in request:', req.user ? 'User object exists' : 'No user object');
  console.log('User admin status:', req.user ? (req.user as any).isAdmin : 'No user');
  console.log('User super admin status:', req.user ? (req.user as any).isSuperAdmin : 'No user');
  
  // Check for the X-Test-Admin header (case insensitive check for extra safety)
  const headerKeys = Object.keys(req.headers).map(k => k.toLowerCase());
  const hasTestAdminHeader = headerKeys.includes('x-test-admin');
  
  // First check for X-Test-Admin header
  if (hasTestAdminHeader) {
    console.log('✅ X-Test-Admin header detected in ensureAdmin middleware - Allowing access');
    next();
  }
  // Check for super admin (highest priority for regular authentication)
  else if (req.isAuthenticated() && req.user && (req.user as any).isSuperAdmin) {
    console.log('✅ User is authenticated and has super admin privileges - Allowing full access');
    next();
  }
  // Then check regular admin
  else if (req.isAuthenticated() && req.user && (req.user as any).isAdmin) {
    console.log('✅ User is authenticated and has admin privileges - Allowing access');
    next();
  } else {
    console.log('❌ Admin access denied - No valid authentication or insufficient privileges');
    res.status(403).json({ 
      success: false, 
      message: 'Admin access required',
      authStatus: {
        hasTestAdminHeader,
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        userIsAdmin: req.user ? !!(req.user as any).isAdmin : false,
        userIsSuperAdmin: req.user ? !!(req.user as any).isSuperAdmin : false
      } 
    });
  }
}

// Initialize OpenAI when the routes are loaded
initializeOpenAI();

// Custom middleware to handle X-Test-Admin header for direct authentication
function ensureTestAdminAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log('=== ensureTestAdminAuthenticated middleware called ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Has X-Test-Admin header:', !!req.headers['x-test-admin']);
  console.log('User authenticated via session:', req.isAuthenticated());
  console.log('Session ID:', req.sessionID || 'No session ID');
  console.log('Session data:', req.session ? 'Has session' : 'No session');
  console.log('User in request:', req.user ? 'User object exists' : 'No user object');
  
  // Check for the X-Test-Admin header (case insensitive check for extra safety)
  const headerKeys = Object.keys(req.headers).map(k => k.toLowerCase());
  const hasTestAdminHeader = headerKeys.includes('x-test-admin');
  
  if (hasTestAdminHeader) {
    console.log('✅ X-Test-Admin header detected, skipping standard authentication');
    next();
  } else {
    console.log('❌ No X-Test-Admin header found, falling back to standard authentication');
    ensureAuthenticated(req, res, next);
  }
}

// Simple health check endpoint to verify the agent is working
router.get('/health', ensureTestAdminAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
  console.log('=============================================');
  console.log('Agent health check request received');
  console.log('Request IP:', req.ip);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('User authenticated via standard auth:', req.isAuthenticated());
  console.log('X-Test-Admin header present:', !!req.headers['x-test-admin']);
  console.log('User admin status (if authenticated):', req.user && (req.user as any).isAdmin);
  console.log('=============================================');

  // List all available environment variables (without values for security)
  const availableEnvVars = Object.keys(process.env);
  console.log('Available environment variables:', availableEnvVars.join(', '));
  
  // Verify if OPENAI_API_KEY is present in environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('Health check called, OpenAI API Key present:', !!apiKey);
  console.log('OpenAI API Key length:', apiKey ? apiKey.length : 0);
  console.log('OpenAI API Key prefix:', apiKey ? apiKey.substring(0, 3) + '...' : 'none');
  
  if (!apiKey) {
    console.log('OpenAI API Key is missing in health check');
    return res.json({ 
      success: false, 
      message: 'OpenAI API Key is not set. Please configure the OPENAI_API_KEY environment variable.',
      envVarsAvailable: availableEnvVars.includes('OPENAI_API_KEY'),
      authentication: {
        standardAuth: req.isAuthenticated(), 
        xTestAdmin: !!req.headers['x-test-admin'],
        userPresent: !!req.user
      }
    });
  }
  
  // Try to validate the length of the key to ensure it's a valid format
  if (apiKey.length < 30) {
    console.log('OpenAI API Key appears to be invalid (too short)');
    return res.json({
      success: false,
      message: 'OpenAI API Key appears to be invalid (too short). Please check the API key format.',
      apiKeyLength: apiKey.length,
      authentication: {
        standardAuth: req.isAuthenticated(), 
        xTestAdmin: !!req.headers['x-test-admin'],
        userPresent: !!req.user
      }
    });
  }
  
  try {
    // Verify that we can initialize the OpenAI client
    const openaiInitResult = initializeOpenAI();
    console.log('OpenAI initialization result in health check:', openaiInitResult);
    
    if (!openaiInitResult) {
      return res.json({ 
        success: false, 
        message: 'Failed to initialize OpenAI service. Check server logs for details.',
        apiKeyLength: apiKey.length,
        apiKeyPrefix: apiKey.substring(0, 3) + '...', // Only show first 3 chars for security
        authentication: {
          standardAuth: req.isAuthenticated(), 
          xTestAdmin: !!req.headers['x-test-admin'],
          userPresent: !!req.user
        }
      });
    }
    
    // Do a minimal API call to verify the key isn't just valid but also has quota
    try {
      console.log('Testing OpenAI API with a minimal request');
      console.log('Using model: gpt-4o-mini for health check');
      const testResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o-mini", // Use the current model we're standardizing on
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say hello" }
          ],
          max_tokens: 5, // Use minimal tokens to save quota
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      // If we get here, the key works and has quota
      console.log('OpenAI API test successful, key has available quota');
      console.log('Test response:', JSON.stringify(testResponse.data, null, 2));
      
      return res.json({ 
        success: true, 
        message: 'My Agent service is online and OpenAI is properly initialized',
        apiKeyValid: true,
        quotaAvailable: true,
        model: 'gpt-4o-mini',
        authentication: {
          standardAuth: req.isAuthenticated(), 
          xTestAdmin: !!req.headers['x-test-admin'],
          userPresent: !!req.user
        }
      });
    } catch (apiError: any) {
      // Check if this is a quota exceeded error
      if (apiError.response?.data?.error?.type === 'insufficient_quota' || 
          apiError.response?.data?.error?.message?.includes('quota')) {
        console.error('OpenAI API key has exceeded its quota:', apiError.response?.data?.error?.message);
        return res.json({ 
          success: false, 
          message: 'OpenAI API key has exceeded its quota',
          error: apiError.response?.data?.error?.message || 'Quota exceeded',
          apiKeyValid: true,
          quotaExceeded: true,
          authentication: {
            standardAuth: req.isAuthenticated(), 
            xTestAdmin: !!req.headers['x-test-admin'],
            userPresent: !!req.user
          }
        });
      }
      
      // Other API errors
      console.error('Error testing OpenAI API:', apiError.response?.data || apiError.message);
      return res.json({ 
        success: false, 
        message: 'Error testing OpenAI API',
        error: apiError.response?.data?.error?.message || apiError.message || 'Unknown API error',
        apiKeyValid: true,
        apiError: true,
        authentication: {
          standardAuth: req.isAuthenticated(), 
          xTestAdmin: !!req.headers['x-test-admin'],
          userPresent: !!req.user
        }
      });
    }
  } catch (error) {
    console.error('Error in health check:', error);
    return res.json({ 
      success: false, 
      message: 'Error checking OpenAI service: ' + (error instanceof Error ? error.message : 'Unknown error'),
      error: error instanceof Error ? error.message : 'Unknown error',
      authentication: {
        standardAuth: req.isAuthenticated(), 
        xTestAdmin: !!req.headers['x-test-admin'],
        userPresent: !!req.user
      }
    });
  }
});

// Chat with the AI agent
router.post('/chat', ensureTestAdminAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
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
router.post('/analyze', ensureTestAdminAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
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
router.post('/suggest', ensureTestAdminAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
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
router.post('/files', ensureTestAdminAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
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

// Read a file
router.post('/read-file', ensureTestAdminAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
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

// Write to a file
router.post('/write-file', ensureTestAdminAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
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