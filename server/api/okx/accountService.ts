import { okxService } from './okxService';

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
   */
  async getAccountBalances(): Promise<AccountBalance[]> {
    try {
      const response = await okxService.makeAuthenticatedRequest<OkxResponse<{ details: Balance[] }>>(
        'GET',
        '/api/v5/account/balance'
      );
      
      if (response.code !== '0' || !response.data[0]?.details) {
        throw new Error(`Failed to fetch account balances: ${response.msg}`);
      }
      
      // Format the response data
      return response.data[0].details.map(balance => ({
        currency: balance.ccy,
        available: parseFloat(balance.availBal),
        frozen: parseFloat(balance.frozenBal),
        total: parseFloat(balance.bal),
        valueUSD: parseFloat(balance.eq)
      }));
    } catch (error) {
      console.error('Failed to fetch account balances:', error);
      throw error;
    }
  }
  
  /**
   * Get trading history
   */
  async getTradingHistory(): Promise<any[]> {
    try {
      const response = await okxService.makeAuthenticatedRequest<OkxResponse<any>>(
        'GET',
        '/api/v5/trade/fills'
      );
      
      if (response.code !== '0') {
        throw new Error(`Failed to fetch trading history: ${response.msg}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch trading history:', error);
      throw error;
    }
  }
  
  /**
   * Get open orders
   */
  async getOpenOrders(): Promise<any[]> {
    try {
      const response = await okxService.makeAuthenticatedRequest<OkxResponse<any>>(
        'GET',
        '/api/v5/trade/orders-pending'
      );
      
      if (response.code !== '0') {
        throw new Error(`Failed to fetch open orders: ${response.msg}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
      throw error;
    }
  }
  
  /**
   * Place a new order
   */
  async placeOrder(symbol: string, side: 'buy' | 'sell', type: 'market' | 'limit', amount: string, price?: string): Promise<any> {
    try {
      // Convert order type to OKX format
      const ordType = type === 'market' ? 'market' : 'limit';
      
      const response = await okxService.placeOrder(symbol, side, ordType, amount, price);
      return response;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }
  
  /**
   * Cancel an existing order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    try {
      const response = await okxService.cancelOrder(symbol, orderId);
      return response;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }
  
  /**
   * Check if API connection and authentication are working
   */
  async checkConnection(): Promise<{ connected: boolean; authenticated: boolean; message: string; publicApiWorking?: boolean }> {
    // Check public API first
    try {
      // Attempt to get market data which doesn't require authentication
      const marketData = await okxService.makePublicRequest<OkxResponse<any>>('/api/v5/market/tickers?instType=SPOT');
      
      // If we reach here, public API is working
      const publicApiWorking = marketData && marketData.code === '0';
      
      if (!publicApiWorking) {
        return {
          connected: false,
          authenticated: false,
          message: 'Failed to connect to OKX public API',
          publicApiWorking: false
        };
      }
      
      // Now check if API keys are configured
      const apiConfigured = okxService.isConfigured();
      
      if (!apiConfigured) {
        return {
          connected: true,
          authenticated: false,
          message: 'Connected to OKX public API, but API keys are not configured',
          publicApiWorking: true
        };
      }
      
      // Try to access authenticated endpoint
      try {
        await this.getAccountBalances();
        
        return {
          connected: true,
          authenticated: true,
          message: 'Successfully connected to OKX API with full authentication',
          publicApiWorking: true
        };
      } catch (authError: any) {
        // Check for specific OKX error responses
        let errorMessage = authError.message;
        
        // Check if this is an axios error with an OKX API response containing an error code
        if (authError.response?.data?.code === '50119') {
          errorMessage = "API key doesn't exist (code 50119). Please check that your API key is correct and has been created with Read and Trade permissions.";
        }
        
        // Authentication failed but public API works
        return {
          connected: true,
          authenticated: false,
          message: `Connected to OKX public API, but authentication failed: ${errorMessage}`,
          publicApiWorking: true
        };
      }
    } catch (error: any) {
      // Complete connection failure
      return {
        connected: false,
        authenticated: false,
        message: `Failed to connect to OKX API: ${error.message}`,
        publicApiWorking: false
      };
    }
  }
}

// Create and export default instance
export const accountService = new AccountService();