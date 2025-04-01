/**
 * BaseTradingBot.ts
 * 
 * Base class for all trading bot implementations
 * Provides common functionality for bot management, execution, and monitoring
 */

import { storage } from '../../storage';
import { InsertTradingBot, InsertBotTrade } from '@shared/schema';
import { PaperTradingBridge, TradeDirection } from '../paper-trading/PaperTradingBridge';

// Common bot status types
export enum BotStatus {
  CREATED = 'CREATED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

// Base parameters for all trading bots
export interface BaseBotParameters {
  symbol: string;
  enabled: boolean;
  enableStopLoss?: boolean;
  stopLossPercentage?: number;
  enableTakeProfit?: boolean;
  takeProfitPercentage?: number;
  maxPositionSize?: number;
  riskLevel?: number; // 1-10 scale for risk management
  initialInvestment?: number;
  totalInvestment?: number;
  // Additional strategy-specific parameters will be added by extending interfaces
}

// Base class for all trading bots
export abstract class BaseTradingBot {
  protected botId: number;
  protected userId: number;
  protected status: BotStatus = BotStatus.CREATED;
  protected parameters: BaseBotParameters;
  protected paperTradingBridge: PaperTradingBridge;
  protected intervalId: NodeJS.Timeout | null = null;
  
  // Properties for state persistence
  protected trades: Array<any> = [];
  protected positions: Array<any> = [];
  protected gridLines: Array<any> = []; // For grid bots
  protected lastExecutionTime: Date | null = null;
  
  constructor(botId: number, userId: number, parameters: BaseBotParameters) {
    this.botId = botId;
    this.userId = userId;
    this.parameters = parameters;
    this.paperTradingBridge = new PaperTradingBridge(this.userId);
  }
  
  /**
   * Initializes the bot and sets up required resources
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize paper trading bridge
      const initialized = await this.paperTradingBridge.initialize();
      if (!initialized) {
        console.error(`Failed to initialize paper trading bridge for bot ${this.botId}`);
        return false;
      }
      
      // Load any saved state if bot is restarting
      await this.loadState();
      
      return true;
    } catch (error) {
      console.error(`Error initializing bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Starts the bot operation
   */
  public async start(): Promise<boolean> {
    try {
      // Check if already running
      if (this.status === BotStatus.RUNNING) {
        console.warn(`Bot ${this.botId} is already running`);
        return true;
      }
      
      // Initialize first
      if (!(await this.initialize())) {
        return false;
      }
      
      // Set status to running
      this.status = BotStatus.RUNNING;
      await this.saveState();
      
      // Start the bot execution cycle
      this.startExecutionCycle();
      
      console.log(`Bot ${this.botId} started successfully`);
      return true;
    } catch (error) {
      console.error(`Error starting bot ${this.botId}:`, error);
      this.status = BotStatus.ERROR;
      await this.saveState();
      return false;
    }
  }
  
  /**
   * Stops the bot operation
   */
  public async stop(): Promise<boolean> {
    try {
      // Check if already stopped
      if (this.status === BotStatus.STOPPED) {
        console.warn(`Bot ${this.botId} is already stopped`);
        return true;
      }
      
      // Clear any running intervals
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // Update status
      this.status = BotStatus.STOPPED;
      await this.saveState();
      
      console.log(`Bot ${this.botId} stopped successfully`);
      return true;
    } catch (error) {
      console.error(`Error stopping bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Pauses the bot operation
   */
  public async pause(): Promise<boolean> {
    try {
      // Check if running
      if (this.status !== BotStatus.RUNNING) {
        console.warn(`Cannot pause bot ${this.botId} because it's not running`);
        return false;
      }
      
      // Clear any running intervals
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // Update status
      this.status = BotStatus.PAUSED;
      await this.saveState();
      
      console.log(`Bot ${this.botId} paused successfully`);
      return true;
    } catch (error) {
      console.error(`Error pausing bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Resumes the bot operation after being paused
   */
  public async resume(): Promise<boolean> {
    try {
      // Check if paused
      if (this.status !== BotStatus.PAUSED) {
        console.warn(`Cannot resume bot ${this.botId} because it's not paused`);
        return false;
      }
      
      // Update status
      this.status = BotStatus.RUNNING;
      await this.saveState();
      
      // Restart the execution cycle
      this.startExecutionCycle();
      
      console.log(`Bot ${this.botId} resumed successfully`);
      return true;
    } catch (error) {
      console.error(`Error resuming bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Updates the bot parameters
   */
  public async updateParameters(parameters: Partial<BaseBotParameters>): Promise<boolean> {
    try {
      // Merge new parameters with existing ones
      this.parameters = {
        ...this.parameters,
        ...parameters
      };
      
      // Save the updated state
      await this.saveState();
      
      console.log(`Bot ${this.botId} parameters updated successfully`);
      return true;
    } catch (error) {
      console.error(`Error updating bot ${this.botId} parameters:`, error);
      return false;
    }
  }
  
  /**
   * Records a trade made by the bot
   */
  protected async recordTrade(trade: InsertBotTrade): Promise<number | null> {
    try {
      const tradeId = await storage.createBotTrade(trade);
      console.log(`Bot ${this.botId} recorded trade ${tradeId}`);
      return tradeId;
    } catch (error) {
      console.error(`Error recording trade for bot ${this.botId}:`, error);
      return null;
    }
  }
  
  /**
   * Checks if stop loss or take profit have been triggered
   */
  protected async checkStopLossAndTakeProfit(): Promise<void> {
    try {
      // No stop loss or take profit settings
      if (!this.parameters.enableStopLoss && !this.parameters.enableTakeProfit) {
        return;
      }
      
      // Get current open positions
      const positions = await this.paperTradingBridge.getOpenPositions();
      
      for (const position of positions) {
        // Skip positions for other symbols
        if (position.symbol !== this.parameters.symbol) {
          continue;
        }
        
        // Get current price for the symbol
        const currentPrice = await this.getCurrentPrice(this.parameters.symbol);
        if (!currentPrice) {
          continue; // Skip if we can't get the current price
        }
        
        const entryPrice = parseFloat(position.entryPrice);
        const direction = position.direction;
        
        // Calculate profit/loss percentage
        let profitLossPercent = 0;
        if (direction === TradeDirection.LONG) {
          profitLossPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        } else {
          profitLossPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
        }
        
        // Check stop loss
        if (this.parameters.enableStopLoss && this.parameters.stopLossPercentage !== undefined) {
          if (profitLossPercent <= -this.parameters.stopLossPercentage) {
            console.log(`Stop loss triggered for bot ${this.botId} position ${position.id} at ${profitLossPercent.toFixed(2)}%`);
            await this.closePosition(position.id, 'Stop Loss');
          }
        }
        
        // Check take profit
        if (this.parameters.enableTakeProfit && this.parameters.takeProfitPercentage !== undefined) {
          if (profitLossPercent >= this.parameters.takeProfitPercentage) {
            console.log(`Take profit triggered for bot ${this.botId} position ${position.id} at ${profitLossPercent.toFixed(2)}%`);
            await this.closePosition(position.id, 'Take Profit');
          }
        }
      }
    } catch (error) {
      console.error(`Error checking stop loss/take profit for bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Closes a specific position
   */
  protected async closePosition(positionId: number, reason: string): Promise<boolean> {
    try {
      const result = await this.paperTradingBridge.closePosition(positionId, { reason });
      return result.success;
    } catch (error) {
      console.error(`Error closing position ${positionId} for bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Gets the current price for a symbol
   */
  protected async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const result = await fetch(`/api/binance/market/price?symbol=${symbol}`);
      const data = await result.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Saves the current bot state to the database
   */
  protected async saveState(): Promise<void> {
    try {
      // Capture current trading data and metrics
      const totalTrades = this.trades.length;
      const profitLossData = this.calculateProfitLoss();
      
      // Prepare bot state for persistence
      const botState = {
        trades: this.trades,
        lastExecutionTime: new Date().toISOString(),
        gridLines: this.gridLines || [],
        metrics: {
          positions: this.positions || [],
          totalTrades,
          profitLoss: profitLossData.profitLoss,
          profitLossPercent: profitLossData.profitLossPercent
        }
      };

      await storage.updateBot(this.botId, {
        isActive: this.status === BotStatus.RUNNING || this.status === BotStatus.PAUSED,
        isRunning: this.status === BotStatus.RUNNING,
        parameters: this.parameters,
        enableStopLoss: this.parameters.enableStopLoss || false,
        stopLossPercentage: this.parameters.stopLossPercentage || null,
        enableTakeProfit: this.parameters.enableTakeProfit || false,
        takeProfitPercentage: this.parameters.takeProfitPercentage || null,
        profitLoss: profitLossData.profitLoss.toString(),
        profitLossPercent: profitLossData.profitLossPercent.toString(),
        totalTrades,
        lastExecutionTime: new Date(),
        botState
      });
      
      console.log(`Bot ${this.botId} state saved successfully. Total trades: ${totalTrades}, PnL: ${profitLossData.profitLoss.toFixed(2)} (${profitLossData.profitLossPercent.toFixed(2)}%)`);
    } catch (error) {
      console.error(`Error saving state for bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Calculates current profit/loss for the bot
   */
  protected calculateProfitLoss(): { profitLoss: number, profitLossPercent: number } {
    try {
      // Default values
      let profitLoss = 0;
      let profitLossPercent = 0;
      
      // Calculate from trades if available
      if (this.trades && this.trades.length > 0) {
        profitLoss = this.trades.reduce((total: number, trade: any) => {
          if (trade.status === 'CLOSED' && trade.profitLoss !== undefined) {
            return total + parseFloat(trade.profitLoss.toString());
          }
          return total;
        }, 0);
        
        // Calculate percentage if we know the initial investment
        if (this.parameters.initialInvestment || this.parameters.totalInvestment) {
          // Use nullish coalescing to handle undefined values
          const initialInvestment = (this.parameters.initialInvestment ?? this.parameters.totalInvestment ?? 1);
          profitLossPercent = (profitLoss / parseFloat(String(initialInvestment))) * 100;
        }
      }
      
      return { profitLoss, profitLossPercent };
    } catch (error) {
      console.error(`Error calculating profit/loss for bot ${this.botId}:`, error);
      return { profitLoss: 0, profitLossPercent: 0 };
    }
  }
  
  /**
   * Loads the bot state from the database
   */
  protected async loadState(): Promise<void> {
    try {
      console.log(`Loading state for bot ${this.botId}...`);
      const bot = await storage.getBotById(this.botId);
      
      if (bot) {
        // Set bot status
        this.status = bot.isRunning ? BotStatus.RUNNING : (bot.isActive ? BotStatus.PAUSED : BotStatus.STOPPED);
        
        // Restore parameters
        if (bot.parameters) {
          this.parameters = {
            ...this.parameters,
            ...bot.parameters
          };
          
          // Load stop loss and take profit settings from parameters if not explicitly set
          if (!this.parameters.hasOwnProperty('enableStopLoss') && bot.enableStopLoss !== undefined) {
            this.parameters.enableStopLoss = bot.enableStopLoss;
          }
          
          if (!this.parameters.hasOwnProperty('stopLossPercentage') && bot.stopLossPercentage !== undefined) {
            this.parameters.stopLossPercentage = parseFloat(bot.stopLossPercentage.toString());
          }
          
          if (!this.parameters.hasOwnProperty('enableTakeProfit') && bot.enableTakeProfit !== undefined) {
            this.parameters.enableTakeProfit = bot.enableTakeProfit;
          }
          
          if (!this.parameters.hasOwnProperty('takeProfitPercentage') && bot.takeProfitPercentage !== undefined) {
            this.parameters.takeProfitPercentage = parseFloat(bot.takeProfitPercentage.toString());
          }
        }
        
        // Restore persisted bot state
        if (bot.botState) {
          // Restore trades
          if (bot.botState.trades) {
            this.trades = bot.botState.trades;
          }
          
          // Restore grid lines for grid bots
          if (bot.botState.gridLines) {
            this.gridLines = bot.botState.gridLines;
          }
          
          // Restore positions
          if (bot.botState.metrics?.positions) {
            this.positions = bot.botState.metrics.positions;
          }
          
          // Log successful state restoration
          console.log(`Bot ${this.botId} state restored successfully.`);
          if (this.trades) {
            console.log(`  - Loaded ${this.trades.length} historical trades`);
          }
          if (this.gridLines) {
            console.log(`  - Loaded ${this.gridLines.length} grid lines`);
          }
          if (this.positions) {
            console.log(`  - Loaded ${this.positions.length} positions`);
          }
          
          // Additional metrics
          if (bot.totalTrades) {
            console.log(`  - Total trades: ${bot.totalTrades}`);
          }
          if (bot.profitLoss) {
            console.log(`  - Profit/Loss: ${bot.profitLoss} (${bot.profitLossPercent}%)`);
          }
        }
      } else {
        console.warn(`No saved state found for bot ${this.botId}`);
      }
    } catch (error) {
      console.error(`Error loading state for bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Abstract methods that must be implemented by specific bot strategies
   */
  
  // Starts the main execution cycle of the bot (specific to each strategy)
  protected abstract startExecutionCycle(): void;
  
  // Executes a single trading cycle (specific to each strategy)
  protected abstract executeTradingCycle(): Promise<void>;
  
  // Gets information about the bot 
  public abstract getInfo(): any;
}