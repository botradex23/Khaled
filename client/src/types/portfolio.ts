/**
 * Portfolio data types
 * 
 * These types are used for the portfolio visualization components.
 */

// Interface for portfolio history data
export interface PortfolioHistoryItem {
  date: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
}

// Interface for asset balance data
export interface AssetBalance {
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  change24h?: number;
  changePercent24h?: number;
}