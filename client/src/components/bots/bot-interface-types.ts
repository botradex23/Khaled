// Types for bot interfaces
export type BotStrategyType = 'grid' | 'ai-grid' | 'dca' | 'macd';

export interface BaseBotParameters {
  symbol: string;
  totalInvestment: number;
}

export interface GridBotParameters extends BaseBotParameters {
  upperPrice: number;
  lowerPrice: number;
  gridCount: number;
}

export interface AiGridBotParameters extends GridBotParameters {
  useAI: boolean;
  riskLevel: number;
  minGridWidth: number;
  maxGridWidth: number;
  adaptGrids: boolean;
  useVolatilityAdjustment: boolean;
}

export interface DcaBotParameters extends BaseBotParameters {
  initialInvestment: number;
  investmentAmount: number;
  interval: string; // "1h", "1d", "1w", etc.
}

export interface MacdBotParameters extends BaseBotParameters {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  takeProfitPercentage: number;
  stopLossPercentage: number;
}

export interface BotStatus {
  isRunning: boolean;
  lastUpdated: Date;
  profitLoss: number;
  profitLossPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  stats?: {
    [key: string]: any;
  };
}

export interface Bot {
  id: number;
  name: string;
  strategy: BotStrategyType;
  description: string;
  tradingPair: string;
  totalInvestment: string;
  minInvestment: string; 
  monthlyReturn: string;
  riskLevel: number;
  rating: string;
  isPopular: boolean;
  isRunning: boolean;
  parameters: string; // JSON string of bot parameters
  createdAt: Date;
  lastStartedAt: Date | null;
  lastStoppedAt: Date | null;
  profitLoss: string;
  profitLossPercent: string;
  totalTrades: number;
  userId: number;
}

export interface Trade {
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