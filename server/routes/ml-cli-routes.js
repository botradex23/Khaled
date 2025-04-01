/**
 * ML CLI Routes
 * 
 * This file contains routes that execute the Python CLI test script
 * to provide access to ML predictions via HTTP.
 */

import express from 'express';
import { exec } from 'child_process';

const router = express.Router();

/**
 * Direct prediction endpoint that uses the Python CLI tool
 */
router.get('/predict/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { model_type = 'balanced' } = req.query;
    
    // Validate model_type
    if (!['balanced', 'standard'].includes(model_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid model_type: ${model_type}. Must be "balanced" or "standard"`,
        symbol,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[ML CLI] Executing prediction for ${symbol} using ${model_type} model`);
    
    // Execute the Python CLI script
    const command = `cd python_app && python test_cli.py --symbol ${symbol} --model ${model_type}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[ML CLI] Execution error: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: error.message,
          symbol,
          timestamp: new Date().toISOString()
        });
      }
      
      if (stderr) {
        console.error(`[ML CLI] stderr: ${stderr}`);
      }
      
      // Parse JSON output
      try {
        const result = JSON.parse(stdout);
        return res.json(result);
      } catch (parseError) {
        console.error(`[ML CLI] Failed to parse JSON result: ${parseError.message}`);
        console.log(`[ML CLI] Raw output: ${stdout}`);
        
        return res.status(500).json({
          success: false,
          error: 'Failed to parse prediction result',
          symbol,
          timestamp: new Date().toISOString(),
          raw_output: stdout
        });
      }
    });
  } catch (error) {
    console.error(`[ML CLI] Route error: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test endpoint to verify the router is registered
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'ML CLI routes are working',
    timestamp: new Date().toISOString()
  });
});

export default router;