import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Import file for side effects only to override console messages
import './override-console.js';
// Import risk manager to start monitoring positions for SL/TP
import './api/risk-management/RiskManager.js';
// Import Python service manager to start the ML predictions Flask service
import { pythonServiceManager } from './services/python-service-manager';

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
  // API routes are defined in routes.ts
  
  const server = await registerRoutes(app);

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
