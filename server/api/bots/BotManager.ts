/**
 * BotManager.ts
 * 
 * Central manager for all trading bots
 * Handles creation, management, and coordination of all bot types
 */

import { storage } from '../../storage';
import { BaseTradingBot, BotStatus } from './BaseTradingBot';
import { GridBot, GridBotParameters, createGridBot } from './GridBot';
import { DCABot, DCABotParameters, createDCABot } from './DCABot';
import { MACDBot, MACDBotParameters, createMACDBot } from './MACDBot';

// Strategy types
export enum BotStrategyType {
  GRID = 'grid',
  DCA = 'dca',
  MACD = 'macd',
  AI_GRID = 'ai_grid'
}

// Bot manager class
export class BotManager {
  private static instance: BotManager;
  private bots: Map<number, BaseTradingBot> = new Map();
  
  // Private constructor to enforce singleton
  private constructor() {
    // Initialize the bot manager
    this.initialize();
  }
  
  /**
   * Get the singleton instance of BotManager
   */
  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    
    return BotManager.instance;
  }
  
  /**
   * Initialize the bot manager
   * Load active bots from the database
   */
  private async initialize(): Promise<void> {
    try {
      console.log('Initializing bot manager...');
      
      // Load active bots from the database
      await this.loadActiveBots();
      
      // Setup regular state saving
      setInterval(() => {
        this.saveAllBotStates();
      }, 5 * 60 * 1000); // Save state every 5 minutes
      
      console.log(`Bot manager initialized with ${this.bots.size} active bots`);
    } catch (error) {
      console.error('Error initializing bot manager:', error);
    }
  }
  
  /**
   * Load active bots from the database
   */
  private async loadActiveBots(): Promise<void> {
    try {
      // Get all active bots from the database
      const activeBots = await storage.getActiveBots();
      
      // Create bot instances
      for (const bot of activeBots) {
        try {
          // Skip bots without parameters
          if (!bot.parameters) {
            console.warn(`Bot ${bot.id} has no parameters, skipping`);
            continue;
          }
          
          // Create the appropriate bot type
          const botInstance = await this.createBotInstance(
            bot.id,
            bot.userId,
            bot.strategyType as BotStrategyType,
            bot.parameters
          );
          
          // Add to the bots map
          if (botInstance) {
            this.bots.set(bot.id, botInstance);
            
            // Start the bot if it was running
            if (bot.isRunning) {
              await botInstance.start();
            }
          }
        } catch (error) {
          console.error(`Error loading bot ${bot.id}:`, error);
        }
      }
      
      console.log(`Loaded ${this.bots.size} active bots`);
    } catch (error) {
      console.error('Error loading active bots:', error);
    }
  }
  
  /**
   * Save state for all bots
   */
  private async saveAllBotStates(): Promise<void> {
    const activeBotCount = this.bots.size;
    console.log(`Saving state for ${activeBotCount} active bots...`);
    
    // Get an array of entries for safer iteration
    const botEntries: [number, BaseTradingBot][] = [];
    
    // Fill the array with entries from the map
    this.bots.forEach((bot, botId) => {
      botEntries.push([botId, bot]);
    });
    
    for (let i = 0; i < botEntries.length; i++) {
      const [botId, bot] = botEntries[i];
      try {
        // Get bot info
        const botInfo = bot.getInfo();
        const botStatus = bot['status'];
        const isRunning = botStatus === BotStatus.RUNNING;
        const isActive = isRunning || botStatus === BotStatus.PAUSED;
        
        // Extract stop loss/take profit settings
        const enableStopLoss = botInfo.parameters.enableStopLoss || false;
        const stopLossPercentage = botInfo.parameters.stopLossPercentage || null;
        const enableTakeProfit = botInfo.parameters.enableTakeProfit || false;
        const takeProfitPercentage = botInfo.parameters.takeProfitPercentage || null;
        
        // Get metrics
        const profitLoss = botInfo.profitLoss || '0';
        const profitLossPercent = botInfo.profitLossPercent || '0';
        const totalTrades = botInfo.totalTrades || 0;
        
        // Update bot in the database with complete state
        await storage.updateBot(botId, {
          isActive,
          isRunning,
          parameters: botInfo.parameters,
          enableStopLoss,
          stopLossPercentage,
          enableTakeProfit, 
          takeProfitPercentage,
          profitLoss,
          profitLossPercent,
          totalTrades,
          lastExecutionTime: new Date(),
          botState: botInfo.state || {}
        });
      } catch (error) {
        console.error(`Error saving state for bot ${botId}:`, error);
      }
    }
    
    console.log(`Saved state for ${activeBotCount} active bots`);
  }
  
  /**
   * Create a new bot
   */
  public async createBot(
    userId: number,
    strategyType: BotStrategyType,
    parameters: any,
    name: string,
    description?: string
  ): Promise<number> {
    try {
      // Extract stop loss and take profit settings from parameters
      const enableStopLoss = parameters.enableStopLoss || false;
      const stopLossPercentage = parameters.stopLossPercentage || null;
      const enableTakeProfit = parameters.enableTakeProfit || false;
      const takeProfitPercentage = parameters.takeProfitPercentage || null;

      // Create bot in database first with full parameters
      const botId = await storage.createBot({
        userId,
        name,
        description: description || '',
        symbol: parameters.symbol,
        broker: 'binance',
        strategyType,
        parameters,
        isActive: false,
        isRunning: false,
        enableStopLoss,
        stopLossPercentage,
        enableTakeProfit,
        takeProfitPercentage,
        profitLoss: '0',
        profitLossPercent: '0',
        totalTrades: 0,
        botState: {
          trades: [],
          gridLines: [],
          metrics: {
            positions: [],
            totalTrades: 0,
            profitLoss: 0,
            profitLossPercent: 0
          }
        }
      });
      
      // Create bot instance
      const botInstance = await this.createBotInstance(
        botId,
        userId,
        strategyType,
        parameters
      );
      
      // Add to bots map
      if (botInstance) {
        this.bots.set(botId, botInstance);
        console.log(`Created new ${strategyType} bot with ID ${botId} for user ${userId}`);
      }
      
      return botId;
    } catch (error) {
      console.error('Error creating bot:', error);
      throw error;
    }
  }
  
  /**
   * Create a bot instance of the appropriate type
   */
  private async createBotInstance(
    botId: number,
    userId: number,
    strategyType: BotStrategyType,
    parameters: any
  ): Promise<BaseTradingBot | null> {
    try {
      switch (strategyType) {
        case BotStrategyType.GRID:
          return createGridBot(botId, userId, parameters as GridBotParameters);
          
        case BotStrategyType.DCA:
          return createDCABot(botId, userId, parameters as DCABotParameters);
          
        case BotStrategyType.MACD:
          return createMACDBot(botId, userId, parameters as MACDBotParameters);
          
        case BotStrategyType.AI_GRID:
          // AI Grid bots are handled separately by AiGridBotManager
          console.log(`AI Grid bots are handled by AiGridBotManager, not creating a BaseTradingBot instance for bot ${botId}`);
          return null;
          
        default:
          console.error(`Unknown bot strategy type: ${strategyType}`);
          return null;
      }
    } catch (error) {
      console.error(`Error creating bot instance of type ${strategyType}:`, error);
      return null;
    }
  }
  
  /**
   * Get a bot instance by ID
   */
  public getBot(botId: number): BaseTradingBot | undefined {
    return this.bots.get(botId);
  }
  
  /**
   * Start a bot
   */
  public async startBot(botId: number): Promise<boolean> {
    const bot = this.bots.get(botId);
    
    if (!bot) {
      // Check if bot exists in the database
      const dbBot = await storage.getBotById(botId);
      
      if (!dbBot) {
        console.error(`Bot ${botId} not found`);
        return false;
      }
      
      // Create and start the bot
      const botInstance = await this.createBotInstance(
        dbBot.id,
        dbBot.userId,
        dbBot.strategyType as BotStrategyType,
        dbBot.parameters
      );
      
      if (!botInstance) {
        console.error(`Failed to create bot instance for bot ${botId}`);
        return false;
      }
      
      // Add to bots map
      this.bots.set(botId, botInstance);
      
      // Start the bot
      return await botInstance.start();
    }
    
    // Start the existing bot
    return await bot.start();
  }
  
  /**
   * Stop a bot
   */
  public async stopBot(botId: number): Promise<boolean> {
    const bot = this.bots.get(botId);
    
    if (!bot) {
      console.error(`Bot ${botId} not found`);
      return false;
    }
    
    return await bot.stop();
  }
  
  /**
   * Pause a bot
   */
  public async pauseBot(botId: number): Promise<boolean> {
    const bot = this.bots.get(botId);
    
    if (!bot) {
      console.error(`Bot ${botId} not found`);
      return false;
    }
    
    return await bot.pause();
  }
  
  /**
   * Resume a bot
   */
  public async resumeBot(botId: number): Promise<boolean> {
    const bot = this.bots.get(botId);
    
    if (!bot) {
      console.error(`Bot ${botId} not found`);
      return false;
    }
    
    return await bot.resume();
  }
  
  /**
   * Delete a bot
   */
  public async deleteBot(botId: number): Promise<boolean> {
    try {
      const bot = this.bots.get(botId);
      
      // Stop the bot if it's running
      if (bot) {
        await bot.stop();
        this.bots.delete(botId);
      }
      
      // Delete from database
      await storage.deleteBot(botId);
      
      return true;
    } catch (error) {
      console.error(`Error deleting bot ${botId}:`, error);
      return false;
    }
  }
  
  /**
   * Update bot parameters
   */
  public async updateBotParameters(botId: number, parameters: any): Promise<boolean> {
    try {
      const bot = this.bots.get(botId);
      
      // Extract stop loss and take profit settings from parameters
      const enableStopLoss = parameters.enableStopLoss !== undefined ? parameters.enableStopLoss : undefined;
      const stopLossPercentage = parameters.stopLossPercentage !== undefined ? parameters.stopLossPercentage : undefined;
      const enableTakeProfit = parameters.enableTakeProfit !== undefined ? parameters.enableTakeProfit : undefined;
      const takeProfitPercentage = parameters.takeProfitPercentage !== undefined ? parameters.takeProfitPercentage : undefined;
      
      // Update database with explicit stop loss and take profit settings if provided
      const updates: any = { parameters };
      
      if (enableStopLoss !== undefined) updates.enableStopLoss = enableStopLoss;
      if (stopLossPercentage !== undefined) updates.stopLossPercentage = stopLossPercentage;
      if (enableTakeProfit !== undefined) updates.enableTakeProfit = enableTakeProfit;
      if (takeProfitPercentage !== undefined) updates.takeProfitPercentage = takeProfitPercentage;
      
      await storage.updateBot(botId, updates);
      
      // Log the updated parameters
      console.log(`Updated parameters for bot ${botId}:`, {
        enableStopLoss,
        stopLossPercentage,
        enableTakeProfit,
        takeProfitPercentage
      });
      
      // Update the bot instance if it exists
      if (bot) {
        return await bot.updateParameters(parameters);
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating bot ${botId} parameters:`, error);
      return false;
    }
  }
  
  /**
   * Get all bots for a user
   */
  public async getUserBots(userId: number): Promise<any[]> {
    try {
      // Get bots from database
      const bots = await storage.getUserBots(userId);
      
      // Enrich with live data from bot instances
      return bots.map(bot => {
        const botInstance = this.bots.get(bot.id);
        
        if (botInstance) {
          // Combine database data with live bot info
          const liveInfo = botInstance.getInfo();
          
          return {
            ...bot,
            ...liveInfo
          };
        }
        
        return bot;
      });
    } catch (error) {
      console.error(`Error getting bots for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get bot details
   */
  public async getBotDetails(botId: number): Promise<any | null> {
    try {
      // Get bot from database
      const bot = await storage.getBotById(botId);
      
      if (!bot) {
        return null;
      }
      
      // Get bot instance
      const botInstance = this.bots.get(botId);
      
      if (botInstance) {
        // Combine database data with live bot info
        const liveInfo = botInstance.getInfo();
        
        return {
          ...bot,
          ...liveInfo
        };
      }
      
      return bot;
    } catch (error) {
      console.error(`Error getting details for bot ${botId}:`, error);
      return null;
    }
  }
  
  /**
   * Get trades for a bot
   */
  public async getBotTrades(botId: number): Promise<any[]> {
    try {
      // Get trades from database
      return await storage.getBotTrades(botId);
    } catch (error) {
      console.error(`Error getting trades for bot ${botId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const botManager = BotManager.getInstance();