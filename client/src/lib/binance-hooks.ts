/**
 * Binance Hooks for React Components
 * 
 * This file provides custom React hooks for interacting with Binance integration
 * from frontend components.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './queryClient';

// Types and interfaces
export interface BinancePrice {
  symbol: string;
  price: string;
}

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
  total: number;
  valueUSD?: number;
}

export interface BinanceStatus {
  connected: boolean;
  simulation: boolean;
  lastError: string | null;
  lastUpdate: string;
}

/**
 * Hook for fetching current prices
 * @param symbols Optional array of symbols to fetch (e.g., ['BTCUSDT', 'ETHUSDT'])
 * @param enabled Whether to enable the query
 * @param refetchInterval Interval in ms to refetch data (default: 10000)
 */
export function useBinancePrices(
  symbols?: string[],
  enabled = true,
  refetchInterval = 10000
) {
  return useQuery({
    queryKey: symbols ? ['binance-prices', ...symbols] : ['binance-prices'],
    queryFn: async () => {
      const endpoint = symbols?.length 
        ? `/api/binance/prices?symbols=${symbols.join(',')}`
        : '/api/binance/prices';
      
      const data = await apiRequest('GET', endpoint);
      return data as BinancePrice[];
    },
    enabled,
    refetchInterval,
    refetchIntervalInBackground: true,
    staleTime: 5000,
  });
}

/**
 * Hook for fetching user account balances
 */
export function useBinanceBalances() {
  return useQuery({
    queryKey: ['binance-balances'],
    queryFn: async () => {
      const data = await apiRequest('GET', '/api/binance/account/balances');
      return data as BinanceBalance[];
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

/**
 * Hook for fetching Binance connection status
 */
export function useBinanceStatus() {
  return useQuery({
    queryKey: ['binance-status'],
    queryFn: async () => {
      const data = await apiRequest('GET', '/api/binance/status');
      return data as BinanceStatus;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * Hook for checking if user has API keys configured
 */
export function useBinanceApiKeys() {
  return useQuery({
    queryKey: ['binance-api-keys'],
    queryFn: async () => {
      const data = await apiRequest('GET', '/api/binance/api-keys/check');
      return data as { hasKeys: boolean; isTestnet: boolean };
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook for using WebSocket real-time price updates
 * @param symbols Array of symbols to subscribe to (e.g., ['BTCUSDT', 'ETHUSDT'])
 */
export function useBinanceWebSocketPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        // Create query parameter with symbols
        const symbolsParam = symbols.join(',');
        const sseUrl = `/api/binance/stream?symbols=${symbolsParam}`;
        
        // Create SSE connection
        eventSource = new EventSource(sseUrl);
        
        // Connection opened
        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };
        
        // Receive message
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'price-update') {
              setPrices((prev) => ({
                ...prev,
                [data.symbol]: data.price,
              }));
            }
          } catch (err) {
            console.error('Error parsing SSE message:', err);
          }
        };
        
        // Handle errors
        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err);
          setIsConnected(false);
          setError('Connection error. Attempting to reconnect...');
          
          // Close and try to reconnect
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          
          // Try to reconnect after a delay
          setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error('Error establishing SSE connection:', err);
        setError('Failed to connect to price stream');
      }
    };
    
    // Start connection
    connectSSE();
    
    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [symbols.join(',')]);

  return { prices, isConnected, error };
}

/**
 * Hook for getting top crypto assets by market cap
 */
export function useTopCryptoAssets() {
  return useQuery({
    queryKey: ['top-crypto-assets'],
    queryFn: async () => {
      const data = await apiRequest('GET', '/api/binance/markets/top');
      return data as Array<{
        symbol: string;
        baseAsset: string;
        quoteAsset: string;
        price: string;
        volume: string;
        change24h: string;
      }>;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}