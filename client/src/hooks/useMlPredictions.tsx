import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

export interface MLPrediction {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  symbol: string;
  timestamp: string;
  current_price: number;
  probabilities: {
    BUY: number;
    SELL: number;
    HOLD: number;
  };
  indicators: {
    rsi_14: number;
    ema_20: number;
    macd: number;
    macd_signal: number;
    macd_hist: number;
  };
  is_sample_data: boolean;
  success: boolean;
}

interface UseMlPredictionOptions {
  symbol: string;
  interval?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook for fetching ML predictions from the Python Flask service
 * Uses the Binance SDK directly in the backend
 */
export function useMlPrediction({ 
  symbol, 
  interval = '4h',
  enabled = true,
  refetchInterval = 60000 // Default: 1 minute
}: UseMlPredictionOptions) {
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<MLPrediction>({
    queryKey: [`/api/ml/predict/${symbol}`, interval],
    queryFn: async () => {
      try {
        // First attempt to get real data through SDK
        try {
          console.log(`Attempting to fetch ${symbol} prediction data using Binance SDK...`);
          // Using fetch directly with proper error handling for better debugging
          const res = await fetch(`/api/ml/predict/${symbol}?interval=${interval}&sample=false`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'include',
          });
          
          const data = await res.json();
          
          if (res.ok && data.success) {
            console.log(`Successfully fetched ${symbol} prediction with SDK: ${data.signal} (${data.confidence.toFixed(2)})`);
            return data;
          }
          
          // If we got here but success is false, throw to trigger the fallback
          throw new Error(data.error || `API returned status: ${res.status}`);
          
        } catch (realDataError) {
          console.warn(`Falling back to sample data for ${symbol}`);
          
          // If real data fails, explicitly request sample data
          try {
            const fallbackRes = await fetch(`/api/ml/predict/${symbol}?interval=${interval}&sample=true`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              credentials: 'include',
            });
            
            const fallbackData = await fallbackRes.json();
            
            if (fallbackRes.ok && fallbackData.success) {
              console.log(`Using fallback sample data for ${symbol}: ${fallbackData.signal}`);
              return fallbackData;
            }
            
            throw new Error(fallbackData.error || `Fallback API returned status: ${fallbackRes.status}`);
          } catch (fallbackError) {
            console.error(`Failed to get fallback data for ${symbol}`);
            throw fallbackError;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ML prediction for ${symbol} (even with fallback)`);
        throw error;
      }
    },
    enabled,
    refetchInterval,
    staleTime: refetchInterval * 0.9, // Consider data stale after 90% of the refetch interval
    // Add retry for better robustness
    retry: 3, // Increased retries for more stability
    retryDelay: attempt => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000), // Increased delay between retries
  });

  return {
    prediction: data,
    isLoading,
    error,
    refetch
  };
}