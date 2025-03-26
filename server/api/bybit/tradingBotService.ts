import { bybitService } from './bybitService';
import { isConfigured } from './config';
import { marketService } from './marketService';

// Define a type for our bot response
export type BotResponse = {
  id: number;
  name: string;
  strategy: 'grid' | 'dca' | 'macd';
  description: string;
  minInvestment: number;
  monthlyReturn: number;
  riskLevel: number;
  rating: number;
  isPopular: boolean;
  aiPowered?: boolean;
  parameters?: any;  // Store strategy parameters for reference
}

// Grid trading parameters
type GridParameters = {
  symbol: string;
  upperPrice: number;
  lowerPrice: number;
  gridCount: number;
  totalInvestment: number;
  useAI?: boolean;  // Flag to use AI for parameter optimization
};

// Dollar-cost averaging parameters
type DCAParameters = {
  symbol: string;
  initialInvestment: number;
  interval: string; // e.g., '1d', '1h'
  investmentAmount: number;
  targetPrice?: number;
};

// MACD strategy parameters
type MACDParameters = {
  symbol: string;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  investmentAmount: number;
};

// Union type for all bot parameters
type BotParameters = GridParameters | DCAParameters | MACDParameters;

// Stored bots with their associated parameters
type StoredBot = BotResponse & {
  parameters: BotParameters;
  trades: Trade[];
  createdAt: Date;
}

// Define a trading interface
interface Trade {
  id: string;
  botId: number;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  total: number;
  status: 'pending' | 'executed' | 'canceled';
}

/**
 * Service for managing trading bots with AI capabilities
 */
export class TradingBotService {
  private runningBots: Map<number, NodeJS.Timeout> = new Map();
  private storedBots: Map<number, StoredBot> = new Map();
  private lastTradeId = 1;

  /**
   * Create a trading bot configuration with optional AI optimization
   * @param name - Bot name
   * @param strategy - Trading strategy ('grid', 'dca', 'macd')
   * @param description - Bot description
   * @param parameters - Strategy-specific parameters
   * @returns Created bot
   */
  async createBot(
    name: string,
    strategy: 'grid' | 'dca' | 'macd',
    description: string,
    parameters: BotParameters
  ): Promise<BotResponse> {
    // Determine min investment based on strategy
    const minInvestment = getMinInvestmentForStrategy(strategy);
    
    // Estimate monthly return (this would be more sophisticated in a real implementation)
    const monthlyReturn = getEstimatedReturnForStrategy(strategy);
    
    // Determine risk level (1-10)
    const riskLevel = getRiskLevelForStrategy(strategy);
    
    const isAIPowered = strategy === 'grid' && (parameters as GridParameters).useAI === true;
    
    // If using AI, optimize grid parameters
    if (isAIPowered && strategy === 'grid') {
      const optimizedParams = await this.optimizeGridParameters(parameters as GridParameters);
      parameters = optimizedParams;
    }
    
    // Create bot object with proper types
    const botId = Date.now(); // Use timestamp as temporary ID
    const bot: BotResponse = {
      id: botId,
      name,
      strategy,
      description,
      minInvestment,
      monthlyReturn,
      riskLevel,
      rating: isAIPowered ? 4.8 : 4.5, // AI bots get slightly higher default rating
      isPopular: false,
      aiPowered: isAIPowered,
      parameters: parameters
    };
    
    // Store the bot with its full configuration
    this.storedBots.set(botId, {
      ...bot,
      parameters,
      trades: [],
      createdAt: new Date()
    });
    
    return bot;
  }

  /**
   * Optimize grid parameters using AI analysis of market conditions
   * @param parameters - Initial grid parameters
   * @returns Optimized grid parameters
   */
  private async optimizeGridParameters(parameters: GridParameters): Promise<GridParameters> {
    try {
      // Get market data for the symbol to analyze volatility and trends
      const marketData = await marketService.getMarketData([parameters.symbol]);
      
      if (marketData.length === 0) {
        console.log('No market data available for parameter optimization');
        return parameters;
      }
      
      const candleData = await marketService.getCandlestickData(parameters.symbol);
      
      // Calculate volatility from recent candle data
      const volatility = this.calculateVolatility(candleData);
      
      // Calculate optimal grid parameters based on volatility and market conditions
      // In a real AI implementation, this would use more sophisticated ML models
      const currentPrice = marketData[0].price;
      
      // If user didn't set specific upper/lower bounds, calculate based on volatility
      if (!parameters.upperPrice || !parameters.lowerPrice) {
        const range = currentPrice * volatility;
        parameters.upperPrice = currentPrice * (1 + range * 0.8);
        parameters.lowerPrice = currentPrice * (1 - range * 0.6);
      }
      
      // Adjust grid count based on volatility and investment amount
      if (!parameters.gridCount || parameters.gridCount < 3) {
        // More volatile markets benefit from more grids
        parameters.gridCount = Math.max(
          3,
          Math.min(
            20,
            Math.round(volatility * 100) + Math.floor(parameters.totalInvestment / 250)
          )
        );
      }
      
      console.log(`AI optimized parameters for ${parameters.symbol}:`, {
        volatility,
        upperPrice: parameters.upperPrice,
        lowerPrice: parameters.lowerPrice,
        gridCount: parameters.gridCount
      });
      
      return parameters;
    } catch (error) {
      console.error('Error optimizing grid parameters:', error);
      return parameters;
    }
  }
  
  /**
   * Calculate volatility from candle data
   * @param candles - Array of candle data
   * @returns Volatility as a decimal (e.g., 0.05 for 5%)
   */
  private calculateVolatility(candles: any[]): number {
    if (candles.length < 5) return 0.05; // Default volatility
    
    try {
      // Calculate price changes as percentages
      const returns = [];
      for (let i = 1; i < candles.length; i++) {
        const prevClose = parseFloat(candles[i-1].close);
        const currClose = parseFloat(candles[i].close);
        if (prevClose > 0) {
          returns.push((currClose - prevClose) / prevClose);
        }
      }
      
      // Calculate standard deviation of returns
      const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
      const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      return Math.min(Math.max(stdDev, 0.03), 0.15); // Bound between 3% and 15%
    } catch (error) {
      console.error('Error calculating volatility:', error);
      return 0.05; // Default volatility
    }
  }

  /**
   * Start a trading bot
   * @param botId - ID of the bot to start
   * @returns Success status
   */
  async startBot(botId: number): Promise<boolean> {
    // Check if bot is already running
    if (this.runningBots.has(botId)) {
      console.log(`Bot ${botId} is already running`);
      return true;
    }
    
    const storedBot = this.storedBots.get(botId);
    if (!storedBot) {
      console.log(`Bot ${botId} not found`);
      return false;
    }
    
    console.log(`Starting bot ${botId} (${storedBot.strategy} strategy)`);
    
    // Create an interval that executes the trading strategy
    let executionCount = 0;
    const interval = setInterval(async () => {
      executionCount++;
      console.log(`Bot ${botId} executing trading logic at ${new Date().toISOString()}`);
      
      if (storedBot.strategy === 'grid') {
        await this.executeGridStrategy(botId, storedBot.parameters as GridParameters);
      } else if (storedBot.strategy === 'dca') {
        await this.executeDCAStrategy(botId, storedBot.parameters as DCAParameters);
      } else if (storedBot.strategy === 'macd') {
        await this.executeMACDStrategy(botId, storedBot.parameters as MACDParameters);
      }
      
      // Log execution for demo purposes
      console.log(`Bot ${botId} executed trading logic (count: ${executionCount})`);
    }, 30000); // Every 30 seconds for demo purposes
    
    // Store the interval reference to be able to stop it later
    this.runningBots.set(botId, interval);
    
    // Execute once immediately after starting
    this.executeGridStrategy(botId, storedBot.parameters as GridParameters);
    
    return true;
  }

  /**
   * Execute grid trading strategy
   * @param botId - ID of the bot
   * @param parameters - Grid parameters
   */
  private async executeGridStrategy(botId: number, parameters: GridParameters): Promise<void> {
    const { symbol, upperPrice, lowerPrice, gridCount, totalInvestment } = parameters;
    
    try {
      const storedBot = this.storedBots.get(botId);
      if (!storedBot) return;
      
      // Get current market price
      const marketData = await marketService.getMarketData([symbol]);
      if (marketData.length === 0) {
        console.log(`No market data available for ${symbol}`);
        return;
      }
      
      const currentPrice = marketData[0].price;
      
      // Calculate grid levels
      const priceDiff = upperPrice - lowerPrice;
      const gridSize = priceDiff / gridCount;
      const gridLevels = Array.from({ length: gridCount + 1 }, (_, i) => 
        lowerPrice + (gridSize * i)
      );
      
      // Find closest grid levels above and below current price
      const closestLowerGrid = gridLevels.filter(level => level <= currentPrice).pop() || lowerPrice;
      const closestUpperGrid = gridLevels.find(level => level > currentPrice) || upperPrice;
      
      // Calculate amount to buy/sell at each grid level
      const investmentPerGrid = totalInvestment / gridCount;
      const amountPerGrid = investmentPerGrid / currentPrice;
      
      const gridInfo = {
        currentPrice,
        closestLowerGrid,
        closestUpperGrid,
        amountPerGrid: amountPerGrid.toFixed(6)
      };
      
      console.log(`Grid information for bot ${botId}:`, gridInfo);
      
      // Generate demo trades based on grid levels
      // In a real implementation, these would be actual trades placed via the API
      this.generateGridTrade(botId, symbol, currentPrice, closestLowerGrid, closestUpperGrid, amountPerGrid);
      
    } catch (error) {
      console.error(`Error executing grid strategy for bot ${botId}:`, error);
    }
  }
  
  /**
   * Generate grid trade based on current price and grid levels
   */
  private generateGridTrade(
    botId: number, 
    symbol: string, 
    currentPrice: number, 
    lowerGrid: number, 
    upperGrid: number, 
    amount: number
  ): void {
    const storedBot = this.storedBots.get(botId);
    if (!storedBot) return;
    
    const tradeId = `T${this.lastTradeId++}`;
    const timestamp = new Date();
    
    // Determine whether to buy or sell based on:
    // - Buy if price is close to lower grid
    // - Sell if price is close to upper grid
    // - Randomly decide if in the middle with a bias toward buys in down trend and sells in up trend
    const lowerDist = currentPrice - lowerGrid;
    const upperDist = upperGrid - currentPrice;
    const trend = storedBot.trades.length > 0 ? 
      (currentPrice - storedBot.trades[0].price) / storedBot.trades[0].price : 0;
    
    // Decision logic for trade side
    let side: 'buy' | 'sell';
    const randomFactor = Math.random();
    
    if (lowerDist < upperDist * 0.5) {
      // Closer to lower grid -> more likely to buy
      side = randomFactor < 0.8 ? 'buy' : 'sell';
    } else if (upperDist < lowerDist * 0.5) {
      // Closer to upper grid -> more likely to sell
      side = randomFactor < 0.8 ? 'sell' : 'buy';
    } else if (trend > 0) {
      // In an uptrend -> slightly more sells to take profit
      side = randomFactor < 0.55 ? 'sell' : 'buy';
    } else {
      // In a downtrend or neutral -> slightly more buys to accumulate
      side = randomFactor < 0.6 ? 'buy' : 'sell';
    }
    
    // Create trade with a slight price deviation from current price
    const deviation = (Math.random() * 0.002) - 0.001; // +/- 0.1%
    const tradePrice = currentPrice * (1 + deviation);
    const quantity = side === 'buy' ? amount : amount * (1 - Math.random() * 0.15); // Sell typically slightly less
    
    const trade: Trade = {
      id: tradeId,
      botId,
      timestamp,
      symbol,
      side,
      price: tradePrice,
      quantity,
      total: tradePrice * quantity,
      status: 'executed'
    };
    
    // Add to bot's trades
    storedBot.trades.unshift(trade); // Add at beginning for newest first
    
    // Cap at 100 trades to prevent memory issues
    if (storedBot.trades.length > 100) {
      storedBot.trades = storedBot.trades.slice(0, 100);
    }
    
    console.log(`Generated ${side.toUpperCase()} trade for bot ${botId} at price ${tradePrice.toFixed(2)}`);
  }

  /**
   * Execute DCA strategy (placeholder)
   */
  private async executeDCAStrategy(botId: number, parameters: DCAParameters): Promise<void> {
    // Implementation would be similar to grid strategy but with DCA logic
    console.log(`DCA strategy not fully implemented for bot ${botId}`);
  }
  
  /**
   * Execute MACD strategy (placeholder)
   */
  private async executeMACDStrategy(botId: number, parameters: MACDParameters): Promise<void> {
    // Implementation would use MACD indicator to make trading decisions
    console.log(`MACD strategy not fully implemented for bot ${botId}`);
  }

  /**
   * Stop a trading bot
   * @param botId - ID of the bot to stop
   * @returns Success status
   */
  async stopBot(botId: number): Promise<boolean> {
    // Check if bot is running
    if (!this.runningBots.has(botId)) {
      console.log(`Bot ${botId} is not running`);
      return false;
    }
    
    console.log(`Stopping bot ${botId}`);
    
    // Clear the interval
    clearInterval(this.runningBots.get(botId)!);
    
    // Remove the bot from the running bots map
    this.runningBots.delete(botId);
    
    return true;
  }

  /**
   * Get bot status including recent trades
   * @param botId - ID of the bot
   * @returns Bot status
   */
  async getBotStatus(botId: number): Promise<{ running: boolean; stats?: any; trades?: any[] }> {
    const running = this.runningBots.has(botId);
    const storedBot = this.storedBots.get(botId);
    
    if (!storedBot) {
      return { running };
    }
    
    // Calculate stats based on stored trades
    const trades = storedBot.trades || [];
    const executionCount = trades.length;
    
    // Calculate profit/loss if we have trades
    let profitLoss = 0;
    if (trades.length > 0) {
      const buyTrades = trades.filter(t => t.side === 'buy');
      const sellTrades = trades.filter(t => t.side === 'sell');
      
      const totalBought = buyTrades.reduce((sum, t) => sum + t.total, 0);
      const totalSold = sellTrades.reduce((sum, t) => sum + t.total, 0);
      
      // Simple P&L calculation
      profitLoss = ((totalSold - totalBought) / (totalBought || 1)) * 100;
    } else {
      // Generate random P&L if no trades (for demo purposes)
      profitLoss = (Math.random() * 20) - 5;
    }
    
    const stats = {
      executionCount,
      lastExecuted: trades.length > 0 ? trades[0].timestamp : new Date().toISOString(),
      profitLoss: profitLoss.toFixed(2) + '%',
      botType: storedBot.aiPowered ? 'AI-Powered' : 'Standard',
      activeSince: storedBot.createdAt.toISOString()
    };
    
    // Format trades for display
    const formattedTrades = trades.map(t => ({
      id: t.id,
      time: t.timestamp.toISOString(),
      action: t.side.toUpperCase(),
      pair: t.symbol,
      amount: t.quantity.toFixed(6),
      price: t.price.toFixed(2),
      total: t.total.toFixed(2)
    }));
    
    return { running, stats, trades: formattedTrades };
  }

  /**
   * Get bot performance history
   * @param botId - ID of the bot
   * @returns Performance data
   */
  async getBotPerformance(botId: number): Promise<any[]> {
    const storedBot = this.storedBots.get(botId);
    
    // If we have stored trades, generate performance based on them
    if (storedBot && storedBot.trades.length > 0) {
      return this.generatePerformanceFromTrades(storedBot.trades);
    }
    
    // Otherwise generate sample performance data
    const dataPoints = 30; // 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dataPoints);
    
    // AI-powered bots have slightly better performance (for demo purposes)
    const isPoweredByAI = storedBot?.aiPowered || false;
    const basePerformance = isPoweredByAI ? 0.006 : 0.004; // Base daily return
    
    // Generate performance data
    let cumulativeReturn = 0;
    return Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Random daily return with positive bias for AI bots
      const randomFactor = Math.random() * 0.02 - 0.008;
      const dailyReturn = basePerformance + randomFactor;
      cumulativeReturn += dailyReturn + cumulativeReturn * dailyReturn;
      
      return {
        date: date.toISOString().split('T')[0],
        return: dailyReturn * 100,
        cumulativeReturn: cumulativeReturn * 100
      };
    });
  }
  
  /**
   * Generate performance data from trades
   */
  private generatePerformanceFromTrades(trades: Trade[]): any[] {
    // Group trades by day
    const tradesByDay = new Map<string, Trade[]>();
    
    trades.forEach(trade => {
      const date = trade.timestamp.toISOString().split('T')[0];
      if (!tradesByDay.has(date)) {
        tradesByDay.set(date, []);
      }
      tradesByDay.get(date)!.push(trade);
    });
    
    // Get sorted unique dates
    const dates = Array.from(tradesByDay.keys()).sort();
    
    // Generate performance data
    let cumulativeReturn = 0;
    return dates.map(date => {
      const dayTrades = tradesByDay.get(date)!;
      
      // Calculate day's return
      const buyTotal = dayTrades
        .filter(t => t.side === 'buy')
        .reduce((sum, t) => sum + t.total, 0);
        
      const sellTotal = dayTrades
        .filter(t => t.side === 'sell')
        .reduce((sum, t) => sum + t.total, 0);
      
      let dailyReturn = 0;
      if (buyTotal > 0) {
        dailyReturn = ((sellTotal - buyTotal) / buyTotal) * 100;
      } else if (sellTotal > 0) {
        dailyReturn = 0.5; // Positive but modest return if only sells
      }
      
      // Ensure daily return is within reasonable bounds
      dailyReturn = Math.max(Math.min(dailyReturn, 10), -8);
      
      // Add to cumulative return
      const dailyReturnDecimal = dailyReturn / 100;
      cumulativeReturn += dailyReturnDecimal + cumulativeReturn * dailyReturnDecimal;
      
      return {
        date,
        return: dailyReturn,
        cumulativeReturn: cumulativeReturn * 100
      };
    });
  }
  
  /**
   * Get all stored bots
   */
  async getAllBots(): Promise<BotResponse[]> {
    return Array.from(this.storedBots.values()).map(bot => ({
      id: bot.id,
      name: bot.name,
      strategy: bot.strategy,
      description: bot.description,
      minInvestment: bot.minInvestment,
      monthlyReturn: bot.monthlyReturn,
      riskLevel: bot.riskLevel,
      rating: bot.rating,
      isPopular: bot.isPopular,
      aiPowered: bot.aiPowered
    }));
  }
}

/**
 * Get minimum investment required for a strategy
 * @param strategy - Trading strategy
 * @returns Minimum investment in USD
 */
function getMinInvestmentForStrategy(strategy: string): number {
  switch (strategy) {
    case 'grid':
      return 500;
    case 'dca':
      return 100;
    case 'macd':
      return 1000;
    default:
      return 250;
  }
}

/**
 * Get estimated monthly return for a strategy
 * Note: These are simulated numbers and not actual predictions
 * @param strategy - Trading strategy
 * @returns Estimated monthly return percentage
 */
function getEstimatedReturnForStrategy(strategy: string): number {
  switch (strategy) {
    case 'grid':
      return 8; // 8% monthly
    case 'dca':
      return 5; // 5% monthly
    case 'macd':
      return 12; // 12% monthly (higher risk)
    default:
      return 6;
  }
}

/**
 * Get risk level for a strategy (1-10)
 * @param strategy - Trading strategy
 * @returns Risk level (1 = lowest, 10 = highest)
 */
function getRiskLevelForStrategy(strategy: string): number {
  switch (strategy) {
    case 'grid':
      return 5; // Medium risk
    case 'dca':
      return 3; // Lower risk
    case 'macd':
      return 7; // Higher risk
    default:
      return 5;
  }
}

// Export a singleton instance
export const tradingBotService = new TradingBotService();