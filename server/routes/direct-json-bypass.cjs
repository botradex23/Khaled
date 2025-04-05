/**
 * Direct JSON Bypass Router (CommonJS)
 * 
 * This file uses CommonJS to avoid being intercepted by Vite middleware.
 */

const express = require('express');
const router = express.Router();

// Simple JSON test endpoint
router.get('/json-test', (req, res) => {
  // Set headers to try to prevent Vite from intercepting
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-No-Vite', 'true');
  res.json({
    success: true,
    message: 'Direct JSON API health check successful (CommonJS bypass)',
    timestamp: new Date().toISOString(),
    type: 'direct-json-bypass.cjs'
  });
});

// Test endpoint with plain text
router.get('/text-test', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('Direct Text API health check successful (CommonJS bypass)\nTimestamp: ' + new Date().toISOString());
});

// OpenAI status endpoint for the frontend to check
router.get('/openai-status', (req, res) => {
  // Check if OPENAI_API_KEY is set
  const apiKey = process.env.OPENAI_API_KEY;
  
  res.setHeader('Content-Type', 'application/json');
  res.json({
    available: !!apiKey,
    message: apiKey ? 'OpenAI API key is available' : 'OpenAI API key is not set',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;