import React from "react";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { PaperTradingAccount, PaperTradingPosition, PaperTradingTrade } from "@shared/schema";
import { useToast } from "./use-toast";

export const queryClient = new QueryClient();

export function usePaperTrading() {
  const { toast } = useToast();

  // Get the user's paper trading account
  const {
    data: account,
    isLoading: isAccountLoading,
    isError: isAccountError,
    error: accountError,
    refetch: refetchAccount
  } = useQuery<PaperTradingAccount>({
    queryKey: ["/api/paper-trading/account"],
    retry: 1,
  });

  // Create a paper trading account
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/paper-trading/account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ initialBalance: 1000 })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "חשבון נוצר בהצלחה",
        description: "חשבון Paper Trading שלך נוצר עם יתרה התחלתית של $1,000",
      });
      queryClient.setQueryData(["/api/paper-trading/account"], data);
      refetchAccount();
    },
    onError: (error: Error) => {
      console.error("Failed to create paper trading account:", error);
      toast({
        title: "שגיאה ביצירת חשבון",
        description: error.message || "אירעה שגיאה ביצירת חשבון Paper Trading",
        variant: "destructive"
      });
    }
  });

  // Reset the account
  const resetAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/paper-trading/account/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset account");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "חשבון אופס בהצלחה",
        description: "חשבון Paper Trading שלך אופס ליתרה ההתחלתית",
      });
      queryClient.setQueryData(["/api/paper-trading/account"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/stats"] });
    },
    onError: (error: Error) => {
      console.error("Failed to reset paper trading account:", error);
      toast({
        title: "שגיאה באיפוס חשבון",
        description: error.message || "אירעה שגיאה באיפוס חשבון Paper Trading",
        variant: "destructive"
      });
    }
  });

  // Get open positions
  const {
    data: positions,
    isLoading: isPositionsLoading,
    isError: isPositionsError,
    refetch: refetchPositions
  } = useQuery<PaperTradingPosition[]>({
    queryKey: ["/api/paper-trading/positions"],
    enabled: !!account,
  });

  // Get trade history
  const {
    data: trades,
    isLoading: isTradesLoading,
    isError: isTradesError,
    refetch: refetchTrades
  } = useQuery<PaperTradingTrade[]>({
    queryKey: ["/api/paper-trading/trades"],
    enabled: !!account,
  });

  // Get account stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats
  } = useQuery<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: string;
    totalProfitLossPercent: string;
    averageProfitLoss: string;
    averageProfitLossPercent: string;
  }>({
    queryKey: ["/api/paper-trading/stats"],
    enabled: !!account,
  });

  // Close a position
  const closePositionMutation = useMutation({
    mutationFn: async ({ positionId, exitPrice }: { positionId: number, exitPrice: number }) => {
      const response = await fetch(`/api/paper-trading/positions/${positionId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ exitPrice })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to close position");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "פוזיציה נסגרה בהצלחה",
        description: "הפוזיציה נסגרה והרווח/הפסד נזקף לחשבון שלך",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/account"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/stats"] });
    },
    onError: (error: Error) => {
      console.error("Failed to close position:", error);
      toast({
        title: "שגיאה בסגירת פוזיציה",
        description: error.message || "אירעה שגיאה בסגירת הפוזיציה",
        variant: "destructive"
      });
    }
  });

  // Create a new trade position
  const createTradeMutation = useMutation({
    mutationFn: async (tradeData: {
      symbol: string;
      quantity: number;
      entryPrice: number;
      direction: "LONG" | "SHORT";
      type?: "MARKET" | "LIMIT";
      isAiGenerated?: boolean;
      aiConfidence?: number;
    }) => {
      const response = await fetch("/api/paper-trading/trades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(tradeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create trade");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "עסקה חדשה נוצרה",
        description: "העסקה החדשה נוצרה בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/account"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/trades"] });
    },
    onError: (error: Error) => {
      console.error("Failed to create trade:", error);
      toast({
        title: "שגיאה ביצירת עסקה",
        description: error.message || "אירעה שגיאה ביצירת העסקה החדשה",
        variant: "destructive"
      });
    }
  });

  return {
    // Account data
    account,
    isAccountLoading,
    isAccountError,
    accountError,
    refetchAccount,
    
    // Mutations
    createAccountMutation,
    resetAccountMutation,
    closePositionMutation,
    createTradeMutation,
    
    // Positions data
    positions,
    isPositionsLoading,
    isPositionsError,
    refetchPositions,
    
    // Trades data
    trades,
    isTradesLoading,
    isTradesError,
    refetchTrades,
    
    // Stats data
    stats,
    isStatsLoading,
    isStatsError,
    refetchStats
  };
}