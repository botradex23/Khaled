import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Import file system module to read .env file directly
import fs from 'fs';
import path from 'path';

// Simple function to load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = path.resolve('.env');
    console.log('Loading environment variables from:', envPath);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) continue;
        
        // Parse KEY=VALUE format
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
      console.log('Environment variables loaded successfully');
    } else {
      console.warn('No .env file found');
    }
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
}

// Load environment variables
loadEnvFile();

// Import file for side effects only to override console messages
import './override-console.js';
// Import risk manager to start monitoring positions for SL/TP
import './api/risk-management/RiskManager.js';
// Import Python service manager to start the ML predictions Flask service
import { pythonServiceManager } from './services/python-service-manager';
// Import the storage interface
import { storage } from './storage';
// ✅ NEW: Import OpenAI initializer
import { initializeOpenAI } from './utils/openai';

// ✅ NEW: Initialize OpenAI API key
initializeOpenAI();

// Log all available environment variables for debugging (hiding sensitive values)
console.log('Environment variables loaded: ', {
  MONGO_URI: process.env.MONGO_URI ? 'CONFIGURED' : 'MISSING',
  DATABASE_URL: process.env.DATABASE_URL ? 'CONFIGURED' : 'MISSING',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'MISSING',
  NODE_ENV: process.env.NODE_ENV
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ CRITICAL ERROR: MONGO_URI environment variable is not set. MongoDB connection is required.');
      throw new Error('MONGO_URI environment variable is required');
    }

    console.log('MongoDB Atlas URI is configured:', mongoUri.substring(0, 20) + '...');
    const clusterPart = mongoUri.split('@')[1]?.split('/')[0] || 'unknown';
    console.log('MongoDB Atlas cluster:', clusterPart);
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'unknown';
    console.log('MongoDB database name:', dbName);
  } catch (error) {
    console.error('❌ CRITICAL ERROR: Failed to process MongoDB URI:', error);
    process.exit(1); // Exit if MongoDB URI is invalid
  }

  try {
    console.log('Connecting to MongoDB database...');
    const connected = await storage.connect();
    
    if (!connected) {
      console.error('❌ CRITICAL ERROR: Failed to connect to MongoDB database');
      process.exit(1); // Exit if MongoDB connection fails
    }
    
    console.log('✅ MongoDB connection established successfully');
    console.log('📊 All data will be stored in MongoDB Atlas');
  } catch (error) {
    console.error('❌ CRITICAL ERROR: Failed to connect to MongoDB:', error);
    process.exit(1); // Exit if MongoDB connection fails
  }

  // Direct route for admin check without Vite middleware
  app.get('/admin-check', async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email parameter is required'
        });
      }
      
      console.log(`Direct admin check (built-in) - looking up user with email: ${email}`);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found'
        });
      }
      
      // Mask sensitive data
      const maskedUser = {
        ...user,
        password: user.password ? `${user.password.substring(0, 10)}...` : null,
        binanceApiKey: user.binanceApiKey ? `***masked***` : null,
        binanceSecretKey: user.binanceSecretKey ? `***masked***` : null,
        okxApiKey: user.okxApiKey ? `***masked***` : null,
        okxSecretKey: user.okxSecretKey ? `***masked***` : null,
        okxPassphrase: user.okxPassphrase ? `***masked***` : null,
      };
      
      return res.json({ 
        success: true, 
        user: maskedUser
      });
    } catch (error: any) {
      console.error('Error fetching user by email:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user',
        error: error.message
      });
    }
  });

  console.log('Registering API routes and initializing database connections...');
  const server = await registerRoutes(app);
  console.log('Server routes registered successfully');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`Server Error: ${err.message || 'Unknown error'}`);
    console.error(err.stack || 'No stack trace');

    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port: 5000,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    try {
      log('Starting Python Flask service for ML predictions...');
      const serviceStarted = await pythonServiceManager.startService();
      if (serviceStarted) {
        log('Python Flask service started successfully');
      } else {
        log('Failed to start Python Flask service. ML predictions may not be available.');
      }
    } catch (error) {
      log(`Error starting Python Flask service: ${error}`);
    }
  });
})();