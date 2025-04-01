/**
 * RiskManager.ts
 * 
 * Risk management system that handles stop-loss and take-profit functionality
 * Monitors open positions and automatically closes them when risk thresholds are met
 */

import { storage } from '../../storage';
import { getPaperTradingBridge } from '../paper-trading/PaperTradingBridge';
import paperTradingApi from '../paper-trading/PaperTradingApi';
import { TradeDirection } from '../paper-trading/PaperTradingBridge';
import { EventEmitter } from 'events';

class RiskManager extends EventEmitter {
  private static instance: RiskManager;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private DEFAULT_CHECK_INTERVAL = 5000; // 5 seconds
  
  private constructor() {
    super();
    // Don't start monitoring immediately - wait for startMonitoring() call
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): RiskManager {
    if (!RiskManager.instance) {
      RiskManager.instance = new RiskManager();
    }
    return RiskManager.instance;
  }
  
  /**
   * Start monitoring all open positions
   */
  public async startMonitoring(checkIntervalMs: number = this.DEFAULT_CHECK_INTERVAL): Promise<void> {
    if (this.isMonitoring) {
      console.log('Risk manager is already monitoring positions');
      return;
    }
    
    try {
      console.log('Starting risk management monitoring system');
      this.isMonitoring = true;
      
      // Subscribe to price change events
      paperTradingApi.on('priceChange', this.handlePriceChange.bind(this));
      
      // Start regular monitoring interval as a backup
      this.monitoringInterval = setInterval(async () => {
        await this.checkAllPositions();
      }, checkIntervalMs);
      
      // Do an initial check of all positions
      await this.checkAllPositions();
      
      console.log('Risk management system monitoring started');
    } catch (error) {
      console.error('Error starting risk management monitoring:', error);
      this.isMonitoring = false;
    }
  }
  
  /**
   * Stop monitoring positions
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }
    
    console.log('Stopping risk management monitoring');
    
    // Remove price change listener
    paperTradingApi.off('priceChange', this.handlePriceChange);
    
    // Clear interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('Risk management monitoring stopped');
  }
  
  /**
   * Handle price change events from the PaperTradingApi
   */
  private async handlePriceChange(priceChangeEvent: {
    symbol: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
  }): Promise<void> {
    try {
      const { symbol, newPrice } = priceChangeEvent;
      
      // Find all open positions for this symbol
      const allAccounts = await this.getAllPaperTradingAccounts();
      
      for (const account of allAccounts) {
        const positions = await storage.getAccountPaperTradingPositions(account.id);
        
        for (const position of positions) {
          if (position.symbol === symbol) {
            await this.checkPositionRiskLevels(position, newPrice);
          }
        }
      }
    } catch (error) {
      console.error('Error handling price change event:', error);
    }
  }
  
  /**
   * Check all open positions across all accounts
   */
  private async checkAllPositions(): Promise<void> {
    try {
      const allAccounts = await this.getAllPaperTradingAccounts();
      
      for (const account of allAccounts) {
        const positions = await storage.getAccountPaperTradingPositions(account.id);
        
        for (const position of positions) {
          // Get current price for the symbol
          const currentPrice = await paperTradingApi.getCurrentPrice(position.symbol);
          
          // Check if position needs to be closed based on risk parameters
          await this.checkPositionRiskLevels(position, currentPrice);
        }
      }
    } catch (error) {
      console.error('Error checking positions:', error);
    }
  }
  
  /**
   * Check if a position's risk levels (SL/TP) have been breached
   * and close the position if needed
   */
  private async checkPositionRiskLevels(position: any, currentPrice: number): Promise<void> {
    try {
      const entryPrice = parseFloat(position.entryPrice);
      const metadata = position.metadata ? (
        typeof position.metadata === 'string' ? JSON.parse(position.metadata) : position.metadata
      ) : null;
      
      // If no metadata or no risk parameters, skip
      if (!metadata || (!metadata.stopLossPercent && !metadata.takeProfitPercent)) {
        return;
      }
      
      // Calculate current PnL percent
      const pnlPercent = position.direction === TradeDirection.LONG
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - currentPrice) / entryPrice) * 100;
      
      // Get risk parameters
      const stopLossPercent = metadata.stopLossPercent || null;
      const takeProfitPercent = metadata.takeProfitPercent || null;
      
      // Check stop loss (negative P&L exceeding stop loss)
      if (stopLossPercent !== null && pnlPercent <= -stopLossPercent) {
        console.log(`🛑 Stop-loss triggered for position ${position.id}: PnL ${pnlPercent.toFixed(2)}% exceeds stop-loss ${stopLossPercent}%`);
        
        // Get the bridge for the user who owns this position
        const account = await storage.getPaperTradingAccount(position.accountId);
        if (!account) {
          console.error(`Cannot close position ${position.id}: Account ${position.accountId} not found`);
          return;
        }
        
        const bridge = getPaperTradingBridge(account.userId);
        
        // Close the position
        const closeResult = await bridge.closePosition(position.id, {
          reason: "stop_loss_triggered",
          stopLossPercent,
          currentPnlPercent: pnlPercent,
          autoClose: true
        });
        
        if (closeResult.success) {
          console.log(`Closed position ${position.id} due to stop-loss`);
          this.emit('positionClosed', {
            positionId: position.id,
            reason: 'stop_loss',
            pnlPercent,
            closePrice: currentPrice
          });
        } else {
          console.error(`Failed to close position ${position.id}:`, closeResult.error);
        }
        
        return;
      }
      
      // Check take profit (positive P&L exceeding take profit)
      if (takeProfitPercent !== null && pnlPercent >= takeProfitPercent) {
        console.log(`🎯 Take-profit triggered for position ${position.id}: PnL ${pnlPercent.toFixed(2)}% exceeds take-profit ${takeProfitPercent}%`);
        
        // Get the bridge for the user who owns this position
        const account = await storage.getPaperTradingAccount(position.accountId);
        if (!account) {
          console.error(`Cannot close position ${position.id}: Account ${position.accountId} not found`);
          return;
        }
        
        const bridge = getPaperTradingBridge(account.userId);
        
        // Close the position
        const closeResult = await bridge.closePosition(position.id, {
          reason: "take_profit_triggered",
          takeProfitPercent,
          currentPnlPercent: pnlPercent,
          autoClose: true
        });
        
        if (closeResult.success) {
          console.log(`Closed position ${position.id} due to take-profit`);
          this.emit('positionClosed', {
            positionId: position.id,
            reason: 'take_profit',
            pnlPercent,
            closePrice: currentPrice
          });
        } else {
          console.error(`Failed to close position ${position.id}:`, closeResult.error);
        }
      }
    } catch (error) {
      console.error(`Error checking risk levels for position ${position.id}:`, error);
    }
  }
  
  /**
   * Helper method to get all paper trading accounts 
   */
  private async getAllPaperTradingAccounts(): Promise<any[]> {
    // Since we don't have a getUsers function in storage,
    // we'll check for user IDs 1 and 2 (default user and admin user)
    const accounts = [];
    
    // Check for user ID 1 (default user)
    const defaultUserAccount = await storage.getUserPaperTradingAccount(1);
    if (defaultUserAccount) {
      accounts.push(defaultUserAccount);
    }
    
    // Check for user ID 2 (admin test user)
    const adminUserAccount = await storage.getUserPaperTradingAccount(2);
    if (adminUserAccount) {
      accounts.push(adminUserAccount);
    }
    
    // Log accounts found for debugging
    console.log(`RiskManager found ${accounts.length} paper trading accounts to monitor`);
    
    return accounts;
  }
}

// Export the singleton instance and auto-start when imported
const riskManagerInstance = RiskManager.getInstance();

// Start the risk manager after a short delay to ensure all systems are initialized
setTimeout(() => {
  riskManagerInstance.startMonitoring().catch(err => {
    console.error('Failed to start risk manager:', err);
  });
}, 5000);

export default riskManagerInstance;