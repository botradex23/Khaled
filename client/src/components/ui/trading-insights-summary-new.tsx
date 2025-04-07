import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Info, BarChart3 } from 'lucide-react';
import { Button } from "./button";
import { Skeleton } from "./skeleton";
import { Badge } from "./badge";
import { toast } from "../../hooks/use-toast";

// Import the trading hook and types
import { TradingSignal, useAiTrading } from "../../hooks/useAiTrading";

// Utility function to calculate trend strength
function calculateTrendStrength(signal: TradingSignal): number {
  const { confidence, rsi, ma_20, ma_50, current_price } = signal;
  
  // Weighted factors to determine trend strength
  const priceTrend = signal.signal === 'BUY' ? 
    (current_price - ma_50) / ma_50 * 100 : 
    (ma_50 - current_price) / ma_50 * 100;
  
  const rsiWeight = signal.signal === 'BUY' ? 
    Math.max(0, (60 - rsi) / 30) :  // Lower RSI is better for buying
    Math.max(0, (rsi - 40) / 30);   // Higher RSI is better for selling
  
  // Combined weighted score (0-1 scale)
  return Math.min(0.99, (confidence * 0.6) + (rsiWeight * 0.2) + Math.min(0.2, priceTrend / 10));
}

// Utility function to format timestamps
function formattedTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper for conditional rendering
type ConditionalWrapperProps = {
  condition: boolean;
  wrapper: (children: React.ReactElement) => React.ReactElement;
  children: React.ReactElement;
};

const ConditionalWrapper = ({ condition, wrapper, children }: ConditionalWrapperProps) => 
  condition ? wrapper(children) : children;

// Main component
export function TradingInsightsSummaryNew() {
  const [showCelebration, setShowCelebration] = useState(false);
  const { 
    signals, 
    isLoadingSignals,
    signalsError, 
    refetchSignals, 
    timestamp
  } = useAiTrading();
  
  // Monitor for strong buy signals and show celebration notification when detected
  useEffect(() => {
    if (signals && signals.length > 0) {
      // Check for strong buy signals
      const strongBuySignals = signals.filter(
        (s: TradingSignal) => s.signal === 'BUY' && s.confidence > 0.8
      );
      
      if (strongBuySignals.length > 0 && !showCelebration) {
        setShowCelebration(true);
        
        // Show celebration toast notification
        toast({
          title: "Strong Buy Signals Detected! 🎉",
          description: `${strongBuySignals.length} cryptocurrencies showing strong buying opportunity.`,
          variant: "default",
        });
        
        // Reset after 2 seconds to allow triggering again
        setTimeout(() => {
          setShowCelebration(false);
        }, 2000);
      }
    }
  }, [signals, showCelebration]);
  
  // Prepare chart data from signals
  const chartData = signals.map(signal => ({
    name: signal.symbol.replace('/USDT', ''),
    price: signal.current_price,
    prediction: signal.predicted_price,
    signal: signal.signal
  }));
  
  // Top signal with highest confidence
  const topSignal = signals.length > 0 
    ? [...signals].sort((a, b) => b.confidence - a.confidence)[0]
    : null;
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Trading Insights Summary
        </CardTitle>
        <CardDescription>
          AI-powered trading signals and recommendations
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoadingSignals ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : signalsError ? (
          <div className="flex items-center justify-center h-[200px] text-center p-4 border border-red-200 bg-red-50 rounded-md">
            <div>
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
              <h3 className="font-medium text-red-800 mb-1">Error Loading Trading Signals</h3>
              <p className="text-sm text-red-600">{signalsError instanceof Error ? signalsError.message : 'Unknown error'}</p>
            </div>
          </div>
        ) : signals.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-center p-4 border border-yellow-200 bg-yellow-50 rounded-md">
            <div>
              <Info className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-medium text-yellow-800 mb-1">No Trading Signals Available</h3>
              <p className="text-sm text-yellow-600">Check back later for updated trading insights</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Featured signal card */}
            {topSignal && (
              <div className={`p-4 rounded-lg border ${
                topSignal.signal === 'BUY' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      {topSignal.symbol}
                      {topSignal.signal === 'BUY' ? (
                        <TrendingUp className="ml-2 h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="ml-2 h-5 w-5 text-red-600" />
                      )}
                    </h3>
                    <p className={`text-sm font-medium ${
                      topSignal.signal === 'BUY' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Strong {topSignal.signal.toLowerCase()} signal with {Math.round(topSignal.confidence * 100)}% confidence
                    </p>
                  </div>
                  <Badge 
                    variant={topSignal.signal === 'BUY' ? 'default' : 'destructive'}
                    className="text-xs font-bold"
                  >
                    {topSignal.signal}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Price:</span>
                    <span className="font-medium">${topSignal.current_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Predicted:</span>
                    <span className={`font-medium ${
                      topSignal.predicted_price > topSignal.current_price ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${topSignal.predicted_price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MA (20):</span>
                    <span className="font-medium">${topSignal.ma_20.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RSI:</span>
                    <span className={`font-medium ${
                      topSignal.rsi > 70 ? 'text-red-600' : (topSignal.rsi < 30 ? 'text-green-600' : '')
                    }`}>
                      {topSignal.rsi.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                {/* Progress bar for trend strength */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className={`h-2 rounded-full ${
                      topSignal.signal === 'BUY' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${calculateTrendStrength(topSignal) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Trend strength</span>
                  <span>{Math.round(calculateTrendStrength(topSignal) * 100)}%</span>
                </div>
              </div>
            )}
            
            {/* Price chart */}
            <div className="h-[200px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#4338ca" 
                    fill="#4338ca" 
                    fillOpacity={0.2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary table */}
            <div className="mt-4 border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Symbol</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Signal</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Confidence</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {signals.map((signal, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        {signal.symbol}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                        ${signal.current_price.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-center">
                        <ConditionalWrapper
                          condition={signal.confidence > 0.8}
                          wrapper={(children) => (
                            <div className="relative inline-block">
                              {children}
                              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                            </div>
                          )}
                        >
                          <Badge 
                            variant={signal.signal === 'BUY' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {signal.signal}
                          </Badge>
                        </ConditionalWrapper>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium">
                        {Math.round(signal.confidence * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {timestamp ? (
            <>Last updated: {new Date(timestamp).toLocaleTimeString()}</>
          ) : (
            <>No data available</>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchSignals()}
          disabled={isLoadingSignals}
        >
          {isLoadingSignals ? 'Updating...' : 'Refresh Signals'} 
        </Button>
      </CardFooter>
    </Card>
  );
}