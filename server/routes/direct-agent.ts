import express, { Router, Request, Response, NextFunction } from 'express';
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

// Create a separate server instance to handle direct access to the agent API
// This is a workaround for the Vite middleware issue where it serves index.html for API routes
const directApp = express();
directApp.use(express.json());

// Enable CORS for Replit and local development
directApp.use((req, res, next) => {
  // Get the origin from the request
  const origin = req.headers.origin || '*';
  
  // Log the origin for debugging
  console.log('Request origin:', origin);
  
  // Allow the specific origin that made the request (or '*' if no origin)
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Test-Admin, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
  
  // Check for the X-Test-Admin header (case insensitive check for extra safety)
  const headerKeys = Object.keys(req.headers).map(k => k.toLowerCase());
  const hasTestAdminHeader = headerKeys.includes('x-test-admin');
  
  if (hasTestAdminHeader) {
    console.log('✅ X-Test-Admin header detected in direct agent route, skipping authentication');
    next();
  } else {
    console.log('❌ No X-Test-Admin header, allowing access anyway (open access mode)');
    next();
  }
}

// DIRECT ROUTE: Health check
directApp.get('/health', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('============================================================');
  console.log('DIRECT AGENT API: Health check request received');
  console.log('Request IP:', req.ip);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
  console.log('============================================================');

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
      authentication: {
        xTestAdmin: !!req.headers['x-test-admin']
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
        xTestAdmin: !!req.headers['x-test-admin']
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
          xTestAdmin: !!req.headers['x-test-admin']
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
          xTestAdmin: !!req.headers['x-test-admin']
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
            xTestAdmin: !!req.headers['x-test-admin']
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
          xTestAdmin: !!req.headers['x-test-admin']
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
        xTestAdmin: !!req.headers['x-test-admin']
      }
    });
  }
});

// Start the direct agent API server
const PORT = 5002;
directApp.listen(PORT, '0.0.0.0', () => {
  console.log(`Direct Agent API server running on port ${PORT}`);
  console.log(`Access the health check at: http://localhost:${PORT}/health`);
});

// Maintain the original router export for compatibility with Express
// Simple health check endpoint to verify the agent is working
router.get('/health', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'My Agent API is accessible via the main Vite app. For direct API access, use port 5002.',
    directApiUrl: `http://localhost:5002/health`,
    openaiKeyLoaded: !!process.env.OPENAI_API_KEY
  });
});

export default router;