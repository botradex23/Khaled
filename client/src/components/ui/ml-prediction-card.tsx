import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { TrendingUp, TrendingDown, Pause, BarChart3, RefreshCw, BrainCircuit, Clock, AlertTriangle } from 'lucide-react';
import { Button } from "./button";
import { formatDistanceToNow } from 'date-fns';
import { useMlPrediction, MLPrediction } from "../../hooks/useMlPredictions";
import { Progress } from "./progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface PredictionCardProps {
  symbol: string;
  interval?: string;
  refetchInterval?: number;
}

export function MLPredictionCard({ 
  symbol, 
  interval = '4h',
  refetchInterval = 60000 // 1 minute
}: PredictionCardProps) {
  const { prediction, isLoading, error, refetch } = useMlPrediction({
    symbol,
    interval,
    refetchInterval
  });

  // Format the confidence as a percentage
  const confidencePercentage = prediction?.confidence 
    ? Math.round(prediction.confidence * 100) 
    : 0;

  // Format the timestamp to relative time
  const lastUpdated = prediction?.timestamp
    ? formatDistanceToNow(new Date(prediction.timestamp), { addSuffix: true })
    : "Unknown";

  // Format the current price
  const formattedPrice = prediction?.current_price
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: prediction.current_price > 1000 ? 2 : 6
      }).format(prediction.current_price)
    : "-";

  // Get signal icon and color
  const getSignalDetails = (signal: MLPrediction['signal'] | undefined) => {
    switch (signal) {
      case 'BUY':
        return { 
          icon: <TrendingUp className="h-5 w-5" />, 
          color: 'bg-green-500/20 text-green-700 dark:text-green-500',
          textColor: 'text-green-700 dark:text-green-500'
        };
      case 'SELL':
        return { 
          icon: <TrendingDown className="h-5 w-5" />, 
          color: 'bg-red-500/20 text-red-700 dark:text-red-500',
          textColor: 'text-red-700 dark:text-red-500'
        };
      case 'HOLD':
      default:
        return { 
          icon: <Pause className="h-5 w-5" />, 
          color: 'bg-orange-500/20 text-orange-700 dark:text-orange-500',
          textColor: 'text-orange-700 dark:text-orange-500'
        };
    }
  };

  const signalDetails = getSignalDetails(prediction?.signal);

  // Get confidence level class
  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 70) return 'bg-green-400';
    if (confidence >= 60) return 'bg-yellow-500';
    if (confidence >= 50) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="h-5 w-5" />
          <CardTitle className="text-lg">{symbol} ML Prediction</CardTitle>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <p className="text-destructive">Failed to load prediction data</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : prediction ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <span className="text-xl font-semibold">{formattedPrice}</span>
              </div>
              <Badge 
                className={`flex items-center gap-1 px-3 py-1.5 ${signalDetails.color}`}
              >
                {signalDetails.icon}
                <span className="text-base font-medium">{prediction.signal}</span>
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Confidence</span>
                  <span className={`text-sm font-semibold ${signalDetails.textColor}`}>
                    {confidencePercentage}%
                  </span>
                </div>
                <Progress 
                  value={confidencePercentage} 
                  className={`h-2 ${getConfidenceClass(confidencePercentage)}`} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-1.5 bg-secondary/40 rounded-md">
                  <div className="text-xs text-muted-foreground">Buy Probability</div>
                  <div className="text-base font-medium">
                    {(prediction.probabilities.BUY * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-1.5 bg-secondary/40 rounded-md">
                  <div className="text-xs text-muted-foreground">Sell Probability</div>
                  <div className="text-base font-medium">
                    {(prediction.probabilities.SELL * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
      <CardFooter className="pt-0 text-xs text-muted-foreground flex flex-col gap-1 w-full">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {isLoading ? (
            <Skeleton className="h-3 w-24" />
          ) : (
            <span>Last updated: {lastUpdated}</span>
          )}
        </div>
        
        {prediction?.is_sample_data && (
          <div className="flex items-center justify-between w-full mt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Using sample data</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs max-w-[200px]">
                    This prediction uses generated sample data because real-time market data 
                    couldn't be retrieved from Binance. For accurate trading signals, 
                    check API connectivity.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="outline" className="text-xs bg-amber-500/10">Sample Data</Badge>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}