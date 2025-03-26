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
    queryKey: ["/api/okx/account/balance"],
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
    // Sample data for demonstration while API connection is fixed
    const sampleBalances: AccountBalance[] = [
      { currency: "BTC", available: 0.42, frozen: 0.0, total: 0.42, valueUSD: 25200.0 },
      { currency: "ETH", available: 5.75, frozen: 0.0, total: 5.75, valueUSD: 11960.25 },
      { currency: "USDT", available: 14500.0, frozen: 0.0, total: 14500.0, valueUSD: 14500.0 },
      { currency: "SOL", available: 25.0, frozen: 0.0, total: 25.0, valueUSD: 3600.0 },
    ];
    
    // Calculate total portfolio value
    const totalValue = sampleBalances.reduce((sum, asset) => sum + asset.valueUSD, 0);
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Account Overview</CardTitle>
          <CardDescription>Demo Portfolio (API connection pending)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="text-3xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="space-y-3">
              {sampleBalances.map((asset) => {
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
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Demo data shown while waiting for API connection
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
    queryKey: ["/api/okx/account/history"],
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
    // Sample trade data for demonstration
    const sampleTrades = [
      { instId: "BTC-USDT", side: "buy", px: "64850.20", sz: "0.05", timestamp: "2 hours ago" },
      { instId: "ETH-USDT", side: "sell", px: "3350.75", sz: "1.2", timestamp: "5 hours ago" },
      { instId: "SOL-USDT", side: "buy", px: "143.50", sz: "10", timestamp: "Yesterday" },
      { instId: "BNB-USDT", side: "buy", px: "605.30", sz: "2.5", timestamp: "Yesterday" },
      { instId: "XRP-USDT", side: "sell", px: "0.5120", sz: "1500", timestamp: "2 days ago" },
    ];
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Recent Trading Activity</CardTitle>
          <CardDescription>Demo data (API connection pending)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sampleTrades.map((trade, index) => (
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
                <div>{trade.timestamp}</div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Demo data shown while waiting for API connection
          </p>
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