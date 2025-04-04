import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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
      console.error('⚠️ WARNING: MONGO_URI environment variable is not set. MongoDB connection will not be attempted.');
      process.env.MONGO_URI = 'mongodb+srv://Khaleddd:Khaled123.@cluster0.rh8kusi.mongodb.net/Saas?retryWrites=true&w=majority&appName=Cluster0';
      console.log('✅ Set MONGO_URI manually from known value');
    }

    const finalMongoUri = process.env.MONGO_URI || '';
    if (finalMongoUri) {
      console.log('MongoDB Atlas URI is configured:', finalMongoUri.substring(0, 20) + '...');
      const clusterPart = finalMongoUri.split('@')[1]?.split('/')[0] || 'unknown';
      console.log('MongoDB Atlas cluster:', clusterPart);
      const dbName = finalMongoUri.split('/').pop()?.split('?')[0] || 'unknown';
      console.log('MongoDB database name:', dbName);
    }
  } catch (error) {
    console.error('Error processing MongoDB URI:', error);
  }

  if (process.env.MONGO_URI) {
    try {
      console.log('Connecting to MongoDB database...');
      await storage.connect();
      console.log('MongoDB connection established successfully');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      console.log('Continuing with fallback to memory storage');
    }
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