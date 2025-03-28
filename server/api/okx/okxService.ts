import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import CryptoJS from 'crypto-js';
import { 
  OKX_BASE_URL, 
  OKX_DEMO_BASE_URL, 
  API_KEY, 
  SECRET_KEY, 
  PASSPHRASE,
  DEFAULT_TIMEOUT,
  isConfigured
} from './config';

// Error for when API is not configured
class OkxApiNotConfiguredError extends Error {
  constructor() {
    super('OKX API is not configured. Please provide API_KEY, SECRET_KEY, and PASSPHRASE');
    this.name = 'OkxApiNotConfiguredError';
  }
}

// Define OkxResponse interface
interface OkxResponse<T> {
  code: string;
  msg: string;
  data: T;
}

// Interface for Custom Credentials
interface CustomCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
}

// Main service class for OKX API
export class OkxService {
  private baseUrl: string;
  private isDemo: boolean;
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private useCustomCredentials: boolean;
  private userId?: number; // Add user ID to track owner of these credentials

  constructor(
    useDemo = true, 
    customCredentials?: CustomCredentials,
    userId?: number
  ) {
    this.isDemo = useDemo;
    this.baseUrl = useDemo ? OKX_DEMO_BASE_URL : OKX_BASE_URL;
    this.userId = userId;
    
    // Check if custom credentials are provided and valid
    this.useCustomCredentials = !!(
      customCredentials && 
      customCredentials.apiKey && 
      customCredentials.secretKey && 
      customCredentials.passphrase
    );
    
    if (this.useCustomCredentials && customCredentials) {
      this.apiKey = customCredentials.apiKey;
      this.secretKey = customCredentials.secretKey;
      this.passphrase = customCredentials.passphrase;
      
      const userIdText = userId ? ` for user ID ${userId}` : '';
      console.log(`OKX Service: Using custom user-provided API credentials${userIdText}`);
    } else {
      // No user credentials found - for better security, we no longer use fallback keys
      // We'll only permit access to public market data
      console.log('No valid API credentials - limiting to public endpoints only');
      this.apiKey = '';      // Intentionally using empty credentials
      this.secretKey = '';   // to prevent accidental usage of private endpoints
      this.passphrase = '';
      
      // If this is for a specific user, make that clear in the logs
      if (userId) {
        console.log(`Note: User ID ${userId} does not have valid API keys configured - they can only access public market data`);
      }
    }
  }

  /**
   * Generate signature required for authenticated API calls
   */
  private generateSignature(timestamp: string, method: string, requestPath: string, body = ''): string {
    // Pre-encode the message for signature
    const message = timestamp + method + requestPath + body;
    
    // Log signature components more verbosely for debugging
    console.log('【OKX Signature】 Generating signature with:');
    console.log(`- Timestamp: ${timestamp}`);
    console.log(`- Method: ${method}`);
    console.log(`- Path: ${requestPath}`);
    console.log(`- Body Length: ${body.length} chars`);
    console.log(`- Message Format: ${timestamp + method + requestPath}[body omitted for security]`);
    console.log(`- Secret Key Length: ${this.secretKey.length} chars`);
    
    // According to OKX API docs:
    // The signature should be BASE64-encoded HMAC-SHA256 of (timestamp + method + requestPath + body) using the SecretKey
    
    // Create HMAC SHA256 signature using the secret key
    const signature = CryptoJS.HmacSHA256(message, this.secretKey).toString(CryptoJS.enc.Base64);
    
    console.log(`- Generated Signature (first 10 chars): ${signature.substring(0, 10)}...`);
    
    return signature;
  }
  
  /**
   * Get passphrase for API v5
   * According to OKX API docs, we need to use the encoded passphrase for REST API calls
   */
  private getPassphrase(): string {
    // Always use the instance passphrase (could be custom or default)
    if (!this.passphrase) {
      throw new Error('OKX passphrase is not configured');
    }
    
    // Log the format of the passphrase (only first and last characters for security)
    const passFirst = this.passphrase.slice(0, 1);
    const passLast = this.passphrase.slice(-1);
    console.log(`Using passphrase format: ${passFirst}...${passLast} (length: ${this.passphrase.length})`);
    
    try {
      // Convert to string explicitly in case we received a non-string somehow
      const originalPassphrase = String(this.passphrase);
      
      // Check for trailing dot
      const endsWithDot = originalPassphrase.endsWith('.');
      if (endsWithDot) {
        console.log('DETECTED: Passphrase ends with dot - this is a known issue with OKX API');
        
        // Create modified version without trailing dot
        const modifiedPassphrase = originalPassphrase.slice(0, -1); // Remove last character (the dot)
        console.log('Created alternative passphrase without trailing dot');
        
        // For DETAILED DEBUG ONLY:
        // Try using unencoded passphrase (not recommended for production)
        // console.log('TRYING unencoded passphrase as fallback');
        // return originalPassphrase;
        
        // Return OKX recommended encoding (base64) without the trailing dot
        const modifiedEncoded = Buffer.from(modifiedPassphrase).toString('base64');
        console.log('Trying modified passphrase encoding');
        console.log(`Modified passphrase encoded (first/last 2 chars): ${modifiedEncoded.slice(0, 2)}...${modifiedEncoded.slice(-2)}`);

        return modifiedEncoded;
      }
      
      // Check for special characters that could cause issues
      const hasSpecialChars = originalPassphrase !== encodeURIComponent(originalPassphrase);
      if (hasSpecialChars) {
        console.log('WARNING: Passphrase contains special characters - this can cause authentication issues with OKX API');
      }
      
      // According to OKX API docs v5, the passphrase needs to be Base64 encoded
      // https://www.okx.com/docs-v5/en/#rest-api-authentication-signature
      const base64Passphrase = Buffer.from(originalPassphrase).toString('base64');
      console.log(`Standard encoded passphrase (first/last 2 chars): ${base64Passphrase.slice(0, 2)}...${base64Passphrase.slice(-2)}`);
      
      // Log guidelines for API key creation
      console.log('NOTE: When creating OKX API keys, the passphrase should NOT have special characters or trailing dots');
      
      return base64Passphrase;
    } catch (error) {
      console.error('Error encoding passphrase:', error);
      
      // As a last resort, try an unencoded passphrase (WARNING: only for desperate debugging)
      console.log('ERROR FALLBACK: Sending raw passphrase without encoding');
      return this.passphrase; 
    }
  }

  /**
   * Make authenticated API request to OKX
   */
  async makeAuthenticatedRequest<T>(
    method: string,
    endpoint: string,
    data: any = {}
  ): Promise<T> {
    // Verify API is configured using the instance method (which checks both custom and default credentials)
    if (!this.isConfigured()) {
      console.error('Attempted to make authenticated request but API keys not configured');
      throw new OkxApiNotConfiguredError();
    }
    
    // Additional verification that credentials are not empty strings
    if (this.apiKey === '' || this.secretKey === '' || this.passphrase === '') {
      console.error('Attempted to make authenticated request but API keys are empty');
      throw new OkxApiNotConfiguredError();
    }

    // Prepare request timestamp
    const timestamp = new Date().toISOString();
    
    // Prepare request body and path
    const requestPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const body = method !== 'GET' ? JSON.stringify(data) : '';
    
    // Generate signature
    const signature = this.generateSignature(timestamp, method, requestPath, body);
    
    // Log request information
    console.log(`OKX API request: ${method} ${requestPath}`);
    
    // Get the encoded passphrase
    const encodedPassphrase = this.getPassphrase();
    
    // Important: According to the latest OKX API documentation (v5), the passphrase 
    // should be base64 encoded when creating the API key AND when making API calls.
    // See: https://www.okx.com/docs-v5/en/#rest-api-authentication-signature
    // Create fresh encodings in case the passphrase had issues before
    
    // Setup request configuration with the instance's API key (which could be custom or default)
    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseUrl}${requestPath}`,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': encodedPassphrase,
        // Add demo trading header only when isDemo is true
        // OKX requires 'x-simulated-trading' header for demo mode
        ...(this.isDemo ? { 'x-simulated-trading': '1' } : {}),
        // Add additional debugging headers
        'User-Agent': 'OKX-API-Client'
      }
    } as AxiosRequestConfig;
    
    // Add request body for non-GET requests
    if (method !== 'GET' && body) {
      config.data = body;
    }
    
    try {
      // Add more detailed logging of the request for debugging
      console.log(`Making ${this.isDemo ? 'DEMO' : 'LIVE'} OKX API request:`, {
        method,
        path: requestPath,
        demoMode: this.isDemo,
        timestampFormat: timestamp
      });
      
      // Log detailed request information for debugging (excluding sensitive data)
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'x-simulated-trading': this.isDemo ? '1' : 'disabled',
        'URL': `${this.baseUrl}${requestPath}`
      });
      
      // Make the request
      const response = await axios(config);
      
      // Check if the response contains an OKX API error
      if (response.data && response.data.code && response.data.code !== '0') {
        console.error(`OKX API error: code ${response.data.code}, message: ${response.data.msg}`);
        
        // Handle specific error codes with more detailed messages
        let errorMessage = response.data.msg || 'OKX API Error';
        
        // Add helpful troubleshooting advice based on error code
        if (response.data.code === '50119') {
          errorMessage += ". This typically means the API key is invalid, doesn't exist, or wasn't created on the main OKX exchange (not OKX Wallet).";
        } else if (response.data.code === '50102') {
          errorMessage += ". This typically means the timestamp is invalid or request timed out.";
        } else if (response.data.code === '50103') {
          errorMessage += ". This typically means the signature is invalid - check your SECRET_KEY format.";
        } else if (response.data.code === '50104' || response.data.code === '50105') {
          errorMessage += ". This typically means the passphrase is incorrect or not properly encoded.";
          
          // Add special logging for passphrase issues
          console.error('PASSPHRASE ERROR: Please ensure your passphrase was entered correctly when creating your API key');
          console.error('When creating the API key on OKX, the passphrase should be plain text, our system does the encoding');
        }
        
        // Create an error object with the response data for better error handling
        const apiError: any = new Error(errorMessage);
        apiError.code = response.data.code;
        apiError.response = response;
        throw apiError;
      }
      
      return response.data as T;
    } catch (error: any) {
      // Log and rethrow the error with more context
      if (error.response?.data) {
        console.error('OKX API request failed:', {
          status: error.response.status,
          code: error.response.data.code,
          message: error.response.data.msg
        });
        
        // Add debug information for specific endpoints
        if (requestPath.includes('/account/balance')) {
          console.log('Note: /account/balance endpoint requires Read permission on your API key');
        } else if (requestPath.includes('/trade/')) {
          console.log('Note: Trade-related endpoints require Trade permission on your API key');
        }
        
        // Special handling for passphrase errors - very common issue
        if (error.response.data.code === '50105') {
          console.error('PASSPHRASE ERROR DETAILS: The passphrase should NOT be encoded when creating the API key.');
          console.error('It should be entered as plain text in OKX, and our system will handle the encoding.');
          console.error('Please try recreating your API key with a simple passphrase without special characters.');
        }
      } else {
        console.error('OKX API request failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Make public (non-authenticated) API request to OKX
   */
  async makePublicRequest<T>(endpoint: string, params: any = {}): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await axios.get(url, { 
        params,
        timeout: DEFAULT_TIMEOUT 
      });
      
      // Check if the response contains an OKX API error
      if (response.data && response.data.code && response.data.code !== '0') {
        console.error(`OKX API error in public request: code ${response.data.code}, message: ${response.data.msg}`);
        
        // Create an error object with the response data for better error handling
        const apiError: any = new Error(response.data.msg || 'OKX API Error');
        apiError.code = response.data.code;
        apiError.response = response;
        throw apiError;
      }
      
      return response.data as T;
    } catch (error: any) {
      // Log and rethrow the error with more context
      if (error.response?.data) {
        console.error('OKX public API request failed:', {
          status: error.response.status,
          code: error.response.data.code,
          message: error.response.data.msg
        });
      } else {
        console.error('OKX public API request failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    console.log("OKX getAccountInfo: Attempting to call /api/v5/account/balance");
    console.log(`Using API credentials (masked): ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    console.log(`Using demo mode: ${this.isDemo ? "YES" : "NO"}`);
    try {
      const result = await this.makeAuthenticatedRequest('GET', '/api/v5/account/balance');
      console.log("OKX getAccountInfo: SUCCESS - received valid account balance response");
      return result;
    } catch (error: any) {
      console.error("OKX getAccountInfo: FAILED with error:", error.message || 'Unknown error');
      throw error;
    }
  }
  
  /**
   * Check if API is configured with proper credentials
   */
  isConfigured(): boolean {
    // If we have custom credentials, check those
    if (this.useCustomCredentials) {
      return !!(this.apiKey && this.secretKey && this.passphrase);
    }
    // Otherwise check global config
    return isConfigured();
  }
  
  /**
   * Check if credentials are empty or just whitespace (for more specific error handling)
   */
  hasEmptyCredentials(): boolean {
    if (!this.apiKey || !this.secretKey || !this.passphrase) return true;
    if (this.apiKey.trim() === '' || this.secretKey.trim() === '' || this.passphrase.trim() === '') return true;
    return false;
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
    return this.makePublicRequest('/api/v5/market/tickers?instType=SPOT');
  }
  
  /**
   * Get ticker information for a specific trading pair
   */
  async getTicker(symbol: string) {
    return this.makePublicRequest(`/api/v5/market/ticker?instId=${symbol}`);
  }
  
  /**
   * Get all tickers for market overview (spot public)
   * Returns ticker information for all available trading pairs
   */
  async getAllTickers() {
    return this.makePublicRequest(`/api/v5/market/tickers?instType=SPOT`);
  }
  
  /**
   * Get candle data (klines) for a specific symbol and timeframe
   * @param symbol - Trading pair (e.g., BTC-USDT)
   * @param timeframe - Candle interval (e.g., 1m, 5m, 15m, 1H, 4H, 1D)
   * @param limit - Number of candles to return (max 100)
   */
  async getCandles(symbol: string, timeframe: string = '1H', limit: string = '100') {
    return this.makePublicRequest(`/api/v5/market/candles?instId=${symbol}&bar=${timeframe}&limit=${limit}`);
  }
  
  /**
   * Get market depth (order book) for specific symbol
   * @param symbol - Trading pair (e.g., BTC-USDT)
   * @param depth - Depth of order book (default: 50, max: 400)
   */
  async getOrderBook(symbol: string, depth: string = '50') {
    return this.makePublicRequest(`/api/v5/market/books?instId=${symbol}&sz=${depth}`);
  }
  
  /**
   * Get recent trades for a specific symbol
   * @param symbol - Trading pair (e.g., BTC-USDT)
   * @param limit - Number of trades to return (max 100)
   */
  async getTrades(symbol: string, limit: string = '50') {
    return this.makePublicRequest(`/api/v5/market/trades?instId=${symbol}&limit=${limit}`);
  }
  
  /**
   * Get historical candlestick data for chart
   */
  async getKlineData(symbol: string, interval = '1H', limit = 100): Promise<any> {
    // According to OKX API docs, bar parameter should be one of:
    // 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W, 1M, 3M, 6M, 1Y
    
    // Make sure interval is in the right format
    let formattedInterval = interval.toUpperCase();
    
    // Valid intervals
    const validIntervals = ['1M', '3M', '5M', '15M', '30M', '1H', '2H', '4H', '6H', '12H', '1D', '1W', '1M', '3M', '6M', '1Y'];
    
    // Default to 1H if not valid
    if (!validIntervals.includes(formattedInterval)) {
      console.warn(`Invalid interval '${interval}' provided, defaulting to '1H'`);
      formattedInterval = '1H';
    }
    
    // UPDATE: OKX API now requires 'timeframe' parameter instead of 'bar' (which causes "Parameter bar error")
    return this.makePublicRequest(`/api/v5/market/candles?instId=${symbol}&timeframe=${formattedInterval}&limit=${limit}`);
  }
  
  /**
   * Get account trading history
   */
  async getTradingHistory() {
    return this.makeAuthenticatedRequest('GET', '/api/v5/trade/fills');
  }
  
  /**
   * Get open orders
   */
  async getOpenOrders() {
    return this.makeAuthenticatedRequest('GET', '/api/v5/trade/orders-pending');
  }
  
  /**
   * Place a new order
   */
  async placeOrder(instId: string, side: string, ordType: string, sz: string, px?: string) {
    const data: any = {
      instId,
      tdMode: 'cash',
      side,
      ordType,
      sz
    };
    
    // Add price if it's a limit order
    if (ordType === 'limit' && px) {
      data.px = px;
    }
    
    return this.makeAuthenticatedRequest('POST', '/api/v5/trade/order', data);
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(instId: string, ordId: string) {
    return this.makeAuthenticatedRequest('POST', '/api/v5/trade/cancel-order', {
      instId,
      ordId
    });
  }
  
  /**
   * Test connectivity to the API
   */
  async ping() {
    try {
      await axios.get(`${this.baseUrl}/api/v5/public/time`);
      return { success: true, message: 'API connection successful', demo: this.isDemo };
    } catch (error) {
      return { success: false, message: 'API connection failed', error, demo: this.isDemo };
    }
  }
}

// Create a function to create OkxService instances with custom credentials
export function createOkxServiceWithCustomCredentials(
  apiKey: string,
  secretKey: string,
  passphrase: string,
  useDemo = true,
  userId?: number
): OkxService {
  return new OkxService(useDemo, { apiKey, secretKey, passphrase }, userId);
}

// Create and export default instance using demo mode and global env credentials
// Using demo/testnet mode to ensure proper environment for testing
// This default service will use demo trading (OKX testnet) by default
// The 'x-simulated-trading' header will be automatically added for all API requests
console.log('Creating default OKX service with testnet/demo mode enabled');
export const okxService = new OkxService(true);