// server/index.ts

import express from "express";
import http from "http";
import { log, serveStatic } from "./vite";
import routes from "./routes";
import { setupVite } from "./vite";
import { setupAuth } from "./auth";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Use environment port or fallback to 5000
// Replit often uses port 3000 for web apps
const port = parseInt(process.env.PORT || "5000", 10);

// Detect environment
const isProduction = process.env.NODE_ENV === "production";
const isDev = !isProduction;
const isReplit = process.env.REPL_ID || process.env.REPLIT_ID || process.env.REPLIT;

// Allow configurable trusted proxies
const trustedProxies = (process.env.TRUSTED_PROXIES || '').split(',').filter(Boolean);
if (isReplit) {
  // Configure to trust Replit proxies
  app.set('trust proxy', true);
} else if (trustedProxies.length) {
  app.set('trust proxy', trustedProxies);
}

// Enhanced logging for deployment diagnostics
log(`Starting server in ${isProduction ? 'production' : 'development'} mode`);
if (isReplit) {
  log('Running in Replit environment');
  log(`Replit ID: ${process.env.REPL_ID || process.env.REPLIT_ID || 'unknown'}`);
  log(`Replit Slug: ${process.env.REPL_SLUG || 'unknown'}`);
  log(`Replit Owner: ${process.env.REPL_OWNER || 'unknown'}`);
}

// CORS configuration for development
if (isDev) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    
    // Preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize authentication (includes session configuration)
setupAuth(app);

// Routes
app.use(routes);

// Enhanced health check with useful diagnostic info
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: isDev ? 'development' : 'production',
    node_version: process.version,
    memory_usage: process.memoryUsage(),
    uptime: process.uptime(),
    isReplit: !!isReplit,
    host: req.get('host'),
    headers: {
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-forwarded-host': req.get('x-forwarded-host'),
      'user-agent': req.get('user-agent')
    }
  });
});

// Server with improved error handling
const server = http.createServer(app);
server.timeout = 60000; // 60 second timeout

// Handle server errors
server.on('error', (error) => {
  log(`Server error: ${error.message}`);
  // Try to restart on port binding errors after a delay
  if ((error as any).code === 'EADDRINUSE') {
    log(`Port ${port} is in use, retrying in 5 seconds...`);
    setTimeout(() => {
      server.close();
      server.listen(port, "0.0.0.0");
    }, 5000);
  }
});

// Serve frontend based on environment
if (isDev) {
  // Development: use Vite middleware
  setupVite(app, server)
    .then(() => log("Vite middleware setup complete"))
    .catch((err) => {
      log(`Vite middleware setup failed: ${err.message}`);
      log("Starting without Vite middleware, only API routes will function");
    });
} else {
  // Production: serve static files from dist/public directory
  const distPath = path.resolve(__dirname, '..', 'dist', 'public');
  app.use(express.static(distPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    index: false, // Don't automatically serve index.html, we'll handle that below
  }));

  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), { maxAge: '0' }); // Don't cache index.html
  });

  log("Static file serving configured for production");
}

// Start server
server.listen(port, "0.0.0.0", () => {
  log(`Server is running on port ${port} in ${isProduction ? 'production' : 'development'} mode`);
  
  // Log useful access URLs
  const localUrl = `http://localhost:${port}`;
  const networkUrl = `http://0.0.0.0:${port}`;
  
  log(`Local access URL: ${localUrl}`);
  
  if (isReplit) {
    // For Replit, we want to show the Replit URL
    const replSlug = process.env.REPL_SLUG;
    const replOwner = process.env.REPL_OWNER;
    if (replSlug && replOwner) {
      const replitUrl = `https://${replSlug}.${replOwner}.repl.co`;
      log(`Replit application URL: ${replitUrl}`);
    } else {
      log(`Replit application URL: Check the 'Webview' tab in your Replit window`);
    }
  } else {
    log(`Network access URL: ${networkUrl}`);
  }
});