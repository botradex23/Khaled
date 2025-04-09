/**
 * ML API Health Check Script
 * 
 * This script checks if the ML API is running and responsive.
 */

import http from 'http';

const ML_API_PORT = 5001;
const ML_API_CHECK_TIMEOUT = 3000;

/**
 * Check if the ML API is running
 * @returns Promise<boolean> Whether the API is running
 */
function checkMlApiRunning() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: ML_API_PORT,
      path: '/api/status',
      method: 'GET',
      timeout: ML_API_CHECK_TIMEOUT
    };

    console.log(`Checking ML API health on http://localhost:${ML_API_PORT}/api/status`);

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ ML API is running');
          try {
            const parsedData = JSON.parse(data);
            console.log('Response:', parsedData);
          } catch (e) {
            console.log('Raw response:', data);
          }
          resolve(true);
        } else {
          console.log(`❌ ML API returned unexpected status code: ${res.statusCode}`);
          console.log('Response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ML API is not running: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('❌ ML API health check timed out');
      resolve(false);
    });
    
    req.end();
  });
}

// Run the check
checkMlApiRunning()
  .then(isRunning => {
    console.log(`ML API running: ${isRunning}`);
    process.exit(isRunning ? 0 : 1);
  })
  .catch(err => {
    console.error('Error checking ML API:', err);
    process.exit(1);
  });