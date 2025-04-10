/**
 * Tradeliy Main Application
 * 
 * This file sets up the Express application with all middleware and routes.
 */

import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { logInfo, logError } from './utils/logger';
import { integratedAgentRoutes } from './routes';
import { config, db, marketData } from './services';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Apply middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS
app.use(cors({
  origin: '*', // In production this should be more restrictive
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Test-Admin'],
  credentials: true
}));

// Logging middleware
app.use((req, res, next) => {
  logInfo('Express', `${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Tradeliy API',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
  // Only return safe config (no sensitive data)
  res.json({
    config: config.getSafeConfig(),
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/agent', integratedAgentRoutes);
app.use('/api/my-agent', integratedAgentRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Express', `Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// Export app for other modules to use
export { app, server };

// Function to initialize the application
export async function initializeApp() {
  try {
    logInfo('App', 'Initializing application...');
    
    // Initialize configuration
    await config.initialize();
    logInfo('App', 'Configuration initialized');
    
    // Initialize database connection
    await db.initialize();
    logInfo('App', 'Database connection initialized');
    
    // Initialize market data service
    await marketData.initialize({
      primaryExchange: 'okx', // Default to OKX due to Binance geo-restrictions
      updateIntervalMs: 60000, // Update every minute
    });
    logInfo('App', 'Market data service initialized');
    
    // Add GET endpoint for market data
    app.get('/api/market-data', (req, res) => {
      const symbols = req.query.symbols 
        ? String(req.query.symbols).split(',') 
        : undefined;
      
      res.json({
        prices: marketData.getMarketPrices(symbols),
        status: marketData.getStatus(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Add GET endpoint for specific symbol price
    app.get('/api/market-data/:symbol', (req, res) => {
      const symbol = req.params.symbol.toUpperCase();
      const price = marketData.getPrice(symbol);
      
      if (price) {
        res.json({
          price,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          error: `Price for symbol ${symbol} not found`,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    logInfo('App', 'Application initialized successfully');
    return true;
  } catch (error: any) {
    logError('App', `Failed to initialize application: ${error.message}`);
    return false;
  }
}