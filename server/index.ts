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
import { setupAuth } from './auth';
import http from 'http';

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

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// New API routes for the global market (no auth required)
app.use('/api/global-market', globalMarketRouter);

// New API routes for user trading (auth required)
app.use('/api/user-trading', userTradingRouter);

// Auth routes for registration, login, etc.
app.use('/api/auth', authRoutes);

// Initialize Vite after server is created
const startViteServer = async () => {
  try {
    // Setup Vite in middleware mode
    await setupVite(app, server);
    log('Vite middleware setup complete');
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      log(`Server is running on port ${PORT}`);
      
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