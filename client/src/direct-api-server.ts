/**
 * Direct API Server
 * 
 * This server runs on a separate port to provide direct API access
 * without interference from the Vite middleware that's serving HTML.
 */

import express from 'express';
import cors from 'cors';
import { logInfo, logError } from './utils/logger';
import { agent } from './controllers';
import { integratedAgentRoutes } from './routes';

// Create a new Express server
const app = express();

// Apply middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  logInfo('Direct API', `${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Tradeliy Direct API',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Mount agent routes
app.use('/agent', integratedAgentRoutes);
app.use('/my-agent', integratedAgentRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Direct API', `Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// Start the server
const PORT = 5002; // Use a different port than the main app
app.listen(PORT, '0.0.0.0', () => {
  logInfo('Direct API', `Direct API server is running on 0.0.0.0:${PORT}`);
  logInfo('Direct API', `Try accessing http://localhost:${PORT}/health`);
  logInfo('Direct API', `Agent endpoints available at http://localhost:${PORT}/agent/status`);
});