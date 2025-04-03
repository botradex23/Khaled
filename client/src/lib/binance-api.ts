/**
 * Binance API Utilities
 * 
 * This module provides functions for interacting with both the Express and Python Binance API services.
 */

import { apiRequest } from '@lib/queryClient';

/**
 * Interface for a Binance balance item
 */
export interface BinanceBalance {
  asset?: string;
  currency?: string;
  free?: string | number;
  available?: string | number;
  locked?: string | number;
  frozen?: string | number;
  total?: string | number;
  usdValue?: number;
  valueUSD?: number;
  calculatedTotalValue?: number;
  pricePerUnit?: number;
}

/**
 * Interface for Binance account balance response
 */
export interface BinanceBalanceResponse {
  success: boolean;
  balances: BinanceBalance[];
  total_value_usd: number;
  error?: string;
  message?: string;
}

/**
 * Interface for Binance ticker price
 */
export interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

/**
 * Interface for Binance 24hr ticker
 */
export interface Binance24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

/**
 * Interface for Binance API status
 */
export interface BinanceApiStatus {
  success: boolean;
  data: {
    status: string;
    apiKeySet: boolean;
    secretKeySet: boolean;
    testnet: boolean;
    direct_api_access?: boolean;
    using_fallback_data?: boolean;
  };
  error?: string;
}

/**
 * Interface for simplified market price display
 */
export interface MarketPriceDisplay {
  symbol: string;
  price: string;
  priceChangePercent: number;
  volume: string;
}

/**
 * Get account balance (authenticated)
 */
export async function getAccountBalance(): Promise<BinanceBalanceResponse> {
  try {
    // First try the Python service
    const pythonResponse = await fetch('/api/binance/trading/balance');
    
    if (pythonResponse.ok) {
      const data = await pythonResponse.json();
      return data;
    }
    
    // Fall back to Express direct API
    const response = await fetch('/direct-api/binance/demo-balance');
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching account balance:', error);
    
    // If all else fails, return a mock response that indicates failure
    return {
      success: false,
      balances: [],
      total_value_usd: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch account balance. Please try again later.'
    };
  }
}

/**
 * Get demo account balance (unauthenticated)
 */
export async function getDemoAccountBalance(): Promise<BinanceBalanceResponse> {
  try {
    const response = await fetch('/direct-api/binance/demo-balance');
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching demo account balance:', error);
    
    return {
      success: false,
      balances: [],
      total_value_usd: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch demo account balance. Please try again later.'
    };
  }
}

/**
 * Get current price for a specific symbol
 */
export async function getCurrentPrice(symbol: string): Promise<{ success: boolean; price: string; error?: string }> {
  try {
    const response = await fetch(`/api/binance/price/${symbol}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    
    return {
      success: false,
      price: '0',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get prices for multiple cryptocurrencies
 */
export async function getAllPrices(): Promise<{ success: boolean; prices: BinanceTickerPrice[]; count: number; error?: string }> {
  try {
    const response = await fetch('/api/binance/prices');
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching all prices:', error);
    
    return {
      success: false,
      prices: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get 24hr ticker for a specific symbol
 */
export async function get24hrTicker(symbol: string): Promise<{ success: boolean; ticker: Binance24hrTicker; error?: string }> {
  try {
    const response = await fetch(`/api/binance/ticker/24hr?symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching 24hr ticker for ${symbol}:`, error);
    
    return {
      success: false,
      ticker: {} as Binance24hrTicker,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Binance API status
 */
export async function checkBinanceApiStatus(): Promise<BinanceApiStatus> {
  try {
    const response = await fetch('/api/binance/trading/status');
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking Binance API status:', error);
    
    return {
      success: false,
      data: {
        status: 'error',
        apiKeySet: false,
        secretKeySet: false,
        testnet: false
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Save Binance API keys
 */
export async function saveBinanceApiKeys(apiKey: string, secretKey: string, useTestnet: boolean = true): Promise<{ success: boolean; message: string }> {
  try {
    const response = await apiRequest('/api/binance/api-keys', {
      method: 'POST',
      body: JSON.stringify({
        binanceApiKey: apiKey,
        binanceSecretKey: secretKey,
        useTestnet
      })
    });
    
    return response;
  } catch (error) {
    console.error('Error saving Binance API keys:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save API keys. Please try again later.'
    };
  }
}

/**
 * Get connection status details
 */
export async function getBinanceConnectionStatus(): Promise<{
  success: boolean;
  connection: {
    status: string;
    direct_api_access: boolean;
    using_fallback_data: boolean | any;
    error?: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch('/api/binance/connection-status');
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking Binance connection status:', error);
    
    return {
      success: false,
      connection: {
        status: 'error',
        direct_api_access: false,
        using_fallback_data: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Utility function to format cryptocurrency market prices for display
 */
export function formatMarketPrices(
  prices: BinanceTickerPrice[],
  tickers?: Binance24hrTicker[]
): MarketPriceDisplay[] {
  return prices.map((price) => {
    const symbol = price.symbol;
    const ticker = tickers?.find(t => t.symbol === symbol);
    
    return {
      symbol,
      price: price.price,
      priceChangePercent: ticker ? parseFloat(ticker.priceChangePercent) : 0,
      volume: ticker?.volume || '0'
    };
  });
}

export default {
  getAccountBalance,
  getDemoAccountBalance,
  getCurrentPrice,
  getAllPrices,
  get24hrTicker,
  checkBinanceApiStatus,
  saveBinanceApiKeys,
  getBinanceConnectionStatus,
  formatMarketPrices
};