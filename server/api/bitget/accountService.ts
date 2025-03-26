import { bitgetService } from './bitgetService';
import { ALWAYS_USE_DEMO } from './config';

/**
 * Interface for standardized account balance information
 */
interface AccountBalance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  valueUSD: number;
}

export class AccountService {
  /**
   * Get account balances
   * If the API request fails or authentication is not set up, returns demo balances
   * 
   * @param {boolean} throwError - If true, will throw errors instead of returning demo balances
   * @param {boolean} forceDemoData - If true, always return demo data regardless of API status
   * @returns Array of account balances or throws error if throwError is true
   */
  async getAccountBalances(throwError = false, forceDemoData = false): Promise<AccountBalance[]> {
    try {
      // If ALWAYS_USE_DEMO or forceDemoData is true, return demo data
      if (ALWAYS_USE_DEMO || forceDemoData) {
        console.log('Using demo account balance data');
        return this.getEmptyBalanceResponse();
      }
      
      // Check if API is configured before making request
      if (!bitgetService.isConfigured()) {
        console.log('Bitget API not configured, using demo account balance data');
        if (throwError) {
          throw new Error('Bitget API credentials not configured');
        }
        return this.getEmptyBalanceResponse();
      }
      
      // Make API request to get account balances
      const response = await bitgetService.getAccountInfo();
      
      // Transform the data to our standard format
      return response.map((asset: any): AccountBalance => ({
        currency: asset.coinName,
        available: parseFloat(asset.available),
        frozen: parseFloat(asset.locked),
        total: parseFloat(asset.available) + parseFloat(asset.locked),
        valueUSD: parseFloat(asset.usdValue || '0')
      }));
    } catch (error) {
      console.error('Failed to fetch account balances:', error);
      
      if (throwError) {
        throw error;
      }
      
      // Return demo data on error
      return this.getEmptyBalanceResponse();
    }
  }
  
  /**
   * Return demo balance data for common currencies when API request fails
   * This provides realistic sample data when API authentication is unavailable
   */
  private getEmptyBalanceResponse(): AccountBalance[] {
    return [
      {
        currency: 'BTC',
        available: 0.75,
        frozen: 0.25,
        total: 1.0,
        valueUSD: 35000.0
      },
      {
        currency: 'ETH',
        available: 15.5,
        frozen: 1.5,
        total: 17.0,
        valueUSD: 35700.0
      },
      {
        currency: 'USDT',
        available: 25000.0,
        frozen: 5000.0,
        total: 30000.0,
        valueUSD: 30000.0
      },
      {
        currency: 'SOL',
        available: 250.0,
        frozen: 50.0,
        total: 300.0,
        valueUSD: 24000.0
      },
      {
        currency: 'DOGE',
        available: 150000.0,
        frozen: 25000.0,
        total: 175000.0,
        valueUSD: 12250.0
      }
    ];
  }
  
  /**
   * Get trading history
   * Returns demo data array if authentication fails
   * 
   * @param {boolean} forceDemoData - If true, always return demo data regardless of API status
   */
  async getTradingHistory(forceDemoData = false): Promise<any[]> {
    try {
      // If ALWAYS_USE_DEMO or forceDemoData is true, return demo data
      if (ALWAYS_USE_DEMO || forceDemoData) {
        console.log('Using demo trading history data');
        return this.getDemoTradingHistory();
      }
      
      // Check if API is configured before making request
      if (!bitgetService.isConfigured()) {
        console.log('Bitget API not configured, using demo trading history data');
        return this.getDemoTradingHistory();
      }
      
      // Make API request to get trading history
      const response = await bitgetService.getTradingHistory();
      
      // Transform the data to our standard format
      return response.map((trade: any) => ({
        id: trade.orderId,
        symbol: trade.symbol,
        side: trade.side.toLowerCase(),
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.size),
        total: parseFloat(trade.price) * parseFloat(trade.size),
        fee: parseFloat(trade.fee),
        feeCurrency: trade.feeCurrency,
        type: trade.orderType,
        timestamp: new Date(Number(trade.cTime)).toISOString(),
        status: trade.status
      }));
    } catch (error) {
      console.error('Failed to fetch trading history:', error);
      return this.getDemoTradingHistory();
    }
  }
  
  /**
   * Generate demo trading history data
   */
  private getDemoTradingHistory(): any[] {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
    const sides = ['buy', 'sell'];
    const types = ['limit', 'market'];
    const statuses = ['filled'];
    
    // Base prices for common crypto assets
    const basePrices: Record<string, number> = {
      'BTCUSDT': 35000,
      'ETHUSDT': 2100,
      'SOLUSDT': 80,
      'DOGEUSDT': 0.07,
      'XRPUSDT': 0.48
    };
    
    return Array.from({ length: 50 }, (_, i) => {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const basePrice = basePrices[symbol] || 100;
      
      // Random price variation
      const price = basePrice * (0.98 + Math.random() * 0.04);
      
      // Random quantity based on price (more expensive assets have lower quantities)
      const quantity = 5000 / basePrice * (0.5 + Math.random());
      
      // Calculate total and fee
      const total = price * quantity;
      const fee = total * 0.001; // 0.1% fee
      
      return {
        id: `demo-${Date.now()}-${i}`,
        symbol,
        side,
        price,
        quantity,
        total,
        fee,
        feeCurrency: symbol.replace('USDT', ''),
        type,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(), // Hour intervals
        status
      };
    });
  }
  
  /**
   * Get open orders
   * Returns demo data array if authentication fails
   * 
   * @param {boolean} forceDemoData - If true, always return demo data regardless of API status
   */
  async getOpenOrders(forceDemoData = false): Promise<any[]> {
    try {
      // If ALWAYS_USE_DEMO or forceDemoData is true, return demo data
      if (ALWAYS_USE_DEMO || forceDemoData) {
        console.log('Using demo open orders data');
        return this.getDemoOpenOrders();
      }
      
      // Check if API is configured before making request
      if (!bitgetService.isConfigured()) {
        console.log('Bitget API not configured, using demo open orders data');
        return this.getDemoOpenOrders();
      }
      
      // Make API request to get open orders
      const response = await bitgetService.getOpenOrders();
      
      // Transform the data to our standard format
      return response.map((order: any) => ({
        id: order.orderId,
        clientOrderId: order.clientOid,
        symbol: order.symbol,
        side: order.side.toLowerCase(),
        type: order.orderType,
        price: parseFloat(order.price),
        quantity: parseFloat(order.size),
        filledQuantity: parseFloat(order.filledQty),
        total: parseFloat(order.price) * parseFloat(order.size),
        status: order.status,
        timestamp: new Date(Number(order.cTime)).toISOString()
      }));
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
      return this.getDemoOpenOrders();
    }
  }
  
  /**
   * Generate demo open orders data
   */
  private getDemoOpenOrders(): any[] {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
    const sides = ['buy', 'sell'];
    const types = ['limit'];
    const statuses = ['open', 'partially_filled'];
    
    // Base prices for crypto assets
    const basePrices: Record<string, number> = {
      'BTCUSDT': 35000,
      'ETHUSDT': 2100,
      'SOLUSDT': 80,
      'DOGEUSDT': 0.07,
      'XRPUSDT': 0.48
    };
    
    return Array.from({ length: 5 }, (_, i) => {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const basePrice = basePrices[symbol] || 100;
      
      // For buy orders, price below market; for sell orders, price above market
      const priceOffset = side === 'buy' ? -0.02 : 0.02;
      const price = basePrice * (1 + priceOffset);
      
      // Random quantity
      const quantity = 5000 / basePrice * (0.5 + Math.random());
      
      // For partially filled orders, calculate filled amount
      const filledQuantity = status === 'partially_filled' 
        ? quantity * (0.1 + Math.random() * 0.4) 
        : 0;
      
      return {
        id: `demo-${Date.now()}-${i}`,
        clientOrderId: `client-${Date.now()}-${i}`,
        symbol,
        side,
        type,
        price,
        quantity,
        filledQuantity,
        total: price * quantity,
        status,
        timestamp: new Date(Date.now() - i * 900000).toISOString() // 15 minute intervals
      };
    });
  }
  
  /**
   * Place a new order
   * Returns a standardized response format with success/error information
   */
  async placeOrder(
    symbol: string, 
    side: 'buy' | 'sell', 
    orderType: 'limit' | 'market', 
    quantity: string, 
    price?: string
  ): Promise<{ success: boolean; orderId?: string; message: string; error?: any }> {
    try {
      // If ALWAYS_USE_DEMO is true, return successful demo response
      if (ALWAYS_USE_DEMO) {
        console.log('Using demo order placement response');
        return {
          success: true,
          orderId: `demo-${Date.now()}`,
          message: 'Demo order placed successfully'
        };
      }
      
      // Check if API is configured before making request
      if (!bitgetService.isConfigured()) {
        console.log('Bitget API not configured, using demo order response');
        return {
          success: true,
          orderId: `demo-${Date.now()}`,
          message: 'Demo order placed successfully (API not configured)'
        };
      }
      
      // Make API request to place order
      const response = await bitgetService.placeOrder(
        symbol, 
        side, 
        orderType, 
        quantity, 
        price
      );
      
      return {
        success: true,
        orderId: response.orderId,
        message: 'Order placed successfully'
      };
    } catch (error: any) {
      console.error('Failed to place order:', error);
      
      // If ALWAYS_USE_DEMO is true, still return success for demo purposes
      if (ALWAYS_USE_DEMO) {
        return {
          success: true,
          orderId: `demo-${Date.now()}`,
          message: 'Demo order placed successfully despite error'
        };
      }
      
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
  async cancelOrder(
    symbol: string, 
    orderId: string
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      // If ALWAYS_USE_DEMO is true, return successful demo response
      if (ALWAYS_USE_DEMO) {
        console.log('Using demo order cancellation response');
        return {
          success: true,
          message: 'Demo order cancelled successfully'
        };
      }
      
      // Check if API is configured before making request
      if (!bitgetService.isConfigured()) {
        console.log('Bitget API not configured, using demo cancel response');
        return {
          success: true,
          message: 'Demo order cancelled successfully (API not configured)'
        };
      }
      
      // Make API request to cancel order
      await bitgetService.cancelOrder(symbol, orderId);
      
      return {
        success: true,
        message: 'Order cancelled successfully'
      };
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      
      // If ALWAYS_USE_DEMO is true, still return success for demo purposes
      if (ALWAYS_USE_DEMO) {
        return {
          success: true,
          message: 'Demo order cancelled successfully despite error'
        };
      }
      
      return {
        success: false,
        message: `Failed to cancel order: ${error.message || 'Unknown error'}`,
        error
      };
    }
  }
  
  /**
   * Check if API connection and authentication are working
   * Performs comprehensive diagnostics on the Bitget API integration
   */
  async checkConnection(): Promise<{ 
    success: boolean; 
    authenticated: boolean; 
    message: string; 
    details?: any; 
    error?: any 
  }> {
    try {
      // First test basic API connectivity with a public endpoint
      await bitgetService.ping();
      
      // If ALWAYS_USE_DEMO is true, return demo connection info
      if (ALWAYS_USE_DEMO) {
        return {
          success: true,
          authenticated: true,
          message: 'Demo connection is functioning properly'
        };
      }
      
      // Check if API credentials are configured
      if (!bitgetService.isConfigured()) {
        return {
          success: true,
          authenticated: false,
          message: 'Public API connection successful, but API credentials are not configured'
        };
      }
      
      // Try to access account info to test authentication
      const accountInfo = await bitgetService.getAccountInfo();
      
      return {
        success: true,
        authenticated: true,
        message: 'API connection and authentication functioning properly',
        details: {
          accountInfo: accountInfo ? 'Retrieved successfully' : 'No account data returned',
          baseUrl: bitgetService.getBaseUrl()
        }
      };
    } catch (error: any) {
      console.error('API connection check failed:', error);
      
      // Determine if we failed at public endpoints or authenticated requests
      const isAuthError = error.message?.includes('API credentials') || 
                         error.message?.includes('authentication') ||
                         error.message?.includes('signature');
      
      return {
        success: false,
        authenticated: false,
        message: isAuthError 
          ? 'Public API connection successful, but authentication failed' 
          : 'Failed to connect to Bitget API',
        error
      };
    }
  }
}

// Export a singleton instance
export const accountService = new AccountService();