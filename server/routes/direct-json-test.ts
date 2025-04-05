import express, { Request, Response } from 'express';

const router = express.Router();

// Simple JSON test endpoint
router.get('/json-health-test', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    success: true,
    message: 'Direct JSON API health check successful',
    timestamp: new Date().toISOString(),
    type: 'direct-json-test'
  });
});

// Test endpoint with options for JSON type
router.options('/json-health-test', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Test-Admin');
  res.status(200).end();
});

// Raw text endpoint
router.get('/text-health-test', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('Direct Text API health check successful\nTimestamp: ' + new Date().toISOString());
});

export default router;