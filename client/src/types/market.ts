export interface Market {
  symbol: string;
  price: number;
  found: boolean;
  source?: string;
  timestamp?: number;
}

export interface MarketPricesResponse {
  timestamp: string;
  totalRequested: number;
  totalFound: number;
  prices: Market[];
}