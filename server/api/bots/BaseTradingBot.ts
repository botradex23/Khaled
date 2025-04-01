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
}

// Base class for all trading bots
export abstract class BaseTradingBot {
  protected botId: number;
  protected userId: number;
  protected status: BotStatus = BotStatus.CREATED;
  protected parameters: BaseBotParameters;
  protected paperTradingBridge: PaperTradingBridge;
  protected intervalId: NodeJS.Timeout | null = null;
  
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
      await storage.updateBot(this.botId, {
        isActive: this.status === BotStatus.RUNNING,
        isRunning: this.status === BotStatus.RUNNING,
        parameters: this.parameters
      });
    } catch (error) {
      console.error(`Error saving state for bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Loads the bot state from the database
   */
  protected async loadState(): Promise<void> {
    try {
      const bot = await storage.getBotById(this.botId);
      if (bot) {
        this.status = bot.isRunning ? BotStatus.RUNNING : (bot.isActive ? BotStatus.PAUSED : BotStatus.STOPPED);
        if (bot.parameters) {
          this.parameters = {
            ...this.parameters,
            ...bot.parameters
          };
        }
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