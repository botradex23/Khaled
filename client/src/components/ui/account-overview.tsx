import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BadgeInfo } from "lucide-react";

// Type definition
interface AccountBalance {
  currency: string;
  available: number;
  frozen: number;
  total: number;
  valueUSD: number;
}

export function AccountBalanceCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/bitget/account/balance"],
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

  if (error || !data || !Array.isArray(data)) {
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
              Could not retrieve account balance from Bitget API
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Please check your API connection and try again
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balances: AccountBalance[] = data;
  
  // Calculate total portfolio value
  const totalValue = balances.reduce((sum, asset) => sum + asset.valueUSD, 0);
  
  // Sort by value (highest first)
  const sortedBalances = [...balances]
    .filter(asset => asset.total > 0)
    .sort((a, b) => b.valueUSD - a.valueUSD)
    .slice(0, 5); // Top 5 assets

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Account Overview</CardTitle>
        <CardDescription>Current portfolio value</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <span className="text-3xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          
          <div className="space-y-3">
            {sortedBalances.length > 0 ? (
              sortedBalances.map((asset) => {
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
              })
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No assets found in your portfolio
              </div>
            )}
          </div>
        </div>
      </CardContent>
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
          tradingHistory.slice(0, 5).map((trade: any, index) => (
            <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
              <div className="flex justify-between">
                <div className="font-medium">{trade.instId}</div>
                <div className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                  {trade.side.toUpperCase()}
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <div>Price: ${parseFloat(trade.px).toFixed(2)}</div>
                <div>Size: {parseFloat(trade.sz).toFixed(4)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No recent trading activity
          </div>
        )}
      </CardContent>
    </Card>
  );
}