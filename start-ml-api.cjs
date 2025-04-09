/**
 * ML API Service Manager
 * 
 * This script starts the ML API service as a persistent background process
 * using PM2 or nohup as a fallback.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Constants
const ML_API_PORT = 5001;
const ML_API_CHECK_TIMEOUT = 3000;
const MAX_HEALTH_CHECK_ATTEMPTS = 10;
const HEALTH_CHECK_INTERVAL = 2000;
const LOG_DIR = path.join(__dirname, 'logs');
const PID_FILE = path.join(__dirname, 'ml-api.pid');
const ECOSYSTEM_CONFIG = path.join(__dirname, 'ecosystem.config.js');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Check if the ML API is already running
 */
function checkIfApiRunning() {
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
          console.log('✅ ML API is already running');
          try {
            const parsedData = JSON.parse(data);
            console.log('Response:', parsedData);
            resolve(true);
          } catch (e) {
            console.log('Raw response:', data);
            resolve(true); // Still resolve as true if we get a 200 status
          }
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

/**
 * Start the ML API using PM2 if available
 */
async function startWithPm2() {
  console.log('Attempting to start ML API with PM2...');
  
  // Check if PM2 is available
  try {
    await new Promise((resolve, reject) => {
      exec('pm2 --version', (error, stdout, stderr) => {
        if (error) {
          console.log('PM2 not found, will use nohup fallback.');
          reject(new Error('PM2 not available'));
        } else {
          console.log(`PM2 found, version: ${stdout.trim()}`);
          resolve();
        }
      });
    });
    
    // Check ecosystem config exists
    if (!fs.existsSync(ECOSYSTEM_CONFIG)) {
      console.warn('PM2 ecosystem config not found:', ECOSYSTEM_CONFIG);
      
      // Create a basic ecosystem config
      console.log('Creating basic PM2 ecosystem config...');
      const configContent = `
module.exports = {
  apps: [{
    name: "ml-api",
    script: "./python_app/run_flask_service.py",
    interpreter: "python",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      PORT: ${ML_API_PORT},
      FLASK_ENV: "production",
      PYTHONUNBUFFERED: "1",
      USE_PROXY: "false",
      FALLBACK_TO_DIRECT: "true"
    },
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "./logs/ml-api-error.log",
    out_file: "./logs/ml-api-output.log"
  }]
};
      `;
      
      fs.writeFileSync(ECOSYSTEM_CONFIG, configContent);
      console.log('Basic PM2 ecosystem config created successfully');
    }
    
    // Stop any existing ML API instance
    console.log('Stopping any existing ML API instances...');
    await new Promise((resolve) => {
      exec('pm2 stop ml-api 2>/dev/null || true', (error, stdout, stderr) => {
        resolve();
      });
    });
    
    // Make sure python_app has a copy of .env
    if (fs.existsSync(path.join(__dirname, '.env')) && 
        !fs.existsSync(path.join(__dirname, 'python_app', '.env'))) {
      console.log('Copying .env to python_app directory...');
      fs.copyFileSync(
        path.join(__dirname, '.env'), 
        path.join(__dirname, 'python_app', '.env')
      );
    }
    
    // Start with PM2
    console.log('Starting ML API with PM2...');
    await new Promise((resolve, reject) => {
      exec('pm2 start ecosystem.config.js --only ml-api', (error, stdout, stderr) => {
        if (error) {
          console.error('Failed to start ML API with PM2:', error);
          reject(error);
        } else {
          console.log('PM2 output:', stdout);
          if (stderr) console.error('PM2 errors:', stderr);
          resolve();
        }
      });
    });
    
    console.log('✅ ML API started with PM2 successfully');
    return true;
  } catch (error) {
    console.error('Failed to start with PM2:', error);
    console.log('Falling back to nohup method...');
    return false;
  }
}

/**
 * Start the ML API using nohup as fallback
 */
async function startWithNohup() {
  console.log('Starting ML API with nohup...');
  
  try {
    // Try to kill any existing Python ML processes
    try {
      console.log('Killing any existing ML API processes...');
      spawn('pkill', ['-f', 'python.*run_flask_service.py']);
    } catch (err) {
      // Ignore errors from pkill
    }

    // Make sure python_app has a copy of .env
    if (fs.existsSync(path.join(__dirname, '.env')) && 
        !fs.existsSync(path.join(__dirname, 'python_app', '.env'))) {
      console.log('Copying .env to python_app directory...');
      fs.copyFileSync(
        path.join(__dirname, '.env'), 
        path.join(__dirname, 'python_app', '.env')
      );
    }

    // Environment variables for the Python process
    const env = {
      ...process.env,
      PORT: ML_API_PORT.toString(),
      FLASK_ENV: 'production',
      PYTHONUNBUFFERED: '1',
      USE_PROXY: 'false',
      FALLBACK_TO_DIRECT: 'true'
    };

    // Start the process with nohup
    const scriptPath = path.join(__dirname, 'python_app', 'run_flask_service.py');
    console.log(`Starting ML API with script: ${scriptPath}`);
    
    const pythonProcess = spawn(
      'nohup',
      ['python', scriptPath],
      {
        detached: true,
        stdio: [
          'ignore',
          fs.openSync(path.join(LOG_DIR, 'ml-api-output.log'), 'a'),
          fs.openSync(path.join(LOG_DIR, 'ml-api-error.log'), 'a')
        ],
        env,
        cwd: __dirname
      }
    );
    
    // Save PID for future reference
    if (pythonProcess.pid) {
      fs.writeFileSync(PID_FILE, pythonProcess.pid.toString());
      console.log(`ML API started with PID: ${pythonProcess.pid}`);
    }
    
    // Detach the process
    pythonProcess.unref();
    
    console.log('✅ ML API started with nohup successfully');
    return true;
  } catch (error) {
    console.error('Failed to start with nohup:', error);
    return false;
  }
}

/**
 * Check if ML API is healthy with retry logic
 */
function checkApiHealth(attemptCount = 0) {
  console.log(`Checking API health, attempt ${attemptCount + 1}/${MAX_HEALTH_CHECK_ATTEMPTS}...`);
  
  return new Promise((resolve, reject) => {
    checkIfApiRunning().then(isRunning => {
      if (isRunning) {
        console.log('✅ ML API health check passed!');
        resolve(true);
      } else if (attemptCount < MAX_HEALTH_CHECK_ATTEMPTS - 1) {
        console.log(`API not responding, retrying in ${HEALTH_CHECK_INTERVAL/1000}s...`);
        setTimeout(() => {
          checkApiHealth(attemptCount + 1).then(resolve).catch(reject);
        }, HEALTH_CHECK_INTERVAL);
      } else {
        console.error('❌ ML API failed to start after multiple attempts');
        reject(new Error('ML API failed to start after maximum attempts'));
      }
    }).catch(error => {
      console.error('Error checking API health:', error);
      reject(error);
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('ML API Service Manager');
    console.log('======================================');
    
    // Check if already running
    const isRunning = await checkIfApiRunning();
    if (isRunning) {
      console.log('✅ ML API is already running, no action needed');
      return;
    }
    
    // Try to start with PM2 first
    let startSuccess = await startWithPm2();
    
    // If PM2 failed, try nohup
    if (!startSuccess) {
      startSuccess = await startWithNohup();
    }
    
    if (!startSuccess) {
      console.error('❌ All methods to start ML API failed');
      process.exit(1);
    }
    
    // Check API health with retries
    console.log(`Waiting for API to become healthy (${MAX_HEALTH_CHECK_ATTEMPTS} attempts)...`);
    try {
      await checkApiHealth();
      console.log('✅ ML API is running and healthy!');
    } catch (error) {
      console.error('❌ Failed to verify ML API health:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);