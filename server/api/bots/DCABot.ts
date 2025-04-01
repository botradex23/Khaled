/**
 * DCABot.ts
 * 
 * Implementation of a Dollar-Cost Averaging (DCA) Bot
 * DCA involves regularly purchasing a fixed amount of an asset regardless of price
 * This strategy helps to average out the purchase price over time
 */

import { BaseTradingBot, BaseBotParameters, BotStatus } from './BaseTradingBot';
import { PaperTradingBridge, TradeDirection } from '../paper-trading/PaperTradingBridge';
import { storage } from '../../storage';

// DCA bot specific parameters
export interface DCABotParameters extends BaseBotParameters {
  intervalHours: number;     // How often to make purchases (in hours)
  totalBudget: number;       // Total budget for all purchases
  purchaseAmount: number;    // Amount to purchase each time
  maxPurchases: number;      // Maximum number of purchases
  priceTargetPercentage?: number; // Target profit percentage
}

// DCA bot implementation
export class DCABot extends BaseTradingBot {
  protected parameters: DCABotParameters;
  private lastExecutionTime: number = 0;
  private totalPurchases: number = 0;
  private averageEntryPrice: number = 0;
  private totalInvested: number = 0;
  private purchaseHistory: Array<{ price: number; amount: number; timestamp: number; }> = [];
  
  constructor(botId: number, userId: number, parameters: DCABotParameters) {
    super(botId, userId, parameters);
    this.parameters = parameters;
  }
  
  /**
   * Initialize the DCA bot
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize base components
      if (!(await super.initialize())) {
        return false;
      }
      
      // Load purchase history and calculate stats
      await this.loadPurchaseHistory();
      
      console.log(`DCA Bot ${this.botId} initialized with interval ${this.parameters.intervalHours} hours, purchase amount ${this.parameters.purchaseAmount}`);
      return true;
    } catch (error) {
      console.error(`Error initializing DCA Bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Load purchase history from database and calculate statistics
   */
  private async loadPurchaseHistory(): Promise<void> {
    try {
      // Get all trades for this bot
      const trades = await storage.getBotTrades(this.botId);
      
      if (trades && trades.length > 0) {
        // Reset stats
        this.totalPurchases = 0;
        this.totalInvested = 0;
        this.purchaseHistory = [];
        
        // Process each trade
        for (const trade of trades) {
          if (trade.side === 'buy') {
            const price = parseFloat(trade.price);
            const amount = parseFloat(trade.amount);
            const timestamp = trade.createdAt?.getTime() || Date.now();
            
            this.purchaseHistory.push({
              price,
              amount,
              timestamp
            });
            
            this.totalPurchases++;
            this.totalInvested += price * amount;
          }
        }
        
        // Calculate average entry price
        if (this.totalPurchases > 0) {
          this.averageEntryPrice = this.totalInvested / this.totalPurchases;
        }
        
        // Find the last execution time
        if (this.purchaseHistory.length > 0) {
          this.lastExecutionTime = Math.max(...this.purchaseHistory.map(p => p.timestamp));
        }
        
        console.log(`DCA Bot ${this.botId} loaded ${this.totalPurchases} purchases, avg price: ${this.averageEntryPrice.toFixed(2)}`);
      } else {
        console.log(`DCA Bot ${this.botId} has no purchase history yet`);
      }
    } catch (error) {
      console.error(`Error loading purchase history for DCA Bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Start the bot's execution cycle
   */
  protected startExecutionCycle(): void {
    // Check for and clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Initial cycle execution
    this.executeTradingCycle().catch(error => {
      console.error(`Error in DCA Bot ${this.botId} trading cycle:`, error);
    });
    
    // Set up regular interval for trading cycles
    // Check every hour if it's time to execute a purchase
    this.intervalId = setInterval(() => {
      this.executeTradingCycle().catch(error => {
        console.error(`Error in DCA Bot ${this.botId} trading cycle:`, error);
      });
    }, 60 * 60 * 1000); // 1 hour
    
    // Additional interval for checking stop loss/take profit every 5 minutes
    setInterval(() => {
      this.checkStopLossAndTakeProfit().catch(error => {
        console.error(`Error checking SL/TP for DCA Bot ${this.botId}:`, error);
      });
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  /**
   * Execute a single trading cycle
   */
  protected async executeTradingCycle(): Promise<void> {
    try {
      // Skip if bot is not running
      if (this.status !== BotStatus.RUNNING) {
        return;
      }
      
      // Check if we've reached the maximum number of purchases
      if (this.totalPurchases >= this.parameters.maxPurchases) {
        console.log(`DCA Bot ${this.botId} has reached maximum purchases (${this.parameters.maxPurchases})`);
        this.status = BotStatus.STOPPED;
        await this.saveState();
        return;
      }
      
      // Check if we've spent the total budget
      if (this.totalInvested >= this.parameters.totalBudget) {
        console.log(`DCA Bot ${this.botId} has spent its total budget (${this.parameters.totalBudget})`);
        this.status = BotStatus.STOPPED;
        await this.saveState();
        return;
      }
      
      // Check if it's time to execute a purchase
      const now = Date.now();
      const timeSinceLastExecution = now - this.lastExecutionTime;
      const intervalMs = this.parameters.intervalHours * 60 * 60 * 1000;
      
      if (timeSinceLastExecution >= intervalMs) {
        await this.executePurchase();
      } else {
        const nextExecutionTime = this.lastExecutionTime + intervalMs;
        const timeUntilNextExecution = nextExecutionTime - now;
        const hoursUntilNext = timeUntilNextExecution / (60 * 60 * 1000);
        
        console.log(`DCA Bot ${this.botId} next purchase in ${hoursUntilNext.toFixed(2)} hours`);
      }
      
      // Save state
      await this.saveState();
      
    } catch (error) {
      console.error(`Error in DCA Bot ${this.botId} trading cycle:`, error);
    }
  }
  
  /**
   * Execute a DCA purchase
   */
  private async executePurchase(): Promise<void> {
    try {
      // Get the current price
      const currentPrice = await this.getCurrentPrice(this.parameters.symbol);
      if (!currentPrice) {
        console.error(`DCA Bot ${this.botId} failed to get current price for ${this.parameters.symbol}`);
        return;
      }
      
      // Calculate quantity based on purchase amount
      const quantity = this.parameters.purchaseAmount / currentPrice;
      
      // Make sure the purchase amount doesn't exceed the remaining budget
      const remainingBudget = this.parameters.totalBudget - this.totalInvested;
      if (this.parameters.purchaseAmount > remainingBudget) {
        console.log(`DCA Bot ${this.botId} adjusting final purchase amount to remaining budget ${remainingBudget}`);
        const adjustedQuantity = remainingBudget / currentPrice;
        
        // Execute the trade via paper trading bridge
        await this.executeTradeWithAmount(adjustedQuantity, currentPrice);
      } else {
        // Execute the trade via paper trading bridge
        await this.executeTradeWithAmount(quantity, currentPrice);
      }
      
      // Update the last execution time
      this.lastExecutionTime = Date.now();
      
    } catch (error) {
      console.error(`Error executing DCA purchase for Bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Execute a trade with the specified amount
   */
  private async executeTradeWithAmount(quantity: number, currentPrice: number): Promise<void> {
    try {
      // Execute the trade via paper trading bridge
      const result = await this.paperTradingBridge.executeTrade({
        symbol: this.parameters.symbol,
        direction: TradeDirection.LONG, // DCA is always buying (long)
        entryPrice: currentPrice,
        quantity: quantity,
        reason: 'DCA scheduled purchase',
        confidence: 1.0,
        signalSource: 'dca',
        metadata: {
          purchaseNumber: this.totalPurchases + 1,
          totalPurchases: this.parameters.maxPurchases
        }
      });
      
      if (result.success) {
        console.log(`DCA Bot ${this.botId} executed purchase #${this.totalPurchases + 1}: ${quantity} ${this.parameters.symbol} at ${currentPrice}`);
        
        // Update stats
        this.totalPurchases++;
        this.totalInvested += quantity * currentPrice;
        this.purchaseHistory.push({
          price: currentPrice,
          amount: quantity,
          timestamp: Date.now()
        });
        
        // Recalculate average entry price
        this.calculateAverageEntryPrice();
        
        // Record the trade in the database
        await this.recordTrade({
          botId: this.botId,
          userId: this.userId,
          symbol: this.parameters.symbol,
          side: 'buy',
          type: 'market',
          price: currentPrice.toString(),
          amount: quantity.toString(),
          status: 'filled',
          orderId: result.tradeId?.toString() || '',
          fee: '0', // Paper trading doesn't have fees
          feeCurrency: 'USDT',
          isTest: true,
          metadata: {
            purchaseNumber: this.totalPurchases,
            averageEntryPrice: this.averageEntryPrice,
            botType: 'DCA'
          }
        });
      } else {
        console.error(`DCA Bot ${this.botId} failed to execute purchase:`, result.message || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error executing DCA trade for Bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Calculate average entry price based on purchase history
   */
  private calculateAverageEntryPrice(): void {
    if (this.purchaseHistory.length === 0) {
      this.averageEntryPrice = 0;
      return;
    }
    
    let totalCost = 0;
    let totalQuantity = 0;
    
    for (const purchase of this.purchaseHistory) {
      const cost = purchase.price * purchase.amount;
      totalCost += cost;
      totalQuantity += purchase.amount;
    }
    
    this.averageEntryPrice = totalCost / totalQuantity;
  }
  
  /**
   * Check if price target has been reached
   */
  private async checkPriceTarget(): Promise<void> {
    try {
      // Skip if no price target is set
      if (!this.parameters.priceTargetPercentage || this.averageEntryPrice === 0) {
        return;
      }
      
      // Get current price
      const currentPrice = await this.getCurrentPrice(this.parameters.symbol);
      if (!currentPrice) {
        return;
      }
      
      // Calculate profit percentage
      const profitPercentage = ((currentPrice - this.averageEntryPrice) / this.averageEntryPrice) * 100;
      
      // Check if price target has been reached
      if (profitPercentage >= this.parameters.priceTargetPercentage) {
        console.log(`DCA Bot ${this.botId} price target reached! Current profit: ${profitPercentage.toFixed(2)}%`);
        
        // Close all positions
        const positions = await this.paperTradingBridge.getOpenPositions();
        for (const position of positions) {
          if (position.symbol === this.parameters.symbol) {
            await this.closePosition(position.id, 'Price Target Reached');
          }
        }
        
        // Stop the bot
        this.status = BotStatus.STOPPED;
        await this.saveState();
      }
    } catch (error) {
      console.error(`Error checking price target for DCA Bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Override the checkStopLossAndTakeProfit method to also check price target
   */
  protected async checkStopLossAndTakeProfit(): Promise<void> {
    await super.checkStopLossAndTakeProfit();
    await this.checkPriceTarget();
  }
  
  /**
   * Get information about the bot
   */
  public getInfo(): any {
    return {
      id: this.botId,
      userId: this.userId,
      status: this.status,
      parameters: this.parameters,
      totalPurchases: this.totalPurchases,
      maxPurchases: this.parameters.maxPurchases,
      totalInvested: this.totalInvested,
      totalBudget: this.parameters.totalBudget,
      averageEntryPrice: this.averageEntryPrice,
      lastPurchaseTime: this.lastExecutionTime ? new Date(this.lastExecutionTime).toISOString() : null,
      purchaseHistory: this.purchaseHistory.slice(-10) // Return last 10 purchases
    };
  }
}

// Factory function to create a DCA Bot instance
export function createDCABot(botId: number, userId: number, parameters: DCABotParameters): DCABot {
  return new DCABot(botId, userId, parameters);
}