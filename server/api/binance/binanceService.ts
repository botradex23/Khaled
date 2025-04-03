/**
 * Binance API Service Module
 * Provides functions for interacting with the Binance API
 */

import axios from 'axios';
import crypto from 'crypto';
import { URLSearchParams } from 'url';

// Constants
const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_TEST_API_URL = 'https://testnet.binance.vision';

// Type definitions
export interface BinanceApiConfig {
  apiKey: string;
  secretKey: string;
  useTestnet?: boolean;
  allowedIp?: string;
}

export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
  permissions: string[];
}

export class BinanceApiService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private useTestnet: boolean;
  private allowedIp: string | null;

  constructor(config: BinanceApiConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.useTestnet = config.useTestnet || false;
    this.baseUrl = this.useTestnet ? BINANCE_TEST_API_URL : BINANCE_API_URL;
    this.allowedIp = config.allowedIp || null;
  }

  /**
   * Generate a signature for the request
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Make a GET request to the Binance API
   */
  private async request(endpoint: string, params: any = {}, method = 'GET', securityType = 'SIGNED'): Promise<any> {
    const timestamp = Date.now();
    let queryString = '';

    // Add timestamp if it's a signed request
    if (securityType === 'SIGNED') {
      params.timestamp = timestamp;
      
      // Convert params to query string
      const searchParams = new URLSearchParams();
      for (const key in params) {
        searchParams.append(key, params[key].toString());
      }
      queryString = searchParams.toString();
      
      // Generate signature
      const signature = this.generateSignature(queryString);
      queryString = `${queryString}&signature=${signature}`;
    } else if (Object.keys(params).length > 0) {
      // For public endpoints with params but no signature
      const searchParams = new URLSearchParams();
      for (const key in params) {
        searchParams.append(key, params[key].toString());
      }
      queryString = searchParams.toString();
    }

    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    try {
      const axiosConfig: any = {
        method,
        url,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'User-Agent': 'BinanceApiService/1.0.0'
        }
      };

      // Add proxy if defined in environment
      if (process.env.BINANCE_PROXY_HOST && process.env.BINANCE_PROXY_PORT) {
        axiosConfig.proxy = {
          host: process.env.BINANCE_PROXY_HOST,
          port: parseInt(process.env.BINANCE_PROXY_PORT)
        };
        
        // Add proxy auth if provided
        if (process.env.BINANCE_PROXY_USERNAME && process.env.BINANCE_PROXY_PASSWORD) {
          axiosConfig.proxy.auth = {
            username: process.env.BINANCE_PROXY_USERNAME,
            password: process.env.BINANCE_PROXY_PASSWORD
          };
        }
        
        console.log(`Using proxy for Binance API: ${process.env.BINANCE_PROXY_HOST}:${process.env.BINANCE_PROXY_PORT}`);
      }

      const response = await axios(axiosConfig);
      
      return response.data;
    } catch (error: any) {
      console.error('Binance API Error:', error.response ? error.response.data : error.message);
      throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
  }

  /**
   * Ping the Binance API server to check connection
   */
  async ping(): Promise<{ success: boolean, message?: string }> {
    try {
      await this.request('/api/v3/ping', {}, 'GET', 'PUBLIC');
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<BinanceAccountInfo> {
    return this.request('/api/v3/account');
  }

  /**
   * Get current exchange trading rules and symbol information
   */
  async getExchangeInfo(symbol?: string): Promise<any> {
    const params: any = {};
    if (symbol) {
      params.symbol = symbol;
    }
    return this.request('/api/v3/exchangeInfo', params, 'GET', 'PUBLIC');
  }

  /**
   * Get ticker price for a symbol
   */
  async getTickerPrice(symbol: string): Promise<{ symbol: string, price: string }> {
    return this.request('/api/v3/ticker/price', { symbol }, 'GET', 'PUBLIC');
  }

  /**
   * Get ticker prices for all symbols
   */
  async getAllTickerPrices(): Promise<Array<{ symbol: string, price: string }>> {
    return this.request('/api/v3/ticker/price', {}, 'GET', 'PUBLIC');
  }

  /**
   * Get 24hr ticker price change statistics
   */
  async get24hrStats(symbol?: string): Promise<any> {
    const params: any = {};
    if (symbol) {
      params.symbol = symbol;
    }
    return this.request('/api/v3/ticker/24hr', params, 'GET', 'PUBLIC');
  }
  
  /**
   * Get 24hr ticker for a specific symbol
   */
  async get24hrTicker(symbol: string): Promise<any> {
    return this.get24hrStats(symbol);
  }
  
  /**
   * Get all 24hr tickers
   */
  async getAllTickers24hr(): Promise<any> {
    return this.get24hrStats();
  }
  
  /**
   * Get ticker price for a specific symbol
   */
  async getSymbolPrice(symbol: string): Promise<any> {
    return this.getTickerPrice(symbol);
  }
  
  /**
   * Get all tickers
   */
  async getAllTickers(): Promise<any> {
    return this.getAllTickerPrices();
  }
  
  /**
   * Test API connectivity and signing (authenticated)
   */
  async testConnectivity(): Promise<{ success: boolean, message?: string }> {
    try {
      await this.getAccountInfo();
      return { success: true, message: 'Connected successfully to Binance API' };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
  
  /**
   * Get account balances with USD conversion
   */
  async getAccountBalancesWithUSD(): Promise<any[]> {
    const accountInfo = await this.getAccountInfo();
    const tickers = await this.getAllTickerPrices();
    
    // Get only non-zero balances
    const balances = accountInfo.balances.filter(
      (balance: any) => 
        parseFloat(balance.free) > 0 || 
        parseFloat(balance.locked) > 0
    );
    
    // Calculate USD value for each balance
    return await Promise.all(
      balances.map(async (balance: any) => {
        const asset = balance.asset;
        const free = parseFloat(balance.free);
        const locked = parseFloat(balance.locked);
        const total = free + locked;
        
        let valueUSD = 0;
        
        if (asset === 'USDT' || asset === 'BUSD' || asset === 'USDC' || asset === 'TUSD' || asset === 'DAI') {
          valueUSD = total;
        } else {
          // Try to find the ticker for the asset with USDT
          const tickerSymbol = `${asset}USDT`;
          const ticker = tickers.find((t: any) => t.symbol === tickerSymbol);
          
          if (ticker) {
            valueUSD = total * parseFloat(ticker.price);
          } else {
            // Try to find BTC pair and convert via BTC
            const btcTickerSymbol = `${asset}BTC`;
            const btcTicker = tickers.find((t: any) => t.symbol === btcTickerSymbol);
            const btcUsdtTicker = tickers.find((t: any) => t.symbol === 'BTCUSDT');
            
            if (btcTicker && btcUsdtTicker) {
              valueUSD = total * parseFloat(btcTicker.price) * parseFloat(btcUsdtTicker.price);
            }
          }
        }
        
        return {
          asset,
          free: balance.free,
          locked: balance.locked,
          total,
          valueUSD: valueUSD > 0 ? valueUSD : undefined
        };
      })
    );
  }

  /**
   * Get order book
   */
  async getOrderBook(symbol: string, limit?: number): Promise<any> {
    const params: any = { symbol };
    if (limit) {
      params.limit = limit;
    }
    return this.request('/api/v3/depth', params, 'GET', 'PUBLIC');
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(symbol: string, limit?: number): Promise<any> {
    const params: any = { symbol };
    if (limit) {
      params.limit = limit;
    }
    return this.request('/api/v3/trades', params, 'GET', 'PUBLIC');
  }

  /**
   * Create a new order
   */
  async createOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
    quantity: number | string;
    price?: number | string;
    newClientOrderId?: string;
    stopPrice?: number | string;
    icebergQty?: number | string;
    newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
  }): Promise<any> {
    return this.request('/api/v3/order', params, 'POST');
  }

  /**
   * Check an order's status
   */
  async getOrder(symbol: string, orderId?: number, origClientOrderId?: string): Promise<any> {
    const params: any = { symbol };
    if (orderId) {
      params.orderId = orderId;
    } else if (origClientOrderId) {
      params.origClientOrderId = origClientOrderId;
    } else {
      throw new Error('Either orderId or origClientOrderId must be provided');
    }
    return this.request('/api/v3/order', params);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId?: number, origClientOrderId?: string): Promise<any> {
    const params: any = { symbol };
    if (orderId) {
      params.orderId = orderId;
    } else if (origClientOrderId) {
      params.origClientOrderId = origClientOrderId;
    } else {
      throw new Error('Either orderId or origClientOrderId must be provided');
    }
    return this.request('/api/v3/order', params, 'DELETE');
  }

  /**
   * Get all open orders
   */
  async getOpenOrders(symbol?: string): Promise<any> {
    const params: any = {};
    if (symbol) {
      params.symbol = symbol;
    }
    return this.request('/api/v3/openOrders', params);
  }

  /**
   * Get all orders (active, canceled, or filled)
   */
  async getAllOrders(symbol: string, orderId?: number, startTime?: number, endTime?: number, limit?: number): Promise<any> {
    const params: any = { symbol };
    if (orderId) params.orderId = orderId;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    if (limit) params.limit = limit;
    return this.request('/api/v3/allOrders', params);
  }

  /**
   * Get account trade list
   */
  async getAccountTrades(symbol: string, orderId?: number, startTime?: number, endTime?: number, limit?: number): Promise<any> {
    const params: any = { symbol };
    if (orderId) params.orderId = orderId;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    if (limit) params.limit = limit;
    return this.request('/api/v3/myTrades', params);
  }
}

/**
 * Create a Binance API service instance with custom credentials
 */
export function createBinanceServiceWithCustomCredentials(
  apiKey: string,
  secretKey: string,
  useTestnet: boolean = false,
  allowedIp?: string
): BinanceApiService {
  return new BinanceApiService({
    apiKey,
    secretKey,
    useTestnet,
    allowedIp
  });
}

/**
 * Default Binance API service instance - configured with environment variables
 */
export const binanceService = new BinanceApiService({
  apiKey: process.env.BINANCE_API_KEY || '',
  secretKey: process.env.BINANCE_SECRET_KEY || '',
  useTestnet: process.env.BINANCE_USE_TESTNET === 'true',
  allowedIp: process.env.BINANCE_ALLOWED_IP
});