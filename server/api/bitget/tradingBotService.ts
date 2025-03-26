import { bitgetService } from './bitgetService';
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

  constructor() {
    // Initialize with some demo bots
    this.initializeDemoBots();
  }

  private initializeDemoBots() {
    // Add a demo bot for a better user experience
    const demoBotId = 1;
    const demoBot: StoredBot = {
      id: demoBotId,
      name: "BTC-USDT AI Grid Bot",
      strategy: "grid",
      description: "AI-powered grid trading bot that automatically analyzes market conditions",
      minInvestment: 500,
      monthlyReturn: 8.5,
      riskLevel: 2,
      rating: 4.7,
      isPopular: true,
      aiPowered: true,
      parameters: {
        symbol: "BTCUSDT",
        upperPrice: 92000,
        lowerPrice: 85000,
        gridCount: 5,
        totalInvestment: 1000,
        useAI: true
      },
      trades: [],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    };
    
    this.storedBots.set(demoBotId, demoBot);
  }

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
    let optimizedParameters = parameters;
    
    // Apply AI optimization for grid parameters if requested
    if (strategy === 'grid' && (parameters as GridParameters).useAI) {
      optimizedParameters = await this.optimizeGridParameters(parameters as GridParameters);
    }

    // Generate a new bot ID
    const id = this.getNextBotId();
    
    // Create bot configuration
    const bot: BotResponse = {
      id,
      name,
      strategy,
      description,
      minInvestment: getMinInvestmentForStrategy(strategy),
      monthlyReturn: getEstimatedReturnForStrategy(strategy),
      riskLevel: getRiskLevelForStrategy(strategy),
      rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
      isPopular: Math.random() > 0.7, // 30% chance of being popular
      aiPowered: strategy === 'grid' && (parameters as GridParameters).useAI,
      parameters: optimizedParameters
    };
    
    // Store the bot for future reference
    this.storedBots.set(id, {
      ...bot,
      parameters: optimizedParameters,
      trades: [],
      createdAt: new Date()
    });
    
    return bot;
  }

  /**
   * Get the next available bot ID
   */
  private getNextBotId(): number {
    return this.storedBots.size > 0 
      ? Math.max(...Array.from(this.storedBots.keys())) + 1 
      : 1;
  }

  /**
   * Optimize grid parameters using AI analysis of market conditions
   * @param parameters - Initial grid parameters
   * @returns Optimized grid parameters
   */
  private async optimizeGridParameters(parameters: GridParameters): Promise<GridParameters> {
    try {
      // Get historical market data to analyze volatility and trends
      const candles = await marketService.getCandlestickData(
        parameters.symbol,
        '1h',
        100
      );
      
      // Calculate volatility from recent price movements
      const volatility = this.calculateVolatility(candles);
      
      // Adjust grid count based on volatility
      // Higher volatility = more grids to capture more price movements
      let gridCount = parameters.gridCount;
      if (volatility > 0.05) { // >5% daily volatility
        gridCount = Math.min(gridCount + 2, 10); // Add grids but cap at 10
      } else if (volatility < 0.02) { // <2% daily volatility
        gridCount = Math.max(gridCount - 1, 3); // Reduce grids but keep at least 3
      }
      
      // Calculate grid spacing based on current price and volatility
      const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 
        (parameters.upperPrice + parameters.lowerPrice) / 2;
      
      // Adjust price range based on volatility
      // For high volatility, widen the grid range to capture more movements
      const priceDelta = currentPrice * volatility * 3; // 3x daily volatility as range
      
      const upperPrice = currentPrice + priceDelta;
      const lowerPrice = Math.max(currentPrice - priceDelta, currentPrice * 0.7); // Don't go below 70% of current price
      
      // Return optimized parameters
      return {
        ...parameters,
        upperPrice,
        lowerPrice,
        gridCount
      };
    } catch (error) {
      console.error('Error optimizing grid parameters:', error);
      // Return original parameters if optimization fails
      return parameters;
    }
  }

  /**
   * Calculate volatility from candle data
   * @param candles - Array of candle data
   * @returns Volatility as a decimal (e.g., 0.05 for 5%)
   */
  private calculateVolatility(candles: any[]): number {
    if (candles.length < 2) return 0.03; // Default volatility if not enough data
    
    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const previousClose = candles[i-1].close;
      const currentClose = candles[i].close;
      returns.push((currentClose - previousClose) / previousClose);
    }
    
    // Calculate standard deviation of returns (volatility)
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const squaredDiffs = returns.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / squaredDiffs.length;
    const volatility = Math.sqrt(variance);
    
    return volatility;
  }

  /**
   * Start a trading bot
   * @param botId - ID of the bot to start
   * @returns Success status
   */
  async startBot(botId: number): Promise<boolean> {
    const bot = this.storedBots.get(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }
    
    // Check if the bot is already running
    if (this.runningBots.has(botId)) {
      return true; // Already running
    }
    
    // Execute strategy based on bot type
    let intervalId: NodeJS.Timeout;
    switch (bot.strategy) {
      case 'grid':
        intervalId = setInterval(
          () => this.executeGridStrategy(botId, bot.parameters as GridParameters),
          30000 // Every 30 seconds
        );
        break;
      case 'dca':
        intervalId = setInterval(
          () => this.executeDCAStrategy(botId, bot.parameters as DCAParameters),
          60000 // Every minute
        );
        break;
      case 'macd':
        intervalId = setInterval(
          () => this.executeMACDStrategy(botId, bot.parameters as MACDParameters),
          60000 // Every minute
        );
        break;
      default:
        throw new Error(`Unsupported strategy: ${bot.strategy}`);
    }
    
    // Store interval ID for future reference
    this.runningBots.set(botId, intervalId);
    
    return true;
  }

  /**
   * Execute grid trading strategy
   * @param botId - ID of the bot
   * @param parameters - Grid parameters
   */
  private async executeGridStrategy(botId: number, parameters: GridParameters): Promise<void> {
    try {
      const bot = this.storedBots.get(botId);
      if (!bot) return;
      
      // Get current price
      const marketData = await marketService.getMarketData([parameters.symbol]);
      if (!marketData || marketData.length === 0) return;
      
      const currentPrice = marketData[0].price;
      
      // Calculate grid levels
      const { upperPrice, lowerPrice, gridCount } = parameters;
      const gridSize = (upperPrice - lowerPrice) / gridCount;
      
      // Generate a trade based on grid levels
      this.generateGridTrade(botId, parameters, currentPrice, gridSize);
    } catch (error) {
      console.error('Error executing grid strategy:', error);
    }
  }

  /**
   * Generate grid trade based on current price and grid levels
   */
  private generateGridTrade(
    botId: number,
    parameters: GridParameters,
    currentPrice: number,
    gridSize: number
  ): void {
    const bot = this.storedBots.get(botId);
    if (!bot) return;
    
    // Determine if we should buy or sell based on position in grid
    // Simulating trading with randomness for demo purposes
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    
    // Calculate a realistic quantity based on investment and price
    const totalInvestment = parameters.totalInvestment;
    const perGridInvestment = totalInvestment / parameters.gridCount;
    const quantity = perGridInvestment / currentPrice;
    
    // Some randomness in price to simulate price movements
    const priceVariation = currentPrice * 0.003 * (Math.random() - 0.5);
    const tradePrice = currentPrice + priceVariation;
    
    // Create trade record
    const trade: Trade = {
      id: `trade-${this.lastTradeId++}`,
      botId,
      timestamp: new Date(),
      symbol: parameters.symbol,
      side,
      price: tradePrice,
      quantity,
      total: tradePrice * quantity,
      status: Math.random() > 0.1 ? 'executed' : 'pending', // 90% chance of being executed
    };
    
    // Add to bot's trades
    bot.trades.push(trade);
    
    // Limit trades history to last 50
    if (bot.trades.length > 50) {
      bot.trades = bot.trades.slice(bot.trades.length - 50);
    }
  }

  /**
   * Execute DCA strategy (placeholder)
   */
  private async executeDCAStrategy(botId: number, parameters: DCAParameters): Promise<void> {
    try {
      const bot = this.storedBots.get(botId);
      if (!bot) return;
      
      // Implementation would go here - simplified for demo
      const marketData = await marketService.getMarketData([parameters.symbol]);
      if (!marketData || marketData.length === 0) return;
      
      const currentPrice = marketData[0].price;
      
      // Create a DCA purchase every few intervals (simplified)
      if (Math.random() > 0.7) { // Only execute 30% of the time to simulate interval
        const trade: Trade = {
          id: `trade-${this.lastTradeId++}`,
          botId,
          timestamp: new Date(),
          symbol: parameters.symbol,
          side: 'buy', // DCA usually buys at regular intervals
          price: currentPrice,
          quantity: parameters.investmentAmount / currentPrice,
          total: parameters.investmentAmount,
          status: 'executed',
        };
        
        bot.trades.push(trade);
        
        // Limit trades history
        if (bot.trades.length > 50) {
          bot.trades = bot.trades.slice(bot.trades.length - 50);
        }
      }
    } catch (error) {
      console.error('Error executing DCA strategy:', error);
    }
  }

  /**
   * Execute MACD strategy (placeholder)
   */
  private async executeMACDStrategy(botId: number, parameters: MACDParameters): Promise<void> {
    try {
      const bot = this.storedBots.get(botId);
      if (!bot) return;
      
      // Implementation would go here - simplified for demo
      const marketData = await marketService.getMarketData([parameters.symbol]);
      if (!marketData || marketData.length === 0) return;
      
      const currentPrice = marketData[0].price;
      
      // Simulate MACD crossing (simplified)
      if (Math.random() > 0.8) { // Only execute 20% of the time to simulate MACD signals
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const quantity = parameters.investmentAmount / currentPrice;
        
        const trade: Trade = {
          id: `trade-${this.lastTradeId++}`,
          botId,
          timestamp: new Date(),
          symbol: parameters.symbol,
          side,
          price: currentPrice,
          quantity,
          total: currentPrice * quantity,
          status: 'executed',
        };
        
        bot.trades.push(trade);
        
        // Limit trades history
        if (bot.trades.length > 50) {
          bot.trades = bot.trades.slice(bot.trades.length - 50);
        }
      }
    } catch (error) {
      console.error('Error executing MACD strategy:', error);
    }
  }

  /**
   * Stop a trading bot
   * @param botId - ID of the bot to stop
   * @returns Success status
   */
  async stopBot(botId: number): Promise<boolean> {
    // Get interval ID
    const intervalId = this.runningBots.get(botId);
    if (!intervalId) {
      return false; // Bot not running
    }
    
    // Clear interval
    clearInterval(intervalId);
    
    // Remove from running bots
    this.runningBots.delete(botId);
    
    return true;
  }

  /**
   * Get bot status including recent trades
   * @param botId - ID of the bot
   * @returns Bot status
   */
  async getBotStatus(botId: number): Promise<{ running: boolean; stats?: any; trades?: any[] }> {
    const bot = this.storedBots.get(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }
    
    const isRunning = this.runningBots.has(botId);
    
    // Calculate performance stats
    const trades = bot.trades;
    const buyTrades = trades.filter(t => t.side === 'buy' && t.status === 'executed');
    const sellTrades = trades.filter(t => t.side === 'sell' && t.status === 'executed');
    
    const totalBought = buyTrades.reduce((sum, t) => sum + t.total, 0);
    const totalSold = sellTrades.reduce((sum, t) => sum + t.total, 0);
    const profit = totalSold - totalBought;
    const profitPercentage = totalBought > 0 ? (profit / totalBought) * 100 : 0;
    
    // Get current price
    let currentPrice = 0;
    try {
      const marketData = await marketService.getMarketData([bot.parameters.symbol]);
      if (marketData && marketData.length > 0) {
        currentPrice = marketData[0].price;
      }
    } catch (error) {
      console.error('Error getting market data:', error);
    }
    
    // Generate some random stats for demonstration
    const stats = {
      botId,
      totalTrades: trades.length,
      successRate: Math.floor(80 + Math.random() * 15), // 80-95%
      profit,
      profitPercentage,
      currentPrice,
      lastUpdated: new Date(),
      predictions: {
        shortTerm: Math.random() > 0.5 ? 'bullish' : 'bearish',
        longTerm: Math.random() > 0.4 ? 'bullish' : 'bearish',
        nextTradeEstimate: new Date(Date.now() + 1000 * 60 * (5 + Math.floor(Math.random() * 20)))
      }
    };
    
    return {
      running: isRunning,
      stats,
      trades: bot.trades.slice().reverse() // Return most recent first
    };
  }

  /**
   * Get bot performance history
   * @param botId - ID of the bot
   * @returns Performance data
   */
  async getBotPerformance(botId: number): Promise<any[]> {
    const bot = this.storedBots.get(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }
    
    // Use trades to generate performance data points
    return this.generatePerformanceFromTrades(bot.trades);
  }

  /**
   * Generate performance data from trades
   */
  private generatePerformanceFromTrades(trades: Trade[]): any[] {
    if (trades.length === 0) {
      // Generate demo data if no trades exist yet
      const now = new Date();
      const performanceData = [];
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Start with small growth, then accelerate
        const growthFactor = 0.2 + (0.8 * (30 - i) / 30);
        const randomFactor = 1 + (Math.random() * 0.1 - 0.05); // -5% to +5% randomness
        
        performanceData.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(1000 * (1 + (0.2 * growthFactor * randomFactor)))
        });
      }
      
      return performanceData;
    }
    
    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    if (sortedTrades.length === 0) return [];
    
    // Get start and end dates
    const startDate = sortedTrades[0].timestamp;
    const endDate = new Date();
    
    // Create daily performance data
    const performanceData = [];
    let currentValue = 1000; // Start with initial investment
    
    // Get number of days between start and end
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const numDataPoints = Math.min(daysDiff, 30); // Limit to 30 data points
    
    for (let i = 0; i <= numDataPoints; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + Math.floor(i * daysDiff / numDataPoints));
      
      // Find trades that happened before this date
      const relevantTrades = sortedTrades.filter(t => 
        t.timestamp <= date && t.status === 'executed'
      );
      
      // Calculate value based on trades
      let profitLoss = 0;
      relevantTrades.forEach(trade => {
        if (trade.side === 'buy') {
          profitLoss -= trade.total;
        } else {
          profitLoss += trade.total;
        }
      });
      
      // Apply profit/loss to current value
      currentValue = 1000 + profitLoss;
      
      // Add some randomness for realistic chart
      const dailyRandomness = 1 + (Math.random() * 0.04 - 0.02); // -2% to +2%
      currentValue *= dailyRandomness;
      
      performanceData.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(Math.floor(currentValue), 10) // Ensure value doesn't go below 10
      });
    }
    
    return performanceData;
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
      return 300;
    default:
      return 100;
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
      return 8.5;
    case 'dca':
      return 6.2;
    case 'macd':
      return 12.4;
    default:
      return 5.0;
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
      return 2;
    case 'dca':
      return 1;
    case 'macd':
      return 3;
    default:
      return 2;
  }
}

export const tradingBotService = new TradingBotService();