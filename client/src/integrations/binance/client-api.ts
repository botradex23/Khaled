/**
 * Binance Client API Module
 * 
 * This module provides a client-side interface for interacting with the Binance API
 * endpoints exposed through our backend services.
 */

/**
 * Helper function to make API requests with proper error handling
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
 * Interface for account balance data
 */
export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
  total: number;
  valueUSD?: number;
}

/**
 * Unified Binance API client service for frontend components
 */
export class BinanceClientApi {
  /**
   * Check Binance API connectivity
   */
  async checkConnectivity(): Promise<{ success: boolean; message: string }> {
    try {
      return await apiRequest<{ success: boolean; message: string }>('/api/binance/status/connectivity');
    } catch (error) {
      console.error('Failed to check Binance API connectivity:', error);
      return { success: false, message: 'Failed to connect to Binance API' };
    }
  }

  /**
   * Get all current prices
   */
  async getAllPrices(): Promise<BinanceTickerPrice[]> {
    try {
      const response = await apiRequest<{ success: boolean; prices: BinanceTickerPrice[] }>('/api/binance/prices');
      return response.prices;
    } catch (error) {
      console.error('Failed to get all prices:', error);
      throw error;
    }
  }

  /**
   * Get price for a specific symbol
   */
  async getSymbolPrice(symbol: string): Promise<BinanceTickerPrice> {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const formattedSymbol = symbol.toUpperCase();
    try {
      const response = await apiRequest<{success: boolean; price: BinanceTickerPrice}>(`/api/binance/price/${formattedSymbol}`);
      return response.price;
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get 24hr ticker data
   */
  async get24hrTicker(symbol?: string): Promise<Binance24hrTicker | Binance24hrTicker[]> {
    try {
      const endpoint = symbol 
        ? `/api/binance/ticker/24hr?symbol=${symbol.toUpperCase()}`
        : '/api/binance/ticker/24hr';
      
      const response = await apiRequest<{success: boolean; data: Binance24hrTicker | Binance24hrTicker[]}>(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to get 24hr ticker data:', error);
      throw error;
    }
  }

  /**
   * Get top cryptocurrency pairs
   */
  async getTopPairs(): Promise<BinanceTickerPrice[]> {
    try {
      const response = await apiRequest<{ success: boolean; data: BinanceTickerPrice[] }>('/api/binance/markets/top');
      return response.data;
    } catch (error) {
      console.error('Failed to get top pairs:', error);
      throw error;
    }
  }

  /**
   * Check if user has API keys configured
   */
  async checkApiKeys(): Promise<{ hasKeys: boolean; isTestnet: boolean }> {
    try {
      return await apiRequest<{ hasKeys: boolean; isTestnet: boolean }>('/api/binance/api-keys/check');
    } catch (error) {
      console.error('Failed to check API keys:', error);
      return { hasKeys: false, isTestnet: false };
    }
  }

  /**
   * Save API keys
   */
  async saveApiKeys(apiKey: string, secretKey: string, isTestnet: boolean): Promise<{ success: boolean; message: string }> {
    try {
      return await apiRequest<{ success: boolean; message: string }>('/api/binance/api-keys/save', {
        method: 'POST',
        body: JSON.stringify({ apiKey, secretKey, isTestnet }),
      });
    } catch (error) {
      console.error('Failed to save API keys:', error);
      throw error;
    }
  }

  /**
   * Get account balances
   */
  async getAccountBalances(): Promise<BinanceBalance[]> {
    try {
      const response = await apiRequest<{ success: boolean; balances: BinanceBalance[] }>('/api/binance/account/balances');
      return response.balances;
    } catch (error) {
      console.error('Failed to get account balances:', error);
      throw error;
    }
  }

  /**
   * Get account overview
   */
  async getAccountOverview(): Promise<{
    totalBalanceUSD: number;
    balances: BinanceBalance[];
    canTrade: boolean;
    accountType: string;
  }> {
    try {
      return await apiRequest<{
        totalBalanceUSD: number;
        balances: BinanceBalance[];
        canTrade: boolean;
        accountType: string;
      }>('/api/binance/account/overview');
    } catch (error) {
      console.error('Failed to get account overview:', error);
      throw error;
    }
  }

  /**
   * Place market order
   */
  async placeMarketOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    quoteOrderQty?: number;
  }): Promise<any> {
    try {
      return await apiRequest<any>('/api/binance/orders/market', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch (error) {
      console.error('Failed to place market order:', error);
      throw error;
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<any[]> {
    try {
      const endpoint = symbol
        ? `/api/binance/orders/open?symbol=${symbol.toUpperCase()}`
        : '/api/binance/orders/open';
      
      return await apiRequest<any[]>(endpoint);
    } catch (error) {
      console.error('Failed to get open orders:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    try {
      return await apiRequest<any>('/api/binance/orders/cancel', {
        method: 'POST',
        body: JSON.stringify({ symbol, orderId }),
      });
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    simulationMode: boolean;
    lastError: string | null;
    currentProxy: {host: string, port: number} | null;
  }> {
    try {
      return await apiRequest<{
        connected: boolean;
        simulationMode: boolean;
        lastError: string | null;
        currentProxy: {host: string, port: number} | null;
      }>('/api/binance/status');
    } catch (error) {
      console.error('Failed to get connection status:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const binanceClientApi = new BinanceClientApi();