/**
 * Server Entry Point
 * 
 * This is the main entry point for the Express server.
 * It initializes the server and middleware, sets up routes, and starts listening.
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
import { initializeGlobalSystem } from './system-init';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const MemoryStoreSession = MemoryStore(session);

// Initialize global system components (ML, market data, etc.)
// This runs 24/7 without requiring user API keys
initializeGlobalSystem().catch(err => {
  log(`Failed to initialize global system: ${err.message}`);
  log('Continuing with server initialization...');
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

// Basic passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// New API routes for the global market (no auth required)
app.use('/api/global-market', globalMarketRouter);

// New API routes for user trading (auth required)
app.use('/api/user-trading', userTradingRouter);

// Export app for use in vite.ts
export { app };