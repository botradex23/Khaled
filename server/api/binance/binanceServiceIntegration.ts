import { binanceMarketService, BinanceMarketPriceService } from './marketPriceService';
import type { LivePriceUpdate, BinanceTickerPrice } from './marketPriceService';
import type { Binance24hrTicker } from './marketPriceService';
import { binanceSdkService, BinanceSdkService } from './binanceSdkService';

// Control variable to determine which implementation to use
// Can be modified at runtime or set via environment variable
// Default to using SDK implementation with fallback to Axios built in
const USE_SDK_IMPLEMENTATION = process.env.USE_BINANCE_SDK === 'true' || process.env.USE_BINANCE_SDK === undefined || true;

/**
 * Unified Binance service interface that abstracts away the implementation details.
 * This allows for seamless switching between the Axios-based implementation and the SDK implementation.
 */
class BinanceServiceFacade {
  private useSDK: boolean;
  
  constructor(useSDK: boolean = USE_SDK_IMPLEMENTATION) {
    this.useSDK = useSDK;
    console.log(`BinanceServiceFacade initialized using ${this.useSDK ? 'SDK' : 'Axios'} implementation`);
  }
  
  /**
   * Set which implementation to use
   * @param useSDK Whether to use the SDK implementation (true) or Axios implementation (false)
   */
  public setImplementation(useSDK: boolean): void {
    this.useSDK = useSDK;
    console.log(`Switched to ${this.useSDK ? 'SDK' : 'Axios'} implementation`);
  }
  
  /**
   * Get the service implementation being used
   * @returns String indicating which implementation is being used
   */
  public getImplementationType(): string {
    return this.useSDK ? 'SDK' : 'Axios';
  }
  
  /**
   * Get the timestamp of the last price update
   * @returns Timestamp in milliseconds
   */
  public getLastUpdateTime(): number {
    return this.useSDK 
      ? binanceSdkService.getLastUpdateTime() 
      : binanceMarketService.getLastUpdateTime();
  }
  
  /**
   * Update price in real-time
   * @param symbol Symbol (e.g., BTCUSDT)
   * @param price New price
   */
  public updatePrice(symbol: string, price: number): void {
    if (this.useSDK) {
      binanceSdkService.updatePrice(symbol, price);
    } else {
      binanceMarketService.updatePrice(symbol, price);
    }
  }
  
  /**
   * Get latest price for a symbol
   * @param symbol Symbol (e.g., BTCUSDT)
   * @returns Latest price or undefined if not available
   */
  public getLatestPrice(symbol: string): number | undefined {
    return this.useSDK
      ? binanceSdkService.getLatestPrice(symbol)
      : binanceMarketService.getLatestPrice(symbol);
  }
  
  /**
   * Get all latest prices available in real-time
   * @returns Array of all latest prices
   */
  public getAllLatestPrices(): LivePriceUpdate[] {
    return this.useSDK
      ? binanceSdkService.getAllLatestPrices()
      : binanceMarketService.getAllLatestPrices();
  }
  
  /**
   * Get simulated prices for development/fallback
   * @returns Map of simulated prices
   */
  public getSimulatedPrices(): Record<string, number> {
    return this.useSDK
      ? binanceSdkService.getSimulatedPrices()
      : binanceMarketService.getSimulatedPrices();
  }
  
  /**
   * Get all ticker prices from Binance
   * @returns Array of ticker prices
   */
  public async getAllPrices(): Promise<BinanceTickerPrice[]> {
    return this.useSDK
      ? await binanceSdkService.getAllPrices()
      : await binanceMarketService.getAllPrices();
  }
  
  /**
   * Get price for a specific symbol
   * @param symbol Symbol (e.g., BTCUSDT)
   * @returns Ticker price or null if not found
   */
  public async getSymbolPrice(symbol: string): Promise<BinanceTickerPrice | null> {
    return this.useSDK
      ? await binanceSdkService.getSymbolPrice(symbol)
      : await binanceMarketService.getSymbolPrice(symbol);
  }
  
  /**
   * Get 24hr ticker information for a symbol
   * @param symbol Symbol (e.g., BTCUSDT)
   * @returns 24hr ticker information or null if not found
   */
  public async get24hrTicker(symbol: string): Promise<Binance24hrTicker | null> {
    if (this.useSDK) {
      return await binanceSdkService.get24hrTicker(symbol);
    } else {
      // For non-SDK implementation, this might need to be implemented
      // or we can redirect to the SDK implementation if not available
      return null;
    }
  }
  
  /**
   * Get all 24hr tickers from Binance
   * @returns Array of all 24hr tickers
   */
  public async getAll24hrTickers(): Promise<Binance24hrTicker[]> {
    if (this.useSDK) {
      return await binanceSdkService.getAll24hrTickers();
    } else {
      // For non-SDK implementation, this might need to be implemented
      // or we can redirect to the SDK implementation if not available
      return [];
    }
  }
  
  /**
   * Check if the Binance API is accessible and properly configured
   * @returns Boolean indicating if the API is working
   */
  public async checkApiStatus(): Promise<boolean> {
    if (this.useSDK) {
      return await binanceSdkService.checkApiStatus();
    } else {
      // For non-SDK implementation, we could perform a similar check
      try {
        await binanceMarketService.getAllPrices();
        return true;
      } catch (error) {
        return false;
      }
    }
  }
  
  /**
   * Subscribe to price updates for specific symbols using WebSocket
   * Only available in SDK implementation
   * @param symbols Array of symbols to subscribe to (e.g., ['BTCUSDT', 'ETHUSDT'])
   */
  public async subscribeToSymbols(symbols: string[]): Promise<void> {
    if (this.useSDK) {
      await binanceSdkService.subscribeToSymbols(symbols);
    } else {
      // Not available in the Axios implementation
      console.log('subscribeToSymbols is only available in the SDK implementation');
    }
  }
  
  /**
   * Register an event listener on the market price service
   * @param event Event name
   * @param listener Event handler function
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    if (this.useSDK) {
      binanceSdkService.on(event, listener);
    } else {
      binanceMarketService.on(event, listener);
    }
  }
}

// Create a singleton instance of the facade
export const binanceService = new BinanceServiceFacade(USE_SDK_IMPLEMENTATION);

// Run a quick test on startup to ensure our service is working
(async () => {
  console.log('Testing Binance Service Integration...');
  console.log(`Using implementation: ${binanceService.getImplementationType()}`);

  try {
    // Test get symbol price
    const btcPrice = await binanceService.getSymbolPrice('BTCUSDT');
    console.log('BTC Price Result:', btcPrice ? `Success: ${btcPrice.price}` : 'No price data available');
    
    // Test 24hr ticker
    const btcTicker = await binanceService.get24hrTicker('BTCUSDT');
    console.log('BTC 24hr Ticker Result:', btcTicker ? 'Success' : 'No ticker data available');
    
    // Load all prices
    const allPrices = await binanceService.getAllPrices();
    console.log(`All Prices Count: ${allPrices.length}`);
    
    console.log('Binance Service Integration Test Completed Successfully');
  } catch (error) {
    console.error('Binance Service Integration Test Failed:', error);
  }
})();

// Re-export relevant types
export type { LivePriceUpdate, BinanceTickerPrice, Binance24hrTicker };