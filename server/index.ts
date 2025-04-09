/**
 * Server Entry Point
 * 
 * This is the main entry point for the Express server.
 * It initializes the server and middleware, sets up routes, and starts listening.
 * 
 * To prevent startup timeout, heavy initialization is delayed until after server is running.
 */

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';
import { log, setupVite } from './vite';
import globalMarketRouter from './api/global-market';
import userTradingRouter from './api/user-trading';
import authRoutes from './routes/auth-routes';
import testAuthRoutes from './routes/test-auth';
import legacyAgentRoutes from './routes/agent-routes';
import integratedAgentRoutes from './routes/integrated-agent-routes';
import pythonApiRouter from './routes/python-api-proxy';
import { setupAuth } from './auth';
import http from 'http';
import { startServices } from './start-services';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const MemoryStoreSession = MemoryStore(session);

// Create HTTP server
const server = http.createServer(app);

// Add status endpoint first to ensure quick startup
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Server is running. Global systems will initialize shortly.',
    version: '1.0.0'
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
    secret: process.env.SESSION_SECRET || 'keyboard cat'
  })
);

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

// Initialize Vite after server is created
const startViteServer = async () => {
  try {
    // Start required services before setting up Vite
    log('Starting required services (Python ML API)...');
    await startServices();
    
    // Setup Vite in middleware mode
    await setupVite(app, server);
    log('Vite middleware setup complete');
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    server.listen(Number(PORT), '0.0.0.0', () => {
      log(`Server is running on 0.0.0.0:${PORT}`);
      
      // Wait a few seconds before initializing heavy systems
      setTimeout(async () => {
        try {
          // Dynamically import to allow server to start first
          const { initializeGlobalSystem } = await import('./system-init');
          log('Beginning delayed global system initialization');
          
          // Initialize global system in the background
          initializeGlobalSystem().catch((err: Error) => {
            log(`Global system initialization error: ${err.message}`);
            log('Server will continue running with limited functionality');
          });
          
          // Initialize integrated agent services
          try {
            log('Initializing integrated OpenAI Agent services...');
            
            // Verify OpenAI API key
            try {
              const { default: agentController } = await import('./agent/index');
              const keyStatus = await agentController.verifyOpenAIKey();
              
              if (keyStatus.success) {
                log('OpenAI API key is valid, Agent services are fully operational');
              } else {
                log(`OpenAI API key verification failed: ${keyStatus.message}`);
                log('Agent services will function with limited capabilities');
              }
              
              log('Integrated OpenAI Agent services initialized successfully');
            } catch (verifyErr: any) {
              log(`Error verifying OpenAI API key: ${verifyErr.message}`);
              log('Agent services will function with limited capabilities');
            }
            
            // For backward compatibility, still try to load the legacy agent if needed
            try {
              // Load the agent proxy for legacy support (will be deprecated)
              const { initializeAgentProxy } = await import('./agent-proxy');
              log('Initializing legacy agent proxy for backward compatibility...');
              initializeAgentProxy(app, 3021);
              log('Legacy agent proxy initialized for backward compatibility');
            } catch (legacyErr: any) {
              log(`Legacy agent proxy not loaded: ${legacyErr.message}`);
              log('Using integrated agent services only');
            }
          } catch (agentErr: any) {
            log(`Error initializing Agent services: ${agentErr.message}`);
            log('Server will continue running with limited agent functionality');
          }
        } catch (err: any) {
          log(`Error during delayed initialization: ${err.message}`);
        }
      }, 5000); // Wait 5 seconds after server starts
    });
  } catch (err: any) {
    log(`Error setting up Vite: ${err.message}`);
    process.exit(1);
  }
};

// Start the server with Vite integration
startViteServer();

// Export app for potential use elsewhere
export { app };