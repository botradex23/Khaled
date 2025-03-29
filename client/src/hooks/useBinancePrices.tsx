import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface BinanceTicker {
  symbol: string;
  price: string;
}

export function useBinancePrices() {
  const [useFallback, setUseFallback] = useState(false);
  
  // שאילתה לקבלת מחירי המטבעות מ-Binance
  const {
    data: prices,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<BinanceTicker[]>({
    queryKey: ['/api/binance/market/tickers', useFallback],
    queryFn: async () => {
      try {
        // התחל עם ניסיון תקשורת רגיל
        const url = useFallback 
          ? '/api/binance/market/tickers?useFallback=true'
          : '/api/binance/market/tickers';
          
        const response = await axios.get(url);
        return response.data;
      } catch (error: any) {
        // אם יש שגיאה והיא קשורה למיקום גיאוגרפי, השתמש בגיבוי
        if (error.response?.data?.useFallback) {
          // אם השרת מציע להשתמש בגיבוי, שמור זאת
          setUseFallback(true);
          // נסה שוב מיד עם הגיבוי
          const fallbackResponse = await axios.get('/api/binance/market/tickers?useFallback=true');
          return fallbackResponse.data;
        }
        throw error;
      }
    },
    refetchInterval: 15000, // רענון כל 15 שניות
    retry: 1, // רק ניסיון אחד נוסף
  });

  // כאשר יש שגיאה, בדוק אם היא קשורה למיקום גיאוגרפי
  useEffect(() => {
    if (isError && typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      if (errorObj.response?.data?.useFallback) {
        setUseFallback(true);
        setTimeout(() => refetch(), 100); // רענן אוטומטית אחרי הגדרת מצב הגיבוי
      }
    }
  }, [isError, error, refetch]);

  // המר מחירי מטבעות לאובייקט חיפוש מהיר
  const pricesMap = prices?.reduce((map: Record<string, string>, ticker) => {
    map[ticker.symbol] = ticker.price;
    return map;
  }, {}) || {};

  // שאילתה לקבלת נתוני 24 שעות עבור מטבעות מבינאנס
  const {
    data: tickers24hr,
    isLoading: is24hrLoading,
    isError: is24hrError
  } = useQuery({
    queryKey: ['/api/binance/market/24hr', useFallback],
    queryFn: async () => {
      try {
        // התחל עם ניסיון תקשורת רגיל
        const url = useFallback 
          ? '/api/binance/market/24hr?useFallback=true'
          : '/api/binance/market/24hr';
          
        const response = await axios.get(url);
        return response.data;
      } catch (error: any) {
        // אם יש שגיאה והיא קשורה למיקום גיאוגרפי, השתמש בגיבוי
        if (error.response?.data?.useFallback) {
          // נסה שוב מיד עם הגיבוי
          const fallbackResponse = await axios.get('/api/binance/market/24hr?useFallback=true');
          return fallbackResponse.data;
        }
        throw error;
      }
    },
    refetchInterval: 60000, // רענון כל דקה
    retry: 1, // רק ניסיון אחד נוסף
    enabled: !isLoading, // רק אחרי שטעינת המחירים הושלמה
  });

  return {
    prices,
    pricesMap,
    tickers24hr,
    isLoading,
    isError,
    is24hrLoading,
    is24hrError,
    refetch,
    isUsingFallback: useFallback
  };
}

// פונקציה לקבלת המחיר של מטבע ספציפי לפי הסמל שלו
export function getPrice(pricesMap: Record<string, string>, symbol: string): number {
  // אם הסמל כולל כבר את הסיומת USDT
  if (symbol.endsWith('USDT')) {
    return pricesMap[symbol] ? parseFloat(pricesMap[symbol]) : 0;
  }
  
  // אחרת, נוסיף את הסיומת USDT
  const fullSymbol = `${symbol}USDT`;
  return pricesMap[fullSymbol] ? parseFloat(pricesMap[fullSymbol]) : 0;
}

// פונקציה להמרת דולר למטבע ספציפי
export function convertUsdToToken(usdAmount: number, tokenPrice: number): number {
  if (!tokenPrice || tokenPrice === 0) return 0;
  return usdAmount / tokenPrice;
}

// פונקציה להמרת מטבע ספציפי לדולר
export function convertTokenToUsd(tokenAmount: number, tokenPrice: number): number {
  return tokenAmount * tokenPrice;
}