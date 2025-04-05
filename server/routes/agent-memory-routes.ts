/**
 * Agent Memory Routes
 * 
 * This module provides enhanced agent routes with conversation memory support.
 * It stores conversation history in MongoDB to provide context-aware responses.
 */

import { Router, Request, Response } from 'express';
import { MongoConversationStorage } from '../services/conversationService';
import { EnhancedOpenAIService } from '../services/enhancedOpenAIService';
import * as fs from 'fs';
import * as path from 'path';

// Simple middleware to ensure test admin authentication for agent access
export function ensureTestAdminAuthenticated(req: Request, res: Response, next: Function) {
  // For testing purposes ONLY - in production, this should be replaced with proper authentication
  const isTestAdmin = req.header('X-Test-Admin') === 'true';
  
  if (isTestAdmin) {
    console.log('💻 Test admin authenticated for agent memory API access');
    next();
  } else {
    console.log('⛔ Unauthorized attempt to access agent memory API');
    res.status(401).json({ 
      success: false,
      message: 'Admin access required (missing header)'
    });
  }
}

// Initialize agent memory routes with MongoDB database connection
export function initializeAgentMemoryRoutes(db: any) {
  const router = Router();
  
  // Create MongoDB-based conversation storage
  const conversationStorage = new MongoConversationStorage(db);
  
  // Initialize our enhanced OpenAI service with conversation memory
  const openAIService = new EnhancedOpenAIService(conversationStorage);
  openAIService.initialize();
  
  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    try {
      console.log('🔍 Agent Memory Health check requested');
      
      // Verify OpenAI API key is valid
      const keyStatus = await openAIService.validateKey();
      
      if (!keyStatus.success) {
        return res.status(503).json({
          success: false,
          status: 'error',
          message: 'OpenAI service is not available',
          details: keyStatus.message
        });
      }
      
      // Verify MongoDB connection by testing conversation storage
      const storageStatus = await conversationStorage.testConnection();
      if (!storageStatus.success) {
        return res.status(503).json({
          success: false,
          status: 'error',
          message: 'Conversation storage service is not available',
          details: storageStatus.message
        });
      }
      
      res.status(200).json({
        success: true,
        status: 'ok',
        services: {
          openai: {
            status: 'available',
            message: keyStatus.message
          },
          conversationStorage: {
            status: 'available',
            message: storageStatus.message
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in agent memory health check:', error);
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Error checking agent memory health',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Direct health check endpoint without auth
  router.get('/direct-health', async (req: Request, res: Response) => {
    try {
      console.log('🔍 Direct health check requested');
      
      res.status(200).json({
        success: true,
        status: 'ok',
        message: 'Agent memory API is running'
      });
    } catch (error) {
      console.error('❌ Error in direct health check:', error);
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Error checking agent memory health',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Chat endpoint with memory
  router.post('/chat', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('📝 Processing agent chat request with memory');
      const { message, systemPrompt, sessionId = 'default' } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false,
          error: 'Message is required' 
        });
      }
      
      console.log(`🔄 Chat request in session: ${sessionId} - Message length: ${message.length} chars`);
      
      // Get response from OpenAI with conversation memory
      const response = await openAIService.getChatCompletionWithMemory(
        sessionId,
        message,
        systemPrompt // Optional parameter
      );
      
      console.log(`✅ Chat response generated: ${response.length} chars`);
      
      // Check if response is too long
      if (response.length > 100000) {
        const truncatedResponse = response.substring(0, 99000) + 
          "\n\n[RESPONSE TRUNCATED - The complete response was too large to display]";
        
        return res.status(200).json({ 
          success: true,
          response: truncatedResponse,
          truncated: true,
          sessionId 
        });
      }
      
      res.status(200).json({ 
        success: true,
        response, 
        sessionId 
      });
    } catch (error) {
      console.error('❌ Error processing chat request:', error);
      res.status(500).json({
        success: false,
        error: 'Error processing chat request',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // List files endpoint
  router.post('/files', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('📂 Listing files in directory');
      
      const { directory = '.' } = req.body;
      
      // Security check - prevent directory traversal
      const safePath = path.normalize(directory).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.resolve(safePath);
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          error: `Directory '${directory}' does not exist`
        });
      }
      
      // List files in directory
      const files = fs.readdirSync(fullPath, { withFileTypes: true });
      
      const fileList = files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        path: path.join(directory, file.name)
      }));
      
      res.status(200).json({
        success: true,
        directory: fullPath,
        files: fileList
      });
    } catch (error) {
      console.error('❌ Error listing files:', error);
      res.status(500).json({
        success: false,
        error: 'Error listing files',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Read file endpoint
  router.post('/read-file', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('📄 Reading file');
      
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: 'File path is required'
        });
      }
      
      // Security check - prevent directory traversal
      const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.resolve(safePath);
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          error: `File '${filePath}' does not exist`
        });
      }
      
      // Read file content
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      
      res.status(200).json({
        success: true,
        filePath: fullPath,
        content: fileContent
      });
    } catch (error) {
      console.error('❌ Error reading file:', error);
      res.status(500).json({
        success: false,
        error: 'Error reading file',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Write file endpoint
  router.post('/write-file', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('✏️ Writing to file');
      
      const { filePath, content } = req.body;
      
      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: 'File path is required'
        });
      }
      
      if (content === undefined) {
        return res.status(400).json({
          success: false,
          error: 'File content is required'
        });
      }
      
      // Security check - prevent directory traversal
      const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.resolve(safePath);
      
      // Create directory if it doesn't exist
      const directory = path.dirname(fullPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      // Write file content
      fs.writeFileSync(fullPath, content, 'utf8');
      
      res.status(200).json({
        success: true,
        filePath: fullPath,
        message: 'File written successfully'
      });
    } catch (error) {
      console.error('❌ Error writing file:', error);
      res.status(500).json({
        success: false,
        error: 'Error writing file',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // List sessions endpoint
  router.get('/list-sessions', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('📋 Listing all conversation sessions');
      
      const sessions = await conversationStorage.listSessions();
      console.log(`✅ Retrieved ${sessions.length} sessions`);
      
      res.status(200).json({
        success: true,
        sessions
      });
    } catch (error) {
      console.error('❌ Error listing conversation sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Error listing conversation sessions',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get conversation history
  router.get('/conversation/:sessionId', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('📜 Retrieving conversation history');
      const sessionId = req.params.sessionId;
      
      if (!sessionId) {
        return res.status(400).json({ 
          success: false,
          error: 'Session ID is required' 
        });
      }
      
      const messages = await conversationStorage.getMessages(sessionId);
      console.log(`✅ Retrieved ${messages.length} messages from session ${sessionId}`);
      
      res.status(200).json({
        success: true,
        sessionId,
        messages
      });
    } catch (error) {
      console.error('❌ Error retrieving conversation history:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving conversation history',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  return router;
}