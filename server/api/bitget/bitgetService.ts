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
      console.log('Bitget API not configured - aborting authenticated request');
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
    
    console.log(`Making authenticated ${method} request to ${this.baseUrl}${requestPath}`);
    
    // Log request details (excluding sensitive information)
    console.log('Request details:', {
      method,
      endpoint: requestPath,
      timestamp,
      hasSignature: !!signature,
      hasPassphrase: !!PASSPHRASE,
      timeout: DEFAULT_TIMEOUT,
      bodyLength: requestBody ? requestBody.length : 0
    });

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
      console.log(`Sending request to Bitget...`);
      const response: AxiosResponse = await axios(config);
      
      console.log(`Received response with status ${response.status}`);
      
      if (response.data && response.data.code) {
        console.log(`Response code: ${response.data.code}, message: ${response.data.msg || 'No message'}`);
      } else {
        console.log('Response has unexpected format:', typeof response.data);
      }
      
      if (response.data.code !== '00000') {
        throw new Error(`Bitget API error: ${response.data.msg} (${response.data.code})`);
      }
      
      return response.data.data as T;
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a non-2xx status
        console.error('Bitget API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Bitget API error: ${error.response.data.msg || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Bitget API no response error:', {
          requestPath,
          method,
          apiConfigured: isConfigured()
        });
        console.error('Request details:', error.request);
        throw new Error('No response from Bitget API');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Bitget API unexpected error:', error.message);
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

    console.log(`Making public request to ${url}`);

    try {
      console.log(`Sending public request to Bitget...`);
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

      console.log(`Received response with status ${response.status}`);
      
      // Log the raw response data type and first part of its content
      const responseType = typeof response.data;
      console.log(`Raw response type: ${responseType}`);
      
      if (responseType === 'object') {
        const isArray = Array.isArray(response.data);
        console.log(`Is array: ${isArray}`);
        
        if (isArray) {
          console.log(`Array length: ${response.data.length}`);
          if (response.data.length > 0) {
            console.log(`First item sample:`, JSON.stringify(response.data[0]).substring(0, 100));
          }
        } else {
          console.log(`Object keys: ${Object.keys(response.data).join(', ')}`);
        }
      }
      
      // Handle two possible response formats from Bitget API:
      // 1. Standard API response with code/msg/data fields
      // 2. Candles API which directly returns an array
      
      // Check if the response is an array (used for candles data)
      if (Array.isArray(response.data)) {
        console.log(`Received array response with ${response.data.length} items`);
        return response.data as T;
      }
      
      // Handle structured response with code/msg/data
      if (response.data && response.data.code) {
        console.log(`Response code: ${response.data.code}, message: ${response.data.msg || 'No message'}`);
        
        if (response.data.code !== '00000') {
          throw new Error(`Bitget API error: ${response.data.msg} (${response.data.code})`);
        }
        
        // Check if data property exists and log its type
        if ('data' in response.data) {
          const dataType = typeof response.data.data;
          console.log(`Data property type: ${dataType}`);
          
          if (dataType === 'object') {
            const isArray = Array.isArray(response.data.data);
            console.log(`Data is array: ${isArray}`);
            
            if (isArray) {
              console.log(`Data array length: ${response.data.data.length}`);
            } else if (response.data.data) {
              console.log(`Data object keys: ${Object.keys(response.data.data).join(', ')}`);
            }
          }
        } else {
          console.log('Response has no data property');
        }
        
        return response.data.data as T;
      }
      
      // Unknown response format, log and return as is
      console.log('Response has unexpected format:', typeof response.data);
      return response.data as T;
    } catch (error: any) {
      if (error.response) {
        console.error('Bitget API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        throw new Error(`Bitget API error: ${error.response.data.msg || 'Unknown error'}`);
      } else if (error.request) {
        console.error('Bitget API no response error:', {
          endpoint,
          url
        });
        console.error('Request details:', error.request);
        throw new Error('No response from Bitget API');
      } else {
        console.error('Bitget API unexpected error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Get account information - retrieves detailed account balance information
   * This provides comprehensive data about the user's assets
   * @returns Array of asset information with available and locked balances
   */
  async getAccountInfo() {
    if (!this.isConfigured()) {
      console.warn('Bitget API credentials not configured');
      return { data: [] };
    }
    
    try {
      console.log('Retrieving account assets from Bitget...');
      const response = await this.makeAuthenticatedRequest('GET', '/api/spot/v1/account/assets');
      
      // Log response structure for comprehensive debugging
      console.log('Full account response:', JSON.stringify(response));
      
      // The actual Bitget API returns the array directly without a data property
      // We need to adapt to the real API response format
      if (Array.isArray(response)) {
        console.log(`Successfully retrieved ${response.length} assets directly from API`);
        if (response.length > 0) {
          console.log('Sample asset structure:', JSON.stringify(response[0]));
        }
        // Return in the expected format for compatibility
        return { data: response };
      } 
      // Check if the response itself is an object with a data property
      else if (response && typeof response === 'object') {
        if ('data' in response) {
          const assets = response.data;
          console.log(`Successfully retrieved ${Array.isArray(assets) ? assets.length : 'unknown'} assets through data property`);
          if (Array.isArray(assets) && assets.length > 0) {
            console.log('Sample asset structure:', JSON.stringify(assets[0]));
          }
          return response;
        } else {
          console.warn('Unexpected response format from Bitget getAccountInfo - missing data property');
          console.log('Available properties:', Object.keys(response).join(', '));
          return { data: [] };
        }
      } else {
        console.error('Invalid response from Bitget getAccountInfo');
        return { data: [] };
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  /**
   * Check if API is configured with proper credentials
   */
  isConfigured(): boolean {
    return isConfigured() === true;
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
   * @returns All market tickers from Bitget in standardized format
   */
  async getAllTickers() {
    // Log the request to debug
    console.log('Fetching all tickers from Bitget...');
    
    try {
      // The API returns an object with a 'data' property containing the array
      const response = await this.makePublicRequest<any>('/api/spot/v1/market/tickers');
      
      // Log the response type for debugging
      console.log('Tickers response type:', typeof response);
      console.log('Is array:', Array.isArray(response));
      console.log('Response length:', Array.isArray(response) ? response.length : 0);
      
      // Check if the response itself is an array (direct response)
      if (Array.isArray(response)) {
        console.log(`Received ${response.length} tickers directly`);
        return response;
      }
      
      // Check if response has a data property that is an array
      if (response && response.data && Array.isArray(response.data)) {
        console.log(`Received ${response.data.length} tickers from data property`);
        return response.data;
      }
      
      // If we get here, log what we actually received
      console.error('Unexpected response format from getAllTickers:', 
                 response ? JSON.stringify(response).substring(0, 200) + '...' : 'null');
      
      return []; // Return empty array if no valid data
    } catch (error) {
      console.error('Error fetching all tickers:', error);
      return []; // Return empty on error
    }
  }

  /**
   * Get historical candlestick data for chart
   * 
   * @param symbol - Trading pair symbol (e.g., BTCUSDT)
   * @param interval - Time interval (e.g., '1min', '5min', '15min', '30min', '1h', '4h', '12h', '1day', '1week')
   * @param limit - Maximum number of results to return
   */
  async getKlineData(symbol: string, interval = '1h', limit = 100): Promise<any> {
    try {
      // Ensure symbol format is correct for candles endpoint (it requires symbol_SPBL format)
      const formattedSymbol = symbol.endsWith('_SPBL') ? symbol : `${symbol}_SPBL`;
      
      console.log(`Fetching candles for ${formattedSymbol} with interval ${interval}`);
      
      const response = await this.makePublicRequest<any>('/api/spot/v1/market/candles', {
        symbol: formattedSymbol,
        period: interval,
        limit
      });
      
      // מדפיס את התשובה המלאה מה-API 
      console.log('Raw candle response structure:', JSON.stringify({
        type: typeof response,
        keys: response ? Object.keys(response) : null,
        code: response?.code,
        msg: response?.msg,
        hasData: response && 'data' in response,
        dataType: response?.data ? typeof response.data : null,
        isDataArray: response?.data ? Array.isArray(response.data) : null,
        dataLength: response?.data && Array.isArray(response.data) ? response.data.length : null
      }));

      // יומני דיבוג נוספים על מבנה הנתונים אם יש
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('First candle data item:', response.data[0]);
      }
      
      // התשובה מה-API מגיעה במבנה הזה:
      // { code: "00000", msg: "success", requestTime: 123456789, data: [...] }
      if (response && response.code === "00000" && response.data && Array.isArray(response.data)) {
        console.log(`Successfully retrieved ${response.data.length} candles from Bitget API`);
        return response.data;
      }
      
      // נסיון נוסף למקרה שהתשובה בפורמט אחר
      if (Array.isArray(response)) {
        console.log(`Successfully retrieved ${response.length} candles directly from response (array format)`);
        return response;
      }
      
      // אם לא מצאנו נתונים תקינים, מחזירים מערך ריק
      console.warn('No valid candle data found in Bitget API response');
      return [];
    } catch (error) {
      console.error('Error fetching candle data:', error);
      return []; // Return empty array if error
    }
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
   * Added retry mechanism to improve reliability
   */
  async ping(maxRetries = 3) {
    // Bitget doesn't have a dedicated ping endpoint, so use a simple public endpoint
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to ping Bitget API (attempt ${attempt}/${maxRetries})...`);
        const result = await this.makePublicRequest('/api/spot/v1/public/time');
        console.log('Successfully pinged Bitget API');
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Ping attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
        
        // Only wait if we're going to retry
        if (attempt < maxRetries) {
          // Exponential backoff - wait longer between attempts
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all attempts failed
    throw lastError;
  }
  
  /**
   * Enhanced connection test that checks multiple endpoints
   * Attempts to access both public and private endpoints with retries
   */
  async checkConnection(testAuthenticated = true): Promise<{
    publicApi: boolean;
    authenticatedApi: boolean;
    message: string;
    details: {
      publicApiResponse?: string;
      publicApiError?: string;
      authenticatedApiResponse?: string;
      authenticatedApiError?: string;
      [key: string]: any;
    };
  }> {
    const result = {
      publicApi: false,
      authenticatedApi: false,
      message: '',
      details: {} as {
        publicApiResponse?: string;
        publicApiError?: string;
        authenticatedApiResponse?: string;
        authenticatedApiError?: string;
        [key: string]: any;
      }
    };
    
    // Test public endpoints
    try {
      const timeResponse = await this.ping(2);
      result.publicApi = true;
      result.details.publicApiResponse = 'Success';
      
      // If we just want to check public API, return now
      if (!testAuthenticated) {
        result.message = 'Public API connection successful. Authentication not tested.';
        return result;
      }
      
    } catch (error) {
      result.publicApi = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.message = `Failed to connect to Bitget public API: ${errorMsg}`;
      result.details.publicApiError = errorMsg;
      return result;
    }
    
    // Now test authenticated endpoints if we got API keys
    if (this.isConfigured()) {
      try {
        // Use smaller timeout for authenticated tests
        const accountResponse = await this.getAccountInfo();
        result.authenticatedApi = true;
        result.message = 'Successfully connected to Bitget API with authentication';
        result.details.authenticatedApiResponse = 'Success';
      } catch (error) {
        result.authenticatedApi = false;
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.message = `Public API connection successful, but authentication failed: ${errorMsg}`;
        result.details.authenticatedApiError = errorMsg;
      }
    } else {
      result.message = 'Public API connection successful. Authentication not tested (no API keys).';
    }
    
    return result;
  }
}

// Export a singleton instance
export const bitgetService = new BitgetService(USE_TESTNET);