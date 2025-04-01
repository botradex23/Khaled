/**
 * Test script for ML prediction endpoints
 * This script creates a simple Express server to test the ML prediction endpoints
 */

import express from 'express';
import http from 'http';

const app = express();
const port = 7000;

// Create a simple Promise-based HTTP client
const getJson = (url) => {
  return new Promise((resolve, reject) => {
    http.get(url, (resp) => {
      let data = '';
      
      // A chunk of data has been received
      resp.on('data', (chunk) => {
        data += chunk;
      });
      
      // The whole response has been received
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}, Raw data: ${data.substring(0, 100)}...`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// API endpoint to test ML predictions
app.get('/test/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  
  try {
    const url = `http://localhost:5001/api/ml/predict/${symbol}`;
    console.log(`Fetching from Python service: ${url}`);
    
    const data = await getJson(url);
    console.log('Successfully received data from Python service');
    
    // Set the content type explicitly
    res.setHeader('Content-Type', 'application/json');
    
    // Send the response with proper formatting
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error fetching prediction: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Error fetching prediction: ${error.message}`
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});