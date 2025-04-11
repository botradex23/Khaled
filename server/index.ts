/**
 * Server Entry Point
 * 
 * This is the main entry point for the Express server.
 * It initializes the server and middleware, sets up routes, and starts listening.
 * 
 * To prevent startup timeout, heavy initialization is delayed until after server is running.
 */

// Load environment variables first, before any other imports
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the project root
config({ path: path.resolve(__dirname, '..', '.env') });

// Import configuration 
import appConfig from './config';

// Core imports
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import MemoryStore from 'memorystore';
import http from 'http';

// Vite and API routers 
import { log, setupVite } from './vite';
import globalMarketRouter from './api/global-market';
import userTradingRouter from './api/user-trading';
import authRoutes from './routes/auth-routes';
import testAuthRoutes from './routes/test-auth';
import legacyAgentRoutes from './routes/agent-routes';
import integratedAgentRoutes from './routes/integrated-agent-routes';
import pythonApiRouter from './routes/python-api-proxy';
import adminUtilsRouter from './routes/admin-utils';

// Auth and services
import { setupAuth } from './auth';
import { startServices } from './start-services';

// MongoDB storage
import { connectToMongoDB } from './storage/mongodb';

// Create Express app
const app = express();
const MemoryStoreSession = MemoryStore(session);

// Create HTTP server
const server = http.createServer(app);

// Verify MongoDB URI is properly set
if (!appConfig.database.mongoUri) {
  console.error('❌ CRITICAL ERROR: MONGO_URI environment variable is not set.');
  console.error('MongoDB connection is required for the application to function properly.');
  console.error('Please add MONGO_URI to your .env file and restart the server.');
  process.exit(1);
}

// Add status endpoint first to ensure quick startup
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Server is running. Global systems will initialize shortly.',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware to parse JSON and URL-encoded request bodies - ensure these run BEFORE auth
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add middleware to debug body parsing
app.use((req, res, next) => {
  if (req.method === 'POST' && req.body === undefined) {
    console.warn('⚠️ Warning: Request body is empty for POST request to:', req.originalUrl);
    console.warn('Request headers:', req.headers);
  }
  next();
});

// Configure session middleware
app.use(
  session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // Prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: appConfig.server.sessionSecret
  })
);

// Setup passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Setup authentication with passport
setupAuth(app);

// New API routes for the global market (no auth required)
app.use('/api/global-market', globalMarketRouter);

// New API routes for user trading (auth required)
app.use('/api/user-trading', userTradingRouter);

// Auth routes for registration, login, etc.
app.use('/api/auth', authRoutes);

// Test auth routes for development and testing
app.use('/api/auth', testAuthRoutes);

// Legacy Agent routes for OpenAI agent integration
app.use('/api/agent-legacy', legacyAgentRoutes);

// New integrated Agent routes for direct access
app.use('/api/agent', integratedAgentRoutes);

// Python API proxy routes
app.use('/api/python', pythonApiRouter);

// Admin utility routes
app.use('/api/admin-utils', adminUtilsRouter);

// Initialize MongoDB, services, and start the server
const startServer = async () => {
  try {
    // Connect to MongoDB first
    log('📦 Connecting to MongoDB database...');
    const mongoConnected = await connectToMongoDB();
    
    if (!mongoConnected) {
      log('❌ Failed to connect to MongoDB. Server will continue with limited functionality.');
      // Set global flag for MongoDB connection status
      (global as any).mongodbConnected = false;
    } else {
      log('✅ Successfully connected to MongoDB database');
      // Set global flag for MongoDB connection status
      (global as any).mongodbConnected = true;
    }
    
    // Start required services (like Python ML API)
    log('🔄 Starting required services...');
    await startServices();
    
    // Setup Vite in middleware mode
    await setupVite(app, server);
    log('✅ Vite middleware setup complete');
    
    // Start the server
    const PORT = appConfig.server.port;
    server.listen(Number(PORT), '0.0.0.0', () => {
      log(`🚀 Server is running on 0.0.0.0:${PORT}`);
      
      // Wait a few seconds before initializing heavy systems
      setTimeout(async () => {
        try {
          // Dynamically import to allow server to start first
          const { initializeGlobalSystem } = await import('./system-init');
          log('Beginning delayed global system initialization');
          
          // Initialize global system in the background
          initializeGlobalSystem().catch((err: Error) => {
            log(`⚠️ Global system initialization error: ${err.message}`);
            log('Server will continue running with limited functionality');
          });
          
          // Initialize integrated agent services
          await initializeAgentServices();
          
        } catch (err: any) {
          log(`⚠️ Error during delayed initialization: ${err.message}`);
        }
      }, 5000); // Wait 5 seconds after server starts
    });
  } catch (err: any) {
    log(`❌ Critical error starting server: ${err.message}`);
    process.exit(1);
  }
};

/**
 * Initialize OpenAI agent services
 */
async function initializeAgentServices() {
  try {
    log('Initializing integrated OpenAI Agent services...');
    
    // Verify OpenAI API key
    try {
      // Try the new modular structure first
      try {
        const { agentController } = await import('../src/agent');
        const keyStatus = await agentController.verifyOpenAIKey();
        
        if (keyStatus.success) {
          log('✅ OpenAI API key is valid, Agent services are fully operational');
        } else {
          log(`⚠️ OpenAI API key verification failed: ${keyStatus.message}`);
          log('Agent services will function with limited capabilities');
        }
        
        log('✅ Integrated OpenAI Agent services initialized successfully');
      } catch (modularErr: any) {
        // Fall back to original structure
        log(`⚠️ Error loading modular agent: ${modularErr.message}`);
        log('Falling back to original agent implementation');
        
        const { default: agentController } = await import('./agent/index');
        const keyStatus = await agentController.verifyOpenAIKey();
        
        if (keyStatus.success) {
          log('✅ OpenAI API key is valid, Agent services are fully operational');
        } else {
          log(`⚠️ OpenAI API key verification failed: ${keyStatus.message}`);
          log('Agent services will function with limited capabilities');
        }
        
        log('✅ Integrated OpenAI Agent services initialized successfully');
      }
    } catch (verifyErr: any) {
      log(`⚠️ Error verifying OpenAI API key: ${verifyErr.message}`);
      log('Agent services will function with limited capabilities');
    }
    
    // For backward compatibility, still try to load the legacy agent if needed
    try {
      // Check if agent-proxy.js exists
      const { initializeAgentProxy } = await import('./agent-proxy');
      log('Initializing legacy agent proxy for backward compatibility...');
      initializeAgentProxy(app, 3021);
      log('✅ Legacy agent proxy initialized for backward compatibility');
    } catch (legacyErr: any) {
      log(`ℹ️ Legacy agent proxy not loaded: ${legacyErr.message}`);
      log('Using integrated agent services only');
    }
  } catch (agentErr: any) {
    log(`⚠️ Error initializing Agent services: ${agentErr.message}`);
    log('Server will continue running with limited agent functionality');
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    log('HTTP server closed');
    process.exit(0);
  });
});

// Start the server with MongoDB and services
startServer().catch(err => {
  log(`❌ Failed to start server: ${err.message}`);
  process.exit(1);
});

// Export app for potential use elsewhere
export { app };