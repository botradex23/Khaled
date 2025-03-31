// useAssetPricing.ts - A dynamic hook for fetching cryptocurrency prices
import { useQuery } from '@tanstack/react-query';
import { AccountBalance } from '@/types/balance';
import { getQueryFn } from '@/lib/queryClient';

// Interface for cryptocurrency price data
export interface CryptoPriceData {
  // Support both the old format (currency) and the new format (symbol)
  currency?: string;
  symbol?: string;
  price: number;
  lastUpdated?: string;
  timestamp?: number;
  found?: boolean;
  source?: string;
}

// List of known stablecoins that should always have a price of 1.0 USD
const STABLECOINS = ['USDT', 'USDC', 'DAI', 'TUSD', 'USDP', 'GUSD', 'BUSD', 'USDK', 'USDN'];

// Helper function to check if a cryptocurrency is a stablecoin
export function isStablecoin(symbol: string): boolean {
  return STABLECOINS.includes(symbol.toUpperCase());
}

/**
 * Get the price for a specific cryptocurrency
 * Uses multiple matching strategies to find the best price
 */
export function getPriceForAsset(
  currency: string, 
  prices: CryptoPriceData[]
): number {
  if (!currency) return 0;
  
  const symbol = currency.toUpperCase();
  
  // 1. Special case: Stablecoins always return 1.0
  if (isStablecoin(symbol)) {
    return 1.0;
  }
  
  // 2. Direct match by currency symbol
  // Handle both Market type (with symbol property) and legacy types (with currency property)
  const directMatch = prices.find(p => {
    const priceCurrency = p.symbol ? p.symbol.toUpperCase() : 
                          p.currency ? p.currency.toUpperCase() : '';
    return priceCurrency === symbol;
  });
  if (directMatch) return directMatch.price;
  
  // 3. Try to find a match where the currency is the base asset in a trading pair
  // This is a fallback for when we don't have direct price data
  const pairMatch = prices.find(p => {
    const priceCurrency = p.symbol ? p.symbol.toUpperCase() : 
                          p.currency ? p.currency.toUpperCase() : '';
    return priceCurrency.startsWith(symbol + '-') || priceCurrency.endsWith('-' + symbol);
  });
  
  if (pairMatch) return pairMatch.price;
  
  // 4. If we still don't have a price, return 0
  return 0;
}

/**
 * Calculates portfolio value and enriches account balances with price data
 */
export function enrichBalancesWithPrices(
  balances: AccountBalance[], 
  prices: CryptoPriceData[]
): AccountBalance[] {
  if (!balances || !balances.length) return [];
  
  // Calculate total value of all assets to compute percentages
  let totalPortfolioValue = 0;
  
  // First pass: calculate values
  const enrichedBalances = balances.map(asset => {
    const price = asset.pricePerUnit || getPriceForAsset(asset.currency, prices);
    
    // In some cases the total might be zero but available balance exists
    const total = asset.total > 0 ? asset.total : (asset.available + (asset.frozen || 0));
    
    // Calculate value in USD
    const valueUSD = total * price;
    totalPortfolioValue += valueUSD;
    
    return {
      ...asset,
      total,
      pricePerUnit: price,
      valueUSD
    };
  });
  
  // Second pass: add percentage of portfolio
  return enrichedBalances.map(asset => ({
    ...asset,
    percentOfPortfolio: totalPortfolioValue > 0 
      ? (asset.valueUSD / totalPortfolioValue) * 100 
      : 0
  }));
}

/**
 * Calculate the total value of a portfolio
 */
export function calculateTotalValue(
  balances: AccountBalance[]
): { total: number; available: number; frozen: number } {
  let total = 0, available = 0, frozen = 0;

  if (!balances || !balances.length) {
    return { total: 0, available: 0, frozen: 0 };
  }

  balances.forEach(asset => {
    // Get price, either from the asset itself or use 0 as fallback
    const price = asset.pricePerUnit || 0;
    
    // Calculate values
    const assetTotal = asset.total * price;
    const assetAvailable = asset.available * price;
    const assetFrozen = (asset.frozen || 0) * price;
    
    // Add to totals
    total += assetTotal;
    available += assetAvailable;
    frozen += assetFrozen;
  });

  return { 
    total: parseFloat(total.toFixed(2)), 
    available: parseFloat(available.toFixed(2)), 
    frozen: parseFloat(frozen.toFixed(2)) 
  };
}

/**
 * React hook for fetching and managing cryptocurrency price data
 * @param currencies Optional list of specific currencies to fetch prices for
 * @returns Object containing price data and utility functions
 */
export function useAssetPricing(currencies?: string[]) {
  // Build the query URL with the optional currencies parameter
  const queryUrl = currencies && currencies.length 
    ? `/api/market/prices?symbols=${currencies.join(',')}`
    : '/api/market/prices';
  
  // Fetch cryptocurrency prices
  const { 
    data: response, 
    isLoading,
    isError,
    error 
  } = useQuery<{ success: boolean, data?: any[], prices?: CryptoPriceData[], count?: number, message?: string }>({
    queryKey: [queryUrl],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,     // Consider data stale after 30 seconds
  });
  
  // Extract prices from the response - handle both response formats
  // The API might return data in different formats:
  // 1. { success: true, prices: [...] } - older format
  // 2. { success: true, data: [...] }   - newer format from Binance endpoints
  let prices: CryptoPriceData[] = [];
  
  if (response?.success === true) {
    if (Array.isArray(response.prices)) {
      // Handle old format
      prices = response.prices;
    } else if (Array.isArray(response.data)) {
      // Handle new format where prices are in data array
      prices = response.data.map(item => ({
        symbol: item.symbol,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
        source: item.source || 'api',
        timestamp: item.timestamp || Date.now()
      }));
    }
  }
  
  // Get price for a specific currency
  const getPrice = (currency: string): number => {
    if (!prices || !currency) return 0;
    return getPriceForAsset(currency, prices);
  };
  
  // Format price with the specified number of decimal places
  const formatPrice = (price: number, decimals = 2): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    } else if (price >= 100) {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } else if (price >= 0.01) {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: decimals + 1,
        maximumFractionDigits: decimals + 1
      });
    } else if (price > 0) {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: decimals + 2,
        maximumFractionDigits: decimals + 3
      });
    } else {
      return '0.00';
    }
  };
  
  return {
    prices: prices || [],
    isLoading,
    isError,
    error,
    getPrice,
    formatPrice,
    enrichBalancesWithPrices: (balances: AccountBalance[]) => 
      enrichBalancesWithPrices(balances, prices || []),
    calculateTotalValue
  };
}

export default useAssetPricing;