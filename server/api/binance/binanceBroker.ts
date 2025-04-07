/**
 * Binance Broker Implementation
 * 
 * This file implements the IBroker interface for Binance exchange
 * using the binance-api-node SDK.
 */

import Binance from 'binance-api-node';
import { BrokerType, IBroker, BrokerTickerPrice, Broker24hrTicker, 
  BrokerBalance, BrokerExchangeInfo, BrokerSymbolInfo, 
  BrokerOrderResult, BrokerOrderBook, BrokerLivePriceUpdate,
  BrokerApiStatus } from '../brokers/interfaces';
import dotenv from 'dotenv';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { URL } from 'url';

// Load environment variables
dotenv.config();

/**
 * Creates a proxy agent based on environment settings
 */
function createProxyAgent() {
  const useProxy = process.env.USE_PROXY === 'true';
  
  if (!useProxy) {
    return undefined;
  }
  
  const proxyProtocol = process.env.PROXY_PROTOCOL || 'http';
  const proxyUsername = process.env.PROXY_USERNAME || '';
  const proxyPassword = process.env.PROXY_PASSWORD || '';
  const proxyIp = process.env.PROXY_IP || '';
  const proxyPort = process.env.PROXY_PORT || '';
  const encodingMethod = process.env.PROXY_ENCODING_METHOD || 'quote_plus';
  
  if (!proxyIp || !proxyPort) {
    console.warn('Proxy IP or Port not configured. Using direct connection.');
    return undefined;
  }
  
  try {
    let authPart = '';
    
    if (proxyUsername && proxyPassword) {
      let encodedUsername = proxyUsername;
      let encodedPassword = proxyPassword;
      
      // Apply encoding based on method
      if (encodingMethod === 'quote') {
        encodedUsername = encodeURIComponent(proxyUsername);
        encodedPassword = encodeURIComponent(proxyPassword);
      } else if (encodingMethod === 'quote_plus') {
        encodedUsername = new URL(`http://${proxyUsername}`).searchParams.toString().replace('=', '');
        encodedPassword = new URL(`http://${proxyPassword}`).searchParams.toString().replace('=', '');
      }
      
      authPart = `${encodedUsername}:${encodedPassword}@`;
    }
    
    const proxyUrl = `${proxyProtocol}://${authPart}${proxyIp}:${proxyPort}`;
    
    if (proxyProtocol === 'socks4' || proxyProtocol === 'socks5') {
      return new SocksProxyAgent(proxyUrl);
    } else {
      return new HttpsProxyAgent(proxyUrl);
    }
  } catch (error) {
    console.error('Failed to create proxy agent:', error);
    return undefined;
  }
}

export class BinanceBroker implements IBroker {
  private client: any;
  private wsClient: any;
  private wsCallbacks: Map<string, ((update: BrokerLivePriceUpdate) => void)[]>;
  private testnet: boolean;
  private proxyAgent: any;
  
  constructor(testnet: boolean = false) {
    // Initialize client with proxy if enabled
    this.testnet = testnet;
    this.proxyAgent = createProxyAgent();
    this.wsCallbacks = new Map();
    
    // Create the Binance client with appropriate config
    this.initializeClient();
  }
  
  private initializeClient() {
    const apiKey = process.env.BINANCE_API_KEY || '';
    const apiSecret = process.env.BINANCE_SECRET_KEY || '';
    
    // Configure client options
    const options: any = {
      apiKey,
      apiSecret,
      httpBase: this.testnet ? 'https://testnet.binance.vision' : undefined,
      wsBase: this.testnet ? 'wss://testnet.binance.vision/ws' : undefined,
      httpOptions: this.proxyAgent ? { agent: this.proxyAgent } : undefined
    };
    
    // Create Binance client
    this.client = Binance(options);
  }
  
  // Broker information methods
  getName(): BrokerType {
    return BrokerType.BINANCE;
  }
  
  isTestnet(): boolean {
    return this.testnet;
  }
  
  isConfigured(): boolean {
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_SECRET_KEY;
    return !!(apiKey && apiSecret);
  }
  
  async getApiStatus(): Promise<BrokerApiStatus> {
    return {
      hasApiKey: !!process.env.BINANCE_API_KEY,
      hasSecretKey: !!process.env.BINANCE_SECRET_KEY,
      testnet: this.testnet,
      name: BrokerType.BINANCE
    };
  }
  
  // Market data methods
  async getSymbolPrice(symbol: string): Promise<BrokerTickerPrice | null> {
    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const ticker = await this.client.prices({ symbol: formattedSymbol });
      
      return {
        symbol: this.standardizeSymbol(formattedSymbol),
        price: String(ticker[formattedSymbol] as any)
      };
    } catch (error) {
      console.error(`Binance getSymbolPrice error: ${error}`);
      return null;
    }
  }
  
  async getAllPrices(): Promise<BrokerTickerPrice[]> {
    try {
      const tickers = await this.client.prices();
      
      return Object.entries(tickers).map(([symbol, price]) => ({
        symbol: this.standardizeSymbol(symbol),
        price: String(price as any)
      }));
    } catch (error) {
      console.error(`Binance getAllPrices error: ${error}`);
      return [];
    }
  }
  
  async get24hrTicker(symbol: string): Promise<Broker24hrTicker | null> {
    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const ticker = await this.client.dailyStats({ symbol: formattedSymbol });
      
      return {
        symbol: this.standardizeSymbol(formattedSymbol),
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent,
        weightedAvgPrice: ticker.weightedAvgPrice,
        prevClosePrice: ticker.prevClosePrice,
        lastPrice: ticker.lastPrice,
        lastQty: ticker.lastQty,
        bidPrice: ticker.bidPrice,
        bidQty: ticker.bidQty,
        askPrice: ticker.askPrice,
        askQty: ticker.askQty,
        openPrice: ticker.openPrice,
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume,
        openTime: ticker.openTime,
        closeTime: ticker.closeTime,
        firstId: ticker.firstId,
        lastId: ticker.lastId,
        count: ticker.count
      };
    } catch (error) {
      console.error(`Binance get24hrTicker error: ${error}`);
      return null;
    }
  }
  
  async getExchangeInfo(symbol?: string): Promise<BrokerExchangeInfo> {
    try {
      const options: any = {};
      
      if (symbol) {
        options.symbol = this.formatSymbolForExchange(symbol);
      }
      
      const info = await this.client.exchangeInfo(options);
      
      const symbols: BrokerSymbolInfo[] = info.symbols.map((s: any) => ({
        symbol: this.standardizeSymbol(s.symbol),
        status: s.status,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        filters: s.filters
      }));
      
      return { symbols };
    } catch (error) {
      console.error(`Binance getExchangeInfo error: ${error}`);
      return { symbols: [] };
    }
  }
  
  async getOrderBook(symbol: string, limit: number = 100): Promise<BrokerOrderBook> {
    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      const book = await this.client.book({ symbol: formattedSymbol, limit });
      
      return {
        lastUpdateId: book.lastUpdateId,
        bids: book.bids,
        asks: book.asks
      };
    } catch (error) {
      console.error(`Binance getOrderBook error: ${error}`);
      return { lastUpdateId: 0, bids: [], asks: [] };
    }
  }
  
  // Account data methods
  async getAccountBalances(): Promise<BrokerBalance[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const account = await this.client.accountInfo();
      
      return account.balances.map((b: any) => ({
        asset: b.asset,
        free: b.free,
        locked: b.locked
      }));
    } catch (error) {
      console.error(`Binance getAccountBalances error: ${error}`);
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
      throw new Error('Binance API is not configured with valid credentials');
    }

    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      
      const orderOptions: any = {
        symbol: formattedSymbol,
        side,
        type,
        quantity
      };
      
      // Add price for limit orders
      if (type === 'LIMIT' && price) {
        orderOptions.price = price;
        orderOptions.timeInForce = timeInForce || 'GTC';
      }
      
      const order = await this.client.order(orderOptions);
      
      return {
        symbol: this.standardizeSymbol(order.symbol),
        orderId: order.orderId.toString(),
        clientOrderId: order.clientOrderId,
        transactTime: order.transactTime,
        price: order.price,
        origQty: order.origQty,
        executedQty: order.executedQty,
        status: order.status,
        timeInForce: order.timeInForce,
        type: order.type,
        side: order.side
      };
    } catch (error) {
      console.error(`Binance placeOrder error: ${error}`);
      throw error;
    }
  }
  
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Binance API is not configured with valid credentials');
    }

    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      
      await this.client.cancelOrder({
        symbol: formattedSymbol,
        orderId: parseInt(orderId, 10)
      });
      
      return true;
    } catch (error) {
      console.error(`Binance cancelOrder error: ${error}`);
      return false;
    }
  }
  
  async getOrder(symbol: string, orderId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Binance API is not configured with valid credentials');
    }

    try {
      const formattedSymbol = this.formatSymbolForExchange(symbol);
      
      const order = await this.client.getOrder({
        symbol: formattedSymbol,
        orderId: parseInt(orderId, 10)
      });
      
      return {
        symbol: this.standardizeSymbol(order.symbol),
        orderId: order.orderId.toString(),
        clientOrderId: order.clientOrderId,
        price: order.price,
        origQty: order.origQty,
        executedQty: order.executedQty,
        status: order.status,
        timeInForce: order.timeInForce,
        type: order.type,
        side: order.side,
        stopPrice: order.stopPrice,
        icebergQty: order.icebergQty,
        time: order.time,
        updateTime: order.updateTime,
        isWorking: order.isWorking
      };
    } catch (error) {
      console.error(`Binance getOrder error: ${error}`);
      return null;
    }
  }
  
  // WebSocket methods
  subscribeToTicker(symbols: string[], callback: (update: BrokerLivePriceUpdate) => void): () => void {
    // Store callbacks for each symbol
    for (const symbol of symbols) {
      const formattedSymbol = this.formatSymbolForExchange(symbol).toLowerCase();
      const callbacks = this.wsCallbacks.get(formattedSymbol) || [];
      callbacks.push(callback);
      this.wsCallbacks.set(formattedSymbol, callbacks);
    }
    
    // Create a clean symbol list for subscription
    const formattedSymbols = symbols.map(s => 
      this.formatSymbolForExchange(s).toLowerCase()
    );
    
    // Create WebSocket connection
    const clean = this.client.ws.ticker(formattedSymbols, (ticker: any) => {
      const symbol = this.standardizeSymbol(ticker.symbol);
      
      const update: BrokerLivePriceUpdate = {
        symbol,
        price: ticker.curDayClose,
        timestamp: Date.now()
      };
      
      // Notify all callbacks for this symbol
      const callbacks = this.wsCallbacks.get(ticker.symbol.toLowerCase()) || [];
      for (const cb of callbacks) {
        cb(update);
      }
    });
    
    // Return cleanup function
    return () => {
      clean();
      
      // Clear stored callbacks
      for (const symbol of symbols) {
        const formattedSymbol = this.formatSymbolForExchange(symbol).toLowerCase();
        this.wsCallbacks.delete(formattedSymbol);
      }
    };
  }
  
  // Symbol format conversion helpers
  standardizeSymbol(symbol: string): string {
    // Binance format is already our standard format (BTCUSDT)
    return symbol;
  }
  
  formatSymbolForExchange(symbol: string): string {
    // Our standard format is already Binance format (BTCUSDT)
    return symbol;
  }
}