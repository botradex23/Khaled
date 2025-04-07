/**
 * Broker Interfaces
 *
 * This file defines the common interfaces that all broker implementations must follow.
 * It provides a standardized way to interact with different cryptocurrency exchanges.
 */

// Type definition for ticker/price data
export interface BrokerTickerPrice {
  symbol: string;
  price: string;
}

// Type definition for 24hr ticker data
export interface Broker24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// Type definition for account balance data
export interface BrokerBalance {
  asset: string;
  free: string;
  locked: string;
  total?: string;
}

// Type definition for exchange information
export interface BrokerExchangeInfo {
  symbols: BrokerSymbolInfo[];
}

// Type definition for symbol information
export interface BrokerSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  filters: any[];
}

// Type definition for order placement result
export interface BrokerOrderResult {
  symbol: string;
  orderId: string;
  clientOrderId?: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
}

// Type definition for order book data
export interface BrokerOrderBook {
  lastUpdateId: number;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][]; // [price, quantity]
}

// Type definition for candle data
export interface BrokerCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Type definition for live price update via WebSocket
export interface BrokerLivePriceUpdate {
  symbol: string;
  price: string;
  timestamp: number;
}

// Enum for broker types
export enum BrokerType {
  BINANCE = 'binance',
  OKX = 'okx'
}

// Interface for broker API status
export interface BrokerApiStatus {
  hasApiKey: boolean;
  hasSecretKey: boolean;
  testnet: boolean;
  name: BrokerType;
  active?: boolean;
  fallbacks?: BrokerApiStatus[];
}

/**
 * Main Broker Interface
 * All broker implementations must implement this interface
 */
export interface IBroker {
  // Broker information
  getName(): BrokerType;
  isTestnet(): boolean;
  isConfigured(): boolean;
  getApiStatus(): Promise<BrokerApiStatus>;
  
  // Market data methods
  getSymbolPrice(symbol: string): Promise<BrokerTickerPrice | null>;
  getAllPrices(): Promise<BrokerTickerPrice[]>;
  get24hrTicker(symbol: string): Promise<Broker24hrTicker | null>;
  getExchangeInfo(symbol?: string): Promise<BrokerExchangeInfo>;
  getOrderBook(symbol: string, limit?: number): Promise<BrokerOrderBook>;
  getCandles(symbol: string, interval: string, limit?: number): Promise<BrokerCandle[]>;
  
  // Account data methods
  getAccountBalances(): Promise<BrokerBalance[]>;
  
  // Order methods
  placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET',
    quantity: string,
    price?: string,
    timeInForce?: string
  ): Promise<BrokerOrderResult>;
  
  cancelOrder(symbol: string, orderId: string): Promise<boolean>;
  getOrder(symbol: string, orderId: string): Promise<any>;
  
  // WebSocket methods
  subscribeToTicker(symbols: string[], callback: (update: BrokerLivePriceUpdate) => void): () => void;
  
  // Symbol format conversion helpers
  standardizeSymbol(symbol: string): string; // Convert to internal standard format
  formatSymbolForExchange(symbol: string): string; // Convert from standard to exchange format
}

/**
 * Broker Factory Interface
 */
export interface IBrokerFactory {
  createBroker(type: BrokerType, config?: any): IBroker;
  getDefaultBroker(): IBroker;
}

/**
 * Multi-Broker Service Interface
 * This interface defines the methods for a service that manages multiple brokers
 * and provides automatic fallback functionality
 */
export interface IMultiBrokerService {
  // Broker management
  setPrimaryBroker(type: BrokerType): void;
  setFallbackBroker(type: BrokerType): void;
  getBroker(type: BrokerType): IBroker;
  
  // Market data methods with fallback
  getSymbolPrice(symbol: string): Promise<BrokerTickerPrice | null>;
  getAllPrices(): Promise<BrokerTickerPrice[]>;
  get24hrTicker(symbol: string): Promise<Broker24hrTicker | null>;
  getExchangeInfo(symbol?: string): Promise<BrokerExchangeInfo>;
  getOrderBook(symbol: string, limit?: number): Promise<BrokerOrderBook>;
  getCandles(symbol: string, interval: string, limit?: number): Promise<BrokerCandle[]>;
  
  // Account data methods with fallback
  getAccountBalances(): Promise<BrokerBalance[]>;
  
  // Order methods with fallback
  placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET',
    quantity: string,
    price?: string,
    timeInForce?: string
  ): Promise<BrokerOrderResult>;
  
  cancelOrder(symbol: string, orderId: string): Promise<boolean>;
  getOrder(symbol: string, orderId: string): Promise<any>;
  
  // WebSocket methods
  subscribeToTicker(symbols: string[], callback: (update: BrokerLivePriceUpdate) => void): () => void;
}