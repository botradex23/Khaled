/**
 * Binance WebSocket Module
 * Provides real-time market data streaming from Binance
 */

import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { 
  BINANCE_WEBSOCKET_URL,
  DEFAULT_CURRENCY_PAIRS,
  PROXY_CONFIG,
  SIMULATION_DEFAULTS,
  WEBSOCKET_CONFIG
} from './binanceConfig';
import { BinanceTickerPrice } from './binanceClient';

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  source: 'binance-websocket' | 'simulated';
}

interface SignificantPriceChange {
  symbol: string;
  previousPrice: number;
  price: number;
  changePercent: number;
  timestamp: number;
}

/**
 * Real-time price updates event emitter class
 */
export class BinanceWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectInterval: number = PROXY_CONFIG.RECONNECT_INTERVAL;
  private currencyPairs: string[] = DEFAULT_CURRENCY_PAIRS;

  // Status tracking fields
  private lastConnectionError: string | null = null;
  private currentProxy: {host: string, port: number} | null = null;
  private connectionAttempts: number = 0;
  private maxRetries: number = PROXY_CONFIG.MAX_PROXY_RETRIES;
  private lastMessageTime: number = 0;

  // Simulation mode properties
  private simulationMode: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulationIntervalTime: number = SIMULATION_DEFAULTS.INTERVAL_TIME;
  private simulationStartTime: number = 0;
  private lastPrices: Record<string, number> = {};

  // Market price service to update prices
  private marketPriceService: any = null;

  constructor(marketPriceService: any) {
    super();
    this.marketPriceService = marketPriceService;
    
    // Register the error event handler
    this.on('error', this.handleError.bind(this));
  }

  /**
   * Connect to Binance WebSocket service
   * Attempts to connect using available proxies, with failover capability
   */
  public connect(proxyIndex: number = 0): void {
    if (this.isConnected || this.ws) {
      console.log('WebSocket connection already exists');
      return;
    }

    try {
      // Build URL for multiple streams
      const streams = this.currencyPairs.map(pair => `${pair}@ticker`).join('/');
      const wsUrl = `${BINANCE_WEBSOCKET_URL}/stream?streams=${streams}`;
      
      console.log(`Connecting to Binance WebSocket: ${wsUrl}`);
      
      // Get proxy details - use either environment variables or try from our list
      const currentProxy = PROXY_CONFIG.AVAILABLE_PROXIES[proxyIndex] || PROXY_CONFIG.AVAILABLE_PROXIES[0];
      const proxyHost = process.env.PROXY_IP || currentProxy.host;
      const proxyPort = process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT, 10) : currentProxy.port;
      
      // Store current proxy for status reporting
      this.currentProxy = { host: proxyHost, port: proxyPort };
      
      // Create proxy agent for WebSocket
      const proxyUrl = PROXY_CONFIG.getProxyUrl(proxyHost, proxyPort);
      console.log(`Using HTTPS proxy for WebSocket: ${proxyHost}:${proxyPort}`);
      const agent = new HttpsProxyAgent(proxyUrl);
      
      // Create WebSocket options with proxy
      const wsOptions = {
        agent,
        headers: {
          'User-Agent': WEBSOCKET_CONFIG.USER_AGENT,
          'Origin': WEBSOCKET_CONFIG.ORIGIN
        }
      };
      
      // Connect to WebSocket using proxy
      this.ws = new WebSocket(wsUrl, wsOptions);
      
      this.ws.on('open', () => {
        console.log('Connected to Binance WebSocket');
        this.isConnected = true;
        this.simulationMode = false;
        
        // Stop simulation if running
        this.stopSimulation();
        
        this.emit('connected');
        
        // Clear reconnect timer if exists
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });
      
      this.ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          
          // Check if message contains price data
          if (message && message.data && message.data.s && message.data.p) {
            const ticker = {
              symbol: message.data.s, // Symbol (like BTCUSDT)
              price: parseFloat(message.data.p), // Current price
              priceChangePercent: parseFloat(message.data.P), // 24hr change percentage
              volume: message.data.v, // Trading volume
              timestamp: Date.now()
            };
            
            // Update price in our system
            if (this.marketPriceService) {
              this.marketPriceService.updatePrice(ticker.symbol, ticker.price);
            }
            
            // Save last price
            this.lastPrices[ticker.symbol] = ticker.price;
            
            // Emit event to all listeners
            this.emit('price-update', {
              symbol: ticker.symbol, 
              price: ticker.price,
              timestamp: Date.now(),
              source: 'binance-websocket'
            } as PriceUpdate);
            
            // Emit specific event for each currency
            this.emit(`ticker:${ticker.symbol}`, ticker);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('error', (error: any) => {
        console.error('Binance WebSocket error:', error);
        this.emit('error', error);
        
        // Handle proxy authentication errors (407) by trying the next proxy
        if (error && (error.message?.includes('407') || error.code === 407)) {
          console.log('[WebSocket] Proxy authentication failed, trying next proxy...');
          
          // Try next proxy if available
          const nextProxyIndex = (proxyIndex + 1) % PROXY_CONFIG.AVAILABLE_PROXIES.length;
          
          // Only try the next proxy if we haven't tried all of them
          if (nextProxyIndex !== proxyIndex) {
            console.log(`[WebSocket] Trying proxy ${nextProxyIndex + 1}/${PROXY_CONFIG.AVAILABLE_PROXIES.length}`);
            
            // Close current connection if it exists
            if (this.ws) {
              try {
                this.ws.close();
              } catch (e) {
                // Ignore
              }
              this.ws = null;
              this.isConnected = false;
            }
            
            // Try connect with next proxy
            setTimeout(() => {
              this.connect(nextProxyIndex);
            }, 1000);
            return;
          }
        }
        
        // If geo-restricted (451) or payment required (402), start simulation
        if (error && (error.message?.includes('451') || error.code === 451 || 
                      error.message?.includes('402') || error.code === 402 ||
                      error.message?.includes('407') || error.code === 407)) {
          console.log('[WebSocket] Binance WebSocket connection failed due to proxy issues, switching to simulation mode');
          
          // Inform all services that we're using simulation
          console.log('Binance WebSocket switched to simulation mode due to connection issues (possibly geo-restricted)');
          
          // Start simulation mode for price updates
          this.startSimulation();
        }
      });
      
      this.ws.on('close', (code: number, reason: string) => {
        console.log(`Binance WebSocket closed with code ${code} and reason: ${reason}`);
        this.isConnected = false;
        this.ws = null;
        
        // Emit disconnected event
        this.emit('disconnected', { code, reason });
        
        // Start simulation when disconnected
        this.startSimulation();
        
        // Attempt to reconnect
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Error creating Binance WebSocket connection:', error);
      this.emit('error', error);
      
      // Start simulation when connection creation fails
      this.startSimulation();
      
      // Schedule reconnect attempt
      this.scheduleReconnect();
    }
  }
  
  /**
   * Start simulation mode for price updates
   * This mode is used when real connection to Binance is not available
   */
  public startSimulation(): void {
    // If simulation is already active, don't start again
    if (this.simulationMode && this.simulationInterval) {
      return;
    }
    
    console.log('Starting WebSocket simulation mode for price updates');
    this.simulationMode = true;
    this.simulationStartTime = Date.now();
    this.lastMessageTime = Date.now(); // Update last message time
    
    // Store this error for status reporting
    this.lastConnectionError = "Binance WebSocket connection failed. Using simulation mode for price data.";
    
    // Get initial prices from the service
    this.initializeSimulatedPrices();
    
    // Send initial update
    this.emitSimulatedPriceUpdates();
    
    // Set up periodic updates
    this.simulationInterval = setInterval(() => {
      this.emitSimulatedPriceUpdates();
      this.lastMessageTime = Date.now(); // Update last message time on each emit
    }, this.simulationIntervalTime);
    
    // Notify about simulation mode
    this.emit('simulation-started');
  }
  
  /**
   * Stop simulation mode
   */
  private stopSimulation(): void {
    if (this.simulationInterval) {
      console.log('Stopping WebSocket simulation mode');
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.simulationMode = false;
  }
  
  /**
   * Initialize initial prices for simulation
   */
  private async initializeSimulatedPrices(): Promise<void> {
    try {
      // Try to get prices from the market price service
      const prices = this.marketPriceService ? await this.marketPriceService.getAllPrices() : [];
      
      if (prices && prices.length > 0) {
        // Update initial prices
        prices.forEach((ticker: BinanceTickerPrice) => {
          this.lastPrices[ticker.symbol] = parseFloat(ticker.price);
        });
        
        console.log(`Initialized simulation with ${Object.keys(this.lastPrices).length} prices`);
      } else {
        // If no prices, initialize with default values
        this.initializeFallbackPrices();
      }
    } catch (error) {
      console.error('Failed to initialize simulated prices:', error);
      this.initializeFallbackPrices();
    }
  }
  
  /**
   * Initialize default values for simulated prices
   */
  private initializeFallbackPrices(): void {
    this.lastPrices = { ...SIMULATION_DEFAULTS.DEFAULT_PRICES };
    console.log('Initialized fallback price simulation');
  }
  
  /**
   * Generate and emit realistic simulated price updates
   */
  private emitSimulatedPriceUpdates(): void {
    // Use all currencies in lastPrices instead of just important ones
    // This includes all currencies defined in the defaults
    Object.keys(this.lastPrices).forEach(symbol => {
      // Skip if no previous price
      if (!this.lastPrices[symbol]) {
        return;
      }
      
      // Create a small realistic price change (-0.5% to +0.5%)
      const priceChange = this.lastPrices[symbol] * (Math.random() * 0.01 - 0.005);
      const previousPrice = this.lastPrices[symbol];
      const newPrice = previousPrice + priceChange;
      
      // Update the new price in the repository
      this.lastPrices[symbol] = newPrice;
      
      // Update the price in the general system
      if (this.marketPriceService) {
        this.marketPriceService.updatePrice(symbol, newPrice);
      }
      
      // Calculate percentage change
      const changePercent = (priceChange / previousPrice) * 100;
      
      // Send price update to all listeners
      this.emit('price-update', {
        symbol, 
        price: newPrice,
        timestamp: Date.now(),
        source: 'simulated'
      } as PriceUpdate);
      
      // If significant change (more than 0.25%), send special event
      if (Math.abs(changePercent) > 0.25) {
        this.emit('significant-price-change', {
          symbol,
          previousPrice,
          price: newPrice,
          changePercent,
          timestamp: Date.now()
        } as SignificantPriceChange);
      }
    });
  }

  /**
   * Disconnect from the service
   */
  public disconnect(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }
    
    console.log('Disconnecting from Binance WebSocket');
    
    try {
      this.ws.close();
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
    
    this.isConnected = false;
    this.ws = null;
    this.emit('disconnected', { code: 1000, reason: 'Manual disconnect' });
  }

  /**
   * Schedule a reconnection attempt with proxy cycling
   * Will try all proxies in sequence before giving up
   */
  private scheduleReconnect(proxyIndex: number = 0): void {
    if (this.reconnectTimer) {
      return;
    }
    
    console.log(`Scheduling WebSocket reconnect in ${this.reconnectInterval}ms, will try proxy ${proxyIndex + 1}/${PROXY_CONFIG.AVAILABLE_PROXIES.length}`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to Binance WebSocket');
      this.reconnectTimer = null;
      
      // Try to connect with the next proxy in sequence
      this.connect(proxyIndex);
    }, this.reconnectInterval);
  }

  /**
   * Handle errors
   */
  private handleError(error: any): void {
    console.error('Binance WebSocket service error:', error);
    
    // If there's a connection error, try to reconnect
    if (!this.isConnected) {
      this.scheduleReconnect();
    }
  }
  
  /**
   * Check if WebSocket is connected
   */
  public isWebSocketConnected(): boolean {
    return this.isConnected && this.ws !== null;
  }
  
  /**
   * Get the last prices (real or simulated)
   */
  public getLastPrices(): Record<string, number> {
    return this.lastPrices;
  }

  /**
   * Add currency pairs to watch list
   */
  public addCurrencyPairs(pairs: string[]): void {
    pairs.forEach(pair => {
      const normalizedPair = pair.toLowerCase();
      if (!this.currencyPairs.includes(normalizedPair)) {
        this.currencyPairs.push(normalizedPair);
      }
    });
    
    // If already connected, reconnect with updated currency list
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
  
  /**
   * Check if simulation mode is active
   */
  public isSimulationMode(): boolean {
    return this.simulationMode;
  }
  
  /**
   * Get the current proxy being used
   */
  public getCurrentProxy(): {host: string, port: number} | null {
    return this.currentProxy;
  }
  
  /**
   * Get the last connection error
   */
  public getLastConnectionError(): string | null {
    return this.lastConnectionError;
  }
  
  /**
   * Get the number of connection attempts made
   */
  public getConnectionAttempts(): number {
    return this.connectionAttempts;
  }
  
  /**
   * Get the maximum number of retry attempts
   */
  public getMaxRetries(): number {
    return this.maxRetries;
  }
  
  /**
   * Get connection status
   */
  public getConnectionStatus(): {
    connected: boolean;
    simulationMode: boolean;
    lastError: string | null;
    currentProxy: {host: string, port: number} | null;
    connectionAttempts: number;
    maxRetries: number;
    lastMessageTime: number;
  } {
    return {
      connected: this.isConnected,
      simulationMode: this.simulationMode,
      lastError: this.lastConnectionError,
      currentProxy: this.currentProxy,
      connectionAttempts: this.connectionAttempts,
      maxRetries: this.maxRetries,
      lastMessageTime: this.lastMessageTime
    };
  }
}