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
}

export function AccountBalanceCard() {
  // We'll fetch balances from both exchanges and display them
  const bitgetQuery = useQuery({
    queryKey: ["/api/bitget/account/balance"],
    refetchInterval: 60000 // 1 minute refresh
  });

  const okxQuery = useQuery({
    queryKey: ["/api/okx/account/balance"],
    refetchInterval: 60000 // 1 minute refresh
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
  // נתקן כאן - נוודא שהחישוב כולל גם את הכספים הקפואים
  const totalValue = totalAvailable + totalFrozen;
  
  // Sort by value (highest first)
  const sortedBalances = [...balances]
    .filter(asset => asset.total > 0)
    .sort((a, b) => b.valueUSD - a.valueUSD)
    .slice(0, 5); // Top 5 assets
    
  // Count assets with non-zero balance
  const assetsWithBalance = balances.filter(asset => asset.total > 0).length;
  
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
          
          <div className="space-y-3">
            {sortedBalances.length > 0 ? (
              <>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Top Assets</span>
                  <span>Value (USD)</span>
                </div>
                {sortedBalances.map((asset) => {
                  const percentage = (asset.valueUSD / totalValue) * 100;
                  return (
                    <div key={asset.currency} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{asset.currency}</span>
                        <span>${asset.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="h-2" />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/bitget/account/history"],
    refetchInterval: 60000 // 1 minute refresh
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

  if (error || !data) {
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
              Could not retrieve trading history from Bitget API
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Please check your API connection and try again
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tradingHistory = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Recent Trading Activity</CardTitle>
        <CardDescription>Your latest trades</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tradingHistory.length > 0 ? (
          <>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pair</span>
              <span>Action</span>
            </div>
            <div className="space-y-3">
              {tradingHistory.slice(0, 5).map((trade: any, index) => (
                <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex justify-between">
                    <div className="font-medium">{trade.symbol || trade.instId}</div>
                    <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                      {trade.side === 'buy' ? 'BUY' : 'SELL'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <div>Price: ${parseFloat(trade.price || trade.px).toFixed(2)}</div>
                    <div>Size: {parseFloat(trade.quantity || trade.sz).toFixed(4)}</div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <div>Total: ${((parseFloat(trade.price || trade.px) * parseFloat(trade.quantity || trade.sz))).toFixed(2)}</div>
                    <div>
                      {new Date(trade.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No recent trading activity
          </div>
        )}
      </CardContent>
      
      {tradingHistory.length > 0 && (
        <CardFooter className="pt-0">
          <div className="text-xs text-muted-foreground w-full text-center">
            Data from Bitget account • Updated {new Date().toLocaleTimeString()}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}