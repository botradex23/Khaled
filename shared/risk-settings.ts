import { z } from 'zod';

// Risk settings schema
export const riskSettingsSchema = z.object({
  globalStopLoss: z.number().min(0.1).max(50),
  globalTakeProfit: z.number().min(0.1).max(100),
  maxPositionSize: z.number().min(1).max(100),
  maxPortfolioRisk: z.number().min(1).max(100),
  maxTradesPerDay: z.number().int().min(1).max(100),
  enableGlobalStopLoss: z.boolean(),
  enableGlobalTakeProfit: z.boolean(),
  enableMaxPositionSize: z.boolean(),
  stopLossStrategy: z.enum(['fixed', 'trailing', 'atr-based']),
  enableEmergencyStopLoss: z.boolean(),
  emergencyStopLossThreshold: z.number().min(5).max(50),
  defaultStopLossPercent: z.number().min(0.5).max(20),
  defaultTakeProfitPercent: z.number().min(0.5).max(50),
  userId: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Types derived from the schema
export type RiskSettings = z.infer<typeof riskSettingsSchema>;

export type RiskSettingsWithoutUserId = Omit<RiskSettings, 'userId' | 'createdAt' | 'updatedAt'>;

// Default risk settings for new users
export const defaultRiskSettings: RiskSettingsWithoutUserId = {
  globalStopLoss: 5,
  globalTakeProfit: 10,
  maxPositionSize: 10,
  maxPortfolioRisk: 20,
  maxTradesPerDay: 10,
  enableGlobalStopLoss: true,
  enableGlobalTakeProfit: true,
  enableMaxPositionSize: true,
  stopLossStrategy: 'fixed',
  enableEmergencyStopLoss: true,
  emergencyStopLossThreshold: 15,
  defaultStopLossPercent: 3,
  defaultTakeProfitPercent: 6,
};

// Visual risk level calculation
export function calculateRiskLevel(settings: RiskSettingsWithoutUserId) {
  // Simple risk level calculation based on various risk settings
  const stopLossWeight = settings.enableGlobalStopLoss ? settings.globalStopLoss / 10 : 5;
  const positionSizeWeight = settings.enableMaxPositionSize ? settings.maxPositionSize / 20 : 5;
  const portfolioRiskWeight = settings.maxPortfolioRisk / 20;
  
  const riskScore = (stopLossWeight + positionSizeWeight + portfolioRiskWeight) / 3;
  
  if (riskScore < 1.5) return { level: "Very Low", color: "green" };
  if (riskScore < 2.5) return { level: "Low", color: "blue" };
  if (riskScore < 3.5) return { level: "Medium", color: "yellow" };
  if (riskScore < 4.5) return { level: "High", color: "orange" };
  return { level: "Very High", color: "red" };
}