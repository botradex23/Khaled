/**
 * Direct Binance API Client
 * 
 * This module provides a direct interface to the Binance API through our Python backend service,
 * using the official Binance SDK without any fallbacks or simulations.
 */

/**
 * Helper function to make API requests with proper error handling
 * @param endpoint API endpoint path
 * @param options Request options
 * @returns Promise with response data
 */
export interface ApiError {
  status: number;
  message: string;
  geo_restricted?: boolean;
  error?: string;
}

export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      // Try to parse error as JSON first
      let errorData: any;
      let errorText: string;
      
      try {
        errorData = await response.json();
        errorText = errorData.message || 'Unknown error';
      } catch (e) {
        // If not JSON, get as text
        errorText = await response.text();
        errorData = { message: errorText };
      }
      
      // Handle geo-restriction specifically
      if (response.status === 451 || (errorData && errorData.geo_restricted)) {
        const error: ApiError = {
          status: response.status,
          message: 'Binance API access is restricted in this region.',
          geo_restricted: true,
          error: errorData.error
        };
        throw error;
      }
      
      // Handle other errors
      const error: ApiError = {
        status: response.status,
        message: errorText,
        ...errorData
      };
      throw error;
    }

    return await response.json() as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Interface for ticker price data from Binance
 */
export interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

/**
 * Interface for 24hr ticker data from Binance
 */
export interface Binance24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  [key: string]: any; // For any additional fields Binance might return
}

/**
 * Direct Binance API service for accessing market data
 */
class DirectBinanceApiService {
  /**
   * Ping the Direct Binance API service to check connectivity
   * @returns Response with connection status
   */
  async pingService(): Promise<{ success: boolean; message: string }> {
    try {
      return await apiRequest<{ success: boolean; message: string }>('/api/direct-binance/ping');
    } catch (error) {
      console.error('Failed to ping Binance API service:', error);
      return { success: false, message: 'Failed to connect to Binance API service' };
    }
  }

  /**
   * Get all current prices from Binance
   * @returns List of all ticker prices
   */
  async getAllPrices(): Promise<BinanceTickerPrice[]> {
    try {
      const response = await apiRequest<{ success: boolean; prices: BinanceTickerPrice[] }>('/api/direct-binance/prices');
      return response.prices;
    } catch (error) {
      console.error('Failed to get all prices:', error);
      throw error;
    }
  }

  /**
   * Get the current price for a specific symbol
   * @param symbol Trading pair symbol (e.g., "BTCUSDT")
   * @returns Ticker price data
   */
  async getSymbolPrice(symbol: string): Promise<BinanceTickerPrice> {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const formattedSymbol = symbol.toUpperCase();
    try {
      const response = await apiRequest<{success: boolean; price: BinanceTickerPrice}>(`/api/direct-binance/price/${formattedSymbol}`);
      return response.price;
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get 24hr ticker data for one or all symbols
   * @param symbol Optional symbol for specific pair data
   * @returns 24hr ticker data
   */
  async get24hrTicker(symbol?: string): Promise<Binance24hrTicker | Binance24hrTicker[]> {
    try {
      const endpoint = symbol 
        ? `/api/direct-binance/ticker/24hr?symbol=${symbol.toUpperCase()}`
        : '/api/direct-binance/ticker/24hr';
      
      const response = await apiRequest<{success: boolean; data: Binance24hrTicker | Binance24hrTicker[]}>(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to get 24hr ticker data:', error);
      throw error;
    }
  }

  /**
   * Get raw price data with minimal processing
   * @returns Raw price data from Binance
   */
  async getRawPrices(): Promise<any> {
    try {
      return await apiRequest<any>('/api/direct-binance/raw/prices');
    } catch (error) {
      console.error('Failed to get raw prices:', error);
      throw error;
    }
  }

  /**
   * Get raw price data for a specific symbol with minimal processing
   * @param symbol Trading pair symbol (e.g., "BTCUSDT")
   * @returns Raw price data from Binance
   */
  async getRawSymbolPrice(symbol: string): Promise<any> {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    try {
      return await apiRequest<any>(`/api/direct-binance/raw/price/${symbol.toUpperCase()}`);
    } catch (error) {
      console.error(`Failed to get raw price for ${symbol}:`, error);
      throw error;
    }
  }
}

export const directBinanceApi = new DirectBinanceApiService();