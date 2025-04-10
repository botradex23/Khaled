/**
 * OKX Broker Implementation
 * 
 * This file implements the IBroker interface for OKX exchange using the okx-api SDK.
 */

import * as okx from 'okx-api';
import { BrokerType, IBroker, BrokerTickerPrice, Broker24hrTicker, 
  BrokerBalance, BrokerExchangeInfo, BrokerSymbolInfo, 
  BrokerOrderResult, BrokerOrderBook, BrokerLivePriceUpdate,
  BrokerApiStatus, BrokerCandle } from '../brokers/interfaces';
import { config } from '../../config';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class OkxBroker implements IBroker {
  private client: any;
  private wsClient: any;
  private wsCallbacks: Map<string, ((update: BrokerLivePriceUpdate) => void)[]>;
  private isWsConnected: boolean;

  constructor(testnet: boolean = false) {
    // Get API credentials from centralized config
    const apiKey = config.exchanges.okx.apiKey;
    const apiSecret = config.exchanges.okx.apiSecret;
    const passphrase = config.exchanges.okx.passphrase;
    const useTestnet = testnet || config.exchanges.okx.useTestnet;

    // Initialize OKX client with credentials and sandbox setting
    const options: any = {
      sandbox: useTestnet
    };
    
    try {
      // For OKX API, we need to initialize the client regardless of credentials
      // But we'll mark whether we're using authenticated mode or public-only mode
      options.apiKey = apiKey;
      options.apiSecret = apiSecret;
      options.apiPassphrase = passphrase;

      // Add proxy support if enabled
      if (config.proxy.enabled && config.proxy.ip && config.proxy.port) {
        console.log(`Using proxy connection to OKX API via ${config.proxy.ip}:${config.proxy.port}`);
        const proxyUrl = `${config.proxy.protocol}://`;
        
        // Add auth if provided
        if (config.proxy.username && config.proxy.password) {
          // Use the configured encoding method for the authentication
          let encodedUsername = config.proxy.username;
          let encodedPassword = config.proxy.password;
          
          if (config.proxy.encodingMethod === 'none') {
            // No encoding
          } else if (config.proxy.encodingMethod === 'quote') {
            encodedUsername = encodeURIComponent(config.proxy.username);
            encodedPassword = encodeURIComponent(config.proxy.password);
          } else { // Default to quote_plus
            encodedUsername = encodeURIComponent(config.proxy.username).replace(/%20/g, '+');
            encodedPassword = encodeURIComponent(config.proxy.password).replace(/%20/g, '+');
          }
          
          const proxyUrlWithAuth = `${proxyUrl}${encodedUsername}:${encodedPassword}@${config.proxy.ip}:${config.proxy.port}`;
          options.httpAgent = new HttpsProxyAgent(proxyUrlWithAuth);
          options.httpsAgent = new HttpsProxyAgent(proxyUrlWithAuth);
        } else {
          const proxyUrlNoAuth = `${proxyUrl}${config.proxy.ip}:${config.proxy.port}`;
          options.httpAgent = new HttpsProxyAgent(proxyUrlNoAuth);
          options.httpsAgent = new HttpsProxyAgent(proxyUrlNoAuth);
        }
      }
      
      // Initialize client
      this.client = new okx.RestClient(options);
      
      if (apiKey && apiSecret && passphrase) {
        console.log('OKX broker initialized with full API access');
      } else {
        console.log('OKX broker initialized in public-only mode (no API credentials found)');
        // We'll handle authentication errors in each method by checking isConfigured() first
      }
    } catch (error) {
      console.error('Failed to initialize OKX client:', error);
      // If there's an error creating the client, we still need to create something
      // so other parts of the code don't break when accessing this.client
      this.client = { 
        // Create a minimal mock client that returns empty results for read-only methods
        getTicker: async () => ({ data: [] }),
        getTickers: async () => ({ data: [] }),
        getCandles: async () => ({ data: [] }),
        getInstruments: async () => ({ data: [] }),
        getBooks: async () => ({ data: [] })
      };
    }

    // Initialize WebSocket state
    this.wsCallbacks = new Map();
    this.isWsConnected = false;
  }

  // Broker information methods
  getName(): BrokerType {
    return BrokerType.OKX;
  }

  isTestnet(): boolean {
    return this.client.sandbox;
  }

  isConfigured(): boolean {
    const apiKey = config.exchanges.okx.apiKey;
    const apiSecret = config.exchanges.okx.apiSecret;
    const passphrase = config.exchanges.okx.passphrase;
    return !!(apiKey && apiSecret && passphrase);
  }

  async getApiStatus(): Promise<BrokerApiStatus> {
    return {
      hasApiKey: !!config.exchanges.okx.apiKey,
      hasSecretKey: !!config.exchanges.okx.apiSecret,
      testnet: this.isTestnet(),
      name: BrokerType.OKX
    };
  }

  // Market data methods
  async getSymbolPrice(symbol: string): Promise<BrokerTickerPrice | null> {
    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const response = await this.client.getTicker({ instId: formattedSymbol });
      
      if (!response || !response.data || !response.data[0]) {
        return null;
      }

      return {
        symbol: this.standardizeSymbol(formattedSymbol),
        price: response.data[0].last
      };
    } catch (error) {
      console.error(`OKX getSymbolPrice error: ${error}`);
      return null;
    }
  }

  async getAllPrices(): Promise<BrokerTickerPrice[]> {
    try {
      const response = await this.client.getTickers({ instType: 'SPOT' });
      
      if (!response || !response.data) {
        return [];
      }

      return response.data.map((ticker: any) => ({
        symbol: this.standardizeSymbol(ticker.instId),
        price: ticker.last
      }));
    } catch (error) {
      console.error(`OKX getAllPrices error: ${error}`);
      return [];
    }
  }

  async get24hrTicker(symbol: string): Promise<Broker24hrTicker | null> {
    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const response = await this.client.getTicker({ instId: formattedSymbol });
      
      if (!response || !response.data || !response.data[0]) {
        return null;
      }

      const ticker = response.data[0];
      
      // Get 24hr candlestick for additional data
      const candleResponse = await this.client.getCandles({
        instId: formattedSymbol, 
        bar: '1D', 
        limit: 1
      });
      
      const candle = candleResponse.data && candleResponse.data[0] ? candleResponse.data[0] : null;

      return {
        symbol: this.standardizeSymbol(formattedSymbol),
        priceChange: (Number(ticker.last) - Number(ticker.open24h)).toString(),
        priceChangePercent: ((Number(ticker.last) / Number(ticker.open24h) - 1) * 100).toString(),
        weightedAvgPrice: ticker.last, // OKX doesn't provide VWAP directly
        prevClosePrice: ticker.open24h,
        lastPrice: ticker.last,
        lastQty: ticker.lastSz,
        bidPrice: ticker.bidPx,
        bidQty: ticker.bidSz,
        askPrice: ticker.askPx,
        askQty: ticker.askSz,
        openPrice: ticker.open24h,
        highPrice: ticker.high24h,
        lowPrice: ticker.low24h,
        volume: ticker.vol24h,
        quoteVolume: ticker.volCcy24h,
        openTime: Date.now() - 86400000, // Estimate 24h ago
        closeTime: Date.now(),
        firstId: 0, // Not provided by OKX
        lastId: 0, // Not provided by OKX
        count: 0 // Not provided by OKX
      };
    } catch (error) {
      console.error(`OKX get24hrTicker error: ${error}`);
      return null;
    }
  }

  async getExchangeInfo(symbol?: string): Promise<BrokerExchangeInfo> {
    try {
      // Get all instruments for SPOT
      const response = await this.client.getInstruments({ instType: 'SPOT' });
      
      if (!response || !response.data) {
        return { symbols: [] };
      }

      let symbols = response.data.map((instrument: any) => ({
        symbol: this.standardizeSymbol(instrument.instId),
        status: instrument.state === 'live' ? 'TRADING' : 'BREAK',
        baseAsset: instrument.baseCcy,
        quoteAsset: instrument.quoteCcy,
        filters: [] // OKX has different format for filters
      }));
      
      // Filter by symbol if provided
      if (symbol) {
        const standardizedSymbol = this.standardizeSymbol(symbol);
        symbols = symbols.filter((s: BrokerSymbolInfo) => s.symbol === standardizedSymbol);
      }

      return { symbols };
    } catch (error) {
      console.error(`OKX getExchangeInfo error: ${error}`);
      return { symbols: [] };
    }
  }

  async getOrderBook(symbol: string, limit: number = 100): Promise<BrokerOrderBook> {
    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const response = await this.client.getBooks({ 
        instId: formattedSymbol, 
        sz: limit 
      });
      
      if (!response || !response.data || !response.data[0]) {
        return { lastUpdateId: 0, bids: [], asks: [] };
      }
      
      const orderBook = response.data[0];
      
      return {
        lastUpdateId: parseInt(orderBook.ts, 10),
        bids: orderBook.bids.map((bid: any) => [bid[0], bid[1]]), // [price, quantity]
        asks: orderBook.asks.map((ask: any) => [ask[0], ask[1]])  // [price, quantity]
      };
    } catch (error) {
      console.error(`OKX getOrderBook error: ${error}`);
      return { lastUpdateId: 0, bids: [], asks: [] };
    }
  }
  
  async getCandles(symbol: string, interval: string, limit: number = 500): Promise<BrokerCandle[]> {
    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      
      // Map common interval strings to OKX-specific formats
      // OKX uses: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W, 1M, 3M, 6M, 1Y
      const intervalMap: Record<string, string> = {
        '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
        '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6H', '12h': '12H',
        '1d': '1D', '1w': '1W', '1M': '1M'
      };
      
      const okxInterval = intervalMap[interval] || '1D'; // Default to 1D if interval not found
      
      const response = await this.client.getCandles({
        instId: formattedSymbol,
        bar: okxInterval,
        limit
      });
      
      if (!response || !response.data) {
        return [];
      }
      
      // OKX candle format: [timestamp, open, high, low, close, volume, volCcy]
      return response.data.map((candle: any) => ({
        timestamp: candle[0], // Timestamp
        open: parseFloat(candle[1]), // Open
        high: parseFloat(candle[2]), // High
        low: parseFloat(candle[3]), // Low
        close: parseFloat(candle[4]), // Close
        volume: parseFloat(candle[5]) // Volume
      }));
    } catch (error) {
      console.error(`OKX getCandles error: ${error}`);
      return [];
    }
  }

  // Account data methods
  async getAccountBalances(): Promise<BrokerBalance[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await this.client.getBalance();
      
      if (!response || !response.data || !response.data[0] || !response.data[0].details) {
        return [];
      }
      
      return response.data[0].details.map((balance: any) => ({
        asset: balance.ccy,
        free: balance.availBal,
        locked: balance.frozenBal,
        total: balance.cashBal
      }));
    } catch (error) {
      console.error(`OKX getAccountBalances error: ${error}`);
      return [];
    }
  }

  // Order methods
  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET',
    quantity: string,
    price?: string,
    timeInForce?: string
  ): Promise<BrokerOrderResult> {
    if (!this.isConfigured()) {
      throw new Error('OKX API is not configured with valid credentials');
    }

    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const orderSide = side === 'BUY' ? 'buy' : 'sell';
      const orderType = type === 'LIMIT' ? 'limit' : 'market';
      
      const orderParams: any = {
        instId: formattedSymbol,
        tdMode: 'cash',
        side: orderSide,
        ordType: orderType,
        sz: quantity
      };
      
      // Add price for limit orders
      if (type === 'LIMIT' && price) {
        orderParams.px = price;
      }
      
      const response = await this.client.submitOrder(orderParams);
      
      if (!response || !response.data || !response.data[0]) {
        throw new Error('Failed to place order on OKX');
      }
      
      // Get order details
      const orderId = response.data[0].ordId;
      const orderDetails = await this.client.getOrderDetails({
        instId: formattedSymbol,
        ordId: orderId
      });
      
      if (!orderDetails || !orderDetails.data || !orderDetails.data[0]) {
        throw new Error('Failed to get order details from OKX');
      }
      
      const order = orderDetails.data[0];
      
      return {
        symbol: this.standardizeSymbol(formattedSymbol),
        orderId: order.ordId,
        clientOrderId: order.clOrdId,
        transactTime: parseInt(order.cTime, 10),
        price: order.px,
        origQty: order.sz,
        executedQty: order.accFillSz,
        status: this.mapOrderStatus(order.state),
        timeInForce: order.tgtCcy || 'GTC',
        type: order.ordType.toUpperCase(),
        side: order.side.toUpperCase()
      };
    } catch (error) {
      console.error(`OKX placeOrder error: ${error}`);
      throw error;
    }
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('OKX API is not configured with valid credentials');
    }

    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const response = await this.client.cancelOrder({
        instId: formattedSymbol,
        ordId: orderId
      });
      
      if (!response || !response.data || !response.data[0]) {
        return false;
      }
      
      return response.data[0].sCode === '0';
    } catch (error) {
      console.error(`OKX cancelOrder error: ${error}`);
      return false;
    }
  }

  async getOrder(symbol: string, orderId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('OKX API is not configured with valid credentials');
    }

    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const response = await this.client.getOrderDetails({
        instId: formattedSymbol,
        ordId: orderId
      });
      
      if (!response || !response.data || !response.data[0]) {
        return null;
      }
      
      const order = response.data[0];
      
      return {
        symbol: this.standardizeSymbol(formattedSymbol),
        orderId: order.ordId,
        clientOrderId: order.clOrdId,
        price: order.px,
        origQty: order.sz,
        executedQty: order.accFillSz,
        status: this.mapOrderStatus(order.state),
        timeInForce: order.tgtCcy || 'GTC',
        type: order.ordType.toUpperCase(),
        side: order.side.toUpperCase(),
        time: parseInt(order.cTime, 10),
        updateTime: parseInt(order.uTime, 10)
      };
    } catch (error) {
      console.error(`OKX getOrder error: ${error}`);
      return null;
    }
  }

  // WebSocket methods
  subscribeToTicker(symbols: string[], callback: (update: BrokerLivePriceUpdate) => void): () => void {
    // Initialize WebSocket client if not already done
    if (!this.wsClient) {
      this.initializeWebSocket();
    }

    // Store callback for each symbol
    for (const symbol of symbols) {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const callbacks = this.wsCallbacks.get(formattedSymbol) || [];
      callbacks.push(callback);
      this.wsCallbacks.set(formattedSymbol, callbacks);

      // Subscribe to ticker channel
      if (this.isWsConnected) {
        this.wsClient.subscribe([
          {
            channel: 'tickers',
            instId: formattedSymbol
          }
        ]);
      }
    }

    // Return unsubscribe function
    return () => {
      for (const symbol of symbols) {
        const formattedSymbol = this.formatSymbolForExchange(symbol);
        this.wsCallbacks.delete(formattedSymbol);
        
        if (this.isWsConnected) {
          this.wsClient.unsubscribe([
            {
              channel: 'tickers',
              instId: formattedSymbol
            }
          ]);
        }
      }
    };
  }

  // Helper methods
  standardizeSymbol(symbol: string): string {
    // OKX format: BTC-USDT -> standard format: BTCUSDT
    return symbol.replace('-', '');
  }

  formatSymbolForExchange(symbol: string): string {
    // Standard format: BTCUSDT -> OKX format: BTC-USDT
    // Check if it's already in OKX format
    if (symbol.includes('-')) {
      return symbol;
    }
    
    // Find common quote assets and split the symbol
    const quoteAssets = ['USDT', 'USD', 'BTC', 'ETH', 'OKB'];
    
    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        const base = symbol.substring(0, symbol.length - quote.length);
        return `${base}-${quote}`;
      }
    }
    
    // Default fallback - try to split in the middle
    const mid = Math.floor(symbol.length / 2);
    return `${symbol.substring(0, mid)}-${symbol.substring(mid)}`;
  }

  private mapOrderStatus(okxStatus: string): string {
    // Map OKX order statuses to standardized format
    const statusMap: Record<string, string> = {
      'live': 'NEW',
      'partially_filled': 'PARTIALLY_FILLED',
      'filled': 'FILLED',
      'canceled': 'CANCELED',
      'canceling': 'CANCELING'
    };
    
    return statusMap[okxStatus] || okxStatus.toUpperCase();
  }

  private initializeWebSocket(): void {
    const apiKey = config.exchanges.okx.apiKey;
    const apiSecret = config.exchanges.okx.apiSecret;
    const passphrase = config.exchanges.okx.passphrase;
    
    // Initialize WebSocket client with all options at once
    const options: any = {
      sandbox: this.isTestnet()
    };
    
    try {
      // Add credentials if available
      if (apiKey && apiSecret && passphrase) {
        options.apiKey = apiKey;
        options.apiSecret = apiSecret;
        options.apiPassphrase = passphrase;
      }
      
      // Add proxy support if enabled (for WebSocket connections)
      if (config.proxy.enabled && config.proxy.ip && config.proxy.port) {
        console.log(`Using proxy connection for OKX WebSocket via ${config.proxy.ip}:${config.proxy.port}`);
        options.proxy = {
          host: config.proxy.ip,
          port: config.proxy.port
        };
        
        // Add auth if provided
        if (config.proxy.username && config.proxy.password) {
          options.proxy.auth = {
            username: config.proxy.username,
            password: config.proxy.password
          };
        }
      }
      
      // Create WebSocket client regardless of credentials
      // The OKX SDK will determine what operations are allowed based on credentials
      this.wsClient = new okx.WebsocketClient(options);
      
      if (apiKey && apiSecret && passphrase) {
        console.log('OKX WebSocket initialized with full API access');
      } else {
        console.log('OKX WebSocket initialized in public-only mode (no API credentials found)');
      }
    } catch (error) {
      console.error('Failed to initialize OKX WebSocket client:', error);
      // Create a mock WebSocket client that does nothing if real one fails
      this.wsClient = {
        on: () => {},
        subscribe: () => {},
        unsubscribe: () => {}
      };
    }

    this.wsClient.on('open', () => {
      console.log('OKX WebSocket connected');
      this.isWsConnected = true;
      
      // Subscribe to all stored symbols
      const subscriptions = Array.from(this.wsCallbacks.keys()).map(symbol => ({
        channel: 'tickers',
        instId: symbol
      }));
      
      if (subscriptions.length > 0) {
        this.wsClient.subscribe(subscriptions);
      }
    });

    this.wsClient.on('message', (data: any) => {
      try {
        // Handle ticker updates
        if (data?.data && data?.arg?.channel === 'tickers' && data.data.length > 0) {
          const ticker = data.data[0];
          const symbol = data.arg.instId;
          const standardSymbol = this.standardizeSymbol(symbol);
          
          const update: BrokerLivePriceUpdate = {
            symbol: standardSymbol,
            price: ticker.last,
            timestamp: parseInt(ticker.ts, 10)
          };
          
          // Notify all callbacks for this symbol
          const callbacks = this.wsCallbacks.get(symbol) || [];
          for (const callback of callbacks) {
            callback(update);
          }
        }
      } catch (error) {
        console.error('Error processing OKX WebSocket message:', error);
      }
    });

    this.wsClient.on('error', (error: any) => {
      console.error('OKX WebSocket error:', error);
    });
    
    this.wsClient.on('close', () => {
      console.log('OKX WebSocket disconnected');
      this.isWsConnected = false;
      
      // Attempt to reconnect after delay
      setTimeout(() => {
        if (!this.isWsConnected) {
          this.initializeWebSocket();
        }
      }, 5000);
    });
  }
}