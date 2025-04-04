/**
 * Direct Agent API endpoints that bypass Vite middleware
 * 
 * This file uses the .cjs extension to ensure it's not processed by Vite
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Middleware to check basic X-Test-Admin header authentication
function ensureTestAdminAuthenticated(req, res, next) {
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
router.get('/agent-direct-bypass-health-987654321.json', (req, res) => {
  console.log('Direct JSON endpoint (CJS) for agent health check accessed');
  
  // Explicitly set content type to JSON
  res.setHeader('Content-Type', 'application/json');
  
  // Return a simple status check
  return res.json({
    success: true,
    message: 'Direct agent health check API is accessible (CJS)',
    apiKeyAvailable: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Direct validation of OpenAI API key
router.get('/validate-openai-key-bypass-12345.json', ensureTestAdminAuthenticated, async (req, res) => {
  console.log('Direct OpenAI key validation endpoint (CJS) accessed');
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
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Direct chat endpoint
router.post('/agent-direct-chat-bypass-54321.json', ensureTestAdminAuthenticated, async (req, res) => {
  console.log('Direct agent chat endpoint (CJS) accessed');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { prompt, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prompt is required' 
      });
    }
    
    // Load the OpenAI API dynamically to avoid TypeScript import issues
    const openaiService = require('../services/openaiService');
    
    // Verify OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'OpenAI API key is not configured' 
      });
    }
    
    console.log('Processing direct chat request with prompt length:', prompt.length);
    const response = await openaiService.getChatCompletion(prompt, systemPrompt);
    
    return res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in direct chat endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;