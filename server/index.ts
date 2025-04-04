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
  // Load .env file if needed (though Replit should handle this)
  try {
    // Check MongoDB environment variable is set
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('⚠️ WARNING: MONGO_URI environment variable is not set. MongoDB connection will not be attempted.');
      // Set it manually from the value in .env file since there might be a loading issue
      process.env.MONGO_URI = 'mongodb+srv://Khaleddd:Khaled123.@cluster0.rh8kusi.mongodb.net/Saas?retryWrites=true&w=majority&appName=Cluster0';
      console.log('✅ Set MONGO_URI manually from known value');
    }
    
    // Now we're sure MONGO_URI is set
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

  // Connect to MongoDB first before registering routes
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

  // API routes are defined in routes.ts
  console.log('Registering API routes and initializing database connections...');
  const server = await registerRoutes(app);
  console.log('Server routes registered successfully');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`Server Error: ${err.message || 'Unknown error'}`);
    console.error(err.stack || 'No stack trace');
    
    // Send response but DON'T throw the error again, which would crash the server
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port: 5000,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Start the Python Flask service for ML predictions
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
