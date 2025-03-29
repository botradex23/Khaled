/**
 * AI Trading Bridge
 * 
 * This module bridges between the Python AI trading model and the TypeScript/Node.js application.
 * It provides functions to:
 * 1. Initialize the Python AI model
 * 2. Get trading signals from the AI
 * 3. Execute trades based on AI recommendations
 * 4. Integrate with the existing bot infrastructure
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define BinanceCredentials interface (must match the one in binanceService.ts)
export interface BinanceCredentials {
  apiKey: string;
  secretKey: string;
  testnet: boolean;
}

// Types for AI trading signals
export interface TradingSignal {
  symbol: string;
  timestamp: string;
  current_price: number;
  predicted_price: number;
  ma_20: number;
  ma_50: number;
  rsi: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

export interface TradeResult {
  success: boolean;
  message: string;
  order?: any;
}

export interface TradingConfig {
  symbols: string[];
  timeframe: string;
  limit: number;
}

export class AITradingBridge {
  private pythonPath: string;
  private scriptPath: string;
  private isInitialized: boolean = false;
  private config: TradingConfig;
  private lastSignals: TradingSignal[] = [];
  private lastUpdateTime: Date = new Date();
  
  constructor(config?: TradingConfig) {
    // Default configuration
    this.config = config || {
      symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'],
      timeframe: '1h',
      limit: 100
    };
    
    // Path to Python and scripts
    this.pythonPath = '.pythonlibs/bin/python3'; // Path to Python executable in Replit
    this.scriptPath = path.join(__dirname, 'TradingStrategy.py');
    
    // Verify that the Python script exists
    if (!fs.existsSync(this.scriptPath)) {
      console.error(`Python script not found at ${this.scriptPath}`);
    }
  }
  
  /**
   * Initialize the AI system
   */
  async initialize(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.scriptPath)) {
        console.error(`Python script not found at ${this.scriptPath}`);
        return false;
      }
      
      // Execute Python script to verify it works
      const result = await this.runPythonScript('check');
      this.isInitialized = result.success;
      
      if (this.isInitialized) {
        console.log("AI Trading System initialized successfully");
      } else {
        console.error("Failed to initialize AI Trading System:", result.error);
      }
      
      return this.isInitialized;
    } catch (error) {
      console.error("Error initializing AI Trading System:", error);
      return false;
    }
  }
  
  /**
   * Run the Python script with specified command
   */
  private async runPythonScript(command: string, args: any = {}): Promise<{ success: boolean, data?: any, error?: string }> {
    return new Promise((resolve) => {
      const fullArgs = {
        command,
        config: this.config,
        ...args
      };
      
      // Convert args to JSON string
      const argsJson = JSON.stringify(fullArgs);
      
      // Spawn Python process
      const process = spawn(this.pythonPath, [
        this.scriptPath,
        '--args', argsJson
      ]);
      
      let outputData = '';
      let errorData = '';
      
      // Collect data from stdout
      process.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      // Collect data from stderr
      process.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      // Handle process completion
      process.on('close', (code) => {
        if (code === 0 && outputData) {
          try {
            const result = JSON.parse(outputData);
            resolve({ success: true, data: result });
          } catch (e) {
            resolve({ success: false, error: `Failed to parse Python output: ${outputData}` });
          }
        } else {
          resolve({ success: false, error: errorData || `Python process exited with code ${code}` });
        }
      });
      
      // Handle process errors
      process.on('error', (err) => {
        resolve({ success: false, error: `Failed to start Python process: ${err.message}` });
      });
    });
  }
  
  /**
   * Set Binance API credentials for the AI model
   */
  async setCredentials(credentials: BinanceCredentials): Promise<boolean> {
    try {
      // Set environment variables for the Python script
      process.env.BINANCE_API_KEY = credentials.apiKey;
      process.env.BINANCE_SECRET_KEY = credentials.secretKey;
      process.env.BINANCE_TESTNET = credentials.testnet ? 'true' : 'false';
      
      return true;
    } catch (error) {
      console.error("Error setting credentials:", error);
      return false;
    }
  }
  
  /**
   * Generate trading signals from the AI model
   */
  async generateSignals(): Promise<TradingSignal[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const result = await this.runPythonScript('analyze');
      
      if (result.success && Array.isArray(result.data)) {
        this.lastSignals = result.data as TradingSignal[];
        this.lastUpdateTime = new Date();
        return this.lastSignals;
      } else {
        console.error("Failed to generate signals:", result.error);
        return [];
      }
    } catch (error) {
      console.error("Error generating trading signals:", error);
      return [];
    }
  }
  
  /**
   * Execute a trade based on a signal
   */
  async executeTrade(signal: TradingSignal, amount?: number): Promise<TradeResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const result = await this.runPythonScript('execute', { signal, amount });
      
      if (result.success && result.data) {
        return result.data as TradeResult;
      } else {
        return {
          success: false,
          message: result.error || "Failed to execute trade"
        };
      }
    } catch (error) {
      console.error("Error executing trade:", error);
      return {
        success: false,
        message: `Error: ${error}`
      };
    }
  }
  
  /**
   * Train the AI model for a specific symbol
   */
  async trainModel(symbol: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const result = await this.runPythonScript('train', { symbol });
      
      return result.success;
    } catch (error) {
      console.error(`Error training model for ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Get the last generated signals without refreshing
   */
  getLastSignals(): { signals: TradingSignal[], timestamp: Date } {
    return {
      signals: this.lastSignals,
      timestamp: this.lastUpdateTime
    };
  }
  
  /**
   * Check if signals are fresh (less than 5 minutes old)
   */
  areSignalsFresh(): boolean {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    return this.lastUpdateTime > fiveMinutesAgo;
  }
}

// Export a singleton instance
export const aiTradingBridge = new AITradingBridge();