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
        const res = await apiRequest('GET', `/api/ml/predict/${symbol}?interval=${interval}&sample=false`);
        return await res.json();
      } catch (error) {
        console.error(`Failed to fetch ML prediction for ${symbol}:`, error);
        throw error;
      }
    },
    enabled,
    refetchInterval,
    staleTime: refetchInterval * 0.9, // Consider data stale after 90% of the refetch interval
  });

  return {
    prediction: data,
    isLoading,
    error,
    refetch
  };
}