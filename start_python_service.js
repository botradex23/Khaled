/**
 * Start the Python Flask service for Binance API
 * 
 * This script starts the Python Flask service that handles Binance API requests
 * using the official Binance connector SDK.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Configuration
const PYTHON_APP_DIR = path.join(process.cwd(), 'python_app');
const PYTHON_SERVICE_SCRIPT = path.join(PYTHON_APP_DIR, 'run_flask_service.py');
const PORT = 5001;
const SERVICE_URL = `http://localhost:${PORT}`;

// Check for required dependencies
function checkDependencies() {
  console.log('Checking for required dependencies...');
  
  try {
    // Check if Python 3 is installed
    const pythonVersionProcess = spawn('python3', ['--version']);
    pythonVersionProcess.on('error', (error) => {
      console.error('❌ Python 3 is not installed or not in PATH');
      console.error('Please install Python 3.8 or higher');
      process.exit(1);
    });
    
    // Check if pip is installed
    const pipVersionProcess = spawn('pip', ['--version']);
    pipVersionProcess.on('error', (error) => {
      console.error('❌ pip is not installed or not in PATH');
      console.error('Please install pip (Python package manager)');
      process.exit(1);
    });
    
    console.log('✅ Basic dependencies found');
  } catch (error) {
    console.error('Error checking dependencies:', error.message);
    process.exit(1);
  }
}

// Check if the service is already running
function checkServiceRunning() {
  return new Promise((resolve) => {
    http.get(`${SERVICE_URL}/api/binance/ping`, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Python Binance service is already running');
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Start the Python service
async function startService() {
  console.log('Starting Python Binance service...');

  // Check if script exists
  if (!fs.existsSync(PYTHON_SERVICE_SCRIPT)) {
    console.error(`❌ Python service script not found at ${PYTHON_SERVICE_SCRIPT}`);
    process.exit(1);
  }

  // Check if service is already running
  const isRunning = await checkServiceRunning();
  if (isRunning) {
    console.log(`Python Binance service is already running on port ${PORT}`);
    console.log('To restart, stop the existing service first');
    return;
  }

  // Check for dependencies
  checkDependencies();

  // Start the Python service
  const serviceProcess = spawn('python3', [PYTHON_SERVICE_SCRIPT], {
    cwd: PYTHON_APP_DIR,
    env: {
      ...process.env,
      PYTHONPATH: PYTHON_APP_DIR,
      PORT: String(PORT),
      FLASK_ENV: 'development'
    },
    stdio: 'inherit' // Pipe stdout and stderr to parent process
  });

  // Handle process events
  serviceProcess.on('error', (error) => {
    console.error(`❌ Error starting Python Binance service: ${error.message}`);
    
    if (error.code === 'ENOENT') {
      console.error('Python 3 is not installed or not in your PATH');
      console.error('Please install Python 3.8 or higher');
    }
    
    process.exit(1);
  });

  serviceProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Python Binance service exited with code ${code}`);
      console.error('Check the error messages above for more details');
    } else {
      console.log(`Python Binance service exited with code ${code}`);
    }
    process.exit(code || 0);
  });

  // Handle termination signals
  process.on('SIGINT', () => {
    console.log('Stopping Python Binance service...');
    serviceProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('Stopping Python Binance service...');
    serviceProcess.kill('SIGTERM');
  });

  console.log(`✅ Python Binance service started on port ${PORT}`);
  console.log(`Service URL: ${SERVICE_URL}`);
  console.log('Press Ctrl+C to stop the service');
  
  // Check if service is actually running after a short delay
  setTimeout(async () => {
    const serviceRunning = await checkServiceRunning();
    if (!serviceRunning) {
      console.warn('⚠️ Service may not be running correctly. Check for errors above.');
      console.warn('Make sure the required Python packages are installed:');
      console.warn('  pip install flask flask-cors binance-connector requests');
    }
  }, 3000);
}

// Run the service
startService();