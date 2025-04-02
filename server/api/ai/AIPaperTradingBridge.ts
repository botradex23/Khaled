/**
 * AIPaperTradingBridge - Bridge between AI trading decisions and paper trading
 * 
 * This module provides a bridge to connect the AI trading system with the paper trading system.
 * It allows AI trading decisions to be executed in the paper trading environment,
 * providing a risk-free way to test and validate AI strategies.
 */

import { storage } from '../../storage';
import paperTradingApi from '../paper-trading/PaperTradingApi';
import { AITradingSystem } from './AITradingSystem';

/**
 * Interface for trading decisions from AI system
 */
export interface TradingDecision {
  symbol: string;               // Trading pair symbol (e.g., "BTCUSDT")
  action: string;               // Trading action ("BUY", "SELL", "HOLD")
  confidence: number;           // Confidence level (0.0 to 1.0)
  price: number;                // Current price
  timestamp: string;            // ISO timestamp of the decision
  strategy: string;             // Strategy used for the decision
  parameters: Record<string, any>; // Strategy-specific parameters
  
  // Optional properties
  reason?: string;              // Reason for the decision
  tradingSignals?: Record<string, any>; // Technical indicators and signals
  marketState?: Record<string, any>;    // Current market state
  predictions?: Record<string, any>;    // ML predictions data
}

/**
 * AI Paper Trading Bridge
 */
export class AIPaperTradingBridge {
  private userId: number | null = null;
  private aiSystem: AITradingSystem;

  /**
   * Create a new AI Paper Trading Bridge
   * 
   * @param aiSystem AI Trading System instance
   */
  constructor(aiSystem: AITradingSystem) {
    this.aiSystem = aiSystem;
  }

  /**
   * Set the user for paper trading
   * 
   * @param userId User ID
   * @returns Promise resolving to success status
   */
  async setUser(userId: number): Promise<boolean> {
    try {
      // Get or create paper trading account for the user
      let account = await storage.getUserPaperTradingAccount(userId);
      
      if (!account) {
        // Create a new account with default balance
        const initialBalance = '10000';  // Default balance in USDT
        account = await storage.createPaperTradingAccount({
          userId,
          initialBalance,
          currentBalance: initialBalance,
          totalProfitLoss: '0',
          totalProfitLossPercent: '0',
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0
        });
        
        if (!account) {
          console.error(`Failed to create paper trading account for user ${userId}`);
          return false;
        }
        
        console.log(`Created paper trading account for user ${userId} with ID ${account.id}`);
      }
      
      this.userId = userId;
      return true;
    } catch (error) {
      console.error('Error setting user for paper trading:', error);
      return false;
    }
  }

  /**
   * Get current user ID
   * 
   * @returns Current user ID or null if not set
   */
  getUserId(): number | null {
    return this.userId;
  }

  /**
   * Execute a trading decision from the AI system
   * 
   * @param decision Trading decision
   * @returns Promise resolving to execution result
   */
  async executeTrading(decision: TradingDecision): Promise<any> {
    try {
      if (!this.userId) {
        throw new Error('User not set for paper trading');
      }
      
      const { symbol, action, price, confidence } = decision;
      
      // Skip HOLD actions
      if (action === 'HOLD') {
        return {
          success: true,
          message: 'No action taken - HOLD signal',
          executed: false,
        };
      }
      
      // Get user account
      const account = await storage.getUserPaperTradingAccount(this.userId);
      if (!account) {
        throw new Error('Paper trading account not found');
      }
      
      // Calculate quantity based on fixed USD amount (e.g., $100 per trade)
      const tradeAmount = 100;  // Fixed amount in USD
      const quantity = (tradeAmount / parseFloat(price.toString())).toFixed(6);
      
      // Create a position
      const position = await storage.createPaperTradingPosition({
        accountId: account.id,
        symbol,
        entryPrice: price.toString(),
        quantity,
        direction: action === 'BUY' ? 'LONG' : 'SHORT',
      });
      
      if (!position) {
        throw new Error('Failed to create paper trading position');
      }
      
      // Create a trade record
      const trade = await storage.createPaperTradingTrade({
        accountId: account.id,
        positionId: position.id,
        symbol,
        entryPrice: price.toString(),
        quantity,
        direction: action === 'BUY' ? 'LONG' : 'SHORT',
        status: 'OPEN',
        type: 'MARKET',
        isAiGenerated: true,
        aiConfidence: confidence.toString(),
      });
      
      if (!trade) {
        throw new Error('Failed to create paper trading trade record');
      }
      
      // Log the execution
      console.log(`AI Paper Trading: Executed ${action} order for ${symbol} at price ${price}, quantity ${quantity}`);
      
      return {
        success: true,
        message: `Successfully executed ${action} trade for ${symbol}`,
        executed: true,
        trade,
        position,
      };
    } catch (error) {
      console.error('Error executing AI trading decision:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error executing trade',
        executed: false,
      };
    }
  }

  /**
   * Get open positions
   * 
   * @returns Promise resolving to open positions
   */
  async getOpenPositions(): Promise<any[]> {
    try {
      if (!this.userId) {
        throw new Error('User not set for paper trading');
      }
      
      const account = await storage.getUserPaperTradingAccount(this.userId);
      if (!account) {
        throw new Error('Paper trading account not found');
      }
      
      return storage.getAccountPaperTradingPositions(account.id);
    } catch (error) {
      console.error('Error getting open positions:', error);
      return [];
    }
  }

  /**
   * Get trade history
   * 
   * @param limit Maximum number of trades to return
   * @returns Promise resolving to trade history
   */
  async getTradeHistory(limit = 50): Promise<any[]> {
    try {
      if (!this.userId) {
        throw new Error('User not set for paper trading');
      }
      
      const account = await storage.getUserPaperTradingAccount(this.userId);
      if (!account) {
        throw new Error('Paper trading account not found');
      }
      
      return storage.getAccountPaperTradingTrades(account.id, limit);
    } catch (error) {
      console.error('Error getting trade history:', error);
      return [];
    }
  }

  /**
   * Get performance statistics
   * 
   * @returns Promise resolving to performance statistics
   */
  async getPerformanceStats(): Promise<any | null> {
    try {
      if (!this.userId) {
        throw new Error('User not set for paper trading');
      }
      
      const account = await storage.getUserPaperTradingAccount(this.userId);
      if (!account) {
        throw new Error('Paper trading account not found');
      }
      
      // Get all closed trades
      const trades = await storage.getAccountPaperTradingTrades(account.id, 1000);
      const closedTrades = trades.filter(trade => trade.status === 'CLOSED');
      
      // Calculate performance metrics
      const totalTrades = closedTrades.length;
      const winningTrades = closedTrades.filter(trade => parseFloat(trade.profitLoss || '0') > 0).length;
      const losingTrades = closedTrades.filter(trade => parseFloat(trade.profitLoss || '0') < 0).length;
      
      // Calculate profit/loss stats
      const totalProfitLoss = closedTrades.reduce((sum, trade) => sum + parseFloat(trade.profitLoss || '0'), 0);
      const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
      
      // Calculate win rate
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      return {
        userId: this.userId,
        accountId: account.id,
        currentBalance: account.currentBalance,
        initialBalance: account.initialBalance,
        totalProfitLoss: account.totalProfitLoss,
        totalProfitLossPercent: account.totalProfitLossPercent,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: winRate.toFixed(2) + '%',
        averageProfitLoss: averageProfitLoss.toFixed(2),
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      };
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return null;
    }
  }
}

/**
 * Create a new AI Paper Trading Bridge
 * 
 * @param aiSystem AI Trading System instance
 * @returns AI Paper Trading Bridge instance
 */
export function createAIPaperTradingBridge(aiSystem: AITradingSystem): AIPaperTradingBridge {
  return new AIPaperTradingBridge(aiSystem);
}

export default AIPaperTradingBridge;