import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card.tsx";
import { Skeleton } from "./skeleton";
import { Badge } from "./badge";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

// Type definition
interface MarketTicker {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export function MarketTickerCard({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/binance/markets/${symbol}`],
    refetchInterval: 30000 // 30 seconds refresh
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            <Skeleton className="h-6 w-24" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-32" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol}</CardTitle>
          <CardDescription>Error loading market data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Could not fetch market data. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  const ticker = data as MarketTicker;
  const isPositive = ticker.change24h >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">{ticker.symbol}</CardTitle>
          <Badge variant={isPositive ? "default" : "destructive"} className={`flex items-center gap-1 ${isPositive ? 'bg-green-500' : ''}`}>
            {isPositive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
            {Math.abs(ticker.change24h).toFixed(2)}%
          </Badge>
        </div>
        <CardDescription>Current Market Data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold">${ticker.price.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">
              Vol: {(ticker.volume24h / 1000).toFixed(1)}K
            </span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>24h High: ${ticker.high24h.toFixed(2)}</span>
            <span>24h Low: ${ticker.low24h.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketTickerGrid() {
  // Binance uses combined format (BTCUSDT) instead of format with hyphen (BTC-USDT)
  const topCoins = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {topCoins.map((symbol) => (
        <MarketTickerCard key={symbol} symbol={symbol} />
      ))}
    </div>
  );
}

export function TopMarketTickers() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Live Market Data</h2>
      <MarketTickerGrid />
    </div>
  );
}