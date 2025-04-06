import express from "express";
import http from "http";
import { log } from "./vite";
import routes from "./routes";
import { setupVite } from "./vite";

// Create Express app
const app = express();
// Explicitly use port 5000 as required
const port = 5000;

// Apply middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Start the server
server.listen(port, "0.0.0.0", () => {
  log(`Server is running on port ${port}`);
});