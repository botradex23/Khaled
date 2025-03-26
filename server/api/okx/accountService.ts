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
  async checkConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      // First check public API
      const pingResult = await okxService.ping();
      
      if (!pingResult.success) {
        return {
          connected: false,
          message: 'Failed to connect to OKX API'
        };
      }
      
      // Then try to access authenticated endpoint
      await this.getAccountBalances();
      
      return {
        connected: true,
        message: 'Successfully connected to OKX API with authentication'
      };
    } catch (error: any) {
      if (error.name === 'OkxApiNotConfiguredError') {
        return {
          connected: false,
          message: 'OKX API is not configured. Please provide API credentials'
        };
      }
      
      return {
        connected: false,
        message: `Failed to authenticate with OKX API: ${error.message}`
      };
    }
  }
}

// Create and export default instance
export const accountService = new AccountService();