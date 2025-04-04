import { Router, Request, Response } from 'express';
import axios from 'axios';
import { initializeOpenAI, getChatCompletion } from '../services/openaiService';

// Create a router for direct agent API endpoints
const router = Router();

// Middleware to check basic X-Test-Admin header authentication
function ensureTestAdminAuthenticated(req: Request, res: Response, next: Function) {
  // Allow access if they have the X-Test-Admin header
  if (req.headers['x-test-admin'] === 'true') {
    console.log('Test admin authentication successful via X-Test-Admin header');
    next();
  } else {
    console.log('Test admin authentication failed - missing or invalid X-Test-Admin header');
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please include X-Test-Admin: true header.'
    });
  }
}

// Direct health check endpoint with unique name to bypass Vite middleware
router.get('/agent-health-direct-check-123456789.json', async (req: Request, res: Response) => {
  console.log('Direct JSON endpoint for agent health check accessed');
  
  // Explicitly set content type to JSON
  res.setHeader('Content-Type', 'application/json');
  
  // Return a simple status check
  return res.json({
    success: true,
    message: 'Direct agent health check API is accessible',
    apiKeyAvailable: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Direct chat endpoint that bypasses Vite middleware
router.post('/agent-direct-chat-13579.json', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('Direct agent chat endpoint accessed');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { prompt, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prompt is required' 
      });
    }
    
    // Verify OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'OpenAI API key is not configured' 
      });
    }
    
    console.log('Processing direct chat request with prompt length:', prompt.length);
    const response = await getChatCompletion(prompt, systemPrompt);
    
    return res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in direct chat endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Direct OpenAI key validation endpoint
router.get('/validate-openai-key-24680.json', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  console.log('Direct OpenAI key validation endpoint accessed');
  res.setHeader('Content-Type', 'application/json');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({
      success: false,
      message: 'OpenAI API key is not configured',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Make a minimal API call to verify the key
    console.log('Testing OpenAI API with a minimal request');
    const testResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
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
    
    return res.json({
      success: true,
      message: 'OpenAI API key is valid and working',
      keyStatus: 'valid',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error validating OpenAI key:', error);
    return res.json({
      success: false,
      message: 'OpenAI API key validation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;