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
      // Process the balances first to ensure we have all the data for accurate calculations
      const processedBalances = data.map(asset => {
        // Clone to avoid mutating the original data
        const processedAsset = { ...asset };
        
        // Make sure total is set properly - if it's 0 but available is not, use available
        if (processedAsset.total === 0 && processedAsset.available > 0) {
          processedAsset.total = processedAsset.available + (processedAsset.frozen || 0);
        }
        
        // If we have valueUSD but no pricePerUnit, calculate it
        if (typeof processedAsset.valueUSD === 'number' && processedAsset.valueUSD > 0 && 
            (!processedAsset.pricePerUnit || processedAsset.pricePerUnit === 0)) {
          // If total is non-zero, calculate price per unit
          if (processedAsset.total > 0) {
            processedAsset.pricePerUnit = processedAsset.valueUSD / processedAsset.total;
          }
        }
        
        return processedAsset;
      });
      
      // Calculate total value using our robust calculation algorithm
      const calculated = processedBalances.reduce((sum, asset) => {
        let assetValue = 0;
        
        // First priority: Use market data if we have quantity and price
        if (asset.total > 0 && asset.pricePerUnit && asset.pricePerUnit > 0) {
          assetValue = asset.total * asset.pricePerUnit;
        }
        // Second priority: Use valueUSD directly if it's a meaningful value
        else if (typeof asset.valueUSD === 'number' && asset.valueUSD > 0.01) {
          assetValue = asset.valueUSD;
        }
        // Third priority: Check for stablecoins which are always ~$1
        else if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(asset.currency)) {
          assetValue = asset.total || asset.available || 0;
        }
        // Last priority: Look for separate available/frozen values
        else {
          const value = (asset.available || 0) * (asset.pricePerUnit || 0);
          const frozenValue = (asset.frozen || 0) * (asset.pricePerUnit || 0);
          assetValue = value + frozenValue;
        }
        
        return sum + assetValue;
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