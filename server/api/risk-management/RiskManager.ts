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
   * 
   * This method examines a position's metadata for stopLossPercent and takeProfitPercent
   * values. If the position's current profit/loss percentage exceeds the configured
   * thresholds, the position will be automatically closed.
   * 
   * @param position The position object to check
   * @param currentPrice The current market price for the position's symbol
   */
  private async checkPositionRiskLevels(position: any, currentPrice: number): Promise<void> {
    try {
      // Make sure we have a position object with required fields
      if (!position || !position.id || !position.entryPrice || !position.direction) {
        console.error(`Invalid position object provided:`, position);
        return;
      }

      const entryPrice = parseFloat(position.entryPrice);
      if (isNaN(entryPrice)) {
        console.error(`Invalid entry price for position ${position.id}: ${position.entryPrice}`);
        return;
      }
      
      // Enhanced metadata handling to ensure we can parse it correctly
      let metadata = null;
      try {
        if (position.metadata) {
          if (typeof position.metadata === 'string') {
            metadata = JSON.parse(position.metadata);
          } else {
            metadata = position.metadata;
          }
        }
      } catch (e) {
        console.error(`Error parsing metadata for position ${position.id}:`, e);
        console.error(`Raw metadata value:`, position.metadata);
        metadata = null;
      }
      
      // If no metadata or no risk parameters, skip
      if (!metadata) {
        return;
      }
      
      // Check for risk management parameters in metadata
      // They could be at the root level or nested in additionalData
      let stopLossValue = metadata.stopLossPercent;
      let takeProfitValue = metadata.takeProfitPercent;
      
      // If not found at root level, check in additionalData (from trade signal)
      if ((!stopLossValue && !takeProfitValue) && metadata.additionalData) {
        stopLossValue = metadata.additionalData.stopLossPercent;
        takeProfitValue = metadata.additionalData.takeProfitPercent;
      }
      
      // If still not found, exit early
      if (!stopLossValue && !takeProfitValue) {
        return;
      }
      
      // Parse the SL/TP values and ensure they're valid
      const stopLossPercent = parseFloat(stopLossValue) || null;
      const takeProfitPercent = parseFloat(takeProfitValue) || null;
      
      if (!stopLossPercent && !takeProfitPercent) {
        return;
      }
      
      // Calculate current PnL percent
      const pnlPercent = position.direction === TradeDirection.LONG
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - currentPrice) / entryPrice) * 100;
      
      // Debug logging - Log details about the position checking
      console.log(`Checking position ${position.id} for risk levels:`, {
        symbol: position.symbol,
        direction: position.direction,
        entryPrice,
        currentPrice,
        pnlPercent: pnlPercent.toFixed(2) + '%',
        stopLossPercent,
        takeProfitPercent
      });

      // Check stop loss (negative P&L exceeding stop loss)
      if (stopLossPercent !== null && pnlPercent <= -stopLossPercent) {
        console.log(`🛑 Stop-loss triggered for position ${position.id}: PnL ${pnlPercent.toFixed(2)}% exceeds stop-loss ${stopLossPercent}%`);
        
        try {
          // Get the bridge for the user who owns this position
          const account = await storage.getPaperTradingAccount(position.accountId);
          if (!account) {
            console.error(`Cannot close position ${position.id}: Account ${position.accountId} not found`);
            return;
          }
          
          // Initialize the bridge and make sure we have access to the position
          const bridge = getPaperTradingBridge(account.userId);
          await bridge.initialize();
          
          // Close the position with the current price directly
          const closeResult = await bridge.closePosition(position.id, {
            exitPrice: currentPrice,
            reason: 'stop_loss',
            automatic: true,
            stopLossPercent,
            actualPnlPercent: pnlPercent
          });
          
          if (closeResult.success) {
            console.log(`✅ Successfully closed position ${position.id} due to stop-loss at ${currentPrice}`);
            this.emit('positionClosed', {
              positionId: position.id,
              reason: 'stop_loss',
              pnlPercent,
              closePrice: currentPrice
            });
          } else {
            console.error(`❌ Failed to close position ${position.id} due to stop-loss:`, closeResult.error || closeResult.message);
          }
        } catch (closeError) {
          console.error(`Error closing position ${position.id} for stop-loss:`, closeError);
        }
        
        return;
      }
      
      // Check take profit (positive P&L exceeding take profit)
      if (takeProfitPercent !== null && pnlPercent >= takeProfitPercent) {
        console.log(`🎯 Take-profit triggered for position ${position.id}: PnL ${pnlPercent.toFixed(2)}% exceeds take-profit ${takeProfitPercent}%`);
        
        try {
          // Get the bridge for the user who owns this position
          const account = await storage.getPaperTradingAccount(position.accountId);
          if (!account) {
            console.error(`Cannot close position ${position.id}: Account ${position.accountId} not found`);
            return;
          }
          
          // Initialize the bridge and make sure we have access to the position
          const bridge = getPaperTradingBridge(account.userId);
          await bridge.initialize();
          
          // Close the position with the current price directly
          const closeResult = await bridge.closePosition(position.id, {
            exitPrice: currentPrice,
            reason: 'take_profit',
            automatic: true,
            takeProfitPercent,
            actualPnlPercent: pnlPercent
          });
          
          if (closeResult.success) {
            console.log(`✅ Successfully closed position ${position.id} due to take-profit at ${currentPrice}`);
            this.emit('positionClosed', {
              positionId: position.id,
              reason: 'take_profit',
              pnlPercent,
              closePrice: currentPrice
            });
          } else {
            console.error(`❌ Failed to close position ${position.id} due to take-profit:`, closeResult.error || closeResult.message);
          }
        } catch (closeError) {
          console.error(`Error closing position ${position.id} for take-profit:`, closeError);
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