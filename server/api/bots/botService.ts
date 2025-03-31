/**
 * Unified Bot Service
 * מספק שירותים מאוחדים לניהול בוטים מסוגים שונים
 */
import { storage } from '../../storage';
// Use string literal for strategy type until we add it to shared schema
type BotStrategyType = 'GRID' | 'DCA' | 'MACD' | 'AI_GRID';

export enum BotStrategyEnum {
  GRID = 'grid',
  DCA = 'dca',
  MACD = 'macd',
  AI_GRID = 'ai_grid'
}

// Grid trading parameters
export type GridParameters = {
  symbol: string;
  upperPrice: number;
  lowerPrice: number;
  gridCount: number;
  totalInvestment: number;
  useAI?: boolean;  // Flag to use AI for parameter optimization
};

// Dollar-cost averaging parameters
export type DCAParameters = {
  symbol: string;
  initialInvestment: number;
  interval: string; // e.g., '1d', '1h'
  investmentAmount: number;
  targetPrice?: number;
};

// MACD strategy parameters
export type MACDParameters = {
  symbol: string;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  investmentAmount: number;
};

// AI Grid parameters
export type AIGridParameters = {
  symbol: string;
  totalInvestment: number;
  riskLevel: number;
  useMarketVelocity?: boolean;
  optimizationTarget?: 'profit' | 'safety' | 'balanced';
};

// Union type for all bot parameters
export type BotParameters = GridParameters | DCAParameters | MACDParameters | AIGridParameters;

// Interface for bot trade
export interface BotTrade {
  id: string;
  botId: number;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  total: number;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  pnl?: number;
}

/**
 * Gets the estimated minimum investment amount for a specific strategy
 */
export function getMinInvestmentForStrategy(strategy: BotStrategyEnum): number {
  switch (strategy) {
    case BotStrategyEnum.GRID:
      return 500;
    case BotStrategyEnum.DCA:
      return 100;
    case BotStrategyEnum.MACD:
      return 1000;
    case BotStrategyEnum.AI_GRID:
      return 750;
    default:
      return 250;
  }
}

/**
 * Gets the estimated monthly return for a specific strategy
 * הערה: אלו הם ערכים משוערים ולא מדויקים, אין בהם הבטחה לתשואה בפועל
 */
export function getEstimatedReturnForStrategy(strategy: BotStrategyEnum): number {
  switch (strategy) {
    case BotStrategyEnum.GRID:
      return 5.2;
    case BotStrategyEnum.DCA:
      return 3.8;
    case BotStrategyEnum.MACD:
      return 6.5;
    case BotStrategyEnum.AI_GRID:
      return 7.2;
    default:
      return 4.0;
  }
}

/**
 * Gets the risk level for a specific strategy (1-5)
 * @param strategy - Trading strategy
 * @returns Risk level (1 = lowest, 5 = highest)
 */
export function getRiskLevelForStrategy(strategy: BotStrategyEnum): number {
  switch (strategy) {
    case BotStrategyEnum.GRID:
      return 2; // Medium-Low risk
    case BotStrategyEnum.DCA:
      return 1; // Low risk
    case BotStrategyEnum.MACD:
      return 3; // Medium risk
    case BotStrategyEnum.AI_GRID:
      return 3; // Medium risk
    default:
      return 2;
  }
}

/**
 * Creates a new trading bot
 */
async function createBot(
  userId: number,
  name: string,
  strategy: BotStrategyEnum,
  parameters: any,
  description?: string
) {
  const strategyType = strategy.toUpperCase() as BotStrategyType;
  const minInvestment = getMinInvestmentForStrategy(strategy).toString();
  const monthlyReturn = getEstimatedReturnForStrategy(strategy).toString();
  const riskLevel = getRiskLevelForStrategy(strategy);
  
  // Extract trading pair/symbol from parameters
  const tradingPair = parameters.symbol;
  const totalInvestment = parameters.totalInvestment.toString();
  
  // Save the bot to storage
  const newBot = await storage.createBot({
    name,
    strategy: strategyType,
    description: description || `${strategy.toUpperCase()} trading bot for ${tradingPair}`,
    minInvestment,
    monthlyReturn,
    riskLevel,
    rating: "4.5",
    isPopular: false,
    userId,
    isRunning: false,
    tradingPair,
    totalInvestment,
    parameters: JSON.stringify(parameters),
    profitLoss: "0",
    profitLossPercent: "0",
    totalTrades: 0
  });
  
  return newBot;
}

/**
 * Starts a bot by ID
 */
async function startBot(botId: number, userId: number) {
  // First, check if the bot exists and belongs to this user
  const bot = await storage.getBotById(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }
  
  if (bot.userId !== userId) {
    throw new Error("You don't have permission to access this bot");
  }
  
  // Update the bot status to running
  const updatedBot = await storage.startBot(botId);
  return updatedBot;
}

/**
 * Stops a bot by ID
 */
async function stopBot(botId: number, userId: number) {
  // First, check if the bot exists and belongs to this user
  const bot = await storage.getBotById(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }
  
  if (bot.userId !== userId) {
    throw new Error("You don't have permission to access this bot");
  }
  
  // Update the bot status to stopped
  const updatedBot = await storage.stopBot(botId);
  return updatedBot;
}

/**
 * Gets a bot by ID
 */
async function getBotById(botId: number, userId: number) {
  const bot = await storage.getBotById(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }
  
  if (bot.userId !== userId) {
    throw new Error("You don't have permission to access this bot");
  }
  
  return bot;
}

/**
 * Gets all bots for a specific user
 */
async function getUserBots(userId: number) {
  const bots = await storage.getUserBots(userId);
  return bots;
}

/**
 * Updates a bot's parameters
 */
async function updateBotParameters(
  botId: number,
  userId: number,
  parameters: any
) {
  // First, check if the bot exists and belongs to this user
  const bot = await storage.getBotById(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }
  
  if (bot.userId !== userId) {
    throw new Error("You don't have permission to access this bot");
  }
  
  // Merge with existing parameters
  const existingParams = JSON.parse(bot.parameters);
  const updatedParams = { ...existingParams, ...parameters };
  
  // Update the bot parameters
  const updatedBot = await storage.updateBot(botId, { 
    parameters: JSON.stringify(updatedParams)
  });
  
  return updatedBot;
}

/**
 * Gets a bot's trading history
 */
async function getBotTradingHistory(botId: number, userId: number) {
  // First, check if the bot exists and belongs to this user
  const bot = await storage.getBotById(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }
  
  if (bot.userId !== userId) {
    throw new Error("You don't have permission to access this bot");
  }
  
  // In this demo implementation, we generate dummy trade history
  const trades: BotTrade[] = [];
  const count = Math.floor(Math.random() * 5) + 3; // 3-7 trades
  
  // Parse the bot parameters to get the symbol
  const params = JSON.parse(bot.parameters);
  const symbol = params.symbol || "BTC-USDT";
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14); // Start 14 days ago
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * 2); // Every 2 days
    
    const isBuy = i % 2 === 0; // Alternate buy/sell
    const price = symbol.includes("BTC") ? 
      69000 + (Math.random() * 4000 - 2000) : // BTC price around 69k
      1950 + (Math.random() * 200 - 100);     // ETH price around 1950
    
    const quantity = symbol.includes("BTC") ? 
      0.01 + (Math.random() * 0.02) : // BTC quantity
      0.1 + (Math.random() * 0.4);    // ETH quantity
    
    const total = price * quantity;
    
    // Calculate PnL for sell orders
    const pnl = !isBuy ? 
      ((price - (price * 0.98)) * quantity) : // 2% profit on sell
      undefined;
    
    trades.push({
      id: `trade-${botId}-${i}`,
      botId,
      timestamp: date,
      symbol,
      side: isBuy ? 'buy' : 'sell',
      price,
      quantity,
      total,
      status: 'executed',
      pnl
    });
  }
  
  return trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Gets a bot's performance metrics
 */
async function getBotPerformance(botId: number, userId: number) {
  // First, check if the bot exists and belongs to this user
  const bot = await storage.getBotById(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }
  
  if (bot.userId !== userId) {
    throw new Error("You don't have permission to access this bot");
  }
  
  // In a real-world scenario, we would calculate actual performance based on trade history
  // For this demo, we'll return simulated performance metrics
  const profitLoss = parseFloat(bot.profitLoss);
  const profitLossPercent = parseFloat(bot.profitLossPercent);
  const totalInvestment = parseFloat(bot.totalInvestment);
  
  return {
    currentValue: totalInvestment + profitLoss,
    profitLoss,
    profitLossPercent,
    totalTrades: bot.totalTrades,
    winningTrades: Math.floor(bot.totalTrades * 0.65), // 65% of trades were winning
    winRate: bot.totalTrades > 0 ? 0.65 : 0, // Win rate of 65%
    averageTradeProfit: bot.totalTrades > 0 ? profitLoss / bot.totalTrades : 0,
    startDate: bot.createdAt,
    lastTradeDate: bot.lastStartedAt || bot.createdAt
  };
}

export const botService = {
  createBot,
  startBot,
  stopBot,
  getBotById,
  getUserBots,
  updateBotParameters,
  getBotTradingHistory,
  getBotPerformance,
  getMinInvestmentForStrategy,
  getEstimatedReturnForStrategy,
  getRiskLevelForStrategy
};