import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

// Chart time interval options
const INTERVALS = [
  { value: "1M", label: "1m" },
  { value: "15M", label: "15m" },
  { value: "1H", label: "1h" },
  { value: "4H", label: "4h" },
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" }
];

// Type for candle data
interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Format timestamp for display
function formatTimestamp(timestamp: string, interval: string): string {
  const date = new Date(parseInt(timestamp));
  
  if (interval.includes('d') || interval.includes('w')) {
    return date.toLocaleDateString();
  }
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Function to format numbers with commas for thousands
function formatNumber(num: number): string {
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Chart tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-bold mb-1">{label}</p>
        <p>Price: <span className="font-medium">${formatNumber(payload[0].value)}</span></p>
      </div>
    );
  }

  return null;
};

export function PriceChart({ symbol = "BTC-USDT" }: { symbol?: string }) {
  const [interval, setInterval] = useState("1H");
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/okx/candles/${symbol}`, interval],
    refetchInterval: interval === "1m" ? 30000 : 60000 // More frequent updates for 1m chart
  });
  
  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
              <CardDescription><Skeleton className="h-4 w-24 mt-1" /></CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{symbol} Price Chart</CardTitle>
              <CardDescription>Unable to load chart data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <p>Failed to load price data</p>
            <button 
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 border rounded-md hover:bg-muted flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Format the data for the chart
  const chartData = (data as CandleData[]).map(candle => ({
    time: formatTimestamp(candle.timestamp, interval),
    price: candle.close,
    timestamp: parseInt(candle.timestamp)
  }))
  .sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate price change
  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;
  const isPositive = priceChangePercent >= 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{symbol} Price Chart</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>${formatNumber(lastPrice)}</span>
              <span className={isPositive ? "text-green-500" : "text-red-500"}>
                {isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              className="p-2 hover:bg-muted rounded-full"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Tabs defaultValue={interval} onValueChange={setInterval} className="w-full">
          <TabsList className="grid grid-cols-6">
            {INTERVALS.map(int => (
              <TabsTrigger key={int.value} value={int.value}>
                {int.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="time" 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#2563eb" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}