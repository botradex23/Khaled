/**
 * Python Service Manager
 * 
 * This module is responsible for starting, monitoring, and managing the Python Flask service
 * that powers the ML predictions and Binance API connection through the official Python SDK.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// Setup logger
const logger = {
  info: (message: string) => console.log(`[Python Service] ${message}`),
  warn: (message: string) => console.warn(`[Python Service] ${message}`),
  error: (message: string) => console.error(`[Python Service] ${message}`)
};

export class PythonServiceManager {
  private static instance: PythonServiceManager;
  private serviceProcess: ChildProcess | null = null;
  private isServiceRunning = false;
  private restartCount = 0;
  private maxRestarts = 5;
  private checkInterval: NodeJS.Timeout | null = null;
  private startupPromise: Promise<boolean> | null = null;

  // Configuration for the Python Flask service
  private PYTHON_SERVICE_PORT = 5001;
  private PYTHON_SERVICE_URL = `http://localhost:${this.PYTHON_SERVICE_PORT}`;
  private PYTHON_APP_DIR = process.cwd();
  private PYTHON_SERVICE_SCRIPT = path.join(this.PYTHON_APP_DIR, 'minimal_flask_app.py');
  private STARTUP_TIMEOUT = 10000; // 10 seconds
  
  // Python executable options to try in order
  private PYTHON_EXECUTABLES = [
    // Absolute paths in Replit environment
    '/nix/store/lg7akh0i11k7hfyyrk097qxzm9d85q1k-replit-module-python-base-3.11/bin/python3',
    '/nix/store/jksn9ar54ya1zlyjbnxh2xzkd41m2pd9-replit-module-python-3.8/bin/python3',
    '/nix/store/k2fd3lnbdf681gi14z37zf7jcmmlw8ms-replit-module-python-3.9/bin/python3',
    '/nix/store/8rcv56dc390kg8p1j41nlq9glxr2kl01-replit-module-python-3.10/bin/python3',
    // Common Python commands
    'python3.11',
    'python3.10',
    'python3.9',
    'python3.8',
    'python3',
    'python'
  ];

  private constructor() {
    // Private constructor to enforce singleton pattern
    process.on('exit', () => {
      this.stopService();
    });
  }

  /**
   * Get the singleton instance of the Python Service Manager
   */
  public static getInstance(): PythonServiceManager {
    if (!PythonServiceManager.instance) {
      PythonServiceManager.instance = new PythonServiceManager();
    }
    return PythonServiceManager.instance;
  }

  /**
   * Start the Python Flask service
   * 
   * This method ensures that the Python Flask service is running.
   * If it's already running, it does nothing.
   * If it's not running, it starts the service.
   */
  public async startService(): Promise<boolean> {
    if (this.isServiceRunning || this.serviceProcess) {
      logger.info('Python service is already running');
      return true;
    }

    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = new Promise<boolean>(async (resolve) => {
      // First check if the service is already running externally
      const isExternallyRunning = await this.pingService();
      if (isExternallyRunning) {
        logger.info('Python service is already running externally');
        this.isServiceRunning = true;
        this.startMonitoring();
        resolve(true);
        this.startupPromise = null;
        return;
      }

      // Check if the Python script exists
      if (!fs.existsSync(this.PYTHON_SERVICE_SCRIPT)) {
        logger.error(`Python service script not found at ${this.PYTHON_SERVICE_SCRIPT}`);
        resolve(false);
        this.startupPromise = null;
        return;
      }

      // Start the Python service
      logger.info(`Starting Python service from ${this.PYTHON_SERVICE_SCRIPT}`);
      
      try {
        // Try each Python executable in order until one works
        let pythonProcess: ChildProcess | null = null;
        let pythonExecutable = '';
        
        for (const executable of this.PYTHON_EXECUTABLES) {
          try {
            logger.info(`Trying to spawn Python service with executable: ${executable}`);
            pythonProcess = spawn(executable, ['-c', 'print("Python working")'], {
              cwd: this.PYTHON_APP_DIR,
              stdio: ['ignore', 'pipe', 'pipe']
            });
            
            // Wait for the process to complete
            const result = await new Promise<{ success: boolean, output: string }>((resolveCheck) => {
              let output = '';
              
              pythonProcess?.stdout?.on('data', (data: Buffer) => {
                output += data.toString().trim();
              });
              
              pythonProcess?.on('error', () => {
                resolveCheck({ success: false, output });
              });
              
              pythonProcess?.on('exit', (code: number | null) => {
                resolveCheck({ success: code === 0, output });
              });
            });
            
            if (result.success) {
              logger.info(`Found working Python executable: ${executable}`);
              pythonExecutable = executable;
              break;
            }
          } catch (error) {
            logger.warn(`Python executable ${executable} failed: ${error}`);
          }
        }
        
        if (!pythonExecutable) {
          logger.error('No working Python executable found');
          resolve(false);
          this.startupPromise = null;
          return;
        }
        
        logger.info(`Starting Python service with executable: ${pythonExecutable}`);
        this.serviceProcess = spawn(pythonExecutable, [this.PYTHON_SERVICE_SCRIPT], {
          cwd: this.PYTHON_APP_DIR,
          env: {
            ...process.env,
            PYTHONPATH: this.PYTHON_APP_DIR,
            PORT: String(this.PYTHON_SERVICE_PORT),
            FLASK_ENV: process.env.NODE_ENV === 'production' ? 'production' : 'development'
          },
          stdio: ['ignore', 'pipe', 'pipe'] // Redirect stdout and stderr to pipes
        });

        if (!this.serviceProcess || !this.serviceProcess.pid) {
          logger.error('Failed to start Python service');
          resolve(false);
          this.startupPromise = null;
          return;
        }

        logger.info(`Python service started with PID ${this.serviceProcess.pid}`);

        // Handle process output for logging
        this.serviceProcess.stdout?.on('data', (data) => {
          logger.info(`Python service: ${data.toString().trim()}`);
        });

        this.serviceProcess.stderr?.on('data', (data) => {
          logger.error(`Python service error: ${data.toString().trim()}`);
        });

        // Handle process exit
        this.serviceProcess.on('exit', (code, signal) => {
          logger.warn(`Python service exited with code ${code} and signal ${signal}`);
          this.isServiceRunning = false;
          this.serviceProcess = null;
          
          // Attempt to restart the service if it crashes
          if (this.restartCount < this.maxRestarts) {
            logger.info(`Attempting to restart Python service (attempt ${this.restartCount + 1} of ${this.maxRestarts})`);
            this.restartCount++;
            this.startService();
          } else {
            logger.error(`Failed to restart Python service after ${this.maxRestarts} attempts`);
          }
        });

        // Wait for the service to be ready
        let attempts = 0;
        const maxAttempts = 20; // Try for ~10 seconds (20 attempts * 500ms)
        const checkInterval = 500; // Check every 500ms

        const waitForService = () => {
          setTimeout(async () => {
            const isRunning = await this.pingService();
            if (isRunning) {
              logger.info('Python service is ready');
              this.isServiceRunning = true;
              this.startMonitoring();
              resolve(true);
              this.startupPromise = null;
            } else if (attempts < maxAttempts) {
              attempts++;
              waitForService();
            } else {
              logger.error('Timed out waiting for Python service to start');
              // Don't kill the process, it might still be starting up
              resolve(false);
              this.startupPromise = null;
            }
          }, checkInterval);
        };

        waitForService();
      } catch (error) {
        logger.error(`Error starting Python service: ${error}`);
        this.isServiceRunning = false;
        this.serviceProcess = null;
        resolve(false);
        this.startupPromise = null;
      }
    });

    return this.startupPromise;
  }

  /**
   * Monitor the Python service to ensure it's still running
   */
  private startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const isRunning = await this.pingService();
      if (!isRunning && this.isServiceRunning) {
        logger.warn('Python service has stopped responding');
        this.isServiceRunning = false;
        
        // If we have a process but it's not responding, kill it
        if (this.serviceProcess) {
          logger.warn(`Killing unresponsive Python service process (PID ${this.serviceProcess.pid})`);
          try {
            this.serviceProcess.kill('SIGTERM');
          } catch (error) {
            logger.error(`Error killing Python service: ${error}`);
          }
          this.serviceProcess = null;
        }

        // Attempt to restart if not exceeding max restarts
        if (this.restartCount < this.maxRestarts) {
          logger.info(`Attempting to restart Python service (attempt ${this.restartCount + 1} of ${this.maxRestarts})`);
          this.restartCount++;
          this.startService();
        } else {
          logger.error(`Failed to restart Python service after ${this.maxRestarts} attempts`);
        }
      } else if (isRunning && !this.isServiceRunning) {
        // Service is responding but we thought it was down
        logger.info('Python service is responding again');
        this.isServiceRunning = true;
        this.restartCount = 0;
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop the Python service
   */
  public stopService(): void {
    // Stop monitoring
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Kill the process if it exists
    if (this.serviceProcess) {
      logger.info(`Stopping Python service (PID ${this.serviceProcess.pid})`);
      try {
        this.serviceProcess.kill('SIGTERM');
      } catch (error) {
        logger.error(`Error stopping Python service: ${error}`);
      }
      this.serviceProcess = null;
    }

    this.isServiceRunning = false;
    this.startupPromise = null;
  }

  /**
   * Check if the Python service is running by pinging it
   */
  private async pingService(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.PYTHON_SERVICE_URL}/api/status`, {
        timeout: 2000 // 2 second timeout
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the status of the Python service
   */
  public getStatus(): { isRunning: boolean; pid: number | null; restartCount: number } {
    return {
      isRunning: this.isServiceRunning,
      pid: this.serviceProcess?.pid ?? null,
      restartCount: this.restartCount
    };
  }
}

// Create and export a singleton instance
export const pythonServiceManager = PythonServiceManager.getInstance();