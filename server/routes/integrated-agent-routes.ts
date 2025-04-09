/**
 * Integrated Agent Routes
 * 
 * This module provides Express routes for the integrated Agent functionality.
 * These routes replace the proxy-based approach with direct integration.
 */

import express from 'express';
import agentController from '../agent/agent-controller';

const router = express.Router();

// Log helper
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
  console.log(`[Agent Routes] [${level}] ${message}`);
}

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const status = agentController.getAgentStatus();
    res.json(status);
  } catch (error: any) {
    log(`Error in health check: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

// Verify OpenAI API key endpoint
router.get('/verify-openai-key', async (req, res) => {
  try {
    const result = await agentController.verifyOpenAIKey();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    log(`Error verifying OpenAI API key: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

// Agent chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }
    
    log(`Processing chat request: ${prompt.substring(0, 50)}...`);
    const result = await agentController.getAgentChatResponse(prompt, systemPrompt);
    res.json(result);
  } catch (error: any) {
    log(`Error in chat endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

// Agent task endpoint
router.post('/task', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }
    
    log(`Processing task request: ${prompt.substring(0, 50)}...`);
    const result = await agentController.executeAgentTask(prompt, systemPrompt);
    res.json(result);
  } catch (error: any) {
    log(`Error in task endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

// File operation endpoint
router.post('/file-op', async (req, res) => {
  try {
    const { operation, params } = req.body;
    
    if (!operation) {
      return res.status(400).json({
        success: false,
        message: 'Operation is required'
      });
    }
    
    log(`Processing file operation: ${operation}`);
    const result = await agentController.executeFileOperation(operation, params);
    res.json(result);
  } catch (error: any) {
    log(`Error in file operation endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

// Search files endpoint
router.post('/search-files', async (req, res) => {
  try {
    const { directory, options } = req.body;
    
    if (!directory) {
      return res.status(400).json({
        success: false,
        message: 'Directory is required'
      });
    }
    
    log(`Processing search files request for directory: ${directory}`);
    const result = await agentController.executeFileOperation('listFilesRecursive', { directory, options });
    res.json(result);
  } catch (error: any) {
    log(`Error in search files endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

// Search content endpoint
router.post('/search-content', async (req, res) => {
  try {
    const { text, options } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }
    
    log(`Processing search content request for text: ${text.substring(0, 50)}...`);
    const result = await agentController.executeFileOperation('findFilesContainingText', { text, options });
    res.json(result);
  } catch (error: any) {
    log(`Error in search content endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

// Status check endpoint
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
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      error: error.message
    });
  }
});

export default router;