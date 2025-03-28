import { Market } from "@/types/market";
import { AccountBalance, calculateTotalValue as calculateTotal, isStablecoin } from "@/types/balance";

/**
 * Gets the best price for a given cryptocurrency asset using market data
 * This function tries multiple approaches to find the most accurate price
 * @param asset The account balance object for the asset
 * @param marketPrices Array of market prices from API
 * @returns The price of the asset in USD
 */
export function getPriceForAsset(asset: AccountBalance, marketPrices: Market[]): number {
  // Method 1: Check if it's a stablecoin (these are always worth $1)
  if (isStablecoin(asset.currency)) {
    return 1.0;
  }
  
  // Method 2: Direct symbol match (for non-stablecoins)
  const exactMatch = marketPrices.find(market => market.symbol === asset.currency);
  if (exactMatch && exactMatch.price > 0) {
    return exactMatch.price;
  }
  
  // Method 3: Try common trading pair formats (e.g., BTC-USDT, BTC/USDT)
  const commonPairs = ['-USDT', '-USD', '/USDT', '/USD', 'USDT', '-BTC', '/BTC', 'BTC'];
  for (const pair of commonPairs) {
    // If we're looking for a USD pair and it contains a stablecoin identifier, return 1.0
    if (asset.currency === 'USD' && (pair.includes('USDT') || pair.includes('USDC') || pair.includes('USD'))) {
      return 1.0;
    }
    
    const symbolToCheck = asset.currency + pair;
    const pairMatch = marketPrices.find(market => market.symbol === symbolToCheck);
    if (pairMatch && pairMatch.price > 0) {
      return pairMatch.price;
    }
  }
  
  // Method 4: Try reverse pairs (e.g., USDT-BTC)
  const baseCoins = ['USDT-', 'USD-', 'BTC-'];
  for (const base of baseCoins) {
    // Special case for USD-related base coins
    if ((base === 'USDT-' || base === 'USD-') && (asset.currency === 'USD' || isStablecoin(asset.currency))) {
      return 1.0;
    }
    
    const symbolToCheck = base + asset.currency;
    const reverseMatch = marketPrices.find(market => market.symbol === symbolToCheck);
    if (reverseMatch && reverseMatch.price > 0) {
      return reverseMatch.price;
    }
  }
  
  // Method 5: Try partial matches (substrings)
  // One more check for stablecoins in case we missed any above
  if (asset.currency.toUpperCase().includes('USD') || 
      asset.currency.toUpperCase().endsWith('ST') || // For BUST, WUST, etc.
      asset.currency.toUpperCase() === 'DAI') {
    return 1.0;
  }
  
  const currencyLower = asset.currency.toLowerCase();
  const possibleMatches = marketPrices.filter(market => 
    market.symbol.toLowerCase().includes(currencyLower)
  );
  
  if (possibleMatches.length > 0) {
    // Sort by relevance - shorter names are likely more relevant
    possibleMatches.sort((a, b) => a.symbol.length - b.symbol.length);
    return possibleMatches[0].price;
  }
  
  // Method 6: Use known defaults for common cryptocurrencies
  const knownPrices: Record<string, number> = {
    'BTC': 83760,
    'ETH': 1870,
    'BNB': 622,
    'SOL': 130,
    'XRP': 2.17,
    'ADA': 0.69,
    'DOGE': 0.18
  };
  
  if (knownPrices[asset.currency]) {
    return knownPrices[asset.currency];
  }
  
  // If we can use the valueUSD, derive price from it
  if (asset.valueUSD > 0 && asset.total > 0) {
    return asset.valueUSD / asset.total;
  }
  
  // Last resort: return existing price or 0
  return asset.pricePerUnit || 0;
}

/**
 * Enriches a list of account balances with price information
 * @param balances Array of account balances
 * @param marketPrices Array of market prices from API
 * @returns The account balances with updated price and value information
 */
export function enrichBalancesWithPrices(
  balances: AccountBalance[],
  marketPrices: Market[]
): AccountBalance[] {
  return balances.map(asset => {
    // Special case for stablecoins - ALWAYS set price to 1.0 directly
    if (isStablecoin(asset.currency)) {
      asset.pricePerUnit = 1.0;
    } else {
      // For non-stablecoins, get the best price using our price discovery process
      asset.pricePerUnit = asset.pricePerUnit || getPriceForAsset(asset, marketPrices);
    }
    
    // Make sure we have a total
    if (asset.total === 0 && asset.available > 0) {
      asset.total = asset.available + (asset.frozen || 0);
    }
    
    // Calculate the total value
    const calculatedTotalValue = asset.total * asset.pricePerUnit;
    
    // Calculate percentage of whole coin if it's a fraction
    const percentOfWhole = asset.total < 1 ? asset.total * 100 : undefined;
    
    // Return the enriched asset
    return {
      ...asset,
      pricePerUnit: asset.pricePerUnit,
      calculatedTotalValue,
      percentOfWhole
    };
  });
}

/**
 * Calculates the total value of a portfolio from balances
 * @param balances Array of account balances
 * @returns Object with total, available, and frozen values
 */
export function calculateTotalValue(balances: AccountBalance[]) {
  return calculateTotal(balances);
}