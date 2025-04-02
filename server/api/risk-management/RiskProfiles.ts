/**
 * RiskProfiles.ts
 * 
 * Predefined risk profiles for users to apply to their accounts
 * These profiles define the risk parameters for different trading strategies
 */

export interface RiskProfile {
  name: string;
  description: string;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxPositionSize: number;
  maxPortfolioRisk: number;
}

export const riskProfiles: Record<string, RiskProfile> = {
  conservative: {
    name: 'Conservative',
    description: 'Lower risk with modest profit targets. Focuses on capital preservation with tighter stop losses and smaller position sizes.',
    stopLossPercent: 1.5,
    takeProfitPercent: 3.0,
    maxPositionSize: 5.0,
    maxPortfolioRisk: 10.0
  },
  
  balanced: {
    name: 'Balanced',
    description: 'Moderate risk with balanced profit targets. A middle-ground approach suitable for most traders.',
    stopLossPercent: 2.5,
    takeProfitPercent: 5.0,
    maxPositionSize: 10.0,
    maxPortfolioRisk: 20.0
  },
  
  aggressive: {
    name: 'Aggressive',
    description: 'Higher risk with larger profit targets. Allows for wider stop losses and larger position sizes for experienced traders.',
    stopLossPercent: 4.0,
    takeProfitPercent: 8.0,
    maxPositionSize: 15.0,
    maxPortfolioRisk: 30.0
  },
  
  dayTrader: {
    name: 'Day Trader',
    description: 'Optimized for short-term trading with tight stop losses and quick profit targets.',
    stopLossPercent: 1.0,
    takeProfitPercent: 2.0,
    maxPositionSize: 8.0,
    maxPortfolioRisk: 25.0
  },
  
  swingTrader: {
    name: 'Swing Trader',
    description: 'Designed for multi-day positions with wider stop losses to accommodate market fluctuations.',
    stopLossPercent: 3.0,
    takeProfitPercent: 7.0,
    maxPositionSize: 12.0,
    maxPortfolioRisk: 25.0
  }
};