/**
 * Python to Node.js Bridge for Binance Market Price Service
 * 
 * This file serves as a bridge between the TypeScript/Node.js application and
 * the Python implementation of the Binance Market Price Service.
 * 
 * It provides the same interface as the original TypeScript implementation
 * but delegates the actual work to the Python script.
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BinanceTickerPrice, Binance24hrTicker, LivePriceUpdate } from './marketPriceService';

// Get the current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python script
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'binance_market_service.py');

/**
 * Executes the Python script with the given arguments and returns the result
 * 
 * @param action The action to perform
 * @param args Additional arguments
 * @returns The result of the Python script execution
 */
async function executePythonScript(action: string, args: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    // Build the command line arguments
    const cmdArgs = ['--action', action];
    
    // Add any additional arguments
    Object.entries(args).forEach(([key, value]) => {
      if (value !== undefined) {
        cmdArgs.push(`--${key}`, value.toString());
      }
    });
    
    // Spawn the Python process
    const process = spawn('python', [PYTHON_SCRIPT_PATH, ...cmdArgs]);
    
    // Collect output
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          console.error('Error parsing Python script output:', e);
          reject(new Error(`Failed to parse output: ${stdout}`));
        }
      } else {
        console.error(`Python script exited with code ${code}`);
        console.error(`Stderr: ${stderr}`);
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });
    
    // Handle process errors
    process.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      reject(err);
    });
  });
}

/**
 * Python-based implementation of the Binance Market Price Service
 * This class maintains the same interface as the original TypeScript implementation
 * but delegates the actual work to the Python script
 */
export class PythonBinanceMarketPriceService extends EventEmitter {
  private baseUrl: string;
  private livePrices: Record<string, number> = {}; // Local cache of prices
  
  constructor(useTestnet: boolean = false) {
    super();
    this.baseUrl = useTestnet ? 'testnet' : 'mainnet';
    console.log(`Python Binance Market Price Service initialized (${this.baseUrl})`);
  }
  
  /**
   * Update the price of a cryptocurrency in real-time
   * 
   * @param symbol The symbol of the cryptocurrency
   * @param price The new price
   */
  public updatePrice(symbol: string, price: number): void {
    const formattedSymbol = symbol.toUpperCase();
    const oldPrice = this.livePrices[formattedSymbol];
    this.livePrices[formattedSymbol] = price;
    
    // Emit price update event
    const update: LivePriceUpdate = {
      symbol: formattedSymbol,
      price,
      timestamp: Date.now(),
      source: 'binance-websocket'
    };
    
    // Emit events
    this.emit('price-update', update);
    this.emit(`price-update:${formattedSymbol}`, update);
    
    // Emit significant price change event if applicable
    if (oldPrice && Math.abs(price - oldPrice) / oldPrice > 0.01) {
      this.emit('significant-price-change', {
        ...update,
        previousPrice: oldPrice,
        changePercent: ((price - oldPrice) / oldPrice) * 100
      });
    }
  }
  
  /**
   * Get the latest price of a cryptocurrency
   * 
   * @param symbol The symbol of the cryptocurrency
   * @returns The latest price or undefined if not found
   */
  public getLatestPrice(symbol: string): number | undefined {
    const formattedSymbol = symbol.toUpperCase();
    return this.livePrices[formattedSymbol];
  }
  
  /**
   * Get all latest prices from the local cache
   * 
   * @returns Array of price updates
   */
  public getAllLatestPrices(): LivePriceUpdate[] {
    const now = Date.now();
    return Object.entries(this.livePrices).map(([symbol, price]) => ({
      symbol,
      price,
      timestamp: now,
      source: 'binance-websocket'
    }));
  }
  
  /**
   * Get simulated prices when real data is not available
   * 
   * @returns Record of simulated prices
   */
  public getSimulatedPrices(): Record<string, number> {
    // This function delegates to the Python script
    return this.livePrices;
  }
  
  /**
   * Get prices for all available symbols
   * 
   * @returns Array of ticker prices
   */
  public async getAllPrices(): Promise<BinanceTickerPrice[]> {
    try {
      // Call the Python script to get all prices
      const result = await executePythonScript('all-prices');
      
      // Update the local cache with the results
      result.forEach((ticker: BinanceTickerPrice) => {
        this.livePrices[ticker.symbol] = parseFloat(ticker.price);
      });
      
      return result;
    } catch (error) {
      console.error('Error fetching all prices from Python service:', error);
      throw error;
    }
  }
  
  /**
   * Get the price of a specific symbol
   * 
   * @param symbol The symbol to get the price for
   * @returns The ticker price or null if not found
   */
  public async getSymbolPrice(symbol: string): Promise<BinanceTickerPrice | null> {
    // Check local cache first for the most up-to-date price
    const formattedSymbol = symbol.replace('-', '').toUpperCase();
    
    if (this.livePrices[formattedSymbol]) {
      console.log(`Using cached price for ${formattedSymbol}: ${this.livePrices[formattedSymbol]}`);
      return {
        symbol: formattedSymbol,
        price: this.livePrices[formattedSymbol].toString()
      };
    }
    
    try {
      // Call the Python script to get the price for this symbol
      const result = await executePythonScript('symbol-price', { symbol: formattedSymbol });
      
      // Update the local cache
      if (result) {
        this.livePrices[result.symbol] = parseFloat(result.price);
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching price for ${symbol} from Python service:`, error);
      return null;
    }
  }
  
  /**
   * Get 24-hour statistics for a symbol or all symbols
   * 
   * @param symbol Optional symbol to get stats for
   * @returns 24-hour statistics or null if not found
   */
  public async get24hrStats(symbol?: string): Promise<Binance24hrTicker[] | Binance24hrTicker | null> {
    try {
      // Call the Python script to get 24hr stats
      const args: Record<string, any> = {};
      if (symbol) {
        args.symbol = symbol.replace('-', '');
      }
      
      return await executePythonScript('24hr-stats', args);
    } catch (error) {
      console.error(`Error fetching 24hr stats from Python service:`, error);
      throw error;
    }
  }
}

// Create a singleton instance of the service
export const pythonBinanceMarketService = new PythonBinanceMarketPriceService(false);