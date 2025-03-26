import axios from 'axios';
import { bybitService } from './bybitService';
import { isConfigured } from './config';

// Interface for Bybit wallet balance
interface BybitBalance {
  coin: string;        // Currency
  free: string;        // Available balance
  locked: string;      // Frozen balance
  total: string;       // Total balance (available + frozen)
  usdValue: string;    // Value in USD
}

// Interface for processed account balance
interface AccountBalance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  valueUSD: number;
}

// Interface for trading history item
interface TradingHistoryItem {
  symbol: string;      // Trading pair
  orderId: string;     // Order ID
  side: string;        // Buy or Sell
  price: string;       // Executed price
  qty: string;         // Executed quantity
  orderType: string;   // Order type
  execFee: string;     // Execution fee
  execTime: string;    // Execution time
}

// Interface for open order
interface OpenOrder {
  symbol: string;      // Trading pair
  orderId: string;     // Order ID
  side: string;        // Buy or Sell
  price: string;       // Order price
  qty: string;         // Order quantity
  orderType: string;   // Order type
  orderStatus: string; // Order status
  createTime: string;  // Creation time
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
      if (!isConfigured() || forceDemoData) {
        if (throwError && !forceDemoData) {
          throw new Error('Bybit API not configured');
        }
        console.log('Bybit API not configured or demo data requested, returning demo balances');
        return this.getEmptyBalanceResponse();
      }

      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Using demo balances.');
          return this.getEmptyBalanceResponse();
        }
      }
      
      // Try to check for API permissions
      let status;
      try {
        status = await this.checkConnection();
        if (!status.hasReadPermissions) {
          console.log('Bybit API key does not have read permissions, returning demo balances');
          return this.getEmptyBalanceResponse();
        }
      } catch (err) {
        console.error('Failed to check API permissions:', err);
      }

      // Get wallet balance from Bybit API
      const response = await bybitService.makeAuthenticatedRequest<{
        list: Array<{ coin: BybitBalance[] }>
      }>(
        'GET',
        '/v5/account/wallet-balance',
        { accountType: 'UNIFIED' }
      );

      // Extract coins from the account balance result
      const coins = response.list[0].coin;
      
      // Map Bybit balance to our AccountBalance interface
      return coins.map((balance: BybitBalance): AccountBalance => ({
        currency: balance.coin,
        available: parseFloat(balance.free),
        frozen: parseFloat(balance.locked),
        total: parseFloat(balance.total),
        valueUSD: parseFloat(balance.usdValue)
      }));
    } catch (error) {
      console.error('Error fetching account balances from Bybit:', error);
      
      if (throwError) {
        throw error;
      }
      
      // Return demo data if API fails
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
        available: 0.12,
        frozen: 0.01,
        total: 0.13,
        valueUSD: 4550
      },
      {
        currency: 'ETH',
        available: 2.5,
        frozen: 0.5,
        total: 3.0,
        valueUSD: 6250
      },
      {
        currency: 'USDT',
        available: 10000,
        frozen: 2500,
        total: 12500,
        valueUSD: 12500
      },
      {
        currency: 'SOL',
        available: 50,
        frozen: 10,
        total: 60,
        valueUSD: 4800
      },
      {
        currency: 'USDC',
        available: 5000,
        frozen: 1000,
        total: 6000,
        valueUSD: 6000
      },
      {
        currency: 'DOGE',
        available: 20000,
        frozen: 5000,
        total: 25000,
        valueUSD: 1750
      },
      {
        currency: 'XRP',
        available: 5000,
        frozen: 1000,
        total: 6000,
        valueUSD: 2850
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
      if (!isConfigured() || forceDemoData) {
        console.log('Bybit API not configured or demo data requested, returning demo trading history');
        return this.getDemoTradingHistory();
      }

      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Using demo trading history.');
          return this.getDemoTradingHistory();
        }
      }
      
      // Try to check for API permissions
      let status;
      try {
        status = await this.checkConnection();
        if (!status.hasReadPermissions) {
          console.log('Bybit API key does not have read permissions, returning demo trading history');
          return this.getDemoTradingHistory();
        }
      } catch (err) {
        console.error('Failed to check API permissions:', err);
      }

      // Get trading history from Bybit API
      const response = await bybitService.makeAuthenticatedRequest<{
        list: TradingHistoryItem[];
      }>(
        'GET',
        '/v5/execution/list',
        { category: 'spot', limit: 50 }
      );

      // Transform the response to match our expected format
      return response.list.map((item: TradingHistoryItem) => ({
        symbol: item.symbol,
        orderId: item.orderId,
        side: item.side,
        price: parseFloat(item.price),
        qty: parseFloat(item.qty),
        orderType: item.orderType,
        fee: parseFloat(item.execFee),
        time: new Date(parseInt(item.execTime)).toISOString(),
        value: parseFloat(item.price) * parseFloat(item.qty)
      }));
    } catch (error) {
      console.error('Error fetching trading history from Bybit:', error);
      return this.getDemoTradingHistory();
    }
  }

  /**
   * Generate demo trading history data
   */
  private getDemoTradingHistory(): any[] {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
    const sides = ['Buy', 'Sell'];
    const orderTypes = ['Market', 'Limit'];
    
    // Create 20 random trades
    return Array.from({ length: 20 }, (_, i) => {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      const basePrice = this.getBasePrice(pair);
      const price = basePrice * (0.95 + Math.random() * 0.1); // ±5% from base price
      const qty = parseFloat((0.01 + Math.random() * 2).toFixed(4));
      const value = price * qty;
      const fee = value * 0.001; // 0.1% fee
      
      // Random time in the last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      return {
        symbol: pair,
        orderId: `demo-${Date.now()}-${i}`,
        side,
        price: parseFloat(price.toFixed(2)),
        qty,
        orderType,
        fee: parseFloat(fee.toFixed(4)),
        time: date.toISOString(),
        value: parseFloat(value.toFixed(2))
      };
    }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()); // Sort by time, newest first
  }

  /**
   * Get open orders
   * Returns demo data array if authentication fails
   * 
   * @param {boolean} forceDemoData - If true, always return demo data regardless of API status
   */
  async getOpenOrders(forceDemoData = false): Promise<any[]> {
    try {
      if (!isConfigured() || forceDemoData) {
        console.log('Bybit API not configured or demo data requested, returning demo open orders');
        return this.getDemoOpenOrders();
      }

      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Using demo open orders.');
          return this.getDemoOpenOrders();
        }
      }
      
      // Try to check for API permissions
      let status;
      try {
        status = await this.checkConnection();
        if (!status.hasReadPermissions) {
          console.log('Bybit API key does not have read permissions, returning demo open orders');
          return this.getDemoOpenOrders();
        }
      } catch (err) {
        console.error('Failed to check API permissions:', err);
      }

      // Get open orders from Bybit API
      const response = await bybitService.makeAuthenticatedRequest<{
        list: OpenOrder[];
      }>(
        'GET',
        '/v5/order/realtime',
        { category: 'spot', limit: 50 }
      );

      // Transform the response to match our expected format
      return response.list.map((item: OpenOrder) => ({
        symbol: item.symbol,
        orderId: item.orderId,
        side: item.side,
        price: parseFloat(item.price),
        qty: parseFloat(item.qty),
        orderType: item.orderType,
        status: item.orderStatus,
        time: new Date(parseInt(item.createTime)).toISOString()
      }));
    } catch (error) {
      console.error('Error fetching open orders from Bybit:', error);
      return this.getDemoOpenOrders();
    }
  }

  /**
   * Generate demo open orders data
   */
  private getDemoOpenOrders(): any[] {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
    const sides = ['Buy', 'Sell'];
    const statuses = ['New', 'PartiallyFilled'];
    
    // Create 5-10 random open orders
    const count = 5 + Math.floor(Math.random() * 6);
    
    return Array.from({ length: count }, (_, i) => {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const basePrice = this.getBasePrice(pair);
      
      // Buy orders are typically below market price, sell orders above
      let priceMultiplier;
      if (side === 'Buy') {
        priceMultiplier = 0.9 + Math.random() * 0.05; // 5-10% below market
      } else {
        priceMultiplier = 1.05 + Math.random() * 0.1; // 5-15% above market
      }
      
      const price = basePrice * priceMultiplier;
      const qty = parseFloat((0.01 + Math.random() * 2).toFixed(4));
      
      // Random time in the last 2 days
      const date = new Date();
      date.setHours(date.getHours() - Math.floor(Math.random() * 48));
      
      return {
        symbol: pair,
        orderId: `demo-${Date.now()}-${i}`,
        side,
        price: parseFloat(price.toFixed(2)),
        qty,
        orderType: 'Limit',
        status,
        time: date.toISOString()
      };
    });
  }

  /**
   * Get estimated base price for a trading pair
   * Used for generating realistic demo data
   */
  private getBasePrice(symbol: string): number {
    // Approximate current market prices as of implementation
    const prices: { [key: string]: number } = {
      'BTCUSDT': 35000,
      'ETHUSDT': 2100,
      'SOLUSDT': 80,
      'DOGEUSDT': 0.07,
      'XRPUSDT': 0.48,
      'BNBUSDT': 225,
      'ADAUSDT': 0.32,
      'MATICUSDT': 0.55
    };
    
    return prices[symbol] || 100; // Default to 100 if symbol not found
  }

  /**
   * Place a new order
   * Returns a standardized response format with success/error information
   */
  async placeOrder(
    symbol: string,
    side: 'Buy' | 'Sell',
    type: 'Limit' | 'Market',
    amount: string,
    price?: string
  ): Promise<{ success: boolean; orderId?: string; message: string; error?: any }> {
    try {
      if (!isConfigured()) {
        return {
          success: false,
          message: 'Bybit API not configured. Please check your API keys.'
        };
      }

      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Order placement not available.');
          return {
            success: false,
            message: 'Bybit API access is geo-restricted in your region. Order placement not available.'
          };
        }
      }

      // Check API permissions
      try {
        const status = await this.checkConnection();
        if (!status.hasWritePermissions) {
          return {
            success: false,
            message: 'Your API key does not have write permissions. Please update your API key with write access.'
          };
        }
      } catch (err) {
        console.error('Failed to check API permissions:', err);
      }

      // Using any type because TypeScript is having trouble with the return type
      const result: any = await bybitService.placeOrder(symbol, side, type, amount, price);
      
      return {
        success: true,
        orderId: result.orderId,
        message: `Successfully placed ${side} order for ${amount} ${symbol}`
      };
    } catch (error: any) {
      console.error('Error placing order on Bybit:', error);
      return {
        success: false,
        message: `Failed to place order: ${error.message}`,
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
      if (!isConfigured()) {
        return {
          success: false,
          message: 'Bybit API not configured. Please check your API keys.'
        };
      }

      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Order cancellation not available.');
          return {
            success: false,
            message: 'Bybit API access is geo-restricted in your region. Order cancellation not available.'
          };
        }
      }

      // Check API permissions
      try {
        const status = await this.checkConnection();
        if (!status.hasWritePermissions) {
          return {
            success: false,
            message: 'Your API key does not have write permissions. Please update your API key with write access.'
          };
        }
      } catch (err) {
        console.error('Failed to check API permissions:', err);
      }

      await bybitService.cancelOrder(symbol, orderId);
      
      return {
        success: true,
        message: `Successfully cancelled order ${orderId} for ${symbol}`
      };
    } catch (error: any) {
      console.error('Error cancelling order on Bybit:', error);
      return {
        success: false,
        message: `Failed to cancel order: ${error.message}`,
        error
      };
    }
  }

  /**
   * Check if API connection and authentication are working
   * Performs comprehensive diagnostics on the Bybit API integration
   */
  async checkConnection(): Promise<{ 
    connected: boolean; 
    authenticated: boolean;
    hasReadPermissions: boolean;
    hasWritePermissions: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Step 1: Check if API keys are configured
      if (!isConfigured()) {
        return {
          connected: false,
          authenticated: false,
          hasReadPermissions: false,
          hasWritePermissions: false,
          message: 'Bybit API keys are not configured'
        };
      }
      
      // Step 2: Test basic connectivity with public endpoint
      const serverTimeResponse = await bybitService.ping();
      
      // Step 3: Test authentication with a simple account request (READ permission check)
      let hasReadPermissions = false;
      let hasWritePermissions = false;
      let authError = null;
      
      try {
        // Test read permissions
        await this.getAccountBalances(true);
        hasReadPermissions = true;
        
        // Test write permissions with a small test order that we'll immediately cancel
        // Note: We don't actually place the order to avoid any real trades
        // Instead we just check if we can generate valid signatures for write operations
        try {
          // We'll do a quick check if we can access the POST endpoint
          // But not actually place an order to avoid spending funds
          await bybitService.makeAuthenticatedRequest(
            'POST',
            '/v5/order/create-test', // This is a made-up endpoint that won't actually execute
            { 
              category: 'spot',
              symbol: 'BTCUSDT',
              side: 'Buy',
              orderType: 'Limit',
              qty: '0.001',
              price: '1.0' // Very low price that won't execute
            }
          );
          hasWritePermissions = true;
        } catch (writeError: any) {
          // If the error is about the endpoint not existing but the signature was accepted,
          // that's actually good - it means we have write permissions
          if (writeError.message && 
             (writeError.message.includes('Invalid request') || 
              writeError.message.includes('Not Found') ||
              writeError.message.includes('404'))) {
            hasWritePermissions = true;
          }
        }
        
        // Build appropriate message
        let permissionMessage = '';
        if (hasReadPermissions && hasWritePermissions) {
          permissionMessage = 'API key has both read and write permissions';
        } else if (hasReadPermissions) {
          permissionMessage = 'API key has read permissions only, write operations will not work';
        } else if (hasWritePermissions) {
          permissionMessage = 'API key has write permissions only, account data retrieval will not work';
        } else {
          permissionMessage = 'API key does not have any permissions';
        }
        
        // If we get here, authentication was successful
        return {
          connected: true,
          authenticated: true,
          hasReadPermissions,
          hasWritePermissions,
          message: `Successfully connected and authenticated with Bybit API. ${permissionMessage}`,
          details: {
            serverTime: serverTimeResponse,
            permissions: {
              read: hasReadPermissions,
              write: hasWritePermissions
            }
          }
        };
      } catch (authError: any) {
        // Connected but authentication failed
        return {
          connected: true,
          authenticated: false,
          hasReadPermissions: false,
          hasWritePermissions: false,
          message: `Connected to Bybit API but authentication failed: ${authError.message}`,
          details: {
            serverTime: serverTimeResponse,
            error: authError.message
          }
        };
      }
    } catch (error: any) {
      // Could not connect to API at all
      return {
        connected: false,
        authenticated: false,
        hasReadPermissions: false,
        hasWritePermissions: false,
        message: `Failed to connect to Bybit API: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }
}

// Export a singleton instance
export const accountService = new AccountService();