import { okxService } from './okxService';
import { DEFAULT_CURRENCIES, API_KEY, SECRET_KEY, PASSPHRASE, DEFAULT_TIMEOUT } from './config';
import axios from 'axios';

// Define response types
interface Balance {
  ccy: string;        // Currency
  availBal: string;   // Available balance
  frozenBal: string;  // Frozen balance 
  bal: string;        // Total balance
  eq: string;         // Equity in USD
}

interface OkxResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

interface AccountBalance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  valueUSD: number;
}

// Service for account-related operations
export class AccountService {
  /**
   * Get account balances
   * If the API request fails or authentication is not set up, returns empty balances
   * 
   * @param {boolean} throwError - If true, will throw errors instead of returning empty balances
   * @returns Array of account balances or throws error if throwError is true
   */
  async getAccountBalances(throwError = false): Promise<AccountBalance[]> {
    // Check if OKX API is properly configured first
    if (!okxService.isConfigured()) {
      console.warn('OKX API credentials not configured - returning empty balances');
      if (throwError) {
        throw new Error('OKX API credentials not configured');
      }
      return this.getEmptyBalanceResponse();
    }
    
    try {
      console.log('Fetching account balances from OKX API with demo mode enabled...');
      
      // Prepare timestamp for the request
      const timestamp = new Date().toISOString();
      const method = 'GET';
      const requestPath = '/api/v5/account/balance';
      
      // Generate signature as per the example code
      const signature = okxService['generateSignature'](timestamp, method, requestPath);
      
      // Make direct API call to ensure demo mode is properly set
      const response = await axios.get(`${okxService.getBaseUrl()}${requestPath}`, {
        headers: {
          'OK-ACCESS-KEY': API_KEY,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': PASSPHRASE,
          'x-simulated-trading': '1' // Ensure demo trading mode is enabled
        },
        timeout: DEFAULT_TIMEOUT
      });
      
      console.log('OKX API response status:', response.status);
      
      if (response.data.code !== '0') {
        console.warn(`Failed to fetch account balances: ${response.data.msg} (Code: ${response.data.code})`);
        if (throwError) {
          throw new Error(`OKX API error (code ${response.data.code}): ${response.data.msg}`);
        }
        return this.getEmptyBalanceResponse();
      }
      
      if (!response.data.data[0]?.details) {
        console.warn('Account balance data format unexpected - no details found');
        if (throwError) {
          throw new Error('Failed to parse OKX balance data - unexpected format');
        }
        return this.getEmptyBalanceResponse();
      }
      
      // Format the response data
      return response.data.data[0].details.map((balance: Balance): AccountBalance => ({
        currency: balance.ccy,
        available: parseFloat(balance.availBal),
        frozen: parseFloat(balance.frozenBal),
        total: parseFloat(balance.bal),
        valueUSD: parseFloat(balance.eq)
      }));
    } catch (error: unknown) {
      const err = error as Error & { response?: { data: unknown } };
      console.error('Failed to fetch account balances:', err.response?.data || err.message);
      if (throwError) {
        throw error;
      }
      return this.getEmptyBalanceResponse();
    }
  }
  
  /**
   * Return empty balance data for common currencies when API request fails
   * This provides a graceful fallback when API authentication is unavailable
   */
  private getEmptyBalanceResponse(): AccountBalance[] {
    return DEFAULT_CURRENCIES.map(currency => ({
      currency,
      available: 0,
      frozen: 0,
      total: 0,
      valueUSD: 0
    }));
  }
  
  /**
   * Get trading history
   * Returns empty array if authentication fails
   */
  async getTradingHistory(): Promise<any[]> {
    // Check if OKX API is properly configured first
    if (!okxService.isConfigured()) {
      console.warn('OKX API credentials not configured - returning empty trading history');
      return [];
    }
    
    try {
      const response = await okxService.makeAuthenticatedRequest<OkxResponse<any>>(
        'GET',
        '/api/v5/trade/fills'
      );
      
      if (response.code !== '0') {
        console.warn(`Failed to fetch trading history: ${response.msg}`);
        return [];
      }
      
      return response.data || [];
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Failed to fetch trading history:', err.message);
      return [];
    }
  }
  
  /**
   * Get open orders
   * Returns empty array if authentication fails
   */
  async getOpenOrders(): Promise<any[]> {
    // Check if OKX API is properly configured first
    if (!okxService.isConfigured()) {
      console.warn('OKX API credentials not configured - returning empty orders list');
      return [];
    }
    
    try {
      const response = await okxService.makeAuthenticatedRequest<OkxResponse<any>>(
        'GET',
        '/api/v5/trade/orders-pending'
      );
      
      if (response.code !== '0') {
        console.warn(`Failed to fetch open orders: ${response.msg}`);
        return [];
      }
      
      return response.data || [];
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Failed to fetch open orders:', err.message);
      return [];
    }
  }
  
  /**
   * Place a new order
   * Returns a standardized response format with success/error information
   */
  async placeOrder(symbol: string, side: 'buy' | 'sell', type: 'market' | 'limit', amount: string, price?: string): Promise<{ success: boolean; orderId?: string; message: string; error?: any }> {
    // Check if OKX API is properly configured first
    if (!okxService.isConfigured()) {
      return {
        success: false,
        message: 'OKX API credentials not configured - unable to place order'
      };
    }
    
    try {
      // Convert order type to OKX format
      const ordType = type === 'market' ? 'market' : 'limit';
      
      const response = await okxService.placeOrder(symbol, side, ordType, amount, price);
      
      if (response && typeof response === 'object' && 'code' in response && response.code !== '0') {
        return {
          success: false,
          message: `Failed to place order: ${(response as any).msg || 'Unknown error'}`,
          error: response
        };
      }
      
      return {
        success: true,
        orderId: response && typeof response === 'object' && 'data' in response ? 
          (response.data as any[])[0]?.ordId : undefined,
        message: 'Order placed successfully'
      };
    } catch (error: any) {
      console.error('Failed to place order:', error);
      return {
        success: false,
        message: `Failed to place order: ${error.message || 'Unknown error'}`,
        error
      };
    }
  }
  
  /**
   * Cancel an existing order
   * Returns a standardized response format with success/error information
   */
  async cancelOrder(symbol: string, orderId: string): Promise<{ success: boolean; message: string; error?: any }> {
    // Check if OKX API is properly configured first
    if (!okxService.isConfigured()) {
      return {
        success: false,
        message: 'OKX API credentials not configured - unable to cancel order'
      };
    }
    
    try {
      const response = await okxService.cancelOrder(symbol, orderId);
      
      if (response && typeof response === 'object' && 'code' in response && response.code !== '0') {
        return {
          success: false,
          message: `Failed to cancel order: ${(response as any).msg || 'Unknown error'}`,
          error: response
        };
      }
      
      return {
        success: true,
        message: 'Order cancelled successfully'
      };
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      return {
        success: false,
        message: `Failed to cancel order: ${error.message || 'Unknown error'}`,
        error
      };
    }
  }
  
  /**
   * Check if API connection and authentication are working
   * Performs comprehensive diagnostics on the OKX API integration
   */
  async checkConnection(): Promise<{ 
    connected: boolean; 
    authenticated: boolean; 
    message: string; 
    publicApiWorking?: boolean;
    apiKeyConfigured?: boolean;
    apiUrl?: string;
    isDemo?: boolean;
    details?: any;
  }> {
    console.log('Running comprehensive OKX API connection check...');
    
    // First, check base configuration
    const apiKeyConfigured = okxService.isConfigured();
    const isDemo = true; // We're using demo mode by default
    const apiUrl = okxService.getBaseUrl();
    
    console.log(`OKX API configuration status: 
      - API URL: ${apiUrl}
      - Demo Mode: ${isDemo ? 'Enabled' : 'Disabled'}
      - API Key Configured: ${apiKeyConfigured ? 'Yes' : 'No'}`);
    
    // Then check public API first (doesn't require authentication)
    try {
      console.log('Testing OKX public API connection...');
      
      // Attempt to get market data which doesn't require authentication
      const marketData = await okxService.makePublicRequest<OkxResponse<any>>('/api/v5/market/tickers?instType=SPOT');
      
      // If we reach here, public API is working
      const publicApiWorking = marketData && marketData.code === '0';
      
      console.log(`OKX public API test ${publicApiWorking ? 'SUCCEEDED' : 'FAILED'}`);
      
      if (!publicApiWorking) {
        return {
          connected: false,
          authenticated: false,
          message: 'Failed to connect to OKX public API. The API might be down or network connectivity issues exist.',
          publicApiWorking: false,
          apiKeyConfigured,
          apiUrl,
          isDemo
        };
      }
      
      // If API keys aren't configured, we can't test authentication
      if (!apiKeyConfigured) {
        return {
          connected: true,
          authenticated: false,
          message: 'Connected to OKX public API, but API keys are not yet configured. Please provide API credentials to enable trading.',
          publicApiWorking: true,
          apiKeyConfigured,
          apiUrl,
          isDemo
        };
      }
      
      // Try to access authenticated endpoint
      try {
        console.log('Testing OKX authenticated API connection...');
        
        // Before checking balances, we need to verify if the OKX API authentication actually works
        // Make a direct call that requires authentication to test auth status
        const authTest = await okxService.makeAuthenticatedRequest('GET', '/api/v5/account/config');
        
        // If we reach here without an error, authentication was successful
        if (!authTest || typeof authTest !== 'object' || !('code' in authTest) || authTest.code !== '0') {
          // Auth test failed with a non-success code
          console.error('Authentication test failed:', authTest);
          return {
            connected: true,
            authenticated: false,
            message: `Connected to OKX public API, but authentication failed with code ${(authTest as any)?.code || 'unknown'}: ${(authTest as any)?.msg || 'unknown error'}`,
            publicApiWorking: true,
            apiKeyConfigured,
            apiUrl,
            isDemo,
            details: { authResponse: authTest }
          };
        }
        
        // If authentication passed, get balances with throwError parameter set to true
        const balances = await this.getAccountBalances(true);
        
        // If we have balances with non-zero values, authentication is definitely working
        const hasRealBalances = balances.some(balance => balance.total > 0);
        
        return {
          connected: true,
          authenticated: true,
          message: `Successfully connected to OKX API with full authentication. ${hasRealBalances ? 'Account has balance data.' : 'Account exists but may have no funds.'}`,
          publicApiWorking: true,
          apiKeyConfigured,
          apiUrl,
          isDemo
        };
      } catch (authError: any) {
        // Detailed authentication error information
        console.error('OKX authentication error:', authError);
        
        // Check for specific OKX error responses
        let errorMessage = authError.message;
        let details = {};
        
        // Check if this is an axios error with an OKX API response containing an error code
        if (authError.response?.data?.code) {
          const errorCode = authError.response.data.code;
          details = { 
            errorCode,
            originalMessage: authError.response.data.msg || 'Unknown error'
          };
          
          // Provide helpful guidance based on error code
          if (errorCode === '50119') {
            errorMessage = "API key doesn't exist (code 50119). Please check that your API key is correct and has been created with Read and Trade permissions.";
          } else if (errorCode === '50102') {
            errorMessage = "Timestamp error (code 50102). Your system clock may be out of sync or there might be network latency issues.";
          } else if (errorCode === '50103') {
            errorMessage = "Invalid signature (code 50103). The SECRET_KEY might be incorrect or improperly formatted.";
          } else if (errorCode === '50104') {
            errorMessage = "Invalid passphrase (code 50104). The PASSPHRASE does not match what was set when creating the API key.";
          } else {
            errorMessage = `OKX API error (code ${errorCode}): ${authError.response.data.msg}`;
          }
        }
        
        // Authentication failed but public API works
        return {
          connected: true,
          authenticated: false,
          message: `Connected to OKX public API, but authentication failed: ${errorMessage}`,
          publicApiWorking: true,
          apiKeyConfigured,
          apiUrl,
          isDemo,
          details
        };
      }
    } catch (error: any) {
      // Complete connection failure
      console.error('OKX complete connection failure:', error);
      
      return {
        connected: false,
        authenticated: false,
        message: `Failed to connect to OKX API: ${error.message}. This could be due to network connectivity issues or the API being unavailable.`,
        publicApiWorking: false,
        apiKeyConfigured,
        apiUrl,
        isDemo,
        details: { originalError: error.message }
      };
    }
  }
}

// Create and export default instance
export const accountService = new AccountService();