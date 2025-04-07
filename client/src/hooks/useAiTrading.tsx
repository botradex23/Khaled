import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "./use-toast";

export interface TradingSignal {
  symbol: string;
  timestamp: string;
  current_price: number;
  predicted_price: number;
  ma_20: number;
  ma_50: number;
  rsi: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

export interface TradeResult {
  success: boolean;
  message: string;
  order?: any;
}

export interface AISignalsResponse {
  success: boolean;
  signals: TradingSignal[];
  timestamp: string;
  isFresh: boolean;
}

/**
 * Custom hook for AI trading functionality
 */
export function useAiTrading() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for getting AI trading signals
  const {
    data: signalsData,
    isLoading: isLoadingSignals,
    error: signalsError,
    refetch: refetchSignals
  } = useQuery<AISignalsResponse>({
    queryKey: ['/api/ai/trading/signals'],
    queryFn: async () => {
      try {
        console.log('Fetching trading signals from API...');
        
        // Determine base URL based on environment
        const isReplit = typeof window !== 'undefined' && window.location.hostname.includes('.replit.dev');
        
        // In Replit we need to use the full URL including port
        const apiUrl = isReplit 
          ? `${window.location.origin}/api/ai/trading/signals`
          : '/api/ai/trading/signals';
        
        console.log(`Using API URL: ${apiUrl}`);
        
        // Direct fetch with more detailed error handling
        const res = await fetch(apiUrl, {
          credentials: 'include',  // Include cookies for auth if needed
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('API response error:', errorText);
          throw new Error(`Failed to fetch signals: ${res.status} ${res.statusText} - ${errorText}`);
        }
        
        const data = await res.json();
        console.log('Successfully fetched trading signals:', data);
        return data;
      } catch (error) {
        console.error('Failed to fetch AI trading signals:', error);
        // Return a properly structured fallback response
        return {
          success: false,
          signals: [],
          timestamp: new Date().toISOString(),
          isFresh: false
        };
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
  });

  // Signal status calculation based on RSI and moving averages
  const getSignalStatus = (signal: TradingSignal) => {
    if (signal.signal === 'BUY') {
      return 'buy';
    } else if (signal.signal === 'SELL') {
      return 'sell';
    } else {
      return 'neutral';
    }
  };

  // Calculate the price change percentage
  const getPriceChangePercent = (signal: TradingSignal) => {
    return ((signal.predicted_price - signal.current_price) / signal.current_price) * 100;
  };

  // Execute trade mutation
  const executeTradeMutation = useMutation({
    mutationFn: async ({ signalId, amount }: { signalId: string; amount?: number }) => {
      console.log('Executing trade with signal:', signalId, 'amount:', amount);
      try {
        // Determine base URL based on environment
        const isReplit = typeof window !== 'undefined' && window.location.hostname.includes('.replit.dev');
        
        // In Replit we need to use the full URL including port
        const apiUrl = isReplit 
          ? `${window.location.origin}/api/ai/trading/execute`
          : '/api/ai/trading/execute';
          
        console.log(`Using API URL for trade execution: ${apiUrl}`);
        
        const res = await fetch(apiUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ signalId, amount })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Trade execution error:', errorText);
          throw new Error(`Failed to execute trade: ${res.status} ${res.statusText} - ${errorText}`);
        }
        
        const data = await res.json() as TradeResult;
        console.log('Trade executed successfully:', data);
        return data;
      } catch (error) {
        console.error('Trade execution failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Trade Executed",
          description: data.message,
        });
      } else {
        toast({
          title: "Trade Failed",
          description: data.message,
          variant: "destructive",
        });
      }
      // Refetch signals after trade execution
      queryClient.invalidateQueries({ queryKey: ['/api/ai/trading/signals'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Train AI model mutation
  const trainModelMutation = useMutation({
    mutationFn: async (symbol: string) => {
      console.log('Training AI model for symbol:', symbol);
      try {
        // Determine base URL based on environment
        const isReplit = typeof window !== 'undefined' && window.location.hostname.includes('.replit.dev');
        
        // In Replit we need to use the full URL including port
        const apiUrl = isReplit 
          ? `${window.location.origin}/api/ai/trading/train`
          : '/api/ai/trading/train';
          
        console.log(`Using API URL for model training: ${apiUrl}`);
        
        const res = await fetch(apiUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ symbol })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Model training error:', errorText);
          throw new Error(`Failed to train model: ${res.status} ${res.statusText} - ${errorText}`);
        }
        
        const data = await res.json();
        console.log('Model trained successfully:', data);
        return data;
      } catch (error) {
        console.error('Model training failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Model Trained",
          description: data.message,
        });
      } else {
        toast({
          title: "Training Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Training Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    signals: signalsData?.signals || [],
    timestamp: signalsData?.timestamp,
    isFresh: signalsData?.isFresh || false,
    isLoadingSignals,
    signalsError,
    refetchSignals,
    getSignalStatus,
    getPriceChangePercent,
    executeTrade: executeTradeMutation.mutate,
    isExecutingTrade: executeTradeMutation.isPending,
    trainModel: trainModelMutation.mutate,
    isTrainingModel: trainModelMutation.isPending,
  };
}