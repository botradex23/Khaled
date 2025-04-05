import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import routes from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import './override-console.js';
import './api/risk-management/RiskManager.js';
import { pythonServiceManager } from './services/python-service-manager';
import { storage } from './storage';
import { initializeOpenAI } from './utils/openai';

// Init OpenAI
const openaiInitialized = initializeOpenAI();
if (!openaiInitialized) {
  console.error('❌ OpenAI failed to initialize');
}

console.log('Loaded environment variables: ', {
  MONGO_URI: process.env.MONGO_URI ? '✔' : '✘',
  DATABASE_URL: process.env.DATABASE_URL ? '✔' : '✘',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✔' : '✘',
  NODE_ENV: process.env.NODE_ENV || 'not set',
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers to allow Replit embedded browser to access the app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Enhanced logging for debugging the agent health endpoint
  if (path === '/api/my-agent/health') {
    console.log('=== MY AGENT HEALTH ENDPOINT ACCESSED ===');
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Method:', req.method);
    console.log('IP:', req.ip);
    console.log('=============================================');
  }
  
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Add error handling for response errors
  const originalResEnd = res.end;
  res.end = function(chunk?: any, encodingOrCallback?: string | (() => void), callback?: () => void) {
    if (path === '/api/my-agent/health') {
      console.log('=== MY AGENT HEALTH ENDPOINT RESPONSE END ===');
      console.log('Status:', res.statusCode);
      console.log('Headers:', JSON.stringify(res.getHeaders(), null, 2));
      console.log('=============================================');
    }

    // Handle different overload signatures properly
    if (typeof encodingOrCallback === 'function') {
      return originalResEnd.call(res, chunk, encodingOrCallback);
    } else {
      return originalResEnd.call(res, chunk, encodingOrCallback as BufferEncoding, callback);
    }
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  // Add error handling for unexpected errors during request processing
  res.on("error", (err) => {
    console.error(`Request error for ${path}:`, err);
    // Try to send an error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        path: path,
        error: err.message
      });
    }
  });

  next();
});

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('❌ MONGO_URI environment variable is not set');
    console.log('✔ MongoDB URI configured');

    await storage.connect();
    console.log('✅ MongoDB connection established');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }

  app.get('/admin-check', async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const maskedUser = {
        ...user,
        password: user.password ? `${user.password.substring(0, 10)}...` : null,
        binanceApiKey: '***',
        binanceSecretKey: '***',
        okxApiKey: '***',
        okxSecretKey: '***',
        okxPassphrase: '***',
      };

      res.json({ success: true, user: maskedUser });
    } catch (error: any) {
      console.error('Admin check failed:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
    }
  });

  // Create server first
  const server = await new Promise<any>((resolve) => {
    const httpServer = app.listen(0, () => {
      httpServer.close(() => {
        resolve(httpServer);
      });
    });
  });

  // Register API routes first to ensure they take precedence over Vite middleware
  console.log('Registering simplified API routes...');
  app.use(routes);
  console.log('Simplified API Routes registered');

  // Then set up Vite in development mode
  if (app.get("env") === "development") {
    console.log('Setting up Vite middleware after API routes...');
    await setupVite(app, server);
    console.log('Vite middleware setup complete');
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Server error';
    console.error('Global error handler:', err);
    res.status(status).json({ message });
  });

  // In production, serve static files after API routes
  if (app.get("env") !== "development") {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({ port, host: "0.0.0.0", reusePort: true }, async () => {
    log(`Server running on port ${port}`);
    try {
      const flaskUp = await pythonServiceManager.startService();
      if (flaskUp) {
        log('ML service started');
      } else {
        log('ML service failed to start');
      }
    } catch (err) {
      log(`Error starting ML service: ${err}`);
    }
  });
})();