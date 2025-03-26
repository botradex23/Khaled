import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import {
  API_KEY,
  SECRET_KEY,
  BYBIT_BASE_URL,
  BYBIT_TESTNET_URL,
  DEFAULT_TIMEOUT,
  isConfigured
} from './config';

// Custom error for API configuration issues
class BybitApiNotConfiguredError extends Error {
  constructor() {
    super('Bybit API is not configured correctly. Please check your API credentials.');
    this.name = 'BybitApiNotConfiguredError';
  }
}

// Response type for Bybit API
interface BybitResponse<T> {
  retCode: number;
  retMsg: string;
  result: T;
  retExtInfo?: any;
  time: number;
}

/**
 * Core service for interacting with Bybit API
 */
export class BybitService {
  private baseUrl: string;
  private isTestnet: boolean;

  /**
   * Initialize the Bybit service
   * @param useTestnet - whether to use testnet or not
   */
  constructor(useTestnet = false) {
    this.isTestnet = useTestnet;
    this.baseUrl = useTestnet ? BYBIT_TESTNET_URL : BYBIT_BASE_URL;

    // Log configuration at startup
    console.log(`Bybit Service initialized with ${useTestnet ? 'testnet' : 'mainnet'}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`API configured: ${isConfigured()}`);
  }

  /**
   * Generate signature required for authenticated API calls
   * @param timestamp - current timestamp in milliseconds
   * @param method - HTTP method
   * @param path - request path (without base URL)
   * @param data - request payload (for POST requests)
   * @returns signature string
   */
  private generateSignature(timestamp: number, method: string, path: string, data?: any): string {
    if (!SECRET_KEY) {
      throw new BybitApiNotConfiguredError();
    }

    // Bybit uses a specific signature method:
    // timestamp + API_KEY + (recv_window) + (queryString or body)
    let signatureString = `${timestamp}${API_KEY}`;
    
    // Add query string or body depending on the request type
    if (method === 'GET' && data) {
      // For GET, convert params to query string
      const queryString = Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      if (queryString) {
        signatureString += queryString;
      }
    } else if (data) {
      // For other methods with body
      signatureString += JSON.stringify(data);
    }
    
    // Generate HMAC signature using SHA256
    return crypto
      .createHmac('sha256', SECRET_KEY)
      .update(signatureString)
      .digest('hex');
  }

  /**
   * Make authenticated API request to Bybit
   * @param method - HTTP method
   * @param endpoint - API endpoint (without base URL)
   * @param params - query parameters (for GET requests) or body (for POST/PUT/DELETE)
   * @returns API response data
   */
  async makeAuthenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    params: any = {}
  ): Promise<T> {
    if (!isConfigured()) {
      throw new BybitApiNotConfiguredError();
    }

    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp, method, endpoint, params);
    const url = `${this.baseUrl}${endpoint}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': 5000, // Window in milliseconds
        'Content-Type': 'application/json'
      }
    };

    // For GET requests, params go in the URL as query parameters
    // For other requests, params go in the request body
    if (method === 'GET') {
      config.params = params;
    } else {
      config.data = params;
    }

    try {
      const response: AxiosResponse<BybitResponse<T>> = await axios(config);
      
      // Check if the API returned an error
      if (response.data.retCode !== 0) {
        console.error('Bybit API error:', response.data.retMsg);
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error('Error making authenticated request to Bybit:', error.message);
      throw error;
    }
  }

  /**
   * Make public (non-authenticated) API request to Bybit
   * @param endpoint - API endpoint (without base URL)
   * @param params - query parameters
   * @returns API response data
   */
  async makePublicRequest<T>(endpoint: string, params: any = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await axios.get<BybitResponse<T>>(url, {
        params,
        timeout: DEFAULT_TIMEOUT
      });
      
      // Check if the API returned an error
      if (response.data.retCode !== 0) {
        console.error('Bybit API error:', response.data.retMsg);
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error('Error making public request to Bybit:', error.message);
      throw error;
    }
  }

  /**
   * Get account information
   * @returns Account information from Bybit
   */
  async getAccountInfo() {
    return this.makeAuthenticatedRequest(
      'GET',
      '/v5/account/wallet-balance',
      { accountType: 'UNIFIED' } // or SPOT, CONTRACT, etc.
    );
  }

  /**
   * Check if API is configured with proper credentials
   * @returns true if configured, false otherwise
   */
  isConfigured(): boolean {
    return isConfigured();
  }

  /**
   * Get the base URL being used for API requests
   * @returns Base URL string
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get market trading pairs (tickers)
   * @returns List of trading pairs
   */
  async getTradingPairs() {
    return this.makePublicRequest('/v5/market/tickers', { category: 'spot' });
  }

  /**
   * Get ticker information for a specific trading pair
   * @param symbol - trading pair symbol (e.g., BTCUSDT)
   * @returns Ticker information
   */
  async getTicker(symbol: string) {
    return this.makePublicRequest('/v5/market/tickers', {
      category: 'spot',
      symbol
    });
  }

  /**
   * Get historical candlestick data for chart
   * @param symbol - trading pair symbol (e.g., BTCUSDT)
   * @param interval - time interval (e.g., 1, 5, 15, 30, 60, 240, D, W, M)
   * @param limit - maximum number of results to return
   * @returns Kline (candlestick) data
   */
  async getKlineData(symbol: string, interval = '60', limit = 100): Promise<any> {
    return this.makePublicRequest('/v5/market/kline', {
      category: 'spot',
      symbol,
      interval,
      limit
    });
  }

  /**
   * Get account trading history
   * @returns Trading history
   */
  async getTradingHistory() {
    return this.makeAuthenticatedRequest(
      'GET',
      '/v5/execution/list',
      { category: 'spot', limit: 50 }
    );
  }

  /**
   * Get open orders
   * @returns Open orders
   */
  async getOpenOrders() {
    return this.makeAuthenticatedRequest(
      'GET',
      '/v5/order/realtime',
      { category: 'spot', limit: 50 }
    );
  }

  /**
   * Place a new order
   * @param symbol - trading pair symbol (e.g., BTCUSDT)
   * @param side - buy or sell
   * @param orderType - limit or market
   * @param qty - order quantity
   * @param price - order price (for limit orders)
   * @returns Order result
   */
  async placeOrder(symbol: string, side: 'Buy' | 'Sell', orderType: 'Limit' | 'Market', qty: string, price?: string) {
    const params: any = {
      category: 'spot',
      symbol,
      side,
      orderType,
      qty
    };

    // Only include price for limit orders
    if (orderType === 'Limit' && price) {
      params.price = price;
    }

    return this.makeAuthenticatedRequest('POST', '/v5/order/create', params);
  }

  /**
   * Cancel an order
   * @param symbol - trading pair symbol (e.g., BTCUSDT)
   * @param orderId - order ID to cancel
   * @returns Cancel result
   */
  async cancelOrder(symbol: string, orderId: string) {
    return this.makeAuthenticatedRequest('POST', '/v5/order/cancel', {
      category: 'spot',
      symbol,
      orderId
    });
  }

  /**
   * Test connectivity to the API
   * @returns Server time if connected
   */
  async ping() {
    try {
      const response = await axios.get(`${this.baseUrl}/v5/market/time`);
      return response.data;
    } catch (error) {
      console.error('Error pinging Bybit API:', error);
      throw error;
    }
  }
}

// Export a singleton instance of the service
export const bybitService = new BybitService(true); // Using testnet to avoid geo-restrictions