import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';

// Check if Python ML API is running
async function checkMlApiRunning() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/status',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
}

// Start Python Flask app
function startPythonApp() {
  console.log('Starting Python Flask app...');
  
  // Kill any existing Python processes
  try {
    console.log('Checking for existing Python processes...');
    const pythonProcess = spawn('pkill', ['-f', 'python run_flask_app.py']);
    
    pythonProcess.on('error', (err) => {
      console.error('Error killing Python processes:', err);
    });
  } catch (error) {
    console.error('Error checking for Python processes:', error);
  }
  
  // Start Flask with nohup
  try {
    console.log('Spawning new Python Flask process...');
    
    // Copy .env to python_app directory if needed
    if (fs.existsSync('.env') && !fs.existsSync('python_app/.env')) {
      console.log('Copying .env file to python_app directory...');
      fs.copyFileSync('.env', 'python_app/.env');
    }
    
    // Set environment variable for Flask port
    const env = { ...process.env, PORT: '5001' };
    
    // Start Flask app with nohup
    const flaskProcess = spawn('nohup', ['python', 'run_flask_app.py'], {
      detached: true,
      stdio: ['ignore', 
              fs.openSync('flask_app.log', 'a'), 
              fs.openSync('flask_app_error.log', 'a')],
      env
    });
    
    // Detach the process
    flaskProcess.unref();
    
    console.log('Python Flask app started with PID:', flaskProcess.pid);
    console.log('Logs will be written to flask_app.log and flask_app_error.log');
    
    // Save PID to file for future reference
    fs.writeFileSync('flask_app.pid', flaskProcess.pid.toString());
    
  } catch (error) {
    console.error('Error starting Python Flask app:', error);
  }
}

// Create a test script for ML API
function createMlTestScript() {
  console.log('Creating Python test script...');
  
  const scriptContent = `#!/usr/bin/env python3
"""
Test script for ML API connection
"""

import requests
import time
import sys

def test_ml_api_connection():
    """Test connection to ML API"""
    print("Testing connection to ML API...")
    
    # Wait a few seconds for the API to start
    time.sleep(5)
    
    # Try to connect to the API
    try:
        response = requests.get("http://localhost:5001/api/status", timeout=5)
        
        if response.status_code == 200:
            print("Successfully connected to ML API!")
            print("Response:", response.json())
            return True
        else:
            print(f"Error connecting to ML API: Status code {response.status_code}")
            print("Response:", response.text)
            return False
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to ML API: {e}")
        return False

if __name__ == "__main__":
    # Test connection
    success = test_ml_api_connection()
    sys.exit(0 if success else 1)
`;

  fs.writeFileSync('test_ml_api.py', scriptContent);
  console.log('Test script created: test_ml_api.py');
}

// Run ML API test
async function runMlApiTest() {
  console.log('Running ML API test...');
  
  return new Promise((resolve, reject) => {
    const testProcess = spawn('python', ['test_ml_api.py']);
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text);
    });
    
    testProcess.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.error(text);
    });
    
    testProcess.on('close', (code) => {
      console.log(`Test script exited with code ${code}`);
      resolve({
        success: code === 0,
        output
      });
    });
    
    testProcess.on('error', (err) => {
      console.error('Error running test script:', err);
      reject(err);
    });
  });
}

// Main function
async function main() {
  try {
    console.log('Checking if ML API is running...');
    const isRunning = await checkMlApiRunning();
    
    if (isRunning) {
      console.log('ML API is already running');
    } else {
      console.log('ML API is not running');
      startPythonApp();
      
      // Wait for Flask app to start
      console.log('Waiting for Flask app to start...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create and run test script
      createMlTestScript();
      const testResult = await runMlApiTest();
      
      if (testResult.success) {
        console.log('ML API is now working properly!');
      } else {
        console.log('ML API is still not working properly.');
        console.log('Check the flask_app.log and flask_app_error.log files for errors.');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();