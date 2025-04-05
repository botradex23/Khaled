// server/routes/memory-api-routes.ts
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { MongoConversationStorage } from '../services/conversationService';
import { EnhancedOpenAIService } from '../services/enhancedOpenAIService';

// Simple middleware to ensure test admin authentication
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

const router = Router();

// Create MongoDB-based conversation storage
const conversationStorage = new MongoConversationStorage(storage.getDb());

// Initialize our enhanced OpenAI service with conversation memory
const openAIService = new EnhancedOpenAIService(conversationStorage);
openAIService.initialize();

// Health check endpoint
router.get('/health', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Memory API Health check requested');
    
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
    console.error('❌ Error in memory API health check:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Error checking memory API health',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// List all active sessions
router.get('/sessions', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
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

// Clear conversation history
router.delete('/conversation/:sessionId', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('🧹 Clearing conversation history');
    const sessionId = req.params.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        error: 'Session ID is required' 
      });
    }
    
    await conversationStorage.clearMessages(sessionId);
    
    res.status(200).json({
      success: true,
      message: `Cleared all messages for session ${sessionId}`
    });
  } catch (error) {
    console.error('❌ Error clearing conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Error clearing conversation history',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Chat endpoint with memory
router.post('/chat', ensureTestAdminAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('📝 Processing agent chat request with memory');
    const { message, sessionId = 'default' } = req.body;
    
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
      message
    );
    
    console.log(`✅ Chat response generated: ${response.length} chars`);
    
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

export default router;