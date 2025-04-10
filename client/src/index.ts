/**
 * Tradeliy Main Entry Point
 * 
 * This file serves as the main entry point for the Tradeliy application.
 * It loads the application components, establishes necessary connections,
 * and starts the server.
 */

import 'dotenv/config';
import { app, server, initializeApp } from './app';
import { logInfo, logError } from './utils/logger';
import { agent } from './controllers';
import { openai } from './services';

// Function to start the server
async function startServer() {
  try {
    // Initialize app components
    await initializeApp();
    
    // Start the server
    const PORT = parseInt(process.env.PORT || '5000', 10);
    server.listen(PORT, '0.0.0.0', () => {
      logInfo('Server', `Server is running on 0.0.0.0:${PORT}`);
      logInfo('Server', `API available at http://localhost:${PORT}/api/agent/status`);
      
      // Initialize agent services after server start
      setTimeout(async () => {
        try {
          logInfo('Server', 'Initializing integrated OpenAI Agent services...');
          
          // Verify OpenAI API key
          try {
            const keyStatus = await agent.verifyOpenAIKey();
            
            if (keyStatus.success) {
              logInfo('Server', 'OpenAI API key is valid, Agent services are fully operational');
            } else {
              logInfo('Server', `OpenAI API key verification failed: ${keyStatus.message}`);
              logInfo('Server', 'Agent services will function with limited capabilities');
            }
            
            logInfo('Server', 'Integrated OpenAI Agent services initialized successfully');
          } catch (verifyErr: any) {
            logError('Server', `Error verifying OpenAI API key: ${verifyErr.message}`);
            logInfo('Server', 'Agent services will function with limited capabilities');
          }
        } catch (err: any) {
          logError('Server', `Error during delayed initialization: ${err.message}`);
        }
      }, 5000); // Wait 5 seconds after server starts
    });
    
    // Handle graceful shutdown
    setupGracefulShutdown();
    
  } catch (error: any) {
    logError('Server', `Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Setup graceful shutdown handlers
function setupGracefulShutdown() {
  // Handle shutdown signals
  process.on('SIGTERM', () => {
    logInfo('Server', 'SIGTERM received, shutting down gracefully');
    gracefulShutdown();
  });
  
  process.on('SIGINT', () => {
    logInfo('Server', 'SIGINT received, shutting down gracefully');
    gracefulShutdown();
  });
  
  // Graceful shutdown function
  function gracefulShutdown() {
    server.close(() => {
      logInfo('Server', 'Server closed');
      process.exit(0);
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      logError('Server', 'Forcing shutdown after timeout');
      process.exit(1);
    }, 10000); // 10 seconds
  }
}

// Start the server
startServer();