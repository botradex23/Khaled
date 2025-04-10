/**
 * Binance Account Service Module
 * Handles authentication, account data, and order management
 */

import { BinanceApiService } from './binanceClient';
import { formatCurrency, formatOrderStatus, formatTradeSide, validateBinanceResponse } from './binanceUtils';

export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
  total: number;
  valueUSD?: number;
}

export class BinanceAccountService {
  private apiService: BinanceApiService;
  
  constructor(apiService: BinanceApiService) {
    this.apiService = apiService;
  }
  
  /**
   * Test API key connectivity
   */
  async testConnectivity(): Promise<{ success: boolean; message: string }> {
    try {
      // First try ping (public endpoint)
      await this.apiService.ping();
      
      // Then try account info (authenticated endpoint)
      await this.apiService.getAccountInfo();
      
      return {
        success: true,
        message: 'Connected to Binance API successfully with valid credentials'
      };
    } catch (error: any) {
      console.error('Binance connectivity test failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to connect to Binance'
      };
    }
  }
  
  /**
   * Get account balances
   */
  async getAccountBalances(): Promise<AccountBalance[]> {
    try {
      const balances = await this.apiService.getAccountBalancesWithUSD();
      return balances;
    } catch (error) {
      console.error('Error fetching account balances:', error);
      throw error;
    }
  }
  
  /**
   * Get account overview
   */
  async getAccountOverview(): Promise<{
    totalBalanceUSD: number;
    balances: AccountBalance[];
    canTrade: boolean;
    accountType: string;
  }> {
    try {
      const accountInfo = await this.apiService.getAccountInfo();
      const balances = await this.getAccountBalances();
      
      // Calculate total USD balance
      let totalBalanceUSD = 0;
      balances.forEach(balance => {
        if (balance.valueUSD) {
          totalBalanceUSD += balance.valueUSD;
        }
      });
      
      return {
        totalBalanceUSD,
        balances,
        canTrade: accountInfo.canTrade,
        accountType: accountInfo.accountType
      };
    } catch (error) {
      console.error('Error fetching account overview:', error);
      throw error;
    }
  }
  
  /**
   * Place a market order
   */
  async placeMarketOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    quoteOrderQty?: number;
  }): Promise<any> {
    try {
      const orderParams: any = {
        symbol: params.symbol,
        side: params.side,
        type: 'MARKET',
        quantity: params.quantity
      };
      
      // If quoteOrderQty is provided, use it instead of quantity
      if (params.quoteOrderQty) {
        delete orderParams.quantity;
        orderParams.quoteOrderQty = params.quoteOrderQty;
      }
      
      const order = await this.apiService.createOrder(orderParams);
      const validation = validateBinanceResponse(order);
      
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      return order;
    } catch (error) {
      console.error('Error placing market order:', error);
      throw error;
    }
  }
  
  /**
   * Place a limit order
   */
  async placeLimitOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
  }): Promise<any> {
    try {
      const orderParams: any = {
        symbol: params.symbol,
        side: params.side,
        type: 'LIMIT',
        quantity: params.quantity,
        price: params.price,
        timeInForce: params.timeInForce || 'GTC'
      };
      
      const order = await this.apiService.createOrder(orderParams);
      const validation = validateBinanceResponse(order);
      
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      return order;
    } catch (error) {
      console.error('Error placing limit order:', error);
      throw error;
    }
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    try {
      const result = await this.apiService.cancelOrder(symbol, orderId);
      const validation = validateBinanceResponse(result);
      
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      return result;
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }
  
  /**
   * Get all open orders
   */
  async getOpenOrders(symbol?: string): Promise<any[]> {
    try {
      const orders = await this.apiService.getOpenOrders(symbol);
      return orders;
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }
  
  /**
   * Get order status
   */
  async getOrderStatus(symbol: string, orderId: number): Promise<any> {
    try {
      const order = await this.apiService.getOrder(symbol, orderId);
      return order;
    } catch (error) {
      console.error('Error fetching order status:', error);
      throw error;
    }
  }
  
  /**
   * Get recent trades for a symbol
   */
  async getMyTrades(symbol: string, limit: number = 50): Promise<any[]> {
    try {
      const trades = await this.apiService.getAccountTrades(symbol, undefined, undefined, undefined, limit);
      return trades;
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      throw error;
    }
  }
  
  /**
   * Format account summary for display
   */
  formatAccountSummary(overview: {
    totalBalanceUSD: number;
    balances: AccountBalance[];
    canTrade: boolean;
    accountType: string;
  }): string {
    const { totalBalanceUSD, balances, canTrade, accountType } = overview;
    
    // Create summary string
    let summary = '===== ACCOUNT SUMMARY =====\n';
    summary += `Total Balance: ${formatCurrency(totalBalanceUSD)}\n`;
    summary += `Account Type: ${accountType}\n`;
    summary += `Trading Enabled: ${canTrade ? 'Yes' : 'No'}\n\n`;
    
    // Add top balances
    summary += 'Top Assets:\n';
    const topBalances = balances
      .filter(b => b.valueUSD && b.valueUSD > 0)
      .sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0))
      .slice(0, 5);
      
    topBalances.forEach(balance => {
      summary += `${balance.asset}: ${balance.free} (${formatCurrency(balance.valueUSD || 0)})\n`;
    });
    
    return summary;
  }
}

/**
 * Create an account service with the given API service
 */
export function createAccountService(apiService: BinanceApiService): BinanceAccountService {
  return new BinanceAccountService(apiService);
}