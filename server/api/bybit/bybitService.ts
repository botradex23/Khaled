import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  API_KEY,
  SECRET_KEY,
  BYBIT_BASE_URL,
  BYBIT_TESTNET_URL,
  DEFAULT_TIMEOUT,
  isConfigured
} from './config';
import { createProxyInstance, VPN_CONFIG } from './proxy-config';

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
  private axiosInstance: AxiosInstance;

  /**
   * Initialize the Bybit service
   * @param useTestnet - whether to use testnet or not
   */
  constructor(useTestnet = false) {
    this.isTestnet = useTestnet;
    this.baseUrl = useTestnet ? BYBIT_TESTNET_URL : BYBIT_BASE_URL;
    
    // Create axios instance with VPN proxy if enabled
    if (VPN_CONFIG.enabled) {
      this.axiosInstance = createProxyInstance();
      console.log(`Bybit Service initialized with VPN/Proxy: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
    } else {
      this.axiosInstance = axios;
      console.log('Bybit Service initialized with direct connection (no VPN/proxy)');
    }

    // Log configuration at startup
    console.log(`Bybit Service initialized with ${useTestnet ? 'testnet' : 'mainnet'}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`API configured: ${isConfigured()}`);
  }

  /**
   * Generate signature required for authenticated API calls
   * @param timestamp - current timestamp in milliseconds
   * @param recvWindow - receive window in milliseconds
   * @param method - HTTP method
   * @param path - request path (without base URL)
   * @param data - request payload (for POST requests) or query params (for GET)
   * @returns signature string
   */
  private generateSignature(
    timestamp: number,
    recvWindow: number,
    method: string,
    path: string,
    data?: any
  ): string {
    if (!SECRET_KEY) {
      throw new BybitApiNotConfiguredError();
    }

    let bodyString = '';

    if (method === 'GET' && data) {
      const queryString = Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      bodyString = queryString;
    } else if (data) {
      bodyString = JSON.stringify(data);
    }

    // החתימה לפי הסדר הנכון: timestamp + apiKey + recvWindow + body
    const signatureString = `${timestamp}${API_KEY}${recvWindow}${bodyString}`;
    
    console.log('Generating signature with:', {
      timestamp,
      method,
      path,
      recvWindow,
      bodyStringLength: bodyString.length 
    });

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
    const recvWindow = 5000; // Window in milliseconds
    const signature = this.generateSignature(timestamp, recvWindow, method, endpoint, params);
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`Making ${method} request to ${endpoint} via ${VPN_CONFIG.enabled ? 'VPN/proxy' : 'direct connection'}`);

    const config: AxiosRequestConfig = {
      method,
      url,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp.toString(),
        'X-BAPI-RECV-WINDOW': recvWindow.toString(),
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
      // Use the proxy-enabled axios instance instead of the global axios
      const response: AxiosResponse<BybitResponse<T>> = await this.axiosInstance(config);
      
      // Check if the API returned an error
      if (response.data.retCode !== 0) {
        console.error('Bybit API error:', response.data.retMsg);
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error('Error making authenticated request to Bybit:', error.message);
      
      // Log more details about proxy-related errors
      if (VPN_CONFIG.enabled && error.code) {
        console.error(`VPN/Proxy error (${error.code}): This might be related to the proxy configuration.`);
      }
      
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
    
    console.log(`Making public request to ${endpoint} via ${VPN_CONFIG.enabled ? 'VPN/proxy' : 'direct connection'}`);
    
    try {
      // Use the proxy-enabled axios instance
      const response = await this.axiosInstance.get<BybitResponse<T>>(url, {
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
      
      // Log more details about proxy-related errors
      if (VPN_CONFIG.enabled && error.code) {
        console.error(`VPN/Proxy error (${error.code}): This might be related to the proxy configuration.`);
      }
      
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
      console.log(`Pinging Bybit API via ${VPN_CONFIG.enabled ? 'VPN/proxy' : 'direct connection'}`);
      const response = await this.axiosInstance.get(`${this.baseUrl}/v5/market/time`);
      console.log('Ping response:', response.status, response.statusText);
      return response.data;
    } catch (error: any) {
      console.error('Error pinging Bybit API:', error.message);
      
      // Log more details about proxy-related errors
      if (VPN_CONFIG.enabled && error.code) {
        console.error(`VPN/Proxy error (${error.code}): This might be related to the proxy configuration.`);
      }
      
      throw error;
    }
  }
}

// Export a singleton instance of the service
export const bybitService = new BybitService(false); // Using main server instead of testnet