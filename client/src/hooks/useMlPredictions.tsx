import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
        // First attempt to get real data
        try {
          const res = await apiRequest('GET', `/api/ml/predict/${symbol}?interval=${interval}&sample=false`, { 
            timeout: 3000 // Set a shorter timeout for the real data attempt
          });
          const data = await res.json();
          if (data.success) {
            return data;
          }
          // If we got here but success is false, throw to trigger the fallback
          throw new Error('Failed to get prediction data');
        } catch (realDataError) {
          console.warn(`Falling back to sample data for ${symbol}:`, realDataError);
          // If real data fails, explicitly request sample data
          const fallbackRes = await apiRequest('GET', `/api/ml/predict/${symbol}?interval=${interval}&sample=true`);
          return await fallbackRes.json();
        }
      } catch (error) {
        console.error(`Failed to fetch ML prediction for ${symbol} (even with fallback):`, error);
        throw error;
      }
    },
    enabled,
    refetchInterval,
    staleTime: refetchInterval * 0.9, // Consider data stale after 90% of the refetch interval
    // Add retry for better robustness
    retry: 2,
    // If all attempts fail, use our error boundary
    useErrorBoundary: false,
  });

  return {
    prediction: data,
    isLoading,
    error,
    refetch
  };
}