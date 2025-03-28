import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

// Define the context type
interface PortfolioContextType {
  totalValue: number;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

// Create the context with default values
const PortfolioContext = createContext<PortfolioContextType>({
  totalValue: 0,
  isLoading: false,
  error: null,
  lastUpdated: null,
});

// Provider component that wraps the app and makes portfolio value available to any child component
export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Use the authenticated endpoint if user is logged in, otherwise use demo endpoint
  const endpoint = isAuthenticated 
    ? "/api/okx/account/balance"
    : "/api/okx/demo/account/balance";
  
  // Fetch the account balance data
  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint],
    refetchInterval: 15000 // Refresh every 15 seconds
  });
  
  // Calculate the total portfolio value whenever the data changes
  const [totalValue, setTotalValue] = useState<number>(0);
  
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      // Calculate total value by summing all assets valueUSD or (amount * price)
      const calculated = data.reduce((sum, asset) => {
        // Check if we have valueUSD directly (OKX format) and it's a meaningful value
        // OKX sometimes returns extremely small valueUSD numbers (e.g. 0.000000123) that should be ignored
        if (typeof asset.valueUSD === 'number' && asset.valueUSD > 0.01) {
          // Use valueUSD directly for significant values
          return sum + asset.valueUSD;
        } else if (asset.total > 0 && asset.pricePerUnit) {
          // For assets with valid quantity and price but small or missing valueUSD
          // Calculate based on total and price per unit
          return sum + (asset.total * asset.pricePerUnit);
        } else {
          // Fallback to separate available and frozen calculations
          const value = asset.available * (asset.pricePerUnit || 0);
          const frozenValue = asset.frozen * (asset.pricePerUnit || 0);
          return sum + value + frozenValue;
        }
      }, 0);
      
      // Round to 2 decimal places for better display
      setTotalValue(Math.round(calculated * 100) / 100);
      setLastUpdated(new Date());
    }
  }, [data]);
  
  // Create the context value object
  const contextValue = {
    totalValue,
    isLoading,
    error: error as Error | null,
    lastUpdated,
  };
  
  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
}

// Custom hook to use the portfolio context
export function usePortfolioValue() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioValue must be used within a PortfolioProvider');
  }
  return context;
}