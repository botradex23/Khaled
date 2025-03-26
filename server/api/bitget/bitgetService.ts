import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { 
  BASE_URL, 
  API_KEY, 
  SECRET_KEY, 
  PASSPHRASE, 
  DEFAULT_TIMEOUT, 
  isConfigured, 
  USE_TESTNET 
} from './config';

/**
 * Error thrown when API keys are not configured
 */
class BitgetApiNotConfiguredError extends Error {
  constructor() {
    super('Bitget API credentials are not configured');
    this.name = 'BitgetApiNotConfiguredError';
  }
}

/**
 * Interface for Bitget API response
 */
interface BitgetResponse<T> {
  code: string;
  msg: string;
  data: T;
  requestTime?: number;
}

/**
 * Core service for interacting with Bitget API
 */
export class BitgetService {
  private baseUrl: string;
  private useTestnet: boolean;

  /**
   * Initialize the Bitget service
   * @param useTestnet - whether to use testnet or not
   */
  constructor(useTestnet = false) {
    this.useTestnet = useTestnet;
    this.baseUrl = BASE_URL;
    
    console.log(`Bitget Service initialized with ${useTestnet ? 'testnet' : 'mainnet'}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`API configured: ${isConfigured()}`);
  }

  /**
   * Generate signature required for authenticated API calls
   * 
   * @param timestamp - ISO timestamp string
   * @param method - HTTP method: GET, POST, DELETE
   * @param requestPath - API endpoint path (e.g., '/api/spot/v1/account/assets')
   * @param body - Request body for POST requests, empty string for GET
   * @returns - Signature hash
   */
  private generateSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    // Bitget uses pre-hash string format: timestamp + method + requestPath + body
    const preHash = timestamp + method.toUpperCase() + requestPath + body;
    
    // Create HMAC-SHA256 signature using the secret key
    return crypto
      .createHmac('sha256', SECRET_KEY)
      .update(preHash)
      .digest('base64');
  }

  /**
   * Make authenticated API request to Bitget
   * 
   * @param method - HTTP method
   * @param endpoint - API endpoint (without base URL)
   * @param params - Query parameters (for GET) or request body (for POST/PUT)
   * @returns API response data
   */
  async makeAuthenticatedRequest<T>(
    method: string,
    endpoint: string,
    params: any = {}
  ): Promise<T> {
    if (!isConfigured()) {
      throw new BitgetApiNotConfiguredError();
    }

    const timestamp = new Date().toISOString();
    method = method.toUpperCase();
    let requestPath = endpoint;
    let requestBody = '';
    let queryString = '';

    // For GET requests, add params to the URL
    if (method === 'GET' && Object.keys(params).length > 0) {
      queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      requestPath = `${endpoint}?${queryString}`;
    } else if (method !== 'GET' && Object.keys(params).length > 0) {
      // For POST requests, stringify the body
      requestBody = JSON.stringify(params);
    }

    // Generate signature
    const signature = this.generateSignature(timestamp, method, requestPath, requestBody);

    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseUrl}${requestPath}`,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'ACCESS-KEY': API_KEY,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': PASSPHRASE,
        'Content-Type': 'application/json',
        // Add this header to indicate we're using API v2
        'X-CHANNEL-API-CODE': '6y4TdEX0',
      },
    };

    if (method !== 'GET' && requestBody) {
      config.data = requestBody;
    }

    try {
      const response: AxiosResponse = await axios(config);
      
      if (response.data.code !== '00000') {
        throw new Error(`Bitget API error: ${response.data.msg} (${response.data.code})`);
      }
      
      return response.data.data as T;
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a non-2xx status
        console.error('Bitget API error:', error.response.data);
        throw new Error(`Bitget API error: ${error.response.data.msg || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Bitget API no response:', error.request);
        throw new Error('No response from Bitget API');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Bitget API request setup error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Make public (non-authenticated) API request to Bitget
   * 
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @returns API response data
   */
  async makePublicRequest<T>(endpoint: string, params: any = {}): Promise<T> {
    let url = `${this.baseUrl}${endpoint}`;
    
    // Add query parameters if any
    if (Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      url = `${url}?${queryString}`;
    }

    try {
      const response = await axios({
        method: 'GET',
        url,
        timeout: DEFAULT_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          // Add this header to indicate we're using API v2
          'X-CHANNEL-API-CODE': '6y4TdEX0',
        }
      });

      if (response.data.code !== '00000') {
        throw new Error(`Bitget API error: ${response.data.msg} (${response.data.code})`);
      }

      return response.data.data as T;
    } catch (error: any) {
      if (error.response) {
        console.error('Bitget API error:', error.response.data);
        throw new Error(`Bitget API error: ${error.response.data.msg || 'Unknown error'}`);
      } else if (error.request) {
        console.error('Bitget API no response:', error.request);
        throw new Error('No response from Bitget API');
      } else {
        console.error('Bitget API request setup error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    return this.makeAuthenticatedRequest('GET', '/api/spot/v1/account/assets');
  }

  /**
   * Check if API is configured with proper credentials
   */
  isConfigured(): boolean {
    return isConfigured();
  }

  /**
   * Get the base URL being used for API requests
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get market trading pairs
   */
  async getTradingPairs() {
    return this.makePublicRequest('/api/spot/v1/public/products');
  }

  /**
   * Get ticker information for a specific trading pair
   */
  async getTicker(symbol: string) {
    return this.makePublicRequest('/api/spot/v1/market/ticker', { symbol });
  }

  /**
   * Get all tickers
   */
  async getAllTickers() {
    return this.makePublicRequest('/api/spot/v1/market/tickers');
  }

  /**
   * Get historical candlestick data for chart
   * 
   * @param symbol - Trading pair symbol (e.g., BTCUSDT)
   * @param interval - Time interval (e.g., '1min', '5min', '15min', '30min', '1h', '4h', '12h', '1day', '1week')
   * @param limit - Maximum number of results to return
   */
  async getKlineData(symbol: string, interval = '1h', limit = 100): Promise<any> {
    return this.makePublicRequest('/api/spot/v1/market/candles', {
      symbol,
      period: interval,
      limit
    });
  }

  /**
   * Get account trading history
   */
  async getTradingHistory() {
    return this.makeAuthenticatedRequest('GET', '/api/spot/v1/trade/history');
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string) {
    const params: any = { limit: 100 };
    if (symbol) params.symbol = symbol;
    
    return this.makeAuthenticatedRequest('GET', '/api/spot/v1/trade/open-orders', params);
  }

  /**
   * Place a new order
   */
  async placeOrder(
    symbol: string, 
    side: 'buy' | 'sell', 
    orderType: 'limit' | 'market', 
    quantity: string, 
    price?: string
  ) {
    const params: any = {
      symbol,
      side,
      orderType,
      quantity
    };

    // Price is required for limit orders
    if (orderType === 'limit' && price) {
      params.price = price;
    }

    return this.makeAuthenticatedRequest('POST', '/api/spot/v1/trade/orders', params);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string) {
    return this.makeAuthenticatedRequest('POST', '/api/spot/v1/trade/cancel-order', {
      symbol,
      orderId
    });
  }

  /**
   * Test connectivity to the API
   */
  async ping() {
    // Bitget doesn't have a dedicated ping endpoint, so use a simple public endpoint
    return this.makePublicRequest('/api/spot/v1/public/time');
  }
}

// Export a singleton instance
export const bitgetService = new BitgetService(USE_TESTNET);