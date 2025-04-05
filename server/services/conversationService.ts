/**
 * Conversation Storage service for MongoDB
 * Stores and retrieves conversation history for OpenAI chat completion
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ConversationStorage {
  // Save a message to the storage
  saveMessage(sessionId: string, message: Message): Promise<void>;
  
  // Get all messages for a given session
  getMessages(sessionId: string): Promise<Message[]>;
  
  // List all active session IDs
  listSessions(): Promise<{ sessionId: string, messageCount: number, lastUpdated: Date }[]>;
  
  // Clear all messages for a given session
  clearMessages(sessionId: string): Promise<void>;
  
  // Test the connection to the storage
  testConnection(): Promise<{ success: boolean; message: string }>;
}

export class MongoConversationStorage implements ConversationStorage {
  private db: any;
  private collection: any;
  
  constructor(db: any) {
    this.db = db;
    
    // Initialize the conversations collection if it exists
    if (this.db) {
      this.collection = this.db.collection('conversations');
      console.log('💾 Initialized MongoDB conversation storage');
    } else {
      console.warn('⚠️ MongoDB database not provided to conversation storage');
    }
  }
  
  /**
   * Test the connection to MongoDB and ensure the conversations collection exists
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.db) {
        return { 
          success: false, 
          message: 'MongoDB database is not initialized' 
        };
      }
      
      // Test the database connection with a ping
      await this.db.command({ ping: 1 });
      
      // Ensure the collection exists (or create it)
      if (!this.collection) {
        this.collection = this.db.collection('conversations');
      }
      
      // Perform a simple find operation to validate access
      await this.collection.findOne({});
      
      return { 
        success: true, 
        message: 'Successfully connected to MongoDB conversation storage' 
      };
    } catch (error) {
      console.error('MongoDB conversation storage connection test failed:', error);
      return { 
        success: false, 
        message: `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  /**
   * Save a message to the conversation history
   */
  async saveMessage(sessionId: string, message: Message): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('MongoDB collection is not initialized');
      }
      
      // Add timestamp to track conversation flow
      const timestamp = new Date();
      
      // Insert the message with session ID and timestamp
      await this.collection.insertOne({
        sessionId,
        message,
        timestamp
      });
      
      console.log(`📝 Saved ${message.role} message to session ${sessionId}`);
    } catch (error) {
      console.error('Error saving message to MongoDB:', error);
      throw new Error(`Failed to save message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get all messages for a given session
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    try {
      if (!this.collection) {
        throw new Error('MongoDB collection is not initialized');
      }
      
      // Find all messages for the given session, sorted by timestamp
      const results = await this.collection
        .find({ sessionId })
        .sort({ timestamp: 1 })
        .toArray();
      
      // Map results to just return the messages
      const messages = results.map((result: any) => result.message);
      
      console.log(`📚 Retrieved ${messages.length} messages from session ${sessionId}`);
      return messages;
    } catch (error) {
      console.error('Error getting messages from MongoDB:', error);
      throw new Error(`Failed to retrieve messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clear all messages for a given session
   */
  async clearMessages(sessionId: string): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('MongoDB collection is not initialized');
      }
      
      // Delete all messages for the given session
      const result = await this.collection.deleteMany({ sessionId });
      
      console.log(`🧹 Cleared ${result.deletedCount} messages from session ${sessionId}`);
    } catch (error) {
      console.error('Error clearing messages from MongoDB:', error);
      throw new Error(`Failed to clear messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * List all active conversation sessions
   */
  async listSessions(): Promise<{ sessionId: string, messageCount: number, lastUpdated: Date }[]> {
    try {
      if (!this.collection) {
        throw new Error('MongoDB collection is not initialized');
      }
      
      // Group by sessionId and get message count and last updated timestamp
      const sessionAggregation = await this.collection.aggregate([
        {
          $group: {
            _id: "$sessionId",
            messageCount: { $sum: 1 },
            lastUpdated: { $max: "$timestamp" }
          }
        },
        {
          $project: {
            _id: 0,
            sessionId: "$_id",
            messageCount: 1,
            lastUpdated: 1
          }
        },
        {
          $sort: { lastUpdated: -1 } // Sort by most recent first
        }
      ]).toArray();
      
      console.log(`📋 Retrieved ${sessionAggregation.length} active conversation sessions`);
      return sessionAggregation;
    } catch (error) {
      console.error('Error listing conversation sessions from MongoDB:', error);
      throw new Error(`Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}