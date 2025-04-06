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
    ? "/api/binance/account/balance"
    : "/api/binance/demo/account/balance";
  
  // Fetch the account balance data
  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint],
    refetchInterval: 15000 // Refresh every 15 seconds
  });
  
  // Calculate the total portfolio value whenever the data changes
  const [totalValue, setTotalValue] = useState<number>(0);
  
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      // בוא נעשה את זה פשוט וברור - התייחסות לכמות ולמחיר
      const processedBalances = JSON.parse(JSON.stringify(data)); // יצירת העתק
      let totalPortfolioValue = 0;
      
      // שלב 1: לוודא שיש לנו את הנתונים הנכונים (כמות ומחיר)
      for (let i = 0; i < processedBalances.length; i++) {
        const asset = processedBalances[i];
        
        // וידוא שסך הכל נקבע נכון - אם 0 אבל available לא 0, נחשב את סך הכל
        if (asset.total === 0 && asset.available > 0) {
          asset.total = asset.available + (asset.frozen || 0);
        }
        
        // וידוא שיש מחיר
        if (!asset.pricePerUnit || asset.pricePerUnit <= 0) {
          // אם אין מחיר, ננסה לחשב מתוך valueUSD
          if (typeof asset.valueUSD === 'number' && asset.valueUSD > 0 && asset.total > 0) {
            asset.pricePerUnit = asset.valueUSD / asset.total;
          } else if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(asset.currency)) {
            // סטייבלקוינס תמיד שווים בערך 1 דולר
            asset.pricePerUnit = 1;
          }
        }
        
        // שלב 2: חישוב פשוט - כמות × מחיר
        const simpleValue = asset.total * (asset.pricePerUnit || 0);
        
        // אחסון הערך המחושב במטבע
        asset.calculatedTotalValue = simpleValue;
        
        // הוספת הערך של המטבע הזה לסך הכולל של התיק
        totalPortfolioValue += simpleValue;
      }
      
      // עדכון האובייקט המקורי עם הערכים המחושבים
      if (typeof data === 'object' && !Array.isArray(data)) {
        (data as any).balances = processedBalances;
      } else {
        for (let i = 0; i < data.length; i++) {
          data[i].calculatedTotalValue = processedBalances[i].calculatedTotalValue;
        }
      }
      
      // עיגול ל-2 ספרות עשרוניות לתצוגה נוחה
      setTotalValue(Math.round(totalPortfolioValue * 100) / 100);
      setLastUpdated(new Date());
      
      // רישום לייעול באגים
      console.log('Total portfolio value (simple calculation):', totalPortfolioValue.toFixed(2));
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