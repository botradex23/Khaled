/**
 * Multi-Broker Service
 * 
 * This service manages multiple brokers and provides automatic fallback between them.
 * The primary strategy is to use Binance as the first choice, then OKX as fallback,
 * and finally the simulated broker when real exchange connections are unavailable.
 */

import { 
  BrokerType, IBroker, BrokerTickerPrice, Broker24hrTicker, 
  BrokerBalance, BrokerExchangeInfo, BrokerOrderBook, 
  BrokerOrderResult, BrokerLivePriceUpdate, BrokerApiStatus
} from './interfaces';
import { BrokerFactory } from './brokerFactory';

export class MultiBrokerService implements IBroker {
  private brokers: IBroker[];
  private factory: BrokerFactory;
  private activeBrokerIndex: number = 0;
  private wsCallbacks: Map<string, ((update: BrokerLivePriceUpdate) => void)[]> = new Map();
  private activeBrokerType: BrokerType;
  private cleanupFunctions: Map<string, () => void> = new Map();
  
  constructor(priorityOrder: BrokerType[] = [BrokerType.BINANCE, BrokerType.OKX, BrokerType.SIMULATED]) {
    // Initialize the broker factory
    this.factory = new BrokerFactory();
    
    // Create the brokers in priority order
    this.brokers = priorityOrder.map(type => this.factory.createBroker(type));
    
    // Set the active broker to the first one that is configured
    this.activeBrokerIndex = this.findFirstConfiguredBrokerIndex();
    this.activeBrokerType = priorityOrder[this.activeBrokerIndex];
    
    console.log(`MultiBrokerService initialized. Active broker: ${this.getName()}`);
  }
  
  /**
   * Find the index of the first configured broker
   */
  private findFirstConfiguredBrokerIndex(): number {
    for (let i = 0; i < this.brokers.length; i++) {
      if (this.brokers[i].isConfigured()) {
        return i;
      }
    }
    
    // If no configured broker found, use the last one (should be simulated)
    return this.brokers.length - 1;
  }
  
  /**
   * Get the current active broker
   */
  private getActiveBroker(): IBroker {
    return this.brokers[this.activeBrokerIndex];
  }
  
  /**
   * Attempt to use a method on the active broker, falling back to others if needed
   * @param method The method name to call
   * @param args The arguments to pass to the method
   * @returns The result of the method call
   */
  private async tryWithFallback<T>(method: string, ...args: any[]): Promise<T> {
    // Start with the current active broker
    let startIndex = this.activeBrokerIndex;
    
    for (let i = 0; i < this.brokers.length; i++) {
      const brokerIndex = (startIndex + i) % this.brokers.length;
      const broker = this.brokers[brokerIndex];
      
      try {
        // Try to execute the method on this broker
        const result = await (broker as any)[method](...args);
        
        // If successful and this isn't the active broker, update the active broker
        if (brokerIndex !== this.activeBrokerIndex) {
          console.log(`Switching active broker from ${this.getName()} to ${broker.getName()}`);
          this.activeBrokerIndex = brokerIndex;
          this.activeBrokerType = broker.getName();
        }
        
        return result;
      } catch (error) {
        console.error(`Error with broker ${broker.getName()} method ${method}:`, error);
        
        // If this is the last broker, no more fallbacks, so re-throw the error
        if (i === this.brokers.length - 1) {
          throw error;
        }
        
        // Otherwise try the next broker
        console.log(`Falling back to next broker for method ${method}`);
      }
    }
    
    // This should never happen due to the throw in the loop, but TypeScript requires a return
    throw new Error(`All brokers failed for method ${method}`);
  }
  
  // Implement IBroker interface
  
  getName(): BrokerType {
    return this.activeBrokerType;
  }
  
  isTestnet(): boolean {
    return this.getActiveBroker().isTestnet();
  }
  
  isConfigured(): boolean {
    // MultiBrokerService is configured if at least one broker is configured
    return this.brokers.some(broker => broker.isConfigured());
  }
  
  async getApiStatus(): Promise<BrokerApiStatus> {
    // Return status of all brokers
    const statuses: BrokerApiStatus[] = await Promise.all(
      this.brokers.map(async broker => {
        try {
          return await broker.getApiStatus();
        } catch {
          return {
            hasApiKey: false,
            hasSecretKey: false,
            testnet: false,
            name: broker.getName()
          };
        }
      })
    );
    
    // Mark the active broker
    const activeStatus = statuses[this.activeBrokerIndex];
    return {
      ...activeStatus,
      active: true,
      fallbacks: statuses.filter((_, i) => i !== this.activeBrokerIndex)
    };
  }
  
  // Market data methods with fallback
  async getSymbolPrice(symbol: string): Promise<BrokerTickerPrice | null> {
    return this.tryWithFallback<BrokerTickerPrice | null>('getSymbolPrice', symbol);
  }
  
  async getAllPrices(): Promise<BrokerTickerPrice[]> {
    return this.tryWithFallback<BrokerTickerPrice[]>('getAllPrices');
  }
  
  async get24hrTicker(symbol: string): Promise<Broker24hrTicker | null> {
    return this.tryWithFallback<Broker24hrTicker | null>('get24hrTicker', symbol);
  }
  
  async getExchangeInfo(symbol?: string): Promise<BrokerExchangeInfo> {
    return this.tryWithFallback<BrokerExchangeInfo>('getExchangeInfo', symbol);
  }
  
  async getOrderBook(symbol: string, limit: number = 100): Promise<BrokerOrderBook> {
    return this.tryWithFallback<BrokerOrderBook>('getOrderBook', symbol, limit);
  }
  
  // Account data methods with fallback
  async getAccountBalances(): Promise<BrokerBalance[]> {
    return this.tryWithFallback<BrokerBalance[]>('getAccountBalances');
  }
  
  // Order methods with fallback
  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET',
    quantity: string,
    price?: string,
    timeInForce?: string
  ): Promise<BrokerOrderResult> {
    return this.tryWithFallback<BrokerOrderResult>(
      'placeOrder',
      symbol,
      side,
      type,
      quantity,
      price,
      timeInForce
    );
  }
  
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    return this.tryWithFallback<boolean>('cancelOrder', symbol, orderId);
  }
  
  async getOrder(symbol: string, orderId: string): Promise<any> {
    return this.tryWithFallback<any>('getOrder', symbol, orderId);
  }
  
  // WebSocket methods require special handling for fallback
  subscribeToTicker(symbols: string[], callback: (update: BrokerLivePriceUpdate) => void): () => void {
    // Store the callback for each symbol
    for (const symbol of symbols) {
      const callbacks = this.wsCallbacks.get(symbol) || [];
      callbacks.push(callback);
      this.wsCallbacks.set(symbol, callbacks);
    }
    
    // Unique key for this subscription
    const subKey = `${symbols.join('_')}_${Date.now()}`;
    
    // Create wrapper callback that will distribute updates to all registered callbacks
    const wrapperCallback = (update: BrokerLivePriceUpdate) => {
      const symbolCallbacks = this.wsCallbacks.get(update.symbol) || [];
      for (const cb of symbolCallbacks) {
        cb(update);
      }
    };
    
    // Subscribe using the active broker
    const cleanup = this.getActiveBroker().subscribeToTicker(symbols, wrapperCallback);
    
    // Store the cleanup function
    this.cleanupFunctions.set(subKey, cleanup);
    
    // Return a cleanup function that removes callbacks and calls the broker's cleanup
    return () => {
      // Remove from callbacks
      for (const symbol of symbols) {
        this.wsCallbacks.delete(symbol);
      }
      
      // Call the broker's cleanup
      const cleanup = this.cleanupFunctions.get(subKey);
      if (cleanup) {
        cleanup();
        this.cleanupFunctions.delete(subKey);
      }
    };
  }
  
  // Format conversion helpers delegate to active broker
  standardizeSymbol(symbol: string): string {
    return this.getActiveBroker().standardizeSymbol(symbol);
  }
  
  formatSymbolForExchange(symbol: string): string {
    return this.getActiveBroker().formatSymbolForExchange(symbol);
  }
}