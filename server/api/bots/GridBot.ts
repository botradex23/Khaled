/**
 * GridBot.ts
 * 
 * Implementation of a Grid Trading Bot
 * Grid trading involves placing buy and sell orders at regularly spaced price levels (a grid)
 * It profits from price oscillations in a sideways market
 */

import { BaseTradingBot, BaseBotParameters, BotStatus } from './BaseTradingBot';
import { PaperTradingBridge, TradeDirection } from '../paper-trading/PaperTradingBridge';
import { storage } from '../../storage';

// Grid bot specific parameters
export interface GridBotParameters extends BaseBotParameters {
  gridLevels: number;        // Number of grid levels
  upperLimit: number;        // Upper price limit for the grid
  lowerLimit: number;        // Lower price limit for the grid
  investmentAmount: number;  // Total amount to invest
  aiOptimized?: boolean;     // Whether to use AI optimization for grid spacing
  adaptToVolatility?: boolean; // Whether to adapt grid to market volatility
  maxPositionSize?: number;  // Maximum position size as percentage of investment
}

// Grid bot implementation
export class GridBot extends BaseTradingBot {
  protected parameters: GridBotParameters;
  private gridLevels: { price: number; buyOrder: boolean }[] = [];
  private lastPrice: number = 0;
  private volatility: number = 0;
  private volatilityUpdateTime: number = 0;
  private orderHistory: Array<{ price: number; type: 'buy' | 'sell'; timestamp: number; }> = [];
  
  constructor(botId: number, userId: number, parameters: GridBotParameters) {
    super(botId, userId, parameters);
    this.parameters = parameters;
  }
  
  /**
   * Initialize the grid bot
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize base components
      if (!(await super.initialize())) {
        return false;
      }
      
      // Calculate grid levels
      this.calculateGridLevels();
      
      // Get current price and volatility
      await this.updateCurrentMarketData();
      
      console.log(`Grid Bot ${this.botId} initialized with ${this.parameters.gridLevels} levels between ${this.parameters.lowerLimit} and ${this.parameters.upperLimit}`);
      return true;
    } catch (error) {
      console.error(`Error initializing Grid Bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Calculate grid levels based on parameters
   */
  private calculateGridLevels(): void {
    // Clear existing grid levels
    this.gridLevels = [];
    
    // Get parameters
    const { lowerLimit, upperLimit, gridLevels } = this.parameters;
    
    // Calculate price spacing between levels
    const priceRange = upperLimit - lowerLimit;
    const gridSpacing = priceRange / (gridLevels - 1);
    
    // Create grid levels with alternating buy/sell orders
    for (let i = 0; i < gridLevels; i++) {
      const price = lowerLimit + (i * gridSpacing);
      // Even levels are buy orders, odd levels are sell orders
      const buyOrder = i % 2 === 0;
      
      this.gridLevels.push({
        price,
        buyOrder
      });
    }
    
    // Sort grid levels by price (ascending)
    this.gridLevels.sort((a, b) => a.price - b.price);
  }
  
  /**
   * Calculate grid distribution optimized for market conditions
   * Uses volatility and price action to optimize grid levels
   */
  private calculateAdaptiveGridLevels(): void {
    // Clear existing grid levels
    this.gridLevels = [];
    
    // Get parameters
    const { lowerLimit, upperLimit, gridLevels } = this.parameters;
    
    // Base grid spacing
    const priceRange = upperLimit - lowerLimit;
    
    if (this.parameters.adaptToVolatility && this.volatility > 0) {
      // Use volatility to create non-linear grid spacing
      // More grid levels in areas of higher volatility
      
      // Calculate the volatility factor (0.5 to 1.5 range)
      const volatilityFactor = 0.5 + this.volatility;
      
      // Create grid with non-linear spacing based on volatility
      for (let i = 0; i < gridLevels; i++) {
        // Use a power function to create non-linear spacing
        const normalizedPosition = i / (gridLevels - 1);
        const adaptivePosition = Math.pow(normalizedPosition, volatilityFactor);
        const price = lowerLimit + (adaptivePosition * priceRange);
        
        // Determine if buy or sell order based on price relation to current price
        const buyOrder = price < this.lastPrice;
        
        this.gridLevels.push({
          price,
          buyOrder
        });
      }
    } else {
      // Standard equidistant grid
      const gridSpacing = priceRange / (gridLevels - 1);
      
      for (let i = 0; i < gridLevels; i++) {
        const price = lowerLimit + (i * gridSpacing);
        // Alternating buy/sell based on comparison to current price
        const buyOrder = price < this.lastPrice;
        
        this.gridLevels.push({
          price,
          buyOrder
        });
      }
    }
    
    // Sort grid levels by price (ascending)
    this.gridLevels.sort((a, b) => a.price - b.price);
    
    console.log(`Adaptive grid calculated with ${this.gridLevels.length} levels. Volatility: ${this.volatility.toFixed(4)}`);
  }
  
  /**
   * Update current market data including price and volatility
   */
  private async updateCurrentMarketData(): Promise<boolean> {
    try {
      // Get current price
      const currentPrice = await this.getCurrentPrice(this.parameters.symbol);
      if (!currentPrice) {
        return false;
      }
      
      this.lastPrice = currentPrice;
      
      // Update volatility every 15 minutes
      const now = Date.now();
      if (now - this.volatilityUpdateTime > 15 * 60 * 1000) {
        await this.calculateVolatility();
        this.volatilityUpdateTime = now;
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating market data for Grid Bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Calculate market volatility for adaptive grid sizing
   */
  private async calculateVolatility(): Promise<void> {
    try {
      // Fetch historical prices (1-hour candles for the last 24 hours)
      const response = await fetch(`/api/binance/klines?symbol=${this.parameters.symbol}&interval=1h&limit=24`);
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length < 2) {
        this.volatility = 0.1; // Default volatility
        return;
      }
      
      // Extract close prices
      const prices = data.map(candle => parseFloat(candle[4]));
      
      // Calculate price returns (percentage changes)
      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
      
      // Calculate standard deviation of returns (volatility)
      const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
      const squaredDiffs = returns.map(value => Math.pow(value - mean, 2));
      const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / returns.length;
      this.volatility = Math.sqrt(variance);
      
      console.log(`Volatility for ${this.parameters.symbol}: ${this.volatility.toFixed(6)}`);
    } catch (error) {
      console.error(`Error calculating volatility for Grid Bot ${this.botId}:`, error);
      this.volatility = 0.1; // Default volatility on error
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
      console.error(`Error in Grid Bot ${this.botId} trading cycle:`, error);
    });
    
    // Set up regular interval for trading cycles
    // Execute trading logic every 5 minutes
    this.intervalId = setInterval(() => {
      this.executeTradingCycle().catch(error => {
        console.error(`Error in Grid Bot ${this.botId} trading cycle:`, error);
      });
    }, 5 * 60 * 1000); // 5 minutes
    
    // Additional interval for checking stop loss/take profit every minute
    setInterval(() => {
      this.checkStopLossAndTakeProfit().catch(error => {
        console.error(`Error checking SL/TP for Grid Bot ${this.botId}:`, error);
      });
    }, 60 * 1000); // 1 minute
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
      
      // Update market data
      if (!(await this.updateCurrentMarketData())) {
        return;
      }
      
      // Check if we need to recalculate grid levels
      if (this.parameters.adaptToVolatility) {
        this.calculateAdaptiveGridLevels();
      }
      
      // Get current price
      const currentPrice = this.lastPrice;
      
      // Find grid levels to act on based on current price
      let actionableLevel = null;
      
      for (const level of this.gridLevels) {
        // Find the nearest level that should trigger an action
        // For buy orders, we want price <= level.price
        // For sell orders, we want price >= level.price
        if (level.buyOrder && currentPrice <= level.price) {
          actionableLevel = level;
          break;
        } else if (!level.buyOrder && currentPrice >= level.price) {
          actionableLevel = level;
          break;
        }
      }
      
      // Execute trade if we found an actionable level
      if (actionableLevel) {
        await this.executeGridTrade(actionableLevel, currentPrice);
      }
      
      // Save state
      await this.saveState();
      
    } catch (error) {
      console.error(`Error in Grid Bot ${this.botId} trading cycle:`, error);
    }
  }
  
  /**
   * Execute a grid trade
   */
  private async executeGridTrade(level: { price: number; buyOrder: boolean }, currentPrice: number): Promise<void> {
    try {
      // Calculate trade amount
      // For a grid strategy, we typically use a fixed amount per trade
      const investmentPerTrade = this.parameters.investmentAmount / this.parameters.gridLevels;
      
      // Calculate quantity based on current price
      const quantity = investmentPerTrade / currentPrice;
      
      // Calculate the direction of the trade
      const direction = level.buyOrder ? TradeDirection.LONG : TradeDirection.SHORT;
      
      // Execute the trade via paper trading bridge
      const result = await this.paperTradingBridge.executeTrade({
        symbol: this.parameters.symbol,
        direction: direction,
        entryPrice: currentPrice,  // Add required entryPrice field
        quantity: quantity,        // Pass as number rather than string
        reason: 'Grid level trade', // Required field
        confidence: 1.0,           // Required field, high confidence for grid trades
        signalSource: 'ai_grid',   // Required field
        metadata: {
          gridLevel: level.price,
          trigger: 'grid_signal'
        }
      });
      
      if (result.success) {
        console.log(`Grid Bot ${this.botId} executed ${direction} trade at price ${currentPrice} (grid level: ${level.price})`);
        
        // Record the trade in the order history
        this.orderHistory.push({
          price: currentPrice,
          type: level.buyOrder ? 'buy' : 'sell',
          timestamp: Date.now()
        });
        
        // Record the trade in the database
        await this.recordTrade({
          botId: this.botId,
          userId: this.userId,
          symbol: this.parameters.symbol,
          side: level.buyOrder ? 'buy' : 'sell',
          type: 'market',
          price: currentPrice.toString(),
          amount: quantity.toString(),
          status: 'filled',
          orderId: result.tradeId?.toString() || '',
          fee: '0', // Paper trading doesn't have fees
          feeCurrency: 'USDT',
          isTest: true,
          metadata: {
            gridLevel: level.price,
            botType: 'GRID'
          }
        });
      } else {
        console.error(`Grid Bot ${this.botId} failed to execute trade:`, result.message || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error executing grid trade for Bot ${this.botId}:`, error);
    }
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
      currentPrice: this.lastPrice,
      volatility: this.volatility,
      gridLevels: this.gridLevels.length,
      orderHistory: this.orderHistory.slice(-10) // Return last 10 orders
    };
  }
}

// Factory function to create a Grid Bot instance
export function createGridBot(botId: number, userId: number, parameters: GridBotParameters): GridBot {
  return new GridBot(botId, userId, parameters);
}