import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "./card.tsx";
import { Skeleton } from "./skeleton";
import { Progress } from "./progress";
import { BadgeInfo, Wallet, Lock } from "lucide-react";
import { Separator } from "./separator";
import { Badge } from "./badge";
import { useAuth } from "../../hooks/use-auth";
import { Market, MarketPricesResponse } from "../../types/market.ts";
import { AccountBalance } from "../../types/balance.ts";
import { 
  CryptoPriceData, 
  enrichBalancesWithPrices, 
  calculateTotalValue 
} from "../../hooks/useAssetPricing.ts";

export function AccountBalanceCard() {
  // Get authentication status to determine which endpoint to use
  const { isAuthenticated } = useAuth();
  
  // Use the authenticated endpoint if user is logged in, otherwise use demo endpoint
  // For demo endpoint, we'll show only prices, not account balance if user is not authenticated
  // Regardless, we'll show market prices for cryptocurrencies at minimum
  const binanceEndpoint = isAuthenticated 
    ? "/api/binance/account/balance"     // Authenticated endpoint with user-specific API keys
    : "/api/binance/demo/account/balance"; // Demo endpoint that doesn't require auth
  
  console.log("Account Balance Card - Using endpoint:", binanceEndpoint, "isAuthenticated:", isAuthenticated);
  
  // We'll fetch balances from Binance and display them
  // Removed Bitget completely as we're focusing on Binance only
  const binanceQuery = useQuery({
    queryKey: [binanceEndpoint],
    refetchInterval: 15000 // 15 seconds refresh for more up-to-date data
  });
  
  // Collect the list of all currencies from the balance to request their prices specifically
  // This way we'll always get the market price for every currency in the account
  const allAssetCurrencies = useMemo(() => {
    const currencies: string[] = [];
    
    // From Binance balance
    const binanceBalances = binanceQuery.data || [];
    if (Array.isArray(binanceBalances)) {
      binanceBalances.forEach(asset => {
        if (asset.currency && !currencies.includes(asset.currency)) {
          currencies.push(asset.currency);
        }
      });
    }
    
    // Add popular coins as backup
    const popularCoins = ['BTC', 'ETH', 'XRP', 'USDT', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK'];
    popularCoins.forEach(coin => {
      if (!currencies.includes(coin)) {
        currencies.push(coin);
      }
    });
    
    console.log("Requesting prices for all balance currencies:", currencies);
    return currencies;
  }, [binanceQuery.data]);
  
  // Get market prices directly from our new API for more accurate pricing
  // כעת אנחנו מבקשים רק את המטבעות שיש בחשבון או את הפופולריים
  const marketPricesQuery = useQuery<MarketPricesResponse>({
    queryKey: ['/api/market/prices', { symbols: allAssetCurrencies.join(',') }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Debug output to console to help identify issues with the data
  console.log("Account Balance Card - Binance Query Result:", {
    endpoint: binanceEndpoint,
    data: binanceQuery.data,
    isLoading: binanceQuery.isLoading,
    error: binanceQuery.error,
    isError: binanceQuery.isError,
    status: binanceQuery.status,
    isSuccess: binanceQuery.isSuccess
  });
  
  // Log market prices data
  console.log("Account Balance Card - Market Prices Query Result:", {
    data: marketPricesQuery.data,
    isLoading: marketPricesQuery.isLoading,
    error: marketPricesQuery.error,
    isError: marketPricesQuery.isError,
    status: marketPricesQuery.status,
    isSuccess: marketPricesQuery.isSuccess,
    dataCount: marketPricesQuery.data?.prices ? marketPricesQuery.data.prices.length : 0,
    prices: marketPricesQuery.data?.prices
  });
  
  // Combine loading state from queries
  const isLoading = binanceQuery.isLoading || marketPricesQuery.isLoading;
  
  // Check for errors in queries
  const binanceError = binanceQuery.error;
  const marketPricesError = marketPricesQuery.error;
  
  // Debug logging to see the status of both queries
  console.log("Account Balance Card - Debug Status:", {
    binanceLoading: binanceQuery.isLoading,
    binanceSuccess: binanceQuery.isSuccess,
    binanceError: binanceQuery.error ? "Error" : "None",
    binanceData: binanceQuery.data,
    marketPricesSuccess: marketPricesQuery.isSuccess,
    marketPricesError: marketPricesQuery.error ? "Error" : "None",
    marketPricesCount: marketPricesQuery.data?.prices ? marketPricesQuery.data.prices.length : 0,
    prices: marketPricesQuery.data?.prices
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

  // Check if we have data from the Binance API
  const hasBinanceData = binanceQuery.data && Array.isArray(binanceQuery.data) && binanceQuery.data.length > 0;
  
  // If the API has no data and they're not loading, show the error UI
  if (!hasBinanceData && !isLoading) {
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
              Could not retrieve account balance from Binance API
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Please check your API connections and try again
            </p>
            <div className="mt-4 w-full">
              <div>
                <p className="text-xs font-semibold mb-1">Binance API:</p>
                {binanceError ? (
                  <div className="p-2 bg-muted rounded-md text-xs overflow-auto max-h-20">
                    <p className="text-red-500">Error</p>
                  </div>
                ) : !hasBinanceData ? (
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
  
  // Use Binance data
  const selectedData = binanceQuery.data;
  const dataSource = "Binance";
  
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
  
  // For debugging
  console.log("Processing balances for total calculation:", balances);
  
  // Get market prices from the query
  const marketPrices = (marketPricesQuery.data?.prices && Array.isArray(marketPricesQuery.data.prices)) 
    ? marketPricesQuery.data.prices 
    : [];
    
  // Convert Market[] to CryptoPriceData[] format for compatibility
  const pricesForEnrichment: CryptoPriceData[] = marketPrices.map(p => ({
    symbol: p.symbol,
    price: p.price,
    found: p.found,
    source: p.source,
    timestamp: p.timestamp
  }));
    
  // Use our utility functions from useAssetPricing
  // Process balances to add market prices
  const processedBalances = enrichBalancesWithPrices(
    (Array.isArray(balances) ? balances : []), 
    pricesForEnrichment
  );
  
  // Calculate total values
  const { total: totalValue, available: totalAvailable, frozen: totalFrozen } = 
    calculateTotalValue(processedBalances);
  
  // Sort balances by value (highest first)
  const sortedBalances = [...processedBalances].sort((a, b) => {
    const valueA = a.total * (a.pricePerUnit || 0);
    const valueB = b.total * (b.pricePerUnit || 0);
    return valueB - valueA;
  });
  
  // Count total number of assets
  const assetsWithBalance = Array.isArray(balances) ? balances.length : 0;
  
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
                        // בטבלה, אנחנו משתמשים באותו מחיר שהשתמשנו בו לחישוב סך התיק הכולל
                        // באופן זה, הסכום של כל השורות בטבלה יהיה זהה לסכום הכולל למעלה
                        const pricePerUnit = asset.pricePerUnit || 0;
                        
                        // חישוב פשוט: כמות × מחיר - בדיוק כמו שחישבנו את הסכום הכולל
                        const assetValue = asset.total * pricePerUnit;
                        const percentage = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
                        const isMinorHolding = percentage < 0.1;
                        
                        // ======= פורמט הצגה =======
                        // פורמט מותאם עבור הכמות
                        let formattedAmount;
                        if (asset.total < 0.0001 && asset.total > 0) {
                          formattedAmount = asset.total.toExponential(4);
                        } else {
                          const precision = asset.total < 0.001 ? 8 : asset.total < 1 ? 6 : 4;
                          formattedAmount = asset.total.toFixed(precision);
                        }
                        
                        // פורמט מותאם עבור המחיר
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
                                    // התוצאה של asset.total * price
                                    const simpleCalculation = asset.total * (pricePerUnit || 0);
                                    return simpleCalculation < 0.01 && simpleCalculation > 0 
                                      ? simpleCalculation.toFixed(8)
                                      : simpleCalculation.toLocaleString(undefined, { maximumFractionDigits: 2 });
                                  })()}
                                </div>
                                {/* תמיד להציג את הנוסחה הבסיסית: כמות × מחיר */}
                                {asset.total > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1 border-t border-muted/20 pt-1">
                                    {asset.total.toFixed(6)} × ${pricePerUnit.toFixed(2)}
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
            Data from {dataSource} {!isAuthenticated ? "(Demo Mode)" : ""} • 
            Market prices updated {new Date().toLocaleTimeString()} • 
            Refresh interval: 15 seconds
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
    ? "/api/binance/trading/history" 
    : "/api/binance/demo/trading/history";
  
  console.log("Trading History Card - Using endpoint:", tradingHistoryEndpoint, "isAuthenticated:", isAuthenticated);
  
  // Query Binance data sources
  const binanceQuery = useQuery({
    queryKey: [tradingHistoryEndpoint],
    refetchInterval: 30000 // 30 second refresh for more up-to-date data
  });
  
  // Track loading and error states
  const isLoading = binanceQuery.isLoading;
  const binanceError = binanceQuery.error;
  
  // Use Binance data
  const hasBinanceData = binanceQuery.data && Array.isArray(binanceQuery.data) && binanceQuery.data.length > 0;
  const selectedData = binanceQuery.data;
  // Show appropriate data source name based on authentication status
  const dataSource = isAuthenticated ? "Binance" : "Binance Demo";

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

  // If the API has no data and is done loading, show an error
  if (!hasBinanceData && !isLoading) {
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
            <div className="mt-4 w-full">
              <div>
                <p className="text-xs font-semibold mb-1">Binance API:</p>
                {binanceError ? (
                  <div className="p-2 bg-muted rounded-md text-xs overflow-auto max-h-20">
                    <p className="text-red-500">Error</p>
                  </div>
                ) : !hasBinanceData ? (
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
  const tradesWithPnL = (Array.isArray(tradingHistory) ? tradingHistory : []).map(trade => {
    // Standardize field names for Binance API
    const standardizedTrade = {
      id: trade.id || trade.orderId || trade.tradeId || `trade-${Math.random().toString(36).substring(2, 10)}`,
      symbol: trade.symbol || 'Unknown Pair',
      side: trade.side || 'unknown', 
      price: parseFloat(trade.price || trade.executedQty || '0'),
      quantity: parseFloat(trade.qty || trade.executedQty || trade.quantity || '0'),
      value: parseFloat(trade.value || trade.cummulativeQuoteQty || '0'),
      fee: parseFloat(trade.fee || trade.commission || '0'),
      feeCcy: trade.feeCcy || trade.commissionAsset || '',
      timestamp: new Date(trade.timestamp || trade.time || trade.transactTime || Date.now()).getTime()
    };
    
    return standardizedTrade;
  });
  
  // Sort trades by timestamp (newest first)
  const sortedTrades = tradesWithPnL.sort((a, b) => b.timestamp - a.timestamp);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Recent Trading Activity</CardTitle>
        <CardDescription>Latest trades from {dataSource}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedTrades.length > 0 ? (
            sortedTrades.slice(0, 5).map((trade) => (
              <div 
                key={trade.id} 
                className={`p-3 rounded-md border ${
                  trade.side === 'buy' ? 'border-green-200 bg-green-50/30' : 
                  trade.side === 'sell' ? 'border-red-200 bg-red-50/30' : 
                  'border-muted bg-muted/10'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm font-semibold">
                    {trade.symbol} 
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-sm ${
                      trade.side === 'buy' ? 'bg-green-100 text-green-800' : 
                      trade.side === 'sell' ? 'bg-red-100 text-red-800' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {trade.side === 'buy' ? 'BUY' : trade.side === 'sell' ? 'SELL' : trade.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(trade.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Amount:</span> {trade.quantity}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Price:</span> ${trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  {trade.fee > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Fee:</span> {trade.fee} {trade.feeCcy}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No recent trading activity found
            </div>
          )}
          
          {sortedTrades.length > 5 && (
            <div className="text-center text-xs text-muted-foreground pt-2">
              Showing the 5 most recent trades of {sortedTrades.length} total
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}