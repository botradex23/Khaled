/**
 * User Trading Service
 * 
 * This service manages user-specific trading operations using user API keys.
 * It connects to exchanges on behalf of users to execute trades and manage positions.
 */

import { log } from '../vite';
import { storage } from '../storage';
import axios from 'axios';
import crypto from 'crypto';
import { mlPredictionService } from './ml-prediction-service';

// Supported exchanges for trading
type SupportedExchange = 'binance' | 'okx';

// Order types
type OrderSide = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT';

// User trade interfaces
interface TradeOrder {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  timestamp: number;
  userId: number;
  status: 'NEW' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELED' | 'REJECTED';
  orderId?: string;
  clientOrderId?: string;
  exchange: SupportedExchange;
}

interface UserPosition {
  userId: number;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  lastUpdated: number;
  exchange: SupportedExchange;
}

class UserTradingService {
  private static instance: UserTradingService;
  private userOrders: Record<number, TradeOrder[]> = {};
  private userPositions: Record<number, UserPosition[]> = {};
  private activeUserSessions: Set<number> = new Set();
  
  // Private constructor to enforce singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance of the user trading service
   */
  public static getInstance(): UserTradingService {
    if (!UserTradingService.instance) {
      UserTradingService.instance = new UserTradingService();
    }
    return UserTradingService.instance;
  }

  /**
   * Initialize user trading for a specific user
   */
  public async initializeUserTrading(userId: number): Promise<boolean> {
    try {
      // Check if user has API keys
      const apiKeys = await storage.getUserApiKeys(userId);
      
      if (!apiKeys || (!apiKeys.binanceApiKey && !apiKeys.okxApiKey)) {
        log(`User ${userId} does not have API keys configured`);
        return false;
      }
      
      // Add user to active sessions
      this.activeUserSessions.add(userId);
      
      // Initialize user orders and positions arrays if they don't exist
      if (!this.userOrders[userId]) {
        this.userOrders[userId] = [];
      }
      
      if (!this.userPositions[userId]) {
        this.userPositions[userId] = [];
      }
      
      // Fetch current positions for the user
      await this.refreshUserPositions(userId);
      
      log(`User trading initialized for user ${userId}`);
      return true;
    } catch (error) {
      log(`Error initializing user trading for user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Refresh user positions
   */
  public async refreshUserPositions(userId: number): Promise<UserPosition[]> {
    try {
      // Get user API keys
      const apiKeys = await storage.getUserApiKeys(userId);
      
      if (!apiKeys) {
        return [];
      }
      
      let positions: UserPosition[] = [];
      
      // Try Binance first if available
      if (apiKeys.binanceApiKey && apiKeys.binanceSecretKey) {
        try {
          const binancePositions = await this.fetchBinancePositions(userId, apiKeys.binanceApiKey, apiKeys.binanceSecretKey);
          positions = [...positions, ...binancePositions];
        } catch (error) {
          log(`Error fetching Binance positions for user ${userId}: ${error.message}`);
        }
      }
      
      // Try OKX if available
      if (apiKeys.okxApiKey && apiKeys.okxSecretKey) {
        try {
          const okxPositions = await this.fetchOKXPositions(userId, apiKeys.okxApiKey, apiKeys.okxSecretKey);
          positions = [...positions, ...okxPositions];
        } catch (error) {
          log(`Error fetching OKX positions for user ${userId}: ${error.message}`);
        }
      }
      
      // Update user positions
      this.userPositions[userId] = positions;
      return positions;
    } catch (error) {
      log(`Error refreshing positions for user ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch Binance positions for a user
   */
  private async fetchBinancePositions(
    userId: number,
    apiKey: string,
    secretKey: string
  ): Promise<UserPosition[]> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      
      // Create signature
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');
      
      // Make API request
      const response = await axios.get('https://api.binance.com/api/v3/account', {
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        params: {
          timestamp,
          signature
        }
      });
      
      if (response.status === 200) {
        // Parse balances from response
        const positions: UserPosition[] = response.data.balances
          .filter((balance: any) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
          .map((balance: any) => {
            const symbol = `${balance.asset}USDT`;
            const quantity = parseFloat(balance.free) + parseFloat(balance.locked);
            
            // Try to get current price from predictions service
            const prediction = mlPredictionService.getPrediction(symbol, '1h');
            const currentPrice = prediction ? 
              prediction.expectedPriceChange / quantity :
              0; // This is a placeholder, we should get actual price
            
            return {
              userId,
              symbol,
              quantity,
              entryPrice: 0, // Binance doesn't provide entry price in this endpoint
              currentPrice,
              pnl: 0, // Need historical data to calculate this
              pnlPercentage: 0,
              lastUpdated: Date.now(),
              exchange: 'binance' as SupportedExchange
            };
          });
        
        return positions;
      }
      
      return [];
    } catch (error) {
      log(`Error fetching Binance positions: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch OKX positions for a user
   */
  private async fetchOKXPositions(
    userId: number,
    apiKey: string,
    secretKey: string
  ): Promise<UserPosition[]> {
    try {
      const timestamp = new Date().toISOString();
      const method = 'GET';
      const requestPath = '/api/v5/account/balance';
      
      // Create signature
      const message = timestamp + method + requestPath;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('base64');
      
      // Make API request
      const response = await axios.get('https://www.okx.com' + requestPath, {
        headers: {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': 'default' // Should be stored with user keys
        }
      });
      
      if (response.status === 200 && response.data.code === '0') {
        // Parse balances from response
        const positions: UserPosition[] = response.data.data[0].details
          .filter((balance: any) => parseFloat(balance.availBal) > 0 || parseFloat(balance.frozenBal) > 0)
          .map((balance: any) => {
            const symbol = `${balance.ccy}USDT`;
            const quantity = parseFloat(balance.availBal) + parseFloat(balance.frozenBal);
            
            // Try to get current price from predictions service
            const prediction = mlPredictionService.getPrediction(symbol, '1h');
            const currentPrice = prediction ? 
              prediction.expectedPriceChange / quantity :
              0; // This is a placeholder, we should get actual price
            
            return {
              userId,
              symbol,
              quantity,
              entryPrice: 0, // Need to fetch from trading history
              currentPrice,
              pnl: 0, // Need historical data to calculate this
              pnlPercentage: 0,
              lastUpdated: Date.now(),
              exchange: 'okx' as SupportedExchange
            };
          });
        
        return positions;
      }
      
      return [];
    } catch (error) {
      log(`Error fetching OKX positions: ${error.message}`);
      return [];
    }
  }

  /**
   * Place a trade order for a user
   */
  public async placeOrder(
    userId: number,
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number
  ): Promise<TradeOrder | null> {
    try {
      // Get user API keys
      const apiKeys = await storage.getUserApiKeys(userId);
      
      if (!apiKeys) {
        throw new Error('User API keys not found');
      }
      
      let order: TradeOrder | null = null;
      
      // Try preferred exchange first
      const preferredExchange = apiKeys.defaultBroker as SupportedExchange;
      
      if (preferredExchange === 'binance' && apiKeys.binanceApiKey && apiKeys.binanceSecretKey) {
        try {
          order = await this.placeBinanceOrder(
            userId,
            apiKeys.binanceApiKey,
            apiKeys.binanceSecretKey,
            symbol,
            side,
            type,
            quantity,
            price
          );
        } catch (error) {
          log(`Error placing Binance order for user ${userId}: ${error.message}`);
        }
      } else if (preferredExchange === 'okx' && apiKeys.okxApiKey && apiKeys.okxSecretKey) {
        try {
          order = await this.placeOKXOrder(
            userId,
            apiKeys.okxApiKey,
            apiKeys.okxSecretKey,
            symbol,
            side,
            type,
            quantity,
            price
          );
        } catch (error) {
          log(`Error placing OKX order for user ${userId}: ${error.message}`);
        }
      }
      
      // If preferred exchange failed, try fallback
      if (!order) {
        const fallbackExchange = preferredExchange === 'binance' ? 'okx' : 'binance';
        
        if (fallbackExchange === 'binance' && apiKeys.binanceApiKey && apiKeys.binanceSecretKey) {
          try {
            order = await this.placeBinanceOrder(
              userId,
              apiKeys.binanceApiKey,
              apiKeys.binanceSecretKey,
              symbol,
              side,
              type,
              quantity,
              price
            );
          } catch (error) {
            log(`Error placing Binance order (fallback) for user ${userId}: ${error.message}`);
          }
        } else if (fallbackExchange === 'okx' && apiKeys.okxApiKey && apiKeys.okxSecretKey) {
          try {
            order = await this.placeOKXOrder(
              userId,
              apiKeys.okxApiKey,
              apiKeys.okxSecretKey,
              symbol,
              side,
              type,
              quantity,
              price
            );
          } catch (error) {
            log(`Error placing OKX order (fallback) for user ${userId}: ${error.message}`);
          }
        }
      }
      
      // Save the order if successful
      if (order) {
        if (!this.userOrders[userId]) {
          this.userOrders[userId] = [];
        }
        
        this.userOrders[userId].push(order);
        
        // Refresh user positions after order
        setTimeout(() => {
          this.refreshUserPositions(userId);
        }, 5000);
      }
      
      return order;
    } catch (error) {
      log(`Error placing order for user ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Place a Binance order
   */
  private async placeBinanceOrder(
    userId: number,
    apiKey: string,
    secretKey: string,
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number
  ): Promise<TradeOrder> {
    try {
      const timestamp = Date.now();
      const clientOrderId = `user_${userId}_${timestamp}`;
      
      // Build query parameters
      let queryParams = `symbol=${symbol}&side=${side}&type=${type}&quantity=${quantity}&timestamp=${timestamp}&newClientOrderId=${clientOrderId}`;
      
      // Add price if provided (required for LIMIT orders)
      if (type === 'LIMIT' && price) {
        queryParams += `&price=${price}&timeInForce=GTC`;
      }
      
      // Create signature
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(queryParams)
        .digest('hex');
      
      queryParams += `&signature=${signature}`;
      
      // Make API request
      const response = await axios.post(
        'https://api.binance.com/api/v3/order',
        queryParams,
        {
          headers: {
            'X-MBX-APIKEY': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (response.status === 200) {
        return {
          userId,
          symbol,
          side,
          type,
          quantity,
          price,
          timestamp,
          status: 'NEW',
          orderId: response.data.orderId,
          clientOrderId,
          exchange: 'binance'
        };
      }
      
      throw new Error(`Binance API error: ${response.status}`);
    } catch (error) {
      log(`Error placing Binance order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Place an OKX order
   */
  private async placeOKXOrder(
    userId: number,
    apiKey: string,
    secretKey: string,
    symbol: string,
    side: OrderSide,
    type: OrderType,
    quantity: number,
    price?: number
  ): Promise<TradeOrder> {
    try {
      const timestamp = new Date().toISOString();
      const method = 'POST';
      const requestPath = '/api/v5/trade/order';
      const clientOrderId = `user_${userId}_${Date.now()}`;
      
      // Format symbol for OKX (e.g., BTC-USDT)
      const formattedSymbol = symbol.slice(0, -4) + '-' + symbol.slice(-4);
      
      // Build request body
      const body = {
        instId: formattedSymbol,
        tdMode: 'cash',
        side: side.toLowerCase(),
        ordType: type === 'MARKET' ? 'market' : 'limit',
        sz: quantity.toString(),
        clOrdId: clientOrderId
      };
      
      // Add price for limit orders
      if (type === 'LIMIT' && price) {
        body['px'] = price.toString();
      }
      
      // Create signature
      const bodyStr = JSON.stringify(body);
      const message = timestamp + method + requestPath + bodyStr;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('base64');
      
      // Make API request
      const response = await axios.post('https://www.okx.com' + requestPath, body, {
        headers: {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': 'default', // Should be stored with user keys
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.code === '0') {
        return {
          userId,
          symbol,
          side,
          type,
          quantity,
          price,
          timestamp: Date.now(),
          status: 'NEW',
          orderId: response.data.data[0].ordId,
          clientOrderId,
          exchange: 'okx'
        };
      }
      
      throw new Error(`OKX API error: ${response.data.code} - ${response.data.msg}`);
    } catch (error) {
      log(`Error placing OKX order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(userId: number, orderId: string, exchange: SupportedExchange): Promise<boolean> {
    try {
      // Get user API keys
      const apiKeys = await storage.getUserApiKeys(userId);
      
      if (!apiKeys) {
        throw new Error('User API keys not found');
      }
      
      let success = false;
      
      // Find the order to get the symbol
      const order = this.userOrders[userId]?.find(o => o.orderId === orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (exchange === 'binance' && apiKeys.binanceApiKey && apiKeys.binanceSecretKey) {
        success = await this.cancelBinanceOrder(
          apiKeys.binanceApiKey,
          apiKeys.binanceSecretKey,
          order.symbol,
          orderId
        );
      } else if (exchange === 'okx' && apiKeys.okxApiKey && apiKeys.okxSecretKey) {
        success = await this.cancelOKXOrder(
          apiKeys.okxApiKey,
          apiKeys.okxSecretKey,
          order.symbol,
          orderId
        );
      }
      
      // Update order status if successful
      if (success && order) {
        order.status = 'CANCELED';
      }
      
      return success;
    } catch (error) {
      log(`Error cancelling order for user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Cancel a Binance order
   */
  private async cancelBinanceOrder(
    apiKey: string,
    secretKey: string,
    symbol: string,
    orderId: string
  ): Promise<boolean> {
    try {
      const timestamp = Date.now();
      
      // Build query parameters
      const queryParams = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
      
      // Create signature
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(queryParams)
        .digest('hex');
      
      // Make API request
      const response = await axios.delete(
        `https://api.binance.com/api/v3/order?${queryParams}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': apiKey
          }
        }
      );
      
      return response.status === 200;
    } catch (error) {
      log(`Error cancelling Binance order: ${error.message}`);
      return false;
    }
  }

  /**
   * Cancel an OKX order
   */
  private async cancelOKXOrder(
    apiKey: string,
    secretKey: string,
    symbol: string,
    orderId: string
  ): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const method = 'POST';
      const requestPath = '/api/v5/trade/cancel-order';
      
      // Format symbol for OKX (e.g., BTC-USDT)
      const formattedSymbol = symbol.slice(0, -4) + '-' + symbol.slice(-4);
      
      // Build request body
      const body = {
        instId: formattedSymbol,
        ordId: orderId
      };
      
      // Create signature
      const bodyStr = JSON.stringify(body);
      const message = timestamp + method + requestPath + bodyStr;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('base64');
      
      // Make API request
      const response = await axios.post('https://www.okx.com' + requestPath, body, {
        headers: {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': 'default', // Should be stored with user keys
          'Content-Type': 'application/json'
        }
      });
      
      return response.status === 200 && response.data.code === '0';
    } catch (error) {
      log(`Error cancelling OKX order: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user orders
   */
  public getUserOrders(userId: number): TradeOrder[] {
    return this.userOrders[userId] || [];
  }

  /**
   * Get user positions
   */
  public getUserPositions(userId: number): UserPosition[] {
    return this.userPositions[userId] || [];
  }

  /**
   * Execute trades based on ML predictions for a user
   */
  public async executeAutomatedTrades(userId: number, riskLevel: 'low' | 'medium' | 'high' = 'low'): Promise<TradeOrder[]> {
    try {
      // Get user API keys
      const apiKeys = await storage.getUserApiKeys(userId);
      
      if (!apiKeys) {
        throw new Error('User API keys not found');
      }
      
      // Get top signals from ML prediction service
      const topSignals = mlPredictionService.getTopSignals(5);
      
      if (topSignals.length === 0) {
        log(`No strong trading signals available for user ${userId}`);
        return [];
      }
      
      // Get user positions
      await this.refreshUserPositions(userId);
      const positions = this.getUserPositions(userId);
      
      // Get account balance
      const balance = await this.getUserBalance(userId);
      
      if (!balance) {
        throw new Error('Unable to get user balance');
      }
      
      // Determine position size based on risk level
      const riskPercentage = riskLevel === 'low' ? 0.02 : riskLevel === 'medium' ? 0.05 : 0.1;
      const maxPositionSize = balance.totalBalance * riskPercentage;
      
      // Execute trades for each strong signal
      const orders: TradeOrder[] = [];
      
      for (const signal of topSignals) {
        // Skip signals with low confidence
        if (signal.confidence < 0.7) {
          continue;
        }
        
        // Determine if we should buy or sell
        const side: OrderSide = signal.prediction === 'buy' ? 'BUY' : 'SELL';
        
        // Check if we already have a position in this symbol
        const existingPosition = positions.find(p => p.symbol === signal.symbol);
        
        // Skip if trying to sell but we don't have a position
        if (side === 'SELL' && !existingPosition) {
          continue;
        }
        
        // Skip if trying to buy but we already have a position
        if (side === 'BUY' && existingPosition) {
          continue;
        }
        
        // Calculate quantity based on position size and current price
        // This is a simplified version - in a real implementation we would get the current price
        const price = 100; // Placeholder, should get actual price
        const quantity = maxPositionSize / price;
        
        // Place the order
        const order = await this.placeOrder(
          userId,
          signal.symbol,
          side,
          'MARKET',
          quantity
        );
        
        if (order) {
          orders.push(order);
          log(`Placed automated ${side} order for user ${userId} on ${signal.symbol}`);
        }
      }
      
      return orders;
    } catch (error) {
      log(`Error executing automated trades for user ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user account balance
   */
  private async getUserBalance(userId: number): Promise<{ freeBalance: number; lockedBalance: number; totalBalance: number } | null> {
    try {
      // Get user API keys
      const apiKeys = await storage.getUserApiKeys(userId);
      
      if (!apiKeys) {
        return null;
      }
      
      // Try preferred exchange first
      const preferredExchange = apiKeys.defaultBroker as SupportedExchange;
      
      if (preferredExchange === 'binance' && apiKeys.binanceApiKey && apiKeys.binanceSecretKey) {
        try {
          return await this.getBinanceBalance(apiKeys.binanceApiKey, apiKeys.binanceSecretKey);
        } catch (error) {
          log(`Error getting Binance balance for user ${userId}: ${error.message}`);
        }
      } else if (preferredExchange === 'okx' && apiKeys.okxApiKey && apiKeys.okxSecretKey) {
        try {
          return await this.getOKXBalance(apiKeys.okxApiKey, apiKeys.okxSecretKey);
        } catch (error) {
          log(`Error getting OKX balance for user ${userId}: ${error.message}`);
        }
      }
      
      // If preferred exchange failed, try fallback
      const fallbackExchange = preferredExchange === 'binance' ? 'okx' : 'binance';
      
      if (fallbackExchange === 'binance' && apiKeys.binanceApiKey && apiKeys.binanceSecretKey) {
        try {
          return await this.getBinanceBalance(apiKeys.binanceApiKey, apiKeys.binanceSecretKey);
        } catch (error) {
          log(`Error getting Binance balance (fallback) for user ${userId}: ${error.message}`);
        }
      } else if (fallbackExchange === 'okx' && apiKeys.okxApiKey && apiKeys.okxSecretKey) {
        try {
          return await this.getOKXBalance(apiKeys.okxApiKey, apiKeys.okxSecretKey);
        } catch (error) {
          log(`Error getting OKX balance (fallback) for user ${userId}: ${error.message}`);
        }
      }
      
      return null;
    } catch (error) {
      log(`Error getting user balance for user ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get Binance account balance
   */
  private async getBinanceBalance(apiKey: string, secretKey: string): Promise<{ freeBalance: number; lockedBalance: number; totalBalance: number }> {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      
      // Create signature
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(queryString)
        .digest('hex');
      
      // Make API request
      const response = await axios.get('https://api.binance.com/api/v3/account', {
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        params: {
          timestamp,
          signature
        }
      });
      
      if (response.status === 200) {
        // Find USDT balance
        const usdtBalance = response.data.balances.find((b: any) => b.asset === 'USDT');
        
        if (usdtBalance) {
          const freeBalance = parseFloat(usdtBalance.free);
          const lockedBalance = parseFloat(usdtBalance.locked);
          
          return {
            freeBalance,
            lockedBalance,
            totalBalance: freeBalance + lockedBalance
          };
        }
        
        return {
          freeBalance: 0,
          lockedBalance: 0,
          totalBalance: 0
        };
      }
      
      throw new Error(`Binance API error: ${response.status}`);
    } catch (error) {
      log(`Error getting Binance balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get OKX account balance
   */
  private async getOKXBalance(apiKey: string, secretKey: string): Promise<{ freeBalance: number; lockedBalance: number; totalBalance: number }> {
    try {
      const timestamp = new Date().toISOString();
      const method = 'GET';
      const requestPath = '/api/v5/account/balance?ccy=USDT';
      
      // Create signature
      const message = timestamp + method + requestPath;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('base64');
      
      // Make API request
      const response = await axios.get('https://www.okx.com' + requestPath, {
        headers: {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': 'default' // Should be stored with user keys
        }
      });
      
      if (response.status === 200 && response.data.code === '0') {
        // Find USDT balance
        const usdtBalance = response.data.data[0].details.find((b: any) => b.ccy === 'USDT');
        
        if (usdtBalance) {
          const freeBalance = parseFloat(usdtBalance.availBal);
          const lockedBalance = parseFloat(usdtBalance.frozenBal);
          
          return {
            freeBalance,
            lockedBalance,
            totalBalance: freeBalance + lockedBalance
          };
        }
        
        return {
          freeBalance: 0,
          lockedBalance: 0,
          totalBalance: 0
        };
      }
      
      throw new Error(`OKX API error: ${response.data.code} - ${response.data.msg}`);
    } catch (error) {
      log(`Error getting OKX balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close user trading session
   */
  public closeUserSession(userId: number): void {
    this.activeUserSessions.delete(userId);
    log(`Closed trading session for user ${userId}`);
  }

  /**
   * Get service status
   */
  public getStatus(): any {
    return {
      activeUsers: Array.from(this.activeUserSessions),
      totalOrders: Object.values(this.userOrders).reduce((sum, orders) => sum + orders.length, 0),
      totalPositions: Object.values(this.userPositions).reduce((sum, positions) => sum + positions.length, 0)
    };
  }
}

// Export singleton instance
export const userTradingService = UserTradingService.getInstance();