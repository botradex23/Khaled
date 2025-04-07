/**
 * Binance Broker Implementation
 * 
 * This file implements the IBroker interface for Binance exchange
 * using the binance-api-node SDK.
 */

// Import the Binance API client properly
import * as BinanceLib from 'binance-api-node';
import { BrokerType, IBroker, BrokerTickerPrice, Broker24hrTicker, 
  BrokerBalance, BrokerExchangeInfo, BrokerSymbolInfo, 
  BrokerOrderResult, BrokerOrderBook, BrokerLivePriceUpdate,
  BrokerApiStatus, BrokerCandle } from '../brokers/interfaces';
import dotenv from 'dotenv';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { URL } from 'url';

// Load environment variables
dotenv.config();

/**
 * Binance Broker class that implements the IBroker interface
 */
export class BinanceBroker implements IBroker {
  private client: any;
  private testnetMode: boolean;
  
  constructor(testnetMode: boolean = false) {
    this.testnetMode = testnetMode;
    this.initializeClient();
  }
  
  /**
   * Check if this broker is running in testnet mode
   */
  isTestnet(): boolean {
    return this.testnetMode;
  }
  
  /**
   * Check if this broker is configured with API keys
   */
  isConfigured(): boolean {
    return !!process.env.BINANCE_API_KEY && !!process.env.BINANCE_API_SECRET;
  }
  
  /**
   * Initialize the Binance API client with proper configuration
   */
  private initializeClient(): void {
    // Check if proxy is needed
    const useProxy = process.env.USE_PROXY === 'true';
    const options: any = {
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      // Use testnet if specified
      httpBase: this.isTestnet() ? 'https://testnet.binance.vision' : undefined
    };
    
    // Configure proxy if needed
    if (useProxy) {
      const proxyUsername = process.env.PROXY_USERNAME;
      const proxyPassword = process.env.PROXY_PASSWORD;
      const proxyIP = process.env.PROXY_IP;
      const proxyPort = process.env.PROXY_PORT;
      
      // Construct proxy URL
      const proxyAuth = proxyUsername && proxyPassword 
        ? `${encodeURIComponent(proxyUsername)}:${encodeURIComponent(proxyPassword)}@` 
        : '';
      const proxyUrl = `http://${proxyAuth}${proxyIP}:${proxyPort}`;
      
      // Create proxy agent
      options.httpAgent = new HttpsProxyAgent(proxyUrl);
      options.wsAgent = new HttpsProxyAgent(proxyUrl);
      
      console.log('Binance broker initialized with HTTP proxy');
    } else {
      console.log('Binance broker initialized without proxy');
    }
    
    // Create the client - in ESM modules with this particular package, 
    // the client factory is under default.default
    const createBinanceClient = BinanceLib.default.default;
    if (typeof createBinanceClient !== 'function') {
      throw new Error('Failed to get Binance client factory function');
    }
    this.client = createBinanceClient(options);
  }
  
  /**
   * Get the broker type (implements IBroker interface)
   */
  getName(): BrokerType {
    return BrokerType.BINANCE;
  }
  
  /**
   * Check if the broker API is accessible
   */
  async getApiStatus(): Promise<BrokerApiStatus> {
    try {
      // Try to get a simple API endpoint to check connectivity
      if (this.isConfigured()) {
        await this.client.time();
      }
      
      return { 
        hasApiKey: !!process.env.BINANCE_API_KEY,
        hasSecretKey: !!process.env.BINANCE_API_SECRET,
        testnet: this.isTestnet(),
        name: BrokerType.BINANCE,
        active: true
      };
    } catch (error: any) {
      return {
        hasApiKey: !!process.env.BINANCE_API_KEY,
        hasSecretKey: !!process.env.BINANCE_API_SECRET,
        testnet: this.isTestnet(),
        name: BrokerType.BINANCE,
        active: false
      };
    }
  }
  
  /**
   * Get symbol price (implements IBroker interface)
   */
  async getSymbolPrice(symbol: string): Promise<BrokerTickerPrice | null> {
    try {
      const price = await this.client.prices({ symbol });
      if (!price || !price[symbol]) {
        return null;
      }
      return {
        symbol,
        price: price[symbol]
      };
    } catch (error: any) {
      console.error(`Error fetching symbol price for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Get all prices (implements IBroker interface)
   */
  async getAllPrices(): Promise<BrokerTickerPrice[]> {
    try {
      const allPrices = await this.client.prices();
      return Object.entries(allPrices).map(([symbol, price]) => ({
        symbol,
        price: price as string
      }));
    } catch (error: any) {
      console.error('Error fetching all prices:', error);
      return [];
    }
  }
  
  /**
   * Get 24hr ticker (implements IBroker interface)
   */
  async get24hrTicker(symbol: string): Promise<Broker24hrTicker | null> {
    try {
      const ticker = await this.client.dailyStats({ symbol });
      if (!ticker) {
        return null;
      }
      return this.formatTickerData(ticker);
    } catch (error: any) {
      console.error(`Error fetching 24hr ticker for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Legacy methods for backwards compatibility
   */
  async getTickerPrices(symbol?: string): Promise<BrokerTickerPrice[]> {
    try {
      if (symbol) {
        const price = await this.getSymbolPrice(symbol);
        return price ? [price] : [];
      } else {
        return await this.getAllPrices();
      }
    } catch (error: any) {
      console.error('Error fetching ticker prices:', error);
      return [];
    }
  }
  
  /**
   * Legacy method for backwards compatibility
   */
  async get24hrTickers(symbol?: string): Promise<Broker24hrTicker[]> {
    try {
      if (symbol) {
        const ticker = await this.get24hrTicker(symbol);
        return ticker ? [ticker] : [];
      } else {
        const allTickers = await this.client.dailyStats();
        return allTickers.map((ticker: any) => this.formatTickerData(ticker));
      }
    } catch (error: any) {
      console.error('Error fetching 24hr tickers:', error);
      return [];
    }
  }
  
  /**
   * Get account balances
   */
  async getAccountBalances(): Promise<BrokerBalance[]> {
    try {
      const accountInfo = await this.client.accountInfo();
      return accountInfo.balances
        .filter((balance: any) => 
          parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .map((balance: any) => ({
          asset: balance.asset,
          free: balance.free,
          locked: balance.locked,
          total: (parseFloat(balance.free) + parseFloat(balance.locked)).toString()
        }));
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      return [];
    }
  }
  
  /**
   * Legacy method for backwards compatibility
   */
  async getBalances(): Promise<BrokerBalance[]> {
    return this.getAccountBalances();
  }
  
  /**
   * Get exchange information
   */
  async getExchangeInfo(): Promise<BrokerExchangeInfo> {
    try {
      const info = await this.client.exchangeInfo();
      return {
        timezone: info.timezone,
        serverTime: info.serverTime,
        symbols: info.symbols.map((symbol: any) => ({
          symbol: symbol.symbol,
          status: symbol.status,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          baseAssetPrecision: symbol.baseAssetPrecision,
          quoteAssetPrecision: symbol.quoteAssetPrecision
        }))
      };
    } catch (error: any) {
      console.error('Error fetching exchange info:', error);
      throw error;
    }
  }
  
  /**
   * Get candle data for a symbol
   */
  async getCandles(symbol: string, interval: string, limit: number = 100): Promise<BrokerCandle[]> {
    try {
      const candles = await this.client.candles({
        symbol,
        interval,
        limit
      });
      
      return candles.map((candle: any) => ({
        openTime: candle.openTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        closeTime: candle.closeTime
      }));
    } catch (error: any) {
      console.error(`Error fetching candles for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<BrokerOrderBook> {
    try {
      const orderBook = await this.client.book({ symbol, limit });
      return {
        lastUpdateId: orderBook.lastUpdateId,
        bids: orderBook.bids.map((bid: any) => ({
          price: bid.price,
          quantity: bid.quantity
        })),
        asks: orderBook.asks.map((ask: any) => ({
          price: ask.price,
          quantity: ask.quantity
        }))
      };
    } catch (error: any) {
      console.error('Error fetching order book:', error);
      return {
        lastUpdateId: 0,
        bids: [],
        asks: []
      };
    }
  }
  
  /**
   * Place an order
   */
  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET',
    quantity: string,
    price?: string,
    timeInForce?: string
  ): Promise<BrokerOrderResult> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Binance API keys not configured');
      }
      
      const options: any = {
        symbol,
        side,
        type,
        quantity
      };
      
      if (type === 'LIMIT') {
        if (!price) {
          throw new Error('Price is required for LIMIT orders');
        }
        options.price = price;
        options.timeInForce = timeInForce || 'GTC';
      }
      
      const order = await this.client.order(options);
      
      return {
        orderId: order.orderId.toString(),
        symbol: order.symbol,
        status: order.status,
        price: order.price,
        quantity: order.origQty,
        side: order.side,
        type: order.type,
        transactionTime: order.transactTime
      };
    } catch (error: any) {
      console.error('Error placing order:', error);
      throw error;
    }
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Binance API keys not configured');
      }
      
      await this.client.cancelOrder({
        symbol,
        orderId
      });
      
      return true;
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      return false;
    }
  }
  
  /**
   * Get order details
   */
  async getOrder(symbol: string, orderId: string): Promise<any> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Binance API keys not configured');
      }
      
      return await this.client.getOrder({
        symbol,
        orderId
      });
    } catch (error: any) {
      console.error('Error getting order:', error);
      throw error;
    }
  }
  
  /**
   * Subscribe to ticker updates
   */
  subscribeToTicker(symbols: string[], callback: (update: BrokerLivePriceUpdate) => void): () => void {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      console.error('No symbols provided for ticker subscription');
      return () => {}; // Return empty unsubscribe function
    }
    
    try {
      // Create a clean WebSocket instance for each subscription
      const cleanSymbols = symbols.map(s => s.toLowerCase());
      
      // Create a single websocket for all symbols
      const streams = cleanSymbols.map(s => `${s}@ticker`).join('/');
      const endpoint = `/stream?streams=${streams}`;
      
      const ws = this.client.ws.ticker(symbols, ticker => {
        const update: BrokerLivePriceUpdate = {
          symbol: ticker.symbol,
          price: ticker.curDayClose,
          time: Date.now(),
          volume: ticker.volume,
          source: BrokerType.BINANCE
        };
        
        callback(update);
      });
      
      // Return the unsubscribe function
      return () => {
        try {
          if (ws && typeof ws === 'function') {
            ws();
            console.log(`Unsubscribed from Binance ticker for symbols: ${symbols.join(', ')}`);
          }
        } catch (error) {
          console.error('Error unsubscribing from Binance ticker:', error);
        }
      };
    } catch (error) {
      console.error('Error subscribing to Binance ticker:', error);
      return () => {}; // Return empty unsubscribe function on error
    }
  }
  
  /**
   * Standardize symbol format
   */
  standardizeSymbol(symbol: string): string {
    // Binance symbols are already in the format we want (e.g., BTCUSDT)
    return symbol;
  }
  
  /**
   * Format symbol for exchange
   */
  formatSymbolForExchange(symbol: string): string {
    // No formatting needed for Binance
    return symbol;
  }
  
  /**
   * Helper method to format ticker data
   */
  private formatTickerData(ticker: any): Broker24hrTicker {
    return {
      symbol: ticker.symbol,
      priceChange: ticker.priceChange.toString(),
      priceChangePercent: ticker.priceChangePercent.toString(),
      weightedAvgPrice: ticker.weightedAvgPrice.toString(),
      prevClosePrice: ticker.prevClosePrice.toString(),
      lastPrice: ticker.lastPrice.toString(),
      lastQty: ticker.lastQty.toString(),
      bidPrice: ticker.bidPrice.toString(),
      askPrice: ticker.askPrice.toString(),
      openPrice: ticker.openPrice.toString(),
      highPrice: ticker.highPrice.toString(),
      lowPrice: ticker.lowPrice.toString(),
      volume: ticker.volume.toString(),
      quoteVolume: ticker.quoteVolume.toString(),
      openTime: ticker.openTime,
      closeTime: ticker.closeTime,
      count: ticker.count
    };
  }
}