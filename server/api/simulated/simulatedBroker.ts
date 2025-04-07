/**
 * Simulated Broker Implementation
 * 
 * This file implements a simulated broker that can be used when real exchanges
 * are unavailable or for testing purposes.
 */

import { BrokerType, IBroker, BrokerTickerPrice, Broker24hrTicker, 
  BrokerBalance, BrokerExchangeInfo, BrokerSymbolInfo, 
  BrokerOrderResult, BrokerOrderBook, BrokerLivePriceUpdate,
  BrokerApiStatus } from '../brokers/interfaces';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Load initial market data from a JSON file or use default data
 */
function loadInitialMarketData(): Record<string, any> {
  try {
    // Try to load data from the markets-data-current.json file
    const dataPath = path.resolve(process.cwd(), 'markets-data-current.json');
    
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return data;
    }
  } catch (error) {
    console.warn('Error loading market data, using default data:', error);
  }
  
  // Default data for common trading pairs
  return {
    'BTCUSDT': { price: '50000.00', priceChange: '1500.00', volume: '10000.00' },
    'ETHUSDT': { price: '3000.00', priceChange: '100.00', volume: '20000.00' },
    'BNBUSDT': { price: '450.00', priceChange: '15.00', volume: '5000.00' },
    'XRPUSDT': { price: '0.75', priceChange: '0.05', volume: '30000.00' },
    'ADAUSDT': { price: '1.20', priceChange: '0.08', volume: '15000.00' },
    'DOGEUSDT': { price: '0.15', priceChange: '0.02', volume: '40000.00' },
    'SOLUSDT': { price: '150.00', priceChange: '10.00', volume: '8000.00' },
    'DOTUSDT': { price: '35.00', priceChange: '2.50', volume: '7000.00' },
    'AVAXUSDT': { price: '80.00', priceChange: '5.00', volume: '6000.00' },
    'UNIUSDT': { price: '25.00', priceChange: '1.20', volume: '9000.00' }
  };
}

export class SimulatedBroker implements IBroker {
  private marketData: Record<string, any>;
  private orders: Map<string, any>;
  private balances: Record<string, BrokerBalance>;
  private wsCallbacks: Map<string, ((update: BrokerLivePriceUpdate) => void)[]>;
  private wsIntervals: Map<string, NodeJS.Timeout>;
  private lastUpdateId: number;
  
  constructor() {
    // Initialize market data
    this.marketData = loadInitialMarketData();
    
    // Initialize orders storage
    this.orders = new Map();
    
    // Initialize balances with some default values
    this.balances = {
      'USDT': { asset: 'USDT', free: '10000.00', locked: '0.00' },
      'BTC': { asset: 'BTC', free: '0.5', locked: '0.00' },
      'ETH': { asset: 'ETH', free: '5.0', locked: '0.00' },
      'BNB': { asset: 'BNB', free: '10.0', locked: '0.00' }
    };
    
    // Initialize WebSocket state
    this.wsCallbacks = new Map();
    this.wsIntervals = new Map();
    
    // Initialize order book ID
    this.lastUpdateId = Date.now();
    
    // Start price simulation
    this.startPriceSimulation();
  }
  
  // Start simulating price movements
  private startPriceSimulation() {
    setInterval(() => {
      Object.keys(this.marketData).forEach(symbol => {
        const data = this.marketData[symbol];
        
        // Simulate random price movement (0.1% to 0.5% change)
        const changePercent = (Math.random() * 0.4 + 0.1) * (Math.random() > 0.5 ? 1 : -1);
        const currentPrice = parseFloat(data.price);
        const newPrice = currentPrice * (1 + changePercent / 100);
        
        // Update price and price change
        data.price = newPrice.toFixed(2);
        data.priceChange = (newPrice - currentPrice).toFixed(2);
        
        // Call WebSocket callbacks if any
        const callbacks = this.wsCallbacks.get(symbol) || [];
        if (callbacks.length > 0) {
          const update: BrokerLivePriceUpdate = {
            symbol,
            price: data.price,
            timestamp: Date.now()
          };
          
          callbacks.forEach(callback => callback(update));
        }
      });
    }, 10000); // Update every 10 seconds
  }
  
  // Broker information methods
  getName(): BrokerType {
    return BrokerType.SIMULATED;
  }
  
  isTestnet(): boolean {
    return true; // Simulated broker is always in "testnet" mode
  }
  
  isConfigured(): boolean {
    return true; // Simulated broker is always configured
  }
  
  async getApiStatus(): Promise<BrokerApiStatus> {
    return {
      hasApiKey: true,
      hasSecretKey: true,
      testnet: true,
      name: BrokerType.SIMULATED
    };
  }
  
  // Market data methods
  async getSymbolPrice(symbol: string): Promise<BrokerTickerPrice | null> {
    const data = this.marketData[symbol];
    
    if (!data) {
      return null;
    }
    
    return {
      symbol,
      price: data.price
    };
  }
  
  async getAllPrices(): Promise<BrokerTickerPrice[]> {
    return Object.entries(this.marketData).map(([symbol, data]) => ({
      symbol,
      price: data.price
    }));
  }
  
  async get24hrTicker(symbol: string): Promise<Broker24hrTicker | null> {
    const data = this.marketData[symbol];
    
    if (!data) {
      return null;
    }
    
    const currentPrice = parseFloat(data.price);
    const priceChange = parseFloat(data.priceChange);
    const prevPrice = currentPrice - priceChange;
    const priceChangePercent = (priceChange / prevPrice * 100).toFixed(2);
    
    return {
      symbol,
      priceChange: data.priceChange,
      priceChangePercent,
      weightedAvgPrice: (currentPrice * 0.99).toFixed(2),
      prevClosePrice: prevPrice.toFixed(2),
      lastPrice: data.price,
      lastQty: (Math.random() * 5).toFixed(4),
      bidPrice: (currentPrice * 0.999).toFixed(2),
      bidQty: (Math.random() * 10).toFixed(4),
      askPrice: (currentPrice * 1.001).toFixed(2),
      askQty: (Math.random() * 10).toFixed(4),
      openPrice: prevPrice.toFixed(2),
      highPrice: (currentPrice * 1.02).toFixed(2),
      lowPrice: (currentPrice * 0.98).toFixed(2),
      volume: data.volume,
      quoteVolume: (parseFloat(data.volume) * currentPrice).toFixed(2),
      openTime: Date.now() - 86400000,
      closeTime: Date.now(),
      firstId: 1,
      lastId: 1000,
      count: 1000
    };
  }
  
  async getExchangeInfo(symbol?: string): Promise<BrokerExchangeInfo> {
    const symbols = Object.keys(this.marketData);
    
    // Filter by symbol if provided
    const filteredSymbols = symbol ? symbols.filter(s => s === symbol) : symbols;
    
    const symbolsInfo: BrokerSymbolInfo[] = filteredSymbols.map(s => {
      const parts = this.splitSymbol(s);
      
      return {
        symbol: s,
        status: 'TRADING',
        baseAsset: parts.base,
        quoteAsset: parts.quote,
        filters: []
      };
    });
    
    return { symbols: symbolsInfo };
  }
  
  async getOrderBook(symbol: string, limit: number = 100): Promise<BrokerOrderBook> {
    const data = this.marketData[symbol];
    
    if (!data) {
      return { lastUpdateId: this.lastUpdateId, bids: [], asks: [] };
    }
    
    const currentPrice = parseFloat(data.price);
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    
    // Generate simulated order book
    for (let i = 0; i < limit; i++) {
      // Bids decrease in price
      const bidPrice = (currentPrice * (1 - 0.0001 * i)).toFixed(2);
      const bidQty = (Math.random() * 10).toFixed(4);
      bids.push([bidPrice, bidQty]);
      
      // Asks increase in price
      const askPrice = (currentPrice * (1 + 0.0001 * i)).toFixed(2);
      const askQty = (Math.random() * 10).toFixed(4);
      asks.push([askPrice, askQty]);
    }
    
    this.lastUpdateId++;
    
    return {
      lastUpdateId: this.lastUpdateId,
      bids,
      asks
    };
  }
  
  // Account data methods
  async getAccountBalances(): Promise<BrokerBalance[]> {
    return Object.values(this.balances);
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
    // Check if symbol exists
    if (!this.marketData[symbol]) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    
    // Get the parts of the symbol
    const parts = this.splitSymbol(symbol);
    const baseAsset = parts.base;
    const quoteAsset = parts.quote;
    
    // Check if we have enough balance
    const qty = parseFloat(quantity);
    
    if (side === 'BUY') {
      const quoteBalance = parseFloat(this.balances[quoteAsset]?.free || '0');
      const orderPrice = price ? parseFloat(price) : parseFloat(this.marketData[symbol].price);
      const totalCost = qty * orderPrice;
      
      if (quoteBalance < totalCost) {
        throw new Error(`Insufficient ${quoteAsset} balance`);
      }
      
      // Update balances
      this.balances[quoteAsset].free = (quoteBalance - totalCost).toFixed(8);
      
      // Add to base asset
      if (!this.balances[baseAsset]) {
        this.balances[baseAsset] = { asset: baseAsset, free: '0', locked: '0' };
      }
      
      const baseBalance = parseFloat(this.balances[baseAsset].free);
      this.balances[baseAsset].free = (baseBalance + qty).toFixed(8);
    } else {
      // SELL order
      const baseBalance = parseFloat(this.balances[baseAsset]?.free || '0');
      
      if (baseBalance < qty) {
        throw new Error(`Insufficient ${baseAsset} balance`);
      }
      
      // Update balances
      this.balances[baseAsset].free = (baseBalance - qty).toFixed(8);
      
      // Add to quote asset
      if (!this.balances[quoteAsset]) {
        this.balances[quoteAsset] = { asset: quoteAsset, free: '0', locked: '0' };
      }
      
      const orderPrice = price ? parseFloat(price) : parseFloat(this.marketData[symbol].price);
      const totalValue = qty * orderPrice;
      
      const quoteBalance = parseFloat(this.balances[quoteAsset].free);
      this.balances[quoteAsset].free = (quoteBalance + totalValue).toFixed(8);
    }
    
    // Create order ID
    const orderId = crypto.randomBytes(8).toString('hex');
    const clientOrderId = 'sim_' + crypto.randomBytes(8).toString('hex');
    const transactTime = Date.now();
    
    // Create order result
    const orderResult: BrokerOrderResult = {
      symbol,
      orderId,
      clientOrderId,
      transactTime,
      price: price || this.marketData[symbol].price,
      origQty: quantity,
      executedQty: quantity, // Simulated orders are immediately filled
      status: 'FILLED',
      timeInForce: timeInForce || 'GTC',
      type,
      side
    };
    
    // Store order
    this.orders.set(orderId, orderResult);
    
    return orderResult;
  }
  
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    // Since simulated orders are filled immediately, cancellation always fails
    return false;
  }
  
  async getOrder(symbol: string, orderId: string): Promise<any> {
    const order = this.orders.get(orderId);
    
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    return order;
  }
  
  // WebSocket methods
  subscribeToTicker(symbols: string[], callback: (update: BrokerLivePriceUpdate) => void): () => void {
    // Store callback for each symbol
    for (const symbol of symbols) {
      // Make sure symbol exists in market data
      if (!this.marketData[symbol]) {
        // Add new symbol with default data
        this.marketData[symbol] = {
          price: '100.00',
          priceChange: '0.00',
          volume: '1000.00'
        };
      }
      
      const callbacks = this.wsCallbacks.get(symbol) || [];
      callbacks.push(callback);
      this.wsCallbacks.set(symbol, callbacks);
      
      // Create interval for this symbol if not exists
      if (!this.wsIntervals.has(symbol)) {
        const interval = setInterval(() => {
          // Simulate random price movement (0.1% to 0.5% change)
          const data = this.marketData[symbol];
          const changePercent = (Math.random() * 0.4 + 0.1) * (Math.random() > 0.5 ? 1 : -1);
          const currentPrice = parseFloat(data.price);
          const newPrice = currentPrice * (1 + changePercent / 100);
          
          // Update price
          data.price = newPrice.toFixed(2);
          
          // Notify callbacks
          const update: BrokerLivePriceUpdate = {
            symbol,
            price: data.price,
            timestamp: Date.now()
          };
          
          const symbolCallbacks = this.wsCallbacks.get(symbol) || [];
          for (const cb of symbolCallbacks) {
            cb(update);
          }
        }, 2000); // Update every 2 seconds
        
        this.wsIntervals.set(symbol, interval);
      }
    }
    
    // Return unsubscribe function
    return () => {
      for (const symbol of symbols) {
        // Clear callbacks
        this.wsCallbacks.delete(symbol);
        
        // Clear interval
        const interval = this.wsIntervals.get(symbol);
        if (interval) {
          clearInterval(interval);
          this.wsIntervals.delete(symbol);
        }
      }
    };
  }
  
  // Symbol format conversion helpers
  standardizeSymbol(symbol: string): string {
    return symbol;
  }
  
  formatSymbolForExchange(symbol: string): string {
    return symbol;
  }
  
  /**
   * Split a symbol into base and quote assets
   * @param symbol The symbol to split (e.g., 'BTCUSDT')
   */
  private splitSymbol(symbol: string): { base: string, quote: string } {
    // Common quote assets
    const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'USD', 'BUSD'];
    
    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, symbol.length - quote.length);
        return { base, quote };
      }
    }
    
    // Default fallback - split in the middle
    const mid = Math.floor(symbol.length / 2);
    return {
      base: symbol.slice(0, mid),
      quote: symbol.slice(mid)
    };
  }
}