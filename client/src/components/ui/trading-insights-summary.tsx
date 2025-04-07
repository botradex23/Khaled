import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { useAiTrading, TradingSignal } from "../../hooks/useAiTrading";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from "../../hooks/use-toast";
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Shuffle, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

function calculateTrendStrength(signal: TradingSignal): number {
  // Calculate trend strength on a scale of 0-100
  const rsiWeight = 0.4;
  const maWeight = 0.6;
  
  let rsiStrength = 0;
  if (signal.rsi < 30) rsiStrength = 100 - (signal.rsi * 3.33); // Oversold, bullish
  else if (signal.rsi > 70) rsiStrength = (signal.rsi - 70) * 3.33; // Overbought, bearish
  else rsiStrength = 50; // Neutral
  
  const maDiff = ((signal.ma_20 / signal.ma_50) - 1) * 100;
  let maStrength = 0;
  if (maDiff > 0) maStrength = Math.min(maDiff * 10, 100); // Bullish
  else maStrength = Math.min(Math.abs(maDiff) * 10, 100); // Bearish
  
  return Math.round((rsiStrength * rsiWeight) + (maStrength * maWeight));
}

function formattedTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
}

type ConditionalWrapperProps = {
  condition: boolean;
  wrapper: (children: React.ReactElement) => React.ReactElement;
  children: React.ReactElement;
};

const ConditionalWrapper: React.FC<ConditionalWrapperProps> = ({ condition, wrapper, children }) => (
  condition ? wrapper(children) : children
);

export function TradingInsightsSummary() {
  const [showInsights, setShowInsights] = useState(false);
  const [currentTab, setCurrentTab] = useState('overview');
  const { toast } = useToast();
  const [hasShownConfetti, setHasShownConfetti] = useState(false);

  const { 
    signals, 
    timestamp, 
    isFresh,
    isLoadingSignals, 
    signalsError,
    refetchSignals,
    getSignalStatus,
    getPriceChangePercent
  } = useAiTrading();

  // Simple visual celebration animation using DOM elements
  const triggerCelebration = () => {
    if (typeof window !== 'undefined') {
      try {
        // Create a container for the celebration particles
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        
        // Create particles
        const colors = ['#FFD700', '#FFA500', '#FF6347', '#00BFFF', '#32CD32'];
        for (let i = 0; i < 50; i++) {
          const particle = document.createElement('div');
          particle.style.position = 'absolute';
          particle.style.width = '10px';
          particle.style.height = '10px';
          particle.style.borderRadius = '50%';
          particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          particle.style.left = Math.random() * 100 + '%';
          particle.style.top = '120%';
          particle.style.opacity = '1';
          particle.style.transform = 'scale(1)';
          particle.style.transition = 'all 1.5s ease-out';
          container.appendChild(particle);
          
          // Animate particle
          setTimeout(() => {
            particle.style.top = 30 + (Math.random() * 50) + '%';
          }, 10);
          
          // Fade out and remove
          setTimeout(() => {
            particle.style.opacity = '0';
            particle.style.transform = 'scale(0)';
          }, 800 + (Math.random() * 700));
        }
        
        // Remove container after animation
        setTimeout(() => {
          document.body.removeChild(container);
        }, 2000);
      } catch (error) {
        console.error('Failed to trigger celebration:', error);
      }
    }
  };
  
  const toggleInsights = () => {
    setShowInsights(prev => !prev);
    
    if (!showInsights && !hasShownConfetti) {
      // Only trigger celebration the first time insights are shown
      triggerCelebration();
      setHasShownConfetti(true);
    }
  };
  
  // Get the latest signals (top 5)
  const latestSignals = signals.slice(0, 5);
  
  // Calculate overall market sentiment
  const calculateSentiment = () => {
    if (signals.length === 0) return 'neutral';
    
    const buySignals = signals.filter(s => s.signal === 'BUY').length;
    const sellSignals = signals.filter(s => s.signal === 'SELL').length;
    const ratio = signals.length > 0 ? buySignals / signals.length : 0.5;
    
    if (ratio > 0.6) return 'bullish';
    if (ratio < 0.4) return 'bearish';
    return 'neutral';
  };
  
  const sentiment = calculateSentiment();
  
  // Transform signals for chart
  const chartData = latestSignals.map(signal => ({
    name: signal.symbol,
    current: signal.current_price,
    predicted: signal.predicted_price,
    ma20: signal.ma_20,
    ma50: signal.ma_50
  })).reverse();
  
  // Handle retry
  const handleRetry = () => {
    refetchSignals();
    toast({
      title: "Refreshing signals",
      description: "Fetching the latest trading insights..."
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI Trading Insights
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleInsights}
            className="text-xs"
          >
            {showInsights ? 'Hide Insights' : 'One-Click Insights'}
          </Button>
        </CardTitle>
        <CardDescription>
          {timestamp ? (
            <div className="flex items-center gap-2">
              <span>Last updated: {formattedTimestamp(timestamp)}</span>
              {isFresh ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Fresh</Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Stale</Badge>
              )}
            </div>
          ) : (
            <span>Loading latest insights...</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <ConditionalWrapper
        condition={showInsights}
        wrapper={(children) => (
          <>
            {children}
            <CardContent>
              {isLoadingSignals ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : signalsError ? (
                <div className="p-4 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
                  <div className="text-lg font-semibold">Failed to load trading signals</div>
                  <p className="text-muted-foreground">
                    {signalsError instanceof Error ? signalsError.message : "Unknown error occurred"}
                  </p>
                  <Button onClick={handleRetry} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : signals.length === 0 ? (
                <div className="p-4 text-center">
                  <p>No trading signals available at this time.</p>
                </div>
              ) : (
                <Tabs 
                  defaultValue="overview" 
                  value={currentTab} 
                  onValueChange={setCurrentTab}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="signals">Top Signals</TabsTrigger>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className={`p-4 rounded-lg border ${
                        sentiment === 'bullish' ? 'border-green-300 bg-green-50' :
                        sentiment === 'bearish' ? 'border-red-300 bg-red-50' :
                        'border-yellow-300 bg-yellow-50'
                      }`}>
                        <h3 className="text-sm font-medium mb-1">Market Sentiment</h3>
                        <div className="flex items-center gap-2">
                          {sentiment === 'bullish' && <TrendingUp className="h-5 w-5 text-green-600" />}
                          {sentiment === 'bearish' && <TrendingDown className="h-5 w-5 text-red-600" />}
                          {sentiment === 'neutral' && <Shuffle className="h-5 w-5 text-yellow-600" />}
                          <span className="font-semibold capitalize">{sentiment}</span>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border">
                        <h3 className="text-sm font-medium mb-1">Signals Count</h3>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {signals.filter(s => s.signal === 'BUY').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Buy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {signals.filter(s => s.signal === 'SELL').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Sell</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              {signals.filter(s => s.signal === 'HOLD').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Hold</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border">
                        <h3 className="text-sm font-medium mb-1">Average Confidence</h3>
                        <div className="font-semibold text-lg">
                          {signals.length > 0 
                            ? `${(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length).toFixed(1)}%`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-3">Top Opportunities</h3>
                      <div className="space-y-3">
                        {latestSignals.slice(0, 3).map((signal, index) => {
                          const changePercent = getPriceChangePercent(signal);
                          const signalStatus = getSignalStatus(signal);
                          const trendStrength = calculateTrendStrength(signal);
                          
                          return (
                            <div key={index} className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{signal.symbol}</div>
                                <div className="text-sm text-muted-foreground">
                                  Current: ${signal.current_price.toFixed(2)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-medium flex items-center gap-1 ${
                                  signalStatus === 'buy' ? 'text-green-600' :
                                  signalStatus === 'sell' ? 'text-red-600' :
                                  'text-yellow-600'
                                }`}>
                                  {signalStatus === 'buy' && <TrendingUp className="h-4 w-4" />}
                                  {signalStatus === 'sell' && <TrendingDown className="h-4 w-4" />}
                                  {signalStatus === 'neutral' && <Shuffle className="h-4 w-4" />}
                                  <span>{signal.signal}</span>
                                </div>
                                <div className={`text-sm ${
                                  changePercent > 0 ? 'text-green-600' :
                                  changePercent < 0 ? 'text-red-600' :
                                  'text-yellow-600'
                                }`}>
                                  {changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="signals">
                    <div className="space-y-3">
                      {latestSignals.map((signal, index) => {
                        const changePercent = getPriceChangePercent(signal);
                        const signalStatus = getSignalStatus(signal);
                        
                        return (
                          <div key={index} className={`p-3 rounded-lg border ${
                            signalStatus === 'buy' ? 'border-green-300 bg-green-50' :
                            signalStatus === 'sell' ? 'border-red-300 bg-red-50' :
                            'border-yellow-300 bg-yellow-50'
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">{signal.symbol}</div>
                              <Badge variant="outline" className={
                                signalStatus === 'buy' ? 'bg-green-100 text-green-800' :
                                signalStatus === 'sell' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {signal.signal}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-muted-foreground">Current Price</div>
                                <div className="font-medium">${signal.current_price.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Predicted Price</div>
                                <div className={`font-medium ${
                                  changePercent > 0 ? 'text-green-600' :
                                  changePercent < 0 ? 'text-red-600' :
                                  'text-muted-foreground'
                                }`}>
                                  ${signal.predicted_price.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">RSI (14)</div>
                                <div className={`font-medium ${
                                  signal.rsi < 30 ? 'text-green-600' :
                                  signal.rsi > 70 ? 'text-red-600' :
                                  'text-muted-foreground'
                                }`}>
                                  {signal.rsi.toFixed(1)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Confidence</div>
                                <div className="font-medium">{signal.confidence.toFixed(1)}%</div>
                              </div>
                            </div>
                            
                            <div className="mt-2 pt-2 border-t text-sm flex justify-between items-center">
                              <div className="text-muted-foreground">
                                Forecast: {Math.abs(changePercent).toFixed(2)}% {changePercent >= 0 ? 'increase' : 'decrease'}
                              </div>
                              <div className={
                                changePercent > 3 ? 'text-green-600' :
                                changePercent < -3 ? 'text-red-600' :
                                'text-yellow-600'
                              }>
                                {changePercent > 3 ? 'Strong Buy' : 
                                 changePercent > 1 ? 'Buy' : 
                                 changePercent > -1 ? 'Hold' : 
                                 changePercent > -3 ? 'Sell' : 'Strong Sell'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="chart">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="current" stroke="#8884d8" name="Current Price" />
                          <Line type="monotone" dataKey="predicted" stroke="#82ca9d" name="Predicted Price" />
                          <Line type="monotone" dataKey="ma20" stroke="#ffc658" name="MA (20)" strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="ma50" stroke="#ff8042" name="MA (50)" strokeDasharray="3 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground text-center">
                      Comparing current prices with AI predictions and moving averages
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry} 
                disabled={isLoadingSignals}
                className="gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingSignals ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentTab(currentTab === 'overview' ? 'signals' : currentTab === 'signals' ? 'chart' : 'overview')}
              >
                Next View
              </Button>
            </CardFooter>
          </>
        )}
      >
        <CardContent className={!showInsights ? "p-4" : ""}>
          {!showInsights && (
            latestSignals.length > 0 ? (
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">Click "One-Click Insights" to reveal AI trading insights</p>
                <p className="text-xs text-muted-foreground">
                  {latestSignals.length} signals available with {latestSignals.filter(s => s.signal === 'BUY').length} buy recommendations
                </p>
              </div>
            ) : isLoadingSignals ? (
              <div className="text-center space-y-4">
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No trading signals available</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry} 
                  className="gap-1 mx-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            )
          )}
        </CardContent>
      </ConditionalWrapper>
    </Card>
  );
}