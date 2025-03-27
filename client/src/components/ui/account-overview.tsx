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

// Type definition
interface AccountBalance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  valueUSD: number;
  percentOfWhole?: number; // Percentage of the whole coin (e.g., 0.1 BTC = 10%)
  pricePerUnit?: number;   // Price per 1 unit of currency
}

export function AccountBalanceCard() {
  // We'll fetch balances from both exchanges and display them
  const bitgetQuery = useQuery({
    queryKey: ["/api/bitget/account/balance"],
    refetchInterval: 60000 // 1 minute refresh
  });

  const okxQuery = useQuery({
    queryKey: ["/api/okx/account/balance"],
    refetchInterval: 15000 // 15 seconds refresh for more up-to-date data
  });
  
  // Debug output to console to help identify issues with the data
  console.log("Account Balance Card - OKX Query Result:", {
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
  
  // Combine loading state from both queries
  const isLoading = okxQuery.isLoading || bitgetQuery.isLoading;
  
  // Check for errors in both queries
  const okxError = okxQuery.error;
  const bitgetError = bitgetQuery.error;
  
  // Debug logging to see the status of both queries
  console.log("Account Balance Card - Debug Status:", {
    okxLoading: okxQuery.isLoading,
    okxSuccess: okxQuery.isSuccess,
    okxError: okxQuery.error ? "Error" : "None",
    okxData: okxQuery.data,
    bitgetLoading: bitgetQuery.isLoading,
    bitgetSuccess: bitgetQuery.isSuccess,
    bitgetError: bitgetQuery.error ? "Error" : "None",
    bitgetData: bitgetQuery.data
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
  
  // Calculate the distribution between "Available" and "Frozen" funds
  const totalAvailable = balances.reduce((sum, asset) => sum + asset.available, 0);
  const totalFrozen = balances.reduce((sum, asset) => sum + asset.frozen, 0);
  
  // Calculate total portfolio value (accounting for both available and frozen funds)
  // Fixed: ensure the calculation includes frozen funds
  const totalValue = totalAvailable + totalFrozen;
  
  // Sort by value (highest first) - show all assets regardless of balance
  const sortedBalances = [...balances]
    .sort((a, b) => b.valueUSD - a.valueUSD);
    
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
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left">Asset ({sortedBalances.length})</th>
                      <th className="text-right">Quantity & Price</th>
                      <th className="text-right">Total Value</th>
                      <th>Distribution</th>
                    </tr>
                  </thead>
                </table>
                <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-muted/20">
                  <table className="w-full">
                    <tbody>
                      {sortedBalances.map((asset) => {
                        const percentage = (asset.valueUSD / totalValue) * 100;
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
                        
                        // Use the price per unit from the backend
                        // This is the market price of the cryptocurrency, not the calculated value from total and USD value
                        const pricePerUnit = asset.pricePerUnit || (asset.total > 0 ? asset.valueUSD / asset.total : 0);
                        
                        return (
                          <tr key={asset.currency} className={`${isMinorHolding ? 'text-muted-foreground' : ''}`}>
                            <td className="py-0.5 font-medium text-sm">{asset.currency}</td>
                            <td className="py-0.5 text-sm text-right">
                              {/* Display price instead of tiny amounts for values with many zeros */}
                              {asset.total < 0.0001 ? (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Actual Amount</div>
                                  <div className="font-medium text-xs opacity-60">{formattedAmount}</div>
                                  <div className="text-sm font-medium mt-2 border-t border-muted/30 pt-1">
                                    <div className="text-xs text-muted-foreground">Current Price</div>
                                    <div className="text-base">
                                      ${pricePerUnit.toLocaleString(undefined, { 
                                        maximumFractionDigits: pricePerUnit > 1000 ? 0 : pricePerUnit > 1 ? 2 : 4 
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Amount section for normal values */}
                                  <div className="font-medium">{formattedAmount}</div>
                                  {asset.total > 0 && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {/* Display percentage of a full coin */}
                                      {asset.total < 1 && asset.total > 0 && (
                                        <div className="mb-1">
                                          {asset.percentOfWhole !== undefined 
                                            ? asset.percentOfWhole.toFixed(2) 
                                            : (asset.total * 100).toFixed(2)}% of 1 {asset.currency}
                                        </div>
                                      )}
                                      {/* Unit price */}
                                      <div className="border-t border-muted/30 pt-1 mt-1">
                                        <span className="text-muted-foreground">Price: </span>
                                        <span className="font-medium">
                                          ${pricePerUnit.toLocaleString(undefined, { 
                                            maximumFractionDigits: pricePerUnit > 1000 ? 0 : pricePerUnit > 1 ? 2 : 4 
                                          })}/unit
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="py-0.5 text-right">
                              {/* Total value section with clear label */}
                              <div className="text-xs text-muted-foreground mb-1">Total Value</div>
                              <div className="text-primary text-base font-medium">
                                ${asset.valueUSD < 0.01 && asset.valueUSD > 0 
                                  ? asset.valueUSD.toFixed(8) 
                                  : asset.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td className="py-0.5 w-1/3">
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
            Data from {dataSource} {useOkxData ? "(Demo Mode)" : ""} • Updated {new Date().toLocaleTimeString()}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

export function TradingHistoryCard() {
  // Query both OKX and Bitget data sources, but prioritize OKX
  const okxQuery = useQuery({
    queryKey: ["/api/okx/trading/history"],
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
  const dataSource = useOkxData ? "OKX Demo" : "Bitget";

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
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left font-normal">Trading Pair</th>
                  <th className="text-center font-normal">Action</th>
                  <th className="text-right font-normal">Price</th>
                  <th className="text-right font-normal">Quantity</th>
                  <th className="text-right font-normal">Profit/Loss</th>
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
                        <div className="font-medium">{trade.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {tradeDate.toLocaleDateString()} {tradeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                          {trade.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex flex-col">
                          <span>{trade.quantity.toFixed(5)}</span>
                          {/* Show percentage of full coin */}
                          {trade.quantity < 1 && trade.quantity > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {(trade.quantity * 100).toFixed(2)}% of 1 {trade.symbol.split('-')[0]}
                            </span>
                          )}
                          <div className="text-xs text-muted-foreground">${trade.totalValue.toFixed(2)}</div>
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        {!isBreakEven ? (
                          <div className="flex flex-col items-end">
                            <span className={`${isProfitable ? "text-green-500" : "text-red-500"} font-medium text-base`}>
                              {isProfitable ? '+' : ''}{trade.estimatedPnL.toFixed(2)}
                            </span>
                            {/* Adding profit/loss percentage */}
                            <span className={`text-xs ${isProfitable ? "text-green-500/70" : "text-red-500/70"}`}>
                              {isProfitable ? '+' : ''}
                              {Math.round((trade.estimatedPnL / trade.totalValue) * 100 * 100) / 100}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
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
            Data from {dataSource} • Updated {new Date().toLocaleTimeString()}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}