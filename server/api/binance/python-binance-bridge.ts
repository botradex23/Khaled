/**
 * Python Binance Bridge
 * 
 * This module provides a bridge to interact with the Python Flask application
 * that handles Binance market data using the official Binance connector SDK.
 */

import axios, { AxiosError } from 'axios';
import { spawn } from 'child_process';
import { logger } from '../../../server/logger';
import path from 'path';
import fs from 'fs';

// Configuration for the Python Flask service
const PYTHON_SERVICE_PORT = 5001;
const PYTHON_SERVICE_URL = `http://localhost:${PYTHON_SERVICE_PORT}`;
const PYTHON_APP_DIR = path.join(process.cwd(), 'python_app');
const PYTHON_SERVICE_SCRIPT = path.join(PYTHON_APP_DIR, 'run_flask_service.py');

/**
 * Class to interact with the Python Binance service
 */
export class PythonBinanceBridge {
  private serviceProcess: ReturnType<typeof spawn> | null = null;
  private isServiceRunning = false;
  private startupPromise: Promise<boolean> | null = null;

  constructor() {
    this.ensureServiceRunning();
  }

  /**
   * Check if the Python Flask service is running
   */
  public async ensureServiceRunning(): Promise<boolean> {
    if (this.isServiceRunning) {
      return true;
    }

    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = new Promise<boolean>((resolve) => {
      // Check if the service is already running
      this.pingService()
        .then(() => {
          logger.info('Python Binance service is already running');
          this.isServiceRunning = true;
          resolve(true);
        })
        .catch(() => {
          logger.warn('Python Binance service is not running. Please start it with `node start_python_service.js` in a separate terminal.');
          resolve(false);
        });
    });

    return this.startupPromise;
  }

  /**
   * Check if the Python service is running
   */
  private async pingService(): Promise<boolean> {
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/api/binance/ping`);
      return response.status === 200;
    } catch (error) {
      logger.debug(`Python Binance service ping failed: ${error}`);
      return false;
    }
  }

  /**
   * Stop the Python Flask service if it was started by this bridge
   */
  public stopService(): void {
    // This bridge no longer manages the service process
    logger.info('Stopping Python Binance service connection...');
    this.isServiceRunning = false;
    this.startupPromise = null;
    this.serviceProcess = null;
  }

  /**
   * Get all current prices from Binance
   */
  public async getAllPrices(): Promise<any> {
    await this.ensureServiceRunning();
    
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/api/binance/prices`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError, 'Error fetching all prices from Python Binance service');
      throw error;
    }
  }

  /**
   * Get price for a specific symbol from Binance
   */
  public async getSymbolPrice(symbol: string): Promise<any> {
    await this.ensureServiceRunning();
    
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/api/binance/price/${symbol}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError, `Error fetching price for ${symbol} from Python Binance service`);
      throw error;
    }
  }

  /**
   * Get 24hr ticker statistics for one or all symbols
   */
  public async get24hrStats(symbol?: string): Promise<any> {
    await this.ensureServiceRunning();
    
    try {
      const url = symbol
        ? `${PYTHON_SERVICE_URL}/api/binance/ticker/24hr?symbol=${symbol}`
        : `${PYTHON_SERVICE_URL}/api/binance/ticker/24hr`;
        
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError, `Error fetching 24hr stats from Python Binance service`);
      throw error;
    }
  }

  /**
   * Handle errors from the Python service
   */
  private handleError(error: AxiosError, message: string): void {
    if (error.response) {
      logger.error(`${message}: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      logger.error(`${message}: No response received`);
      
      // If the service is not responding, try to restart it
      this.isServiceRunning = false;
      this.startupPromise = null;
      this.ensureServiceRunning().catch(() => {
        logger.error('Failed to restart Python Binance service');
      });
    } else {
      logger.error(`${message}: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const pythonBinanceBridge = new PythonBinanceBridge();