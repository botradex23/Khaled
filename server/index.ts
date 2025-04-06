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
const port = parseInt(process.env.PORT || "5000", 10);

// Detect environment
const isProduction = process.env.NODE_ENV === "production";
const isDev = !isProduction;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
}));

// Initialize authentication
setupAuth(app);

// Routes
app.use(routes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Server
const server = http.createServer(app);
server.timeout = 60000;

// Serve frontend based on environment
if (isDev) {
  // Development: use Vite middleware
  setupVite(app, server)
    .then(() => log("Vite middleware setup complete"))
    .catch((err) => {
      log(`Vite middleware setup failed: ${err.message}`);
      process.exit(1);
    });
} else {
  // Production: serve static files from dist directory
  const distPath = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  log("Static file serving configured for production");
}

// Start server
server.listen(port, "0.0.0.0", () => {
  log(`Server is running on port ${port} in ${isProduction ? 'production' : 'development'} mode`);
});