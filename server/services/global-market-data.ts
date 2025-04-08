/**
 * Global Market Data Service
 * 
 * This service handles fetching and processing public market data without requiring API keys.
 * It provides data to the ML system for training and prediction.
 */

import axios from 'axios';
import { log } from '../vite';

// Supported exchanges for public data
type SupportedExchange = 'binance' | 'okx';

// Market data types
interface MarketPrice {
  symbol: string;
  price: number;
  timestamp: number;
  exchange: SupportedExchange;
  volume24h?: number;
  change24h?: number;
  marketCap?: number;
}

interface CandleData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  interval: string;
  exchange?: SupportedExchange;
}

class GlobalMarketDataService {
  private static instance: GlobalMarketDataService;
  private marketPrices: Record<string, MarketPrice> = {};
  private candles: Record<string, CandleData[]> = {};
  private isInitialized = false;
  private dataCollectionInterval: NodeJS.Timeout | null = null;
  private primaryExchange: SupportedExchange = 'okx'; // Default to OKX as it has fewer restrictions
  private fallbackExchange: SupportedExchange = 'binance';

  // Private constructor to enforce singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance of the market data service
   */
  public static getInstance(): GlobalMarketDataService {
    if (!GlobalMarketDataService.instance) {
      GlobalMarketDataService.instance = new GlobalMarketDataService();
    }
    return GlobalMarketDataService.instance;
  }

  /**
   * Initialize the market data service and start data collection
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      log('Initializing Global Market Data Service');
      
      // Always use OKX as primary exchange since Binance is consistently returning 451 errors
      this.primaryExchange = 'okx';
      this.fallbackExchange = 'binance';
      log('Using OKX as primary exchange for market data due to Binance geo-restrictions');
      
      // Start with a single data refresh
      await this.refreshMarketData();
      
      // Mark as initialized to allow server to start
      this.isInitialized = true;
      log('Global Market Data Service initialized successfully');
      
      // Delay periodic data collection to prevent slowing down server startup
      setTimeout(() => {
        this.startDataCollection();
      }, 15000);
    } catch (error: any) {
      log(`Error initializing Global Market Data Service: ${error.message}`);
      // Don't throw error, set initialized status anyway to prevent startup failure
      this.isInitialized = true;
    }
  }

  /**
   * Start periodic data collection
   */
  private startDataCollection(): void {
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
    }

    // Collect data every minute
    this.dataCollectionInterval = setInterval(async () => {
      try {
        await this.refreshMarketData();
      } catch (error) {
        log(`Error in data collection: ${error.message}`);
      }
    }, 60000); // 1 minute interval
    
    log('Scheduled market data collection every minute');
  }

  /**
   * Stop data collection
   */
  public stopDataCollection(): void {
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
      log('Stopped market data collection');
    }
  }

  /**
   * Test if an exchange is available
   */
  private async testExchangeAvailability(exchange: SupportedExchange): Promise<boolean> {
    try {
      let testUrl: string;
      
      switch (exchange) {
        case 'binance':
          testUrl = 'https://api.binance.com/api/v3/ping';
          break;
        case 'okx':
          testUrl = 'https://www.okx.com/api/v5/public/time';
          break;
      }

      const response = await axios.get(testUrl, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      log(`Exchange ${exchange} test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Refresh market data from exchanges
   */
  private async refreshMarketData(): Promise<void> {
    try {
      // Try primary exchange first
      let success = await this.fetchMarketPrices(this.primaryExchange);
      
      // If primary fails, try fallback
      if (!success) {
        log(`Primary exchange (${this.primaryExchange}) failed, trying fallback (${this.fallbackExchange})`);
        success = await this.fetchMarketPrices(this.fallbackExchange);
      }

      if (!success) {
        log('WARNING: Failed to fetch market data from all exchanges');
      }
    } catch (error) {
      log(`Error refreshing market data: ${error.message}`);
    }
  }

  /**
   * Fetch market prices from a specific exchange
   */
  private async fetchMarketPrices(exchange: SupportedExchange): Promise<boolean> {
    try {
      let url: string;
      let dataMapper: (data: any) => MarketPrice[];
      
      switch (exchange) {
        case 'binance':
          url = 'https://api.binance.com/api/v3/ticker/price';
          dataMapper = (data: any[]) => data.map(item => ({
            symbol: item.symbol,
            price: parseFloat(item.price),
            timestamp: Date.now(),
            exchange: 'binance' as SupportedExchange
          }));
          break;
        case 'okx':
          url = 'https://www.okx.com/api/v5/market/tickers?instType=SPOT';
          dataMapper = (data: any) => data.data.map((item: any) => {
            // Convert OKX format (BTC-USDT) to standard format (BTCUSDT)
            const symbol = item.instId.replace('-', '');
            return {
              symbol: symbol,
              price: parseFloat(item.last),
              timestamp: Date.now(),
              exchange: 'okx' as SupportedExchange,
              // Add additional data that might be useful for UI
              volume24h: parseFloat(item.vol24h || '0'),
              change24h: parseFloat(item.sodUtc0 || '0') > 0 
                ? ((parseFloat(item.last) - parseFloat(item.sodUtc0)) / parseFloat(item.sodUtc0)) * 100 
                : 0
            };
          });
          break;
        default:
          return false;
      }

      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.status === 200) {
        const prices = dataMapper(response.data);
        
        // Filter out non-USDT pairs to focus on major trading pairs
        // But include other stablecoins like BUSD, USDC as well
        const filteredPrices = prices.filter(price => {
          return price.symbol.endsWith('USDT') || 
                 price.symbol.endsWith('BUSD') || 
                 price.symbol.endsWith('USDC') ||
                 price.symbol.endsWith('USD');
        });
        
        // Update market prices
        filteredPrices.forEach(price => {
          this.marketPrices[price.symbol] = price;
        });
        
        log(`Updated ${filteredPrices.length} market prices from ${exchange}`);
        return true;
      }
      
      return false;
    } catch (error) {
      log(`Error fetching market prices from ${exchange}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current market prices
   */
  public getMarketPrices(): MarketPrice[] {
    return Object.values(this.marketPrices);
  }

  /**
   * Get market price for a specific symbol
   */
  public getMarketPrice(symbol: string): MarketPrice | null {
    return this.marketPrices[symbol] || null;
  }

  /**
   * Fetch historical candle data for a symbol
   */
  public async fetchCandleData(symbol: string, interval = '1h', limit = 100): Promise<CandleData[]> {
    try {
      // Try primary exchange first
      let candles = await this.fetchCandlesFromExchange(this.primaryExchange, symbol, interval, limit);
      
      // If primary fails, try fallback
      if (!candles.length) {
        candles = await this.fetchCandlesFromExchange(this.fallbackExchange, symbol, interval, limit);
      }
      
      // Store candles for future reference
      if (candles.length) {
        const key = `${symbol}-${interval}`;
        this.candles[key] = candles;
      }
      
      return candles;
    } catch (error) {
      log(`Error fetching candle data for ${symbol}: ${error.message}`);
      
      // Return cached data if available
      const key = `${symbol}-${interval}`;
      return this.candles[key] || [];
    }
  }

  /**
   * Fetch candles from a specific exchange
   */
  private async fetchCandlesFromExchange(
    exchange: SupportedExchange, 
    symbol: string, 
    interval: string, 
    limit: number
  ): Promise<CandleData[]> {
    try {
      let url: string;
      let dataMapper: (data: any) => CandleData[];
      
      switch (exchange) {
        case 'binance':
          url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
          dataMapper = (data: any[][]) => data.map(item => ({
            symbol,
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
            timestamp: item[0],
            interval,
            exchange: 'binance' as SupportedExchange
          }));
          break;
        case 'okx':
          // Handle different symbol format for OKX (BTC-USDT instead of BTCUSDT)
          let instId: string;
          if (symbol.endsWith('USDT')) {
            instId = `${symbol.slice(0, -4)}-${symbol.slice(-4)}`;
          } else if (symbol.endsWith('USDC')) {
            instId = `${symbol.slice(0, -4)}-${symbol.slice(-4)}`;
          } else if (symbol.endsWith('BUSD')) {
            instId = `${symbol.slice(0, -4)}-${symbol.slice(-4)}`;
          } else if (symbol.endsWith('USD')) {
            instId = `${symbol.slice(0, -3)}-${symbol.slice(-3)}`;
          } else {
            // Default fallback
            instId = symbol;
          }
          
          // Adjust interval format for OKX
          let okxInterval = interval;
          if (interval === '1d') okxInterval = '1D';
          if (interval === '4h') okxInterval = '4H';
          if (interval === '1h') okxInterval = '1H';
          
          url = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${okxInterval}&limit=${limit}`;
          dataMapper = (data: any) => {
            // Check if we have valid data
            if (!data.data || !Array.isArray(data.data)) {
              return [];
            }
            
            return data.data.map((item: any) => ({
              symbol,
              open: parseFloat(item[1]),
              high: parseFloat(item[2]),
              low: parseFloat(item[3]),
              close: parseFloat(item[4]),
              volume: parseFloat(item[5]),
              timestamp: parseInt(item[0]),
              interval,
              exchange: 'okx' as SupportedExchange
            }));
          };
          break;
        default:
          return [];
      }

      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.status === 200) {
        return dataMapper(response.data);
      }
      
      return [];
    } catch (error: any) {
      log(`Error fetching candles from ${exchange}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get status information about the service
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      primaryExchange: this.primaryExchange,
      fallbackExchange: this.fallbackExchange,
      symbolCount: Object.keys(this.marketPrices).length,
      lastUpdateTime: Math.max(
        ...Object.values(this.marketPrices).map(p => p.timestamp), 
        0
      ),
    };
  }
}

// Export singleton instance
export const globalMarketData = GlobalMarketDataService.getInstance();