import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import routes from './routes';
import { setupVite, serveStatic, log } from './vite';
import './override-console.js';
import './api/risk-management/RiskManager.js';
import { pythonServiceManager } from './services/python-service-manager';
import { storage } from './storage';
import { initializeOpenAI } from './utils/openai';
import rateLimit from 'express-rate-limit';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(">>> Starting server/index.ts <<<");

// Check environment variables
const requiredEnvVars = ['MONGO_URI', 'DATABASE_URL', 'OPENAI_API_KEY', 'NODE_ENV'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} environment variable is not set`);
    process.exit(1);
  }
});

console.log('Loaded environment variables: ', {
  MONGO_URI: process.env.MONGO_URI ? '✔' : '✘',
  DATABASE_URL: process.env.DATABASE_URL ? '✔' : '✘',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✔' : '✘',
  NODE_ENV: process.env.NODE_ENV || 'not set',
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin || '')) {
    res.header('Access-Control-Allow-Origin', origin!);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Enable trust proxy for Express first
app.set('trust proxy', 1);

// Then configure rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Allow many more requests
  standardHeaders: true,
  legacyHeaders: false
  // trustProxy removed as it's not a valid property
});

// Apply rate limiting
app.use(limiter);

// Error handler middleware
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Server error';
  console.error('Global error handler:', err);
  res.status(status).json({ message });
};
app.use(errorHandler);

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI!;
    await storage.connect();
    console.log('✅ MongoDB connection established');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }

  initializeOpenAI();

  // Use routes first for API endpoints
  app.use(routes);
  
  // Let Vite handle static files and SPA routing in development mode
  // setupVite() will be called later in the code

  const server = app.listen(0, () => {
    const port = process.env.PORT || 5000;
    server.close(() => {
      server.listen(Number(port), '0.0.0.0', async () => {
        console.log(`✅ Server running on port ${port}`);

        try {
          const flaskUp = await pythonServiceManager.startService();
          flaskUp ? log('ML service started') : log('ML service failed to start');
        } catch (err) {
          log(`Error starting ML service: ${err}`);
        }
      });
    });
  });

  if (app.get("env") === "development") {
    console.log('Setting up Vite middleware...');
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();