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
  minInvestment: number;
  monthlyReturn: number;
  riskLevel: number;
  rating: number;
  isPopular: boolean;
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
