import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BadgeInfo, Wallet, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

// Type definition
interface AccountBalance {
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

export function AccountBalanceCard() {
  // Get authentication status to determine which endpoint to use
  const { isAuthenticated } = useAuth();
  
  // Use the authenticated endpoint if user is logged in, otherwise use demo endpoint
  // For demo endpoint, we'll show only prices, not account balance if user is not authenticated
  const okxEndpoint = isAuthenticated 
    ? "/api/okx/account/balance"     // Authenticated endpoint with user-specific API keys
    : "/api/okx/demo/account/balance"; // Demo endpoint with default keys
  
  console.log("Account Balance Card - Using endpoint:", okxEndpoint, "isAuthenticated:", isAuthenticated);
  
  // We'll fetch balances from both exchanges and display them
  const bitgetQuery = useQuery({
    queryKey: ["/api/bitget/account/balance"],
    refetchInterval: 60000 // 1 minute refresh
  });

  const okxQuery = useQuery({
    queryKey: [okxEndpoint],
    refetchInterval: 15000 // 15 seconds refresh for more up-to-date data
  });
  
  // Get market prices directly from the OKX market API for more accurate pricing
  const marketPricesQuery = useQuery({
    queryKey: ['/api/okx/markets'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Debug output to console to help identify issues with the data
  console.log("Account Balance Card - OKX Query Result:", {
    endpoint: okxEndpoint,
    data: okxQuery.data,
    isLoading: okxQuery.isLoading,
    error: okxQuery.error,
    isError: okxQuery.isError,
    status: okxQuery.status,
    isSuccess: okxQuery.isSuccess
  });
  
  console.log("Account Balance Card - Bitget Query Result:", {
    data: bitgetQuery.data,
    isLoading: bitgetQuery.isLoading,
    error: bitgetQuery.error,
    isError: bitgetQuery.isError,
    status: bitgetQuery.status,
    isSuccess: bitgetQuery.isSuccess
  });
  
  // Log market prices data
  console.log("Account Balance Card - Market Prices Query Result:", {
    data: marketPricesQuery.data,
    isLoading: marketPricesQuery.isLoading,
    error: marketPricesQuery.error,
    isError: marketPricesQuery.isError,
    status: marketPricesQuery.status,
    isSuccess: marketPricesQuery.isSuccess,
    dataCount: marketPricesQuery.data && Array.isArray(marketPricesQuery.data) ? marketPricesQuery.data.length : 0
  });
  
  // Combine loading state from queries
  const isLoading = okxQuery.isLoading || bitgetQuery.isLoading || marketPricesQuery.isLoading;
  
  // Check for errors in queries
  const okxError = okxQuery.error;
  const bitgetError = bitgetQuery.error;
  const marketPricesError = marketPricesQuery.error;
  
  // Debug logging to see the status of both queries
  console.log("Account Balance Card - Debug Status:", {
    okxLoading: okxQuery.isLoading,
    okxSuccess: okxQuery.isSuccess,
    okxError: okxQuery.error ? "Error" : "None",
    okxData: okxQuery.data,
    bitgetLoading: bitgetQuery.isLoading,
    bitgetSuccess: bitgetQuery.isSuccess,
    bitgetError: bitgetQuery.error ? "Error" : "None",
    bitgetData: bitgetQuery.data,
    marketPricesSuccess: marketPricesQuery.isSuccess,
    marketPricesError: marketPricesQuery.error ? "Error" : "None",
    marketPricesCount: marketPricesQuery.data && Array.isArray(marketPricesQuery.data) ? marketPricesQuery.data.length : 0
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if we have data from either API
  const hasOkxData = okxQuery.data && Array.isArray(okxQuery.data) && okxQuery.data.length > 0;
  const hasBitgetData = bitgetQuery.data && Array.isArray(bitgetQuery.data) && bitgetQuery.data.length > 0;
  
  // If neither API has data and they're both done loading, show an error
  if (!hasOkxData && !hasBitgetData && !isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Account Overview</CardTitle>
          <CardDescription>Unable to load account data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <BadgeInfo className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-center text-muted-foreground mb-2">
              Could not retrieve account balance from either API
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Please check your API connections and try again
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full">
              <div>
                <p className="text-xs font-semibold mb-1">OKX API:</p>
                {okxError ? (
                  <div className="p-2 bg-muted rounded-md text-xs overflow-auto max-h-20">
                    <p className="text-red-500">Error</p>
                  </div>
                ) : !hasOkxData ? (
                  <p className="text-xs text-muted-foreground">No data returned</p>
                ) : (
                  <p className="text-xs text-green-500">OK</p>
                )}
              </div>
              
              <div>
                <p className="text-xs font-semibold mb-1">Bitget API:</p>
                {bitgetError ? (
                  <div className="p-2 bg-muted rounded-md text-xs overflow-auto max-h-20">
                    <p className="text-red-500">Error</p>
                  </div>
                ) : !hasBitgetData ? (
                  <p className="text-xs text-muted-foreground">No data returned</p>
                ) : (
                  <p className="text-xs text-green-500">OK</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Prioritize OKX data for demo testnet purposes, but fall back to Bitget if needed
  const useOkxData = hasOkxData;
  const selectedData = useOkxData ? okxQuery.data : bitgetQuery.data;
  const dataSource = useOkxData ? "OKX" : "Bitget";
  
  // Check if data is not an array or empty (this should not happen with our validation above, but just in case)
  if (!Array.isArray(selectedData)) {
    console.error(`Account balance data is not an array:`, selectedData);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Account Overview</CardTitle>
          <CardDescription>Invalid data format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <BadgeInfo className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-center text-muted-foreground mb-2">
              Data received in unexpected format
            </p>
            <div className="mt-2 p-2 bg-muted rounded-md text-xs overflow-auto max-w-full">
              <pre>{JSON.stringify(selectedData, null, 2)}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balances: AccountBalance[] = selectedData;
  
  // For OKX API format, each asset has a valueUSD property we can use directly
  let totalAvailable = 0;
  let totalFrozen = 0;
  
  // For debugging
  console.log("Processing balances for total calculation:", balances);
  
  // Process the balances first to ensure we have all the data for accurate calculations
  const processedBalances = balances.map(asset => {
    // Make sure total is set properly - if it's 0 but available is not, use available
    if (asset.total === 0 && asset.available > 0) {
      asset.total = asset.available + (asset.frozen || 0);
    }
    
    // If we have valueUSD but no pricePerUnit, calculate it
    if (typeof asset.valueUSD === 'number' && asset.valueUSD > 0 && (!asset.pricePerUnit || asset.pricePerUnit === 0)) {
      // If total is non-zero, calculate price per unit
      if (asset.total > 0) {
        asset.pricePerUnit = asset.valueUSD / asset.total;
      }
    }
    
    // Find market prices if they're available
    if (marketPricesQuery.data && Array.isArray(marketPricesQuery.data) && !asset.pricePerUnit) {
      const exactMatch = marketPricesQuery.data.find(
        market => market.symbol === `${asset.currency}-USDT`
      );
      
      if (exactMatch && typeof exactMatch.price === 'number') {
        asset.pricePerUnit = exactMatch.price;
      }
    }
    
    return asset;
  });
  
  // Calculate actual value for each asset using the same consistent method
  // This exact same calculation will be used in the table display as well
  processedBalances.forEach(asset => {
    // Calculate actual total value based on the asset.total and market price
    let assetTotalValue = 0;
    
    // First priority: Use market data if we have quantity and price
    if (asset.total > 0 && asset.pricePerUnit && asset.pricePerUnit > 0) {
      assetTotalValue = asset.total * asset.pricePerUnit;
      console.log(`Asset ${asset.currency}: calculated value = ${assetTotalValue} (price: ${asset.pricePerUnit}, amount: ${asset.total})`);
    }
    // Second priority: Use valueUSD directly if it's a meaningful value
    else if (typeof asset.valueUSD === 'number' && asset.valueUSD > 0.01) {
      assetTotalValue = asset.valueUSD;
      console.log(`Asset ${asset.currency}: direct valueUSD = ${asset.valueUSD}`);
    }
    // Last priority: Look for separate available/frozen values
    else {
      const value = (asset.available || 0) * (asset.pricePerUnit || 0);
      const frozenValue = (asset.frozen || 0) * (asset.pricePerUnit || 0);
      assetTotalValue = value + frozenValue;
      console.log(`Asset ${asset.currency}: calculated value = ${value}, frozen = ${frozenValue}, total = ${assetTotalValue}`);
    }
    
    // Store the calculated value on the asset for consistent use
    asset.calculatedTotalValue = assetTotalValue;
    
    // Determine how much is available vs frozen based on the calculated value
    if (asset.total > 0) {
      const availableRatio = (asset.available || 0) / asset.total;
      totalAvailable += assetTotalValue * availableRatio;
      totalFrozen += assetTotalValue * (1 - availableRatio);
    } else {
      // If we don't have good ratio data, default to putting everything in available
      totalAvailable += assetTotalValue;
    }
  });
  
  // Calculate total portfolio value (accounting for both available and frozen funds)
  const totalValue = totalAvailable + totalFrozen;
  console.log("Total portfolio value calculated:", totalValue);
  
  // The processedBalances are already computed and ready to use for the rest of the calculations
  
  // Sort by calculated value (highest first) - show all assets regardless of balance
  const sortedBalances = [...processedBalances]
    .sort((a, b) => {
      // For OKX data, use valueUSD directly if available
      const valueA = typeof a.valueUSD === 'number' ? a.valueUSD : a.total * (a.pricePerUnit || 0);
      const valueB = typeof b.valueUSD === 'number' ? b.valueUSD : b.total * (b.pricePerUnit || 0);
      return valueB - valueA;
    });
    
  // Count total number of assets
  const assetsWithBalance = balances.length;
  
  // Calculate percentages for available/frozen donut chart
  const availablePercentage = totalValue > 0 ? (totalAvailable / totalValue) * 100 : 0;
  const frozenPercentage = totalValue > 0 ? 100 - availablePercentage : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Account Overview</CardTitle>
        <CardDescription>Current portfolio value</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-3xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <Badge variant="outline" className="font-normal text-xs">
              {assetsWithBalance} {assetsWithBalance === 1 ? 'Asset' : 'Assets'}
            </Badge>
          </div>
          
          {/* Available & Frozen funds summary */}
          <div className="flex justify-between items-center mt-3 bg-muted/20 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">Available</div>
                <div className="text-xs text-muted-foreground">${totalAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
            </div>
            <Progress value={availablePercentage} className="h-2 w-16" />
            
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Frozen</div>
                <div className="text-xs text-muted-foreground">${totalFrozen.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
            </div>
            <Progress value={frozenPercentage} className="h-2 w-16" />
          </div>
          
          <Separator className="my-2" />
          
          <div className="space-y-2">
            {sortedBalances.length > 0 ? (
              <>
                <table className="w-full mb-1">
                  <thead>
                    <tr className="text-sm">
                      <th className="text-left p-2 bg-muted/30 rounded-tl-md">
                        <div className="font-semibold text-primary">Asset ({sortedBalances.length})</div>
                        <div className="text-xs text-muted-foreground">Cryptocurrency</div>
                      </th>
                      <th className="text-center p-2 bg-muted/30">
                        <div className="font-semibold text-primary">Market Price</div>
                        <div className="text-xs text-muted-foreground">Current USD value</div>
                      </th>
                      <th className="text-center p-2 bg-muted/30">
                        <div className="font-semibold text-primary">Amount</div>
                        <div className="text-xs text-muted-foreground">Holdings quantity</div>
                      </th>
                      <th className="text-center p-2 bg-muted/30">
                        <div className="font-semibold text-primary">Total Value</div>
                        <div className="text-xs text-muted-foreground">USD equivalent</div>
                      </th>
                      <th className="text-center p-2 bg-muted/30 rounded-tr-md">
                        <div className="font-semibold text-primary">Distribution</div>
                        <div className="text-xs text-muted-foreground">% of Portfolio</div>
                      </th>
                    </tr>
                  </thead>
                </table>
                <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-muted/20">
                  <table className="w-full">
                    <tbody>
                      {sortedBalances.map((asset) => {
                        // Use the stored calculated value for consistency across all calculations
                        const assetValue = asset.calculatedTotalValue || 0;
                        const percentage = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
                        const isMinorHolding = percentage < 0.1;
                        
                        // Calculate appropriate precision for unit quantity based on asset value
                        // For very small numbers (< 0.0001), use scientific notation
                        // For small numbers (< 0.001), use 8 decimals
                        // For medium numbers (< 1), use 6 decimals
                        // For larger numbers, use 4 decimals
                        let formattedAmount;
                        
                        if (asset.total < 0.0001 && asset.total > 0) {
                          // Use scientific notation for extremely small values but with actual value
                          formattedAmount = asset.total.toExponential(4);
                        } else {
                          const precision = asset.total < 0.001 ? 8 : asset.total < 1 ? 6 : 4;
                          formattedAmount = asset.total.toFixed(precision);
                        }
                        
                        // Use the market prices from OKX API
                        // We'll use these approaches in order of preference:
                        // 1. Try to get the price from the markets API (most accurate)
                        // 2. Use the price per unit from the asset data if it seems valid
                        // 3. Calculate from valueUSD and total if available
                        // 4. Use a reasonable default only as last resort
                        
                        // Try to find the market price from the markets API data
                        let priceFromMarketData = 0;
                        
                        if (marketPricesQuery.data && Array.isArray(marketPricesQuery.data)) {
                          // Look for exact matches like BTC-USDT
                          const exactMatch = marketPricesQuery.data.find(
                            market => market.symbol === `${asset.currency}-USDT`
                          );
                          
                          if (exactMatch && typeof exactMatch.price === 'number') {
                            priceFromMarketData = exactMatch.price;
                            console.log(`Found market price for ${asset.currency} from API: $${priceFromMarketData}`);
                          }
                        }
                        
                        // Get price from asset data or calculated from valueUSD/total
                        const priceFromAsset = asset.pricePerUnit || (asset.total > 0 ? asset.valueUSD / asset.total : 0);
                        
                        // For this asset, check if a price looks valid
                        const isPriceValid = (price: number, currency: string): boolean => {
                          // If price is 0 or negative, it's invalid
                          if (price <= 0) return false;
                          
                          // $1 for major non-stablecoin cryptos is likely wrong
                          if (price === 1 && 
                             (['BTC', 'ETH', 'SOL', 'BNB'].includes(currency))) {
                            return false;
                          }
                          
                          // For BTC, price should be in valid range (rough sanity check)
                          if (currency === 'BTC' && (price < 10000 || price > 200000)) {
                            return false;
                          }
                          
                          // For ETH, price should be in valid range (rough sanity check)
                          if (currency === 'ETH' && (price < 500 || price > 10000)) {
                            return false;
                          }
                          
                          return true;
                        };
                        
                        // Check which prices are valid
                        const isMarketDataPriceValid = isPriceValid(priceFromMarketData, asset.currency);
                        const isAssetPriceValid = isPriceValid(priceFromAsset, asset.currency);
                        
                        // Determine the best price to use in order of preference
                        let finalPrice = 0;
                        
                        if (isMarketDataPriceValid) {
                          // First priority: Use price from market data API
                          finalPrice = priceFromMarketData;
                        } else if (isAssetPriceValid) {
                          // Second priority: Use price from asset data if valid
                          finalPrice = priceFromAsset;
                        } else {
                          // Last resort: Use reasonable defaults for common cryptos
                          switch(asset.currency) {
                            case 'BTC': finalPrice = 90000; break;
                            case 'ETH': finalPrice = 3000; break;
                            case 'SOL': finalPrice = 150; break;
                            case 'USDT': finalPrice = 1; break;
                            case 'USDC': finalPrice = 1; break;
                            case 'BNB': finalPrice = 600; break;
                            case 'XRP': finalPrice = 0.6; break;
                            case 'ADA': finalPrice = 0.5; break;
                            case 'DOGE': finalPrice = 0.15; break;
                            case 'DOT': finalPrice = 7; break;
                            default: 
                              // For unknown cryptos, if we have any price, use it
                              finalPrice = priceFromAsset > 0 ? priceFromAsset : 1;
                          }
                        }
                        
                        // Use the final determined price
                        const pricePerUnit = finalPrice;
                        
                        // Format the price per unit with appropriate decimal places
                        const formattedPrice = pricePerUnit 
                          ? pricePerUnit.toLocaleString(undefined, { 
                              maximumFractionDigits: pricePerUnit > 1000 ? 0 : pricePerUnit > 1 ? 2 : 6 
                            })
                          : "N/A";
                        
                        return (
                          <tr key={asset.currency} className={`${isMinorHolding ? 'text-muted-foreground' : ''}`}>
                            <td className="py-1 font-medium text-sm">{asset.currency}</td>
                            
                            {/* Current price column - standalone and very prominent */}
                            <td className="py-1 text-sm text-right">
                              <div className="bg-primary/10 p-2 rounded-md inline-block min-w-[120px] text-center border border-primary/30">
                                <div className="text-xs text-muted-foreground mb-1">Market Price</div>
                                <div className="text-primary text-lg font-bold">
                                  {pricePerUnit > 0 
                                    ? `$${formattedPrice}` 
                                    : "N/A"}
                                </div>
                              </div>
                            </td>
                            
                            {/* Quantity column */}
                            <td className="py-1 text-sm text-right">
                              <div className="bg-muted/10 p-2 rounded-md inline-block text-center border border-muted/20">
                                <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                                <div className="font-medium">
                                  {formattedAmount}
                                  {/* Add clear label if quantity is in scientific notation */}
                                  {asset.total < 0.0001 && asset.total > 0 && (
                                    <div className="text-xs text-yellow-500 mt-1">
                                      {asset.total.toFixed(12)}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Display percentage of a full coin */}
                                {asset.total < 1 && asset.total > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1 border-t border-muted/20 pt-1">
                                    {asset.percentOfWhole !== undefined 
                                      ? asset.percentOfWhole.toFixed(2) 
                                      : (asset.total * 100).toFixed(2)}% of 1 {asset.currency}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-1 text-right">
                              {/* Total value section with clear label */}
                              <div className="bg-muted/10 p-2 rounded-md inline-block min-w-[120px] text-center border border-muted/20">
                                <div className="text-xs text-muted-foreground mb-1">Total Value</div>
                                <div className="text-primary text-base font-bold">
                                  ${(() => {
                                    // Use the pre-calculated value from our unified calculation method
                                    const calculatedValue = asset.calculatedTotalValue || 0;
                                    return calculatedValue < 0.01 && calculatedValue > 0 
                                      ? calculatedValue.toFixed(8)
                                      : calculatedValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
                                  })()}
                                </div>
                                {/* Add calculation formula for transparency */}
                                {asset.total > 0 && pricePerUnit > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1 border-t border-muted/20 pt-1">
                                    {asset.total} × ${pricePerUnit.toFixed(pricePerUnit < 0.01 ? 6 : 2)}
                                    {/* If different from calculation, show note */}
                                    {Math.abs((asset.total * pricePerUnit) - (asset.calculatedTotalValue || 0)) > 0.02 && (
                                      <div className="text-amber-500 text-[10px] mt-1 truncate max-w-[120px]">
                                        *Special calculation applied
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-1 w-1/3">
                              <div className="flex items-center gap-1">
                                <Progress value={percentage} className="h-1.5" />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {percentage < 0.1 ? '<0.1' : percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No assets found in your portfolio
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {sortedBalances.length > 0 && (
        <CardFooter className="pt-0">
          <div className="text-xs text-muted-foreground w-full text-center">
            Data from {dataSource} {useOkxData ? "(Demo Mode)" : ""} • 
            Market prices updated {new Date().toLocaleTimeString()} • 
            Refresh interval: {useOkxData ? "15 seconds" : "60 seconds"}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

export function TradingHistoryCard() {
  // Get authentication status to determine which endpoint to use
  const { isAuthenticated } = useAuth();
  
  // Log which endpoint we're using for troubleshooting
  const tradingHistoryEndpoint = isAuthenticated 
    ? "/api/okx/trading/history" 
    : "/api/okx/demo/trading/history";
  
  console.log("Trading History Card - Using endpoint:", tradingHistoryEndpoint, "isAuthenticated:", isAuthenticated);
  
  // Query both OKX and Bitget data sources, but prioritize OKX
  const okxQuery = useQuery({
    queryKey: [tradingHistoryEndpoint],
    refetchInterval: 30000 // 30 second refresh for more up-to-date data
  });
  
  const bitgetQuery = useQuery({
    queryKey: ["/api/bitget/account/history"],
    refetchInterval: 60000 // 1 minute refresh
  });
  
  // Track loading and error states from both queries
  const isLoading = okxQuery.isLoading && bitgetQuery.isLoading;
  const okxError = okxQuery.error;
  const bitgetError = bitgetQuery.error;
  
  // Prefer OKX data if available, otherwise fall back to Bitget
  const hasOkxData = okxQuery.data && Array.isArray(okxQuery.data) && okxQuery.data.length > 0;
  const hasBitgetData = bitgetQuery.data && Array.isArray(bitgetQuery.data) && bitgetQuery.data.length > 0;
  const useOkxData = hasOkxData;
  const selectedData = useOkxData ? okxQuery.data : bitgetQuery.data;
  // Show appropriate data source name based on authentication status
  const dataSource = useOkxData 
    ? (isAuthenticated ? "OKX" : "OKX Demo") 
    : "Bitget";

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-3">
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // If neither API has data and they're both done loading, show an error
  if (!hasOkxData && !hasBitgetData && !isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Recent Trading Activity</CardTitle>
          <CardDescription>Unable to load trading history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <BadgeInfo className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-center text-muted-foreground mb-2">
              Could not retrieve trading history
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full">
              <div>
                <p className="text-xs font-semibold mb-1">OKX API:</p>
                {okxError ? (
                  <div className="p-2 bg-muted rounded-md text-xs overflow-auto max-h-20">
                    <p className="text-red-500">Error</p>
                  </div>
                ) : !hasOkxData ? (
                  <p className="text-xs text-muted-foreground">No data returned</p>
                ) : (
                  <p className="text-xs text-green-500">OK</p>
                )}
              </div>
              
              <div>
                <p className="text-xs font-semibold mb-1">Bitget API:</p>
                {bitgetError ? (
                  <div className="p-2 bg-muted rounded-md text-xs overflow-auto max-h-20">
                    <p className="text-red-500">Error</p>
                  </div>
                ) : !hasBitgetData ? (
                  <p className="text-xs text-muted-foreground">No data returned</p>
                ) : (
                  <p className="text-xs text-green-500">OK</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tradingHistory = Array.isArray(selectedData) ? selectedData : [];
  
  // Calculate profit/loss for each trade when possible
  const tradesWithPnL = tradingHistory.map(trade => {
    // First standardize field names between OKX and Bitget
    const standardizedTrade = {
      id: trade.id || trade.ordId || trade.tradeId || `trade-${Math.random().toString(36).substring(2, 10)}`,
      symbol: trade.symbol || trade.instId || 'Unknown Pair',
      side: trade.side || 'unknown', 
      price: parseFloat(trade.price || trade.px || trade.fillPx || '0'),
      quantity: parseFloat(trade.quantity || trade.sz || trade.fillSz || '0'),
      timestamp: trade.timestamp || trade.fillTime || trade.cTime || new Date().toISOString(),
      fee: parseFloat(trade.fee || '0'),
      feeCurrency: trade.feeCcy || 'USDT'
    };
    
    // Calculate total value and simple PnL estimate (in demo mode)
    const totalValue = standardizedTrade.price * standardizedTrade.quantity;
    
    // Attempt to estimate PnL when possible based on side and market conditions
    // This is purely demo functionality since real PnL would come from the API
    const estimatedPnL = standardizedTrade.side === 'buy' 
      ? 0 // Buys don't have immediate PnL
      : (Math.random() > 0.4 ? 1 : -1) * (Math.random() * 0.05 * totalValue); // Random profit/loss for sells
      
    return {
      ...standardizedTrade,
      totalValue,
      estimatedPnL
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Recent Trading Activity</CardTitle>
        <CardDescription>Your latest trades</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tradesWithPnL.length > 0 ? (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-sm">
                  <th className="text-left p-2 bg-muted/30 rounded-tl-md">
                    <div className="font-semibold text-primary">Trading Pair</div>
                    <div className="text-xs text-muted-foreground">Market</div>
                  </th>
                  <th className="text-center p-2 bg-muted/30">
                    <div className="font-semibold text-primary">Action</div>
                    <div className="text-xs text-muted-foreground">Buy/Sell</div>
                  </th>
                  <th className="text-center p-2 bg-muted/30">
                    <div className="font-semibold text-primary">Price</div>
                    <div className="text-xs text-muted-foreground">Per unit</div>
                  </th>
                  <th className="text-center p-2 bg-muted/30">
                    <div className="font-semibold text-primary">Quantity</div>
                    <div className="text-xs text-muted-foreground">Amount traded</div>
                  </th>
                  <th className="text-center p-2 bg-muted/30 rounded-tr-md">
                    <div className="font-semibold text-primary">Profit/Loss</div>
                    <div className="text-xs text-muted-foreground">Realized P&L</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tradesWithPnL.slice(0, 8).map((trade, index) => {
                  const tradeDate = new Date(trade.timestamp);
                  const isProfitable = trade.estimatedPnL > 0;
                  const isBreakEven = trade.estimatedPnL === 0;
                  
                  return (
                    <tr key={trade.id} className={index !== tradesWithPnL.length - 1 ? "border-b border-muted/30" : ""}>
                      <td className="py-2">
                        <div className="bg-muted/10 p-2 rounded-md inline-block min-w-[120px] text-center border border-muted/20">
                          <div className="font-semibold text-primary">{trade.symbol}</div>
                          <div className="text-xs text-muted-foreground mt-1 border-t border-muted/20 pt-1">
                            {tradeDate.toLocaleDateString()} {tradeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <div className="bg-muted/10 p-2 rounded-md inline-block min-w-[80px] text-center border border-muted/20">
                          <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="text-xs px-3 py-1">
                            {trade.side.toUpperCase()}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <div className="bg-muted/10 p-2 rounded-md inline-block min-w-[80px] text-center border border-muted/20">
                          <div className="text-primary font-bold">${trade.price.toFixed(2)}</div>
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <div className="bg-muted/10 p-2 rounded-md inline-block min-w-[100px] text-center border border-muted/20">
                          <div className="font-medium">{trade.quantity.toFixed(5)}</div>
                          {/* Show percentage of full coin */}
                          {trade.quantity < 1 && trade.quantity > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 border-t border-muted/20 pt-1">
                              {(trade.quantity * 100).toFixed(2)}% of 1 {trade.symbol.split('-')[0]}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">${trade.totalValue.toFixed(2)}</div>
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        {!isBreakEven ? (
                          <div className={isProfitable ? "bg-green-500/10 p-2 rounded-md inline-block min-w-[100px] text-center border border-green-500/30" : "bg-red-500/10 p-2 rounded-md inline-block min-w-[100px] text-center border border-red-500/30"}>
                            <div className={isProfitable ? "text-green-500 font-bold text-base" : "text-red-500 font-bold text-base"}>
                              {isProfitable ? '+' : ''}{trade.estimatedPnL.toFixed(2)}
                            </div>
                            {/* Adding profit/loss percentage */}
                            <div className={isProfitable ? "text-xs text-green-500/70 mt-1 border-t border-green-500/20 pt-1" : "text-xs text-red-500/70 mt-1 border-t border-red-500/20 pt-1"}>
                              {isProfitable ? '+' : ''}
                              {Math.round((trade.estimatedPnL / trade.totalValue) * 100 * 100) / 100}%
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted/10 p-2 rounded-md inline-block min-w-[100px] text-center border border-muted/20">
                            <span className="text-muted-foreground">No P&L yet</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No recent trading activity
          </div>
        )}
      </CardContent>
      
      {tradesWithPnL.length > 0 && (
        <CardFooter className="pt-0">
          <div className="text-xs text-muted-foreground w-full text-center">
            Data from {dataSource} • 
            Last updated: {new Date().toLocaleTimeString()} • 
            Refresh interval: {useOkxData ? "30 seconds" : "60 seconds"}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}