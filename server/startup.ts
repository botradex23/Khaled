/**
 * Optimized Server Entry Point
 * 
 * This file provides a lightweight server startup that initializes
 * only essential components first, then loads heavier components
 * after the server is already running.
 */

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import MemoryStore from 'memorystore';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from './vite';
import globalMarketRouter from './api/global-market';
import userTradingRouter from './api/user-trading';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const MemoryStoreSession = MemoryStore(session);

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

// Basic passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create default response for /api route to verify server is running
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Server is running. Global systems will initialize shortly.'
  });
});

// New API routes for the global market (no auth required)
app.use('/api/global-market', globalMarketRouter);

// New API routes for user trading (auth required)
app.use('/api/user-trading', userTradingRouter);

// Export app for use in vite.ts
export { app };

// Start initializing the global system after the server is ready
let serverReadyTimeout: NodeJS.Timeout;

// Function to be called after server is ready
export function onServerReady() {
  log('Server is ready, scheduling global system initialization');
  
  // Clear any existing timeout
  if (serverReadyTimeout) {
    clearTimeout(serverReadyTimeout);
  }
  
  // Schedule global system initialization after server is fully started
  serverReadyTimeout = setTimeout(async () => {
    try {
      // Dynamically import to prevent loading during startup
      const { initializeGlobalSystem } = await import('./system-init');
      initializeGlobalSystem().catch((err: Error) => {
        log(`Background global system initialization error: ${err.message}`);
      });
    } catch (err: any) {
      log(`Error starting global system: ${err.message}`);
    }
  }, 5000); // Wait 5 seconds after server is ready
}