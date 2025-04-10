/**
 * Binance Market Price Service Module
 * Central repository for cryptocurrency market prices
 */

import { EventEmitter } from 'events';
import { BinanceApiService, BinanceTickerPrice } from './binanceClient';
import { safeParseFloat } from './binanceUtils';

export interface PriceUpdateEventData {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
}

export class BinanceMarketPriceService extends EventEmitter {
  private prices: Map<string, number> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private binanceApiService: BinanceApiService | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private updateFrequency: number = 60000; // 1 minute by default
  private isInitialized: boolean = false;
  
  constructor(binanceApiService?: BinanceApiService) {
    super();
    if (binanceApiService) {
      this.binanceApiService = binanceApiService;
    }
  }
  
  /**
   * Set the Binance API service instance
   */
  public setBinanceApiService(service: BinanceApiService): void {
    this.binanceApiService = service;
  }
  
  /**
   * Initialize the price service by fetching initial prices
   */
  public async initialize(): Promise<boolean> {
    try {
      if (!this.binanceApiService) {
        console.error('Cannot initialize market price service: Binance API service not set');
        return false;
      }
      
      console.log('Initializing Binance market price service');
      const prices = await this.binanceApiService.getAllTickerPrices();
      
      // Update local prices cache
      prices.forEach((tickerPrice: BinanceTickerPrice) => {
        const price = safeParseFloat(tickerPrice.price);
        this.prices.set(tickerPrice.symbol, price);
        this.lastUpdateTime.set(tickerPrice.symbol, Date.now());
      });
      
      console.log(`Initialized with ${this.prices.size} currency prices`);
      this.isInitialized = true;
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      return true;
    } catch (error) {
      console.error('Error initializing market price service:', error);
      return false;
    }
  }
  
  /**
   * Start periodic price updates
   */
  private startPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      try {
        if (this.binanceApiService) {
          console.log('Updating market prices from Binance API');
          const prices = await this.binanceApiService.getAllTickerPrices();
          let updateCount = 0;
          
          prices.forEach((tickerPrice: BinanceTickerPrice) => {
            const price = safeParseFloat(tickerPrice.price);
            this.updatePrice(tickerPrice.symbol, price, 'api-update');
            updateCount++;
          });
          
          console.log(`Updated ${updateCount} market prices from Binance API`);
        }
      } catch (error) {
        console.error('Error updating market prices:', error);
      }
    }, this.updateFrequency);
    
    console.log(`Started periodic market price updates every ${this.updateFrequency / 1000} seconds`);
  }
  
  /**
   * Set the update frequency
   */
  public setUpdateFrequency(milliseconds: number): void {
    this.updateFrequency = milliseconds;
    
    // Restart the interval with new frequency if running
    if (this.updateInterval) {
      this.startPeriodicUpdates();
    }
  }
  
  /**
   * Stop periodic updates
   */
  public stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Stopped periodic market price updates');
    }
  }
  
  /**
   * Update the price of a specific currency
   */
  public updatePrice(symbol: string, price: number, source = 'unknown'): void {
    // Validate inputs
    if (!symbol || typeof price !== 'number' || isNaN(price)) {
      return;
    }
    
    const previousPrice = this.prices.get(symbol);
    const now = Date.now();
    
    // Update price and timestamp
    this.prices.set(symbol, price);
    this.lastUpdateTime.set(symbol, now);
    
    // Calculate price change if previous price exists
    let priceChange = 0;
    let percentChange = 0;
    
    if (previousPrice !== undefined) {
      priceChange = price - previousPrice;
      percentChange = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;
    }
    
    // Emit price update event
    this.emit('price-update', {
      symbol,
      price,
      timestamp: now,
      source,
      previousPrice,
      priceChange,
      percentChange
    });
    
    // Emit specific event for this symbol
    this.emit(`price-update:${symbol}`, {
      symbol,
      price,
      timestamp: now,
      source,
      previousPrice,
      priceChange,
      percentChange
    });
    
    // If significant change, emit additional event
    const SIGNIFICANT_CHANGE_THRESHOLD = 1.0; // 1%
    if (previousPrice && Math.abs(percentChange) >= SIGNIFICANT_CHANGE_THRESHOLD) {
      this.emit('significant-price-change', {
        symbol,
        price,
        previousPrice,
        percentChange,
        timestamp: now
      });
    }
  }
  
  /**
   * Get the current price of a specific currency
   */
  public getPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }
  
  /**
   * Get all current prices
   */
  public getAllPrices(): BinanceTickerPrice[] {
    const result: BinanceTickerPrice[] = [];
    
    this.prices.forEach((price, symbol) => {
      result.push({
        symbol,
        price: price.toString()
      });
    });
    
    return result;
  }
  
  /**
   * Get top currencies by highest price
   */
  public getTopCurrenciesByPrice(limit: number = 10): BinanceTickerPrice[] {
    const allPrices = this.getAllPrices();
    
    // Filter to only include USDT pairs for fair comparison
    const usdtPairs = allPrices.filter(p => p.symbol.endsWith('USDT'));
    
    // Sort by price (highest first)
    usdtPairs.sort((a, b) => {
      const priceA = safeParseFloat(a.price);
      const priceB = safeParseFloat(b.price);
      return priceB - priceA;
    });
    
    // Return limited number
    return usdtPairs.slice(0, limit);
  }
  
  /**
   * Get top cryptocurrencies (major ones)
   */
  public getTopCryptocurrencies(): BinanceTickerPrice[] {
    const topSymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'
    ];
    
    return topSymbols
      .map(symbol => {
        const price = this.prices.get(symbol);
        return price !== undefined ? { symbol, price: price.toString() } : null;
      })
      .filter((item): item is BinanceTickerPrice => item !== null);
  }
  
  /**
   * Check if the service is initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Get the timestamp of the last update for a symbol
   */
  public getLastUpdateTime(symbol: string): number | undefined {
    return this.lastUpdateTime.get(symbol);
  }
  
  /**
   * Calculate the price change over a period
   */
  public calculatePriceChange(symbol: string, currentPrice: number, previousPrice: number): {
    priceChange: number;
    percentChange: number;
  } {
    const priceChange = currentPrice - previousPrice;
    const percentChange = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;
    
    return {
      priceChange,
      percentChange
    };
  }
}

// Export a singleton instance
export const binanceMarketService = new BinanceMarketPriceService();