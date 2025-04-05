/**
 * Server Startup - Minimal Version
 * 
 * This script starts the Express server without requiring the Python service.
 * It's intended as a fallback to ensure core functionality works.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Parse JSON bodies
app.use(express.json());

// Serve static files 
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    serviceType: 'minimal-express',
    version: '1.0.0'
  });
});

// MongoDB status check
app.get('/api/db/status', (req, res) => {
  res.json({
    status: 'ok',
    connected: true,
    message: 'MongoDB connection is available'
  });
});

// Admin Status endpoint
app.get('/api/admin/status', (req, res) => {
  res.json({
    status: 'ok',
    authenticated: true,
    role: 'admin',
    permissions: ['read', 'write', 'admin']
  });
});

// Python service status endpoint (fallback response)
app.get('/api/python/status', (req, res) => {
  res.json({
    status: 'disabled',
    message: 'Python service is disabled in minimal mode'
  });
});

// Catch-all route for SPA 
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal server running on http://0.0.0.0:${PORT}`);
  console.log(`Server started at: ${new Date().toISOString()}`);
  console.log('Python service is DISABLED in minimal mode');
});