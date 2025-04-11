/**
 * Service Starter for Tradeliy
 * 
 * This module is responsible for ensuring all required services,
 * such as the Python ML API, are running before the main server starts.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

// Setup ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const ML_API_PORT = 5001;
const ML_API_CHECK_TIMEOUT = 3000;
const STARTUP_WAIT_TIME = 5000;
const LOG_DIR = path.join(__dirname, '..', 'logs');
const PID_FILE = path.join(__dirname, '..', 'ml-api.pid');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Check if the ML API is running
 * @returns Promise<boolean> Whether the API is running
 */
export async function checkMlApiRunning(): Promise<boolean> {
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
 * Start the ML API as a background process
 * @returns Promise<boolean> Whether the API was started successfully
 */
export async function startMlApi(): Promise<boolean> {
  // Check if ML API is already running
  try {
    const isRunning = await checkMlApiRunning();
    if (isRunning) {
      return true;
    }
  } catch (error) {
    console.log(`Error checking ML API status: ${error.message}`);
    console.log('Will attempt to start the ML API anyway');
  }

  console.log('🚀 Starting ML API service...');

  try {
    // Try to kill any existing Python ML processes
    try {
      console.log('Killing any existing ML API processes...');
      // Check if we're on Windows
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        spawn('taskkill', ['/f', '/im', 'python.exe', '/fi', 'CommandLine like %run_flask_service.py%']);
      } else {
        spawn('pkill', ['-f', 'python.*run_flask_service.py']);
      }
    } catch (err) {
      // Ignore errors from pkill/taskkill
    }

    // Make sure python_app has a copy of .env
    if (fs.existsSync(path.join(__dirname, '..', '.env')) && 
        !fs.existsSync(path.join(__dirname, '..', 'python_app', '.env'))) {
      console.log('Copying .env to python_app directory...');
      fs.copyFileSync(
        path.join(__dirname, '..', '.env'), 
        path.join(__dirname, '..', 'python_app', '.env')
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

    // Determine the Python executable to use
    const pythonCommand = process.env.PYTHON_CMD || 'python3';

    // Get script path
    const scriptPath = path.join(__dirname, '..', 'python_app', 'run_flask_service.py');
    console.log(`Starting ML API with script: ${scriptPath}`);
    console.log(`Using Python command: ${pythonCommand}`);
    
    // Check if we're on Windows
    const isWindows = process.platform === 'win32';
    let pythonProcess;
    
    if (isWindows) {
      // On Windows, don't use nohup
      pythonProcess = spawn(
        pythonCommand,
        [scriptPath],
        {
          detached: true,
          stdio: [
            'ignore',
            fs.openSync(path.join(LOG_DIR, 'ml-api-output.log'), 'a'),
            fs.openSync(path.join(LOG_DIR, 'ml-api-error.log'), 'a')
          ],
          env,
          cwd: path.join(__dirname, '..')
        }
      );
    } else {
      // On Unix, use nohup
      pythonProcess = spawn(
        'nohup',
        [pythonCommand, scriptPath],
        {
          detached: true,
          stdio: [
            'ignore',
            fs.openSync(path.join(LOG_DIR, 'ml-api-output.log'), 'a'),
            fs.openSync(path.join(LOG_DIR, 'ml-api-error.log'), 'a')
          ],
          env,
          cwd: path.join(__dirname, '..')
        }
      );
    }
    
    // Save PID for future reference
    if (pythonProcess.pid) {
      fs.writeFileSync(PID_FILE, pythonProcess.pid.toString());
      console.log(`ML API started with PID: ${pythonProcess.pid}`);
    }
    
    // Detach the process
    pythonProcess.unref();
    
    console.log(`ML API started - waiting ${STARTUP_WAIT_TIME/1000}s for it to initialize...`);
    
    // Wait for the API to start
    await new Promise(resolve => setTimeout(resolve, STARTUP_WAIT_TIME));
    
    // Verify the API is running
    const apiRunning = await checkMlApiRunning();
    if (apiRunning) {
      console.log('✅ ML API is running successfully!');
    } else {
      console.log('⚠️ ML API may not have started properly.');
      console.log('Check the log files for more information:');
      console.log(`- Output: ${path.join(LOG_DIR, 'ml-api-output.log')}`);
      console.log(`- Errors: ${path.join(LOG_DIR, 'ml-api-error.log')}`);
    }
    
    return apiRunning;
  } catch (error) {
    console.error('Failed to start ML API:', error);
    return false;
  }
}

/**
 * Start all required services
 * @returns Promise<void>
 */
export async function startServices(): Promise<void> {
  console.log('🔄 Starting all required services...');
  
  try {
    // Start ML API
    const mlApiStarted = await startMlApi();
    
    if (mlApiStarted) {
      console.log('✅ All services started successfully');
    } else {
      console.log('⚠️ Some services failed to start');
      console.log('The main server will continue, but some functionality may be limited');
    }
  } catch (error) {
    console.error('Error starting services:', error);
    console.log('⚠️ Service startup failed, but main server will continue');
    console.log('Some functionality may be limited');
  }
}

// In ESM there's no direct equivalent to require.main === module
// This file will be imported by other modules, not executed directly