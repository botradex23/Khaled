// Chart data type
export type ChartData = {
  name: string;
  value: number;
};

// Asset allocation type
export type AssetAllocation = {
  name: string;
  value: number;
  color: string;
};

// Strategy types
export type StrategyType = "grid" | "dca" | "macd";

// Investment bot type
export type Bot = {
  id: number;
  name: string;
  strategy: StrategyType;
  description: string;
  minInvestment: number | string;
  monthlyReturn: number | string;
  riskLevel: number;
  rating: number | string;
  isPopular: boolean;
  userId?: number;
  isRunning?: boolean;
  tradingPair?: string;
  totalInvestment?: string | number;
  parameters?: string;
  createdAt?: Date | string;
  lastStartedAt?: Date | string | null;
  lastStoppedAt?: Date | string | null;
  profitLoss?: string;
  profitLossPercent?: string;
  totalTrades?: number;
};

// Pricing plan type
export type PricingPlan = {
  id: number;
  name: string;
  description: string;
  price: number;
  features: string[];
  isPopular: boolean;
};

// User type
export type User = {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
};
