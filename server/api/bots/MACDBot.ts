/**
 * MACDBot.ts
 * 
 * Implementation of a MACD (Moving Average Convergence Divergence) Trading Bot
 * MACD is a trend-following momentum indicator that shows the relationship
 * between two moving averages of a security's price.
 */

import { BaseTradingBot, BaseBotParameters, BotStatus } from './BaseTradingBot';
import { PaperTradingBridge, TradeDirection } from '../paper-trading/PaperTradingBridge';
import { storage } from '../../storage';

// MACD bot specific parameters
export interface MACDBotParameters extends BaseBotParameters {
  fastPeriod: number;       // Fast EMA period (typically 12)
  slowPeriod: number;       // Slow EMA period (typically 26)
  signalPeriod: number;     // Signal line period (typically 9)
  timeframe: string;        // Timeframe for analysis (1h, 4h, 1d, etc.)
  investmentAmount: number; // Amount to invest per trade
  maxPositions: number;     // Maximum number of open positions
}

// Types for historical price data
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

// MACD values
interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

// MACD bot implementation
export class MACDBot extends BaseTradingBot {
  protected parameters: MACDBotParameters;
  private historicalPrices: Candle[] = [];
  private lastSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
  private currentPositions: number = 0;
  private lastMACDUpdate: number = 0;
  private macdHistory: Array<{ timestamp: number; macd: number; signal: number; histogram: number; }> = [];
  
  constructor(botId: number, userId: number, parameters: MACDBotParameters) {
    super(botId, userId, parameters);
    this.parameters = parameters;
  }
  
  /**
   * Initialize the MACD bot
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize base components
      if (!(await super.initialize())) {
        return false;
      }
      
      // Fetch historical prices
      await this.updateHistoricalPrices();
      
      // Calculate MACD values
      this.calculateMACD();
      
      // Get current open positions
      const positions = await this.paperTradingBridge.getOpenPositions();
      this.currentPositions = positions.filter(p => p.symbol === this.parameters.symbol).length;
      
      console.log(`MACD Bot ${this.botId} initialized with fast=${this.parameters.fastPeriod}, slow=${this.parameters.slowPeriod}, signal=${this.parameters.signalPeriod}`);
      return true;
    } catch (error) {
      console.error(`Error initializing MACD Bot ${this.botId}:`, error);
      return false;
    }
  }
  
  /**
   * Fetch historical price data
   */
  private async updateHistoricalPrices(): Promise<void> {
    try {
      // Convert timeframe to Binance format
      const interval = this.convertTimeframe(this.parameters.timeframe);
      
      // Fetch enough candles to calculate MACD
      // We need at least slowPeriod + signalPeriod candles
      const requiredCandles = this.parameters.slowPeriod + this.parameters.signalPeriod + 10; // Add some buffer
      
      // Fetch candles from Binance API
      const response = await fetch(`/api/binance/klines?symbol=${this.parameters.symbol}&interval=${interval}&limit=${requiredCandles}`);
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error(`Invalid response from Binance API: ${JSON.stringify(data)}`);
      }
      
      // Parse candles
      this.historicalPrices = data.map(candle => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
      
      console.log(`MACD Bot ${this.botId} fetched ${this.historicalPrices.length} candles for ${this.parameters.symbol} (${interval})`);
    } catch (error) {
      console.error(`Error fetching historical prices for MACD Bot ${this.botId}:`, error);
      throw error;
    }
  }
  
  /**
   * Convert timeframe to Binance format
   */
  private convertTimeframe(timeframe: string): string {
    // Binance uses 1h, 4h, 1d, etc.
    // Make sure timeframe is in the correct format
    switch (timeframe.toLowerCase()) {
      case '1m': return '1m';
      case '3m': return '3m';
      case '5m': return '5m';
      case '15m': return '15m';
      case '30m': return '30m';
      case '1h': return '1h';
      case '2h': return '2h';
      case '4h': return '4h';
      case '6h': return '6h';
      case '8h': return '8h';
      case '12h': return '12h';
      case '1d': return '1d';
      case '3d': return '3d';
      case '1w': return '1w';
      case '1M': return '1M';
      default: return '1h'; // Default to 1h
    }
  }
  
  /**
   * Calculate MACD values from historical prices
   */
  private calculateMACD(): MACDResult | null {
    try {
      if (this.historicalPrices.length < this.parameters.slowPeriod + this.parameters.signalPeriod) {
        console.warn(`Not enough historical prices to calculate MACD for Bot ${this.botId}`);
        return null;
      }
      
      // Extract close prices
      const prices = this.historicalPrices.map(candle => candle.close);
      
      // Calculate fast EMA
      const fastEMA = this.calculateEMA(prices, this.parameters.fastPeriod);
      
      // Calculate slow EMA
      const slowEMA = this.calculateEMA(prices, this.parameters.slowPeriod);
      
      // Calculate MACD line
      const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
      
      // Calculate signal line (EMA of MACD line)
      const signalLine = this.calculateEMA(macdLine, this.parameters.signalPeriod);
      
      // Calculate histogram (MACD line - signal line)
      const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
      
      // Store MACD history
      this.macdHistory = [];
      for (let i = 0; i < macdLine.length; i++) {
        if (i < this.historicalPrices.length) {
          this.macdHistory.push({
            timestamp: this.historicalPrices[i].timestamp,
            macd: macdLine[i],
            signal: signalLine[i],
            histogram: histogram[i]
          });
        }
      }
      
      // Return the latest MACD values
      const latest = {
        macd: macdLine[macdLine.length - 1],
        signal: signalLine[signalLine.length - 1],
        histogram: histogram[histogram.length - 1]
      };
      
      this.lastMACDUpdate = Date.now();
      
      return latest;
    } catch (error) {
      console.error(`Error calculating MACD for Bot ${this.botId}:`, error);
      return null;
    }
  }
  
  /**
   * Calculate Exponential Moving Average (EMA)
   */
  private calculateEMA(prices: number[], period: number): number[] {
    // Initial SMA value
    const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    // Multiplier: (2 / (period + 1))
    const multiplier = 2 / (period + 1);
    
    // EMA values
    const emaValues: number[] = new Array(prices.length).fill(0);
    
    // Set first EMA value to SMA
    emaValues[period - 1] = sma;
    
    // Calculate EMA values
    for (let i = period; i < prices.length; i++) {
      // EMA = Price(t) * k + EMA(y) * (1 - k)
      emaValues[i] = prices[i] * multiplier + emaValues[i - 1] * (1 - multiplier);
    }
    
    return emaValues;
  }
  
  /**
   * Generate a trading signal based on MACD values
   */
  private generateTradingSignal(macdResult: MACDResult): 'buy' | 'sell' | 'neutral' {
    try {
      // No historical data
      if (!macdResult) {
        return 'neutral';
      }
      
      const { macd, signal, histogram } = macdResult;
      
      // Get previous MACD values
      const previousIndex = this.macdHistory.length - 2;
      if (previousIndex < 0) {
        return 'neutral';
      }
      
      const previousMacd = this.macdHistory[previousIndex].macd;
      const previousSignal = this.macdHistory[previousIndex].signal;
      const previousHistogram = this.macdHistory[previousIndex].histogram;
      
      // Buy signal: MACD line crosses above signal line
      if (previousMacd < previousSignal && macd > signal) {
        return 'buy';
      }
      
      // Sell signal: MACD line crosses below signal line
      if (previousMacd > previousSignal && macd < signal) {
        return 'sell';
      }
      
      // If both MACD and signal are positive and histogram is increasing, it's a bullish trend
      if (macd > 0 && signal > 0 && histogram > previousHistogram) {
        return 'buy';
      }
      
      // If both MACD and signal are negative and histogram is decreasing, it's a bearish trend
      if (macd < 0 && signal < 0 && histogram < previousHistogram) {
        return 'sell';
      }
      
      // No clear signal
      return 'neutral';
    } catch (error) {
      console.error(`Error generating trading signal for MACD Bot ${this.botId}:`, error);
      return 'neutral';
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
      console.error(`Error in MACD Bot ${this.botId} trading cycle:`, error);
    });
    
    // Set up regular interval for trading cycles
    // Timeframe-based interval - if we're using 1h, check every 5 minutes
    // If 4h, check every 20 minutes, etc.
    const baseInterval = this.getIntervalMilliseconds(this.parameters.timeframe);
    const checkInterval = Math.min(baseInterval / 12, 15 * 60 * 1000); // at least 12 checks per period, max 15 minutes
    
    this.intervalId = setInterval(() => {
      this.executeTradingCycle().catch(error => {
        console.error(`Error in MACD Bot ${this.botId} trading cycle:`, error);
      });
    }, checkInterval);
    
    // Additional interval for checking stop loss/take profit every minute
    setInterval(() => {
      this.checkStopLossAndTakeProfit().catch(error => {
        console.error(`Error checking SL/TP for MACD Bot ${this.botId}:`, error);
      });
    }, 60 * 1000); // 1 minute
  }
  
  /**
   * Get interval in milliseconds from timeframe
   */
  private getIntervalMilliseconds(timeframe: string): number {
    const tf = timeframe.toLowerCase();
    
    if (tf.endsWith('m')) {
      const minutes = parseInt(tf);
      return minutes * 60 * 1000;
    } else if (tf.endsWith('h')) {
      const hours = parseInt(tf);
      return hours * 60 * 60 * 1000;
    } else if (tf.endsWith('d')) {
      const days = parseInt(tf);
      return days * 24 * 60 * 60 * 1000;
    } else if (tf.endsWith('w')) {
      const weeks = parseInt(tf);
      return weeks * 7 * 24 * 60 * 60 * 1000;
    } else if (tf.endsWith('M')) {
      // Approximate a month as 30 days
      const months = parseInt(tf);
      return months * 30 * 24 * 60 * 60 * 1000;
    }
    
    // Default to 1 hour
    return 60 * 60 * 1000;
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
      
      // Update historical prices and calculate MACD at regular intervals
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastMACDUpdate;
      
      // Update MACD every 5 minutes or when lastMACDUpdate is 0
      if (this.lastMACDUpdate === 0 || timeSinceLastUpdate > 5 * 60 * 1000) {
        await this.updateHistoricalPrices();
      }
      
      // Calculate MACD
      const macdResult = this.calculateMACD();
      
      // Skip if MACD calculation failed
      if (!macdResult) {
        return;
      }
      
      // Generate trading signal
      const signal = this.generateTradingSignal(macdResult);
      
      // Log signal if it has changed
      if (signal !== this.lastSignal) {
        console.log(`MACD Bot ${this.botId} signal changed from ${this.lastSignal} to ${signal}`);
        this.lastSignal = signal;
      }
      
      // Check current positions
      const positions = await this.paperTradingBridge.getOpenPositions();
      this.currentPositions = positions.filter(p => p.symbol === this.parameters.symbol).length;
      
      // Execute trade based on signal
      if (signal === 'buy' && this.currentPositions < this.parameters.maxPositions) {
        await this.executeBuyTrade(macdResult);
      } else if (signal === 'sell' && this.currentPositions > 0) {
        await this.executeSellTrade(macdResult);
      }
      
      // Save state
      await this.saveState();
      
    } catch (error) {
      console.error(`Error in MACD Bot ${this.botId} trading cycle:`, error);
    }
  }
  
  /**
   * Execute a buy trade
   */
  private async executeBuyTrade(macdResult: MACDResult): Promise<void> {
    try {
      // Get current price
      const currentPrice = await this.getCurrentPrice(this.parameters.symbol);
      if (!currentPrice) {
        return;
      }
      
      // Calculate quantity based on investment amount
      const quantity = this.parameters.investmentAmount / currentPrice;
      
      // Calculate the signal strength (0-1) based on MACD and signal values
      const signalStrength = Math.min(1, Math.abs(macdResult.histogram) / 0.1); // Normalize
      
      // Get the current price as a number or use a fallback
      const entryPrice = typeof currentPrice === 'number' ? currentPrice : 0;

      // Execute the trade via paper trading bridge
      const result = await this.paperTradingBridge.executeTrade({
        symbol: this.parameters.symbol,
        direction: TradeDirection.LONG,
        entryPrice: entryPrice, // Now we're sure it's a number
        quantity: quantity,     
        reason: 'MACD signal',  
        confidence: signalStrength, 
        signalSource: 'macd',   
        metadata: {
          macd: macdResult.macd,
          signal: macdResult.signal,
          histogram: macdResult.histogram,
          signalStrength: signalStrength
        }
      });
      
      if (result.success) {
        console.log(`MACD Bot ${this.botId} executed BUY trade: ${quantity} ${this.parameters.symbol} at ${currentPrice}`);
        
        // Update position count
        this.currentPositions++;
        
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
            macd: macdResult.macd,
            signal: macdResult.signal,
            histogram: macdResult.histogram,
            botType: 'MACD'
          }
        });
      } else {
        console.error(`MACD Bot ${this.botId} failed to execute BUY trade:`, result.message || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error executing BUY trade for MACD Bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Execute a sell trade by closing positions
   */
  private async executeSellTrade(macdResult: MACDResult): Promise<void> {
    try {
      // Get open positions
      const positions = await this.paperTradingBridge.getOpenPositions();
      const symbolPositions = positions.filter(p => p.symbol === this.parameters.symbol);
      
      if (symbolPositions.length === 0) {
        console.log(`MACD Bot ${this.botId} has no open positions to sell`);
        return;
      }
      
      // Close all positions
      for (const position of symbolPositions) {
        const result = await this.closePosition(position.id, 'MACD Sell Signal');
        
        if (result) {
          console.log(`MACD Bot ${this.botId} closed position ${position.id}`);
          
          // Update position count
          this.currentPositions--;
          
          // Get current price
          const currentPrice = await this.getCurrentPrice(this.parameters.symbol);
          
          // Record the trade in the database (if we have the current price)
          if (currentPrice) {
            await this.recordTrade({
              botId: this.botId,
              userId: this.userId,
              symbol: this.parameters.symbol,
              side: 'sell',
              type: 'market',
              price: currentPrice.toString(),
              amount: position.quantity,
              status: 'filled',
              orderId: position.id.toString(),
              fee: '0', // Paper trading doesn't have fees
              feeCurrency: 'USDT',
              isTest: true,
              metadata: {
                macd: macdResult.macd,
                signal: macdResult.signal,
                histogram: macdResult.histogram,
                botType: 'MACD',
                positionId: position.id
              }
            });
          }
        } else {
          console.error(`MACD Bot ${this.botId} failed to close position ${position.id}`);
        }
      }
    } catch (error) {
      console.error(`Error executing SELL trade for MACD Bot ${this.botId}:`, error);
    }
  }
  
  /**
   * Get information about the bot
   */
  public getInfo(): any {
    const latestMacd = this.macdHistory.length > 0 ? this.macdHistory[this.macdHistory.length - 1] : null;
    
    return {
      id: this.botId,
      userId: this.userId,
      status: this.status,
      parameters: this.parameters,
      currentPositions: this.currentPositions,
      maxPositions: this.parameters.maxPositions,
      currentSignal: this.lastSignal,
      macdData: {
        latest: latestMacd,
        history: this.macdHistory.slice(-20) // Return last 20 MACD values
      }
    };
  }
}

// Factory function to create a MACD Bot instance
export function createMACDBot(botId: number, userId: number, parameters: MACDBotParameters): MACDBot {
  return new MACDBot(botId, userId, parameters);
}