import express from "express";
import http from "http";
import { log } from "./vite";
import routes from "./routes";
import { setupVite } from "./vite";
import { setupAuth } from "./auth";
import path from "path";
import session from "express-session";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
// Explicitly use port 5000 as required
const port = 5000;

// Apply middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with secure settings for production
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'session-secret-dev-only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize authentication system
setupAuth(app);

// Apply API routes
app.use(routes);

// Create HTTP server
const server = http.createServer(app);

// Set server timeout to 60000ms (60 seconds)
server.timeout = 60000;

// Setup Vite middleware for development
const isDev = process.env.NODE_ENV !== "production";
if (isDev) {
  setupVite(app, server)
    .then(() => {
      log("Vite middleware setup complete");
    })
    .catch((err) => {
      log(`Vite middleware setup failed: ${err.message}`);
      process.exit(1);
    });
}

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
server.listen(port, "0.0.0.0", () => {
  log(`Server is running on port ${port}`);
});