export interface AccountBalance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  valueUSD: number;
  percentOfWhole?: number; // Percentage of the whole coin (e.g., 0.1 BTC = 10%)
  pricePerUnit?: number;   // Price per 1 unit of currency
  calculatedTotalValue?: number; // Total calculated value in USD
  isRealAccount?: boolean; // Whether this is real account data or demo data
}

// Helper functions for working with account balances
export function isStablecoin(symbol: string): boolean {
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDK', 'USDP', 'USDN', 'GUSD'];
  return stablecoins.includes(symbol.toUpperCase());
}

// Calculate total portfolio value from balances
export function calculateTotalValue(balances: AccountBalance[]): { total: number; available: number; frozen: number } {
  let totalValue = 0;
  let availableValue = 0;
  let frozenValue = 0;
  
  balances.forEach(asset => {
    // Calculate asset value using price per unit
    const assetValue = asset.total * (asset.pricePerUnit || 0);
    
    // Add to total
    totalValue += assetValue;
    
    // Calculate available/frozen proportion
    if (asset.total > 0) {
      const availableRatio = asset.available / asset.total;
      availableValue += assetValue * availableRatio;
      frozenValue += assetValue * (1 - availableRatio);
    } else {
      availableValue += assetValue; // If no total, assume all available
    }
  });
  
  return {
    total: totalValue,
    available: availableValue,
    frozen: frozenValue
  };
}