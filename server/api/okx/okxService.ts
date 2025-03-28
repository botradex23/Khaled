import { createHmac, randomBytes } from 'crypto';
import axios, { AxiosRequestConfig } from 'axios';

/**
 * OKX API Service
 * Handles authentication and making requests to the OKX API
 */
export class OkxService {
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private isTestnet: boolean;
  public isConfigured: boolean;

  constructor(
    apiKey: string, 
    secretKey: string, 
    passphrase: string, 
    isTestnet: boolean = true
  ) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passphrase = passphrase;
    this.isTestnet = isTestnet;
    
    // Set if the service is configured with valid API keys
    this.isConfigured = !!(apiKey && secretKey && passphrase);
    
    // Use testnet API endpoint if specified, otherwise use live API
    this.baseUrl = isTestnet
      ? 'https://www.okx.com' // Testnet URL
      : 'https://www.okx.com'; // Production URL (same base URL for OKX)
  }
  
  /**
   * Get the base URL
   * Used by diagnostic tools to check connectivity
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Test the connection to the OKX API
   * Returns a success/error response
   */
  async ping(): Promise<{ success: boolean; message: string }> {
    try {
      // Basic public API call that doesn't require authentication
      const response = await this.makePublicRequest<any>('/api/v5/public/time');
      return { 
        success: response.code === '0', 
        message: response.code === '0' ? 'Connection successful' : `API Error: ${response.msg}` 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Connection failed: ${error.message}` 
      };
    }
  }

  /**
   * Get account information
   * Requires authentication
   */
  async getAccountInfo() {
    return this.makeAuthenticatedRequest<any>('/api/v5/account/balance');
  }

  /**
   * Place an order on the exchange
   * @param symbol Trading pair symbol (e.g., "BTC-USDT")
   * @param side Buy or sell
   * @param type Market or limit order type
   * @param amount Amount to buy/sell
   * @param price Price for limit orders
   */
  async placeOrder(
    symbol: string,
    side: 'buy' | 'sell',
    type: 'market' | 'limit',
    amount: string,
    price?: string
  ): Promise<any> {
    const params: Record<string, any> = {
      instId: symbol,
      tdMode: 'cash',
      side: side === 'buy' ? 'buy' : 'sell',
      ordType: type === 'market' ? 'market' : 'limit',
      sz: amount
    };

    // Add price for limit orders
    if (type === 'limit' && price) {
      params.px = price;
    }

    return this.makeAuthenticatedRequest<any>('/api/v5/trade/order', 'POST', params);
  }

  /**
   * Cancel an existing order
   * @param symbol Trading pair symbol
   * @param orderId Order ID to cancel
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.makeAuthenticatedRequest<any>('/api/v5/trade/cancel-order', 'POST', {
      instId: symbol,
      ordId: orderId
    });
  }

  /**
   * Make a public request to the OKX API (no authentication required)
   * @param endpoint The API endpoint to request
   * @param method The HTTP method to use
   * @param params Optional parameters to include in the request
   */
  async makePublicRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params: Record<string, any> = {}
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config: AxiosRequestConfig = {
        method,
        url,
        params: method === 'GET' ? params : undefined,
        data: method === 'POST' ? params : undefined,
      };

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('OKX API Error:', error.message);
      if (error.response) {
        console.error('OKX API Response:', error.response.data);
        throw new Error(`OKX API Error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Make an authenticated request to the OKX API
   * @param endpoint The API endpoint to request
   * @param method The HTTP method to use
   * @param params Optional parameters to include in the request
   */
  async makeAuthenticatedRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params: Record<string, any> = {}
  ): Promise<T> {
    try {
      const timestamp = new Date().toISOString();
      const requestPath = endpoint;
      const body = method === 'GET' ? '' : JSON.stringify(params);

      // Create the signature according to OKX authentication requirements
      const prehash = timestamp + method + requestPath + body;
      const signature = createHmac('sha256', this.secretKey)
        .update(prehash)
        .digest('base64');

      const headers: Record<string, string> = {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      };

      // Add test mode flag if using the sandbox
      if (this.isTestnet) {
        headers['x-simulated-trading'] = '1';
      }

      const url = `${this.baseUrl}${endpoint}`;
      const config: AxiosRequestConfig = {
        method,
        url,
        headers,
        params: method === 'GET' ? params : undefined,
        data: method === 'POST' ? params : undefined,
      };

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('OKX API Error:', error.message);
      if (error.response) {
        console.error('OKX API Response:', error.response.data);
        throw new Error(`OKX API Error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}

/**
 * Create a OKX service with custom credentials
 * Used for validating API keys and testing connections
 */
export function createOkxServiceWithCustomCredentials(
  apiKey: string,
  secretKey: string,
  passphrase: string,
  useTestnet: boolean = true
): OkxService {
  return new OkxService(apiKey, secretKey, passphrase, useTestnet);
}

// Create a default service with no credentials
// Only for public endpoints - authenticated requests will fail
export const okxService = new OkxService('', '', '', true);