import React from "react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "./card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Skeleton } from "./skeleton";
import { RefreshCw, AlertTriangle, Key } from "lucide-react";
import { Link } from "wouter";
import { Button } from "./button";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { useAuth } from "../../hooks/use-auth";
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
  try {
    // Check if timestamp is already a Date object or ISO string
    const date = typeof timestamp === 'string' && timestamp.includes('T') 
      ? new Date(timestamp)  // It's an ISO string
      : new Date(parseInt(timestamp)); // It's a numeric timestamp
    
    if (isNaN(date.getTime())) {
      console.error("Invalid timestamp:", timestamp);
      return "Invalid date";
    }
    
    if (interval.includes('D') || interval.includes('W') || 
        interval.includes('d') || interval.includes('w')) {
      return date.toLocaleDateString();
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error("Error formatting timestamp:", error, timestamp);
    return "Invalid date";
  }
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

export function PriceChart({ symbol = "BTCUSDT" }: { symbol?: string }) {
  const { isAuthenticated, user } = useAuth();
  const [interval, setInterval] = useState("1H");
  const [apiKeysSetup, setApiKeysSetup] = useState(true); // Default to true to avoid flicker
  
  // Check for API keys via API
  const { data: apiKeysData } = useQuery({
    queryKey: ['/api/users/api-keys/status'],
    queryFn: async () => {
      if (!isAuthenticated) return { hasValidApiKeys: false };
      try {
        const res = await fetch('/api/users/api-keys/status');
        if (!res.ok) throw new Error('Failed to fetch API key status');
        return await res.json();
      } catch (err) {
        console.error('Error checking API key status:', err);
        return { hasValidApiKeys: false };
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });
  
  // Effect to check if the user has API keys set up
  useEffect(() => {
    if (isAuthenticated && apiKeysData) {
      setApiKeysSetup(apiKeysData.hasValidApiKeys || false);
    }
  }, [isAuthenticated, apiKeysData]);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/bitget/candles/${symbol}`, interval],
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
              <CardDescription>Unable to load price data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex flex-col items-center justify-center">
            <p className="text-muted-foreground mb-4">Could not retrieve chart data from Bitget API</p>
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 border rounded-md hover:bg-muted flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Format the data for the chart
  const chartData = (data as CandleData[]).map(candle => {
    // Handle timestamp: it can be either ISO string or numeric timestamp
    let timestampValue: number;
    try {
      // First try: check if it's an ISO string
      if (typeof candle.timestamp === 'string' && candle.timestamp.includes('T')) {
        timestampValue = new Date(candle.timestamp).getTime();
      } else {
        // Otherwise it might be a numeric string
        timestampValue = typeof candle.timestamp === 'string' ? 
          parseInt(candle.timestamp) : candle.timestamp;
      }
      
      // If we got an invalid timestamp, log and use current time
      if (isNaN(timestampValue)) {
        console.error("Invalid timestamp encountered:", candle.timestamp);
        timestampValue = Date.now();
      }
    } catch (error) {
      console.error("Error processing timestamp:", error, candle);
      timestampValue = Date.now();
    }
    
    return {
      time: formatTimestamp(candle.timestamp, interval),
      price: candle.close,
      timestamp: timestampValue
    };
  })
  .sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate price change
  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;
  const isPositive = priceChangePercent >= 0;
  
  return (
    <div className="space-y-4">
      {/* API Keys Banner */}
      {isAuthenticated && !apiKeysSetup && (
        <Alert className="flex justify-between items-start bg-blue-50 border-blue-300 text-blue-900">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
            <div>
              <AlertTitle className="font-bold text-blue-800 mb-1">הגדרת מפתחות API נדרשת</AlertTitle>
              <AlertDescription className="text-blue-700">
                <p className="mb-1">לצפייה בנתוני המסחר האישיים שלך והפעלת בוטים אוטומטיים, נדרשת הגדרת מפתחות API.</p>
                <p className="text-sm">ללא מפתחות API תקפים, תוכל לראות רק מידע ציבורי.</p>
              </AlertDescription>
            </div>
          </div>
          <Link href="/api-keys">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Key className="h-4 w-4 mr-1" />
              הגדר מפתחות API
            </Button>
          </Link>
        </Alert>
      )}
      
      {/* Price Chart Card */}
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
                  tickFormatter={(value: number) => `$${value.toLocaleString()}`}
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
    </div>
  );
}