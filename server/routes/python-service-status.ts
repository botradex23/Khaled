/**
 * Python Service Status Routes
 * 
 * These routes provide status information about the Python Flask service
 * that powers the ML predictions and Binance API connection.
 */

import { Router } from "express";
import { pythonServiceManager } from "../services/python-service-manager";

const router = Router();

/**
 * Get the status of the Python Flask service
 * @route GET /api/services/python/status
 */
router.get('/api/services/python/status', (req, res) => {
  const status = pythonServiceManager.getStatus();
  
  return res.json({
    success: true,
    isRunning: status.isRunning,
    pid: status.pid,
    restartCount: status.restartCount,
    url: 'http://localhost:5001'
  });
});

/**
 * Restart the Python Flask service
 * @route POST /api/services/python/restart
 */
router.post('/api/services/python/restart', async (req, res) => {
  // Stop the service if it's running
  pythonServiceManager.stopService();
  
  // Wait a moment to ensure the process has been terminated
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Start the service again
  const success = await pythonServiceManager.startService();
  
  // Get the current status
  const status = pythonServiceManager.getStatus();
  
  return res.json({
    success: success,
    isRunning: status.isRunning,
    pid: status.pid,
    restartCount: status.restartCount,
    message: success ? 'Python service restarted successfully' : 'Failed to restart Python service'
  });
});

export default router;