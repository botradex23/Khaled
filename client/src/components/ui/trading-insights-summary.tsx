import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAiTrading, TradingSignal } from "@/hooks/useAiTrading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  AlertCircle, 
  BarChart3, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Confetti styles
const confettiStyles = `
  .confetti-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
    overflow: hidden;
  }
  .confetti {
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: var(--color);
    opacity: 0.7;
    animation: confetti-fall var(--fall-duration) ease-in forwards,
               confetti-shake var(--shake-duration) ease-in-out infinite alternate;
  }
  @keyframes confetti-fall {
    0% {
      transform: translateY(-100vh);
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      transform: translateY(100vh);
      opacity: 0;
    }
  }
  @keyframes confetti-shake {
    0% {
      transform: translateY(0) translateX(0) rotate(0deg);
    }
    25% {
      transform: translateY(0) translateX(-15px) rotate(-45deg);
    }
    50% {
      transform: translateY(0) translateX(0) rotate(0deg);
    }
    75% {
      transform: translateY(0) translateX(15px) rotate(45deg);
    }
    100% {
      transform: translateY(0) translateX(0) rotate(0deg);
    }
  }
`;

// Generate confetti elements
const generateConfetti = (count = 100) => {
  const confetti = [];
  const colors = [
    '#1a8fe3', // Blue
    '#ff4757', // Red
    '#feca57', // Yellow
    '#2ed573', // Green
    '#5f27cd', // Purple
    '#ff6b6b', // Light Red
    '#48dbfb', // Light Blue
    '#1dd1a1', // Light Green
  ];

  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const fallDuration = 3 + Math.random() * 2 + 's'; // Between 3-5s
    const shakeDuration = 1 + Math.random() * 1 + 's'; // Between 1-2s
    const size = 5 + Math.random() * 15 + 'px'; // Between 5-20px
    const leftPos = Math.random() * 100 + 'vw';
    const style = {
      '--color': color,
      '--fall-duration': fallDuration,
      '--shake-duration': shakeDuration,
      left: leftPos,
      width: size,
      height: size,
      transform: `rotate(${Math.random() * 360}deg)`,
      borderRadius: Math.random() > 0.5 ? '50%' : '0', // Circle or square
      top: `-${Math.random() * 20 + 10}%`, // Start off-screen
    } as React.CSSProperties;

    confetti.push(
      <div 
        className="confetti" 
        key={`confetti-${i}`} 
        style={style} 
      />
    );
  }

  return confetti;
};

// Summary card for a specific signal
const SignalSummaryCard = ({ signal }: { signal: TradingSignal }) => {
  const priceChangePercent = ((signal.predicted_price - signal.current_price) / signal.current_price) * 100;
  const isPriceUp = priceChangePercent > 0;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 relative">
        <div className={`absolute top-0 left-0 w-full h-1 ${signal.signal === 'BUY' ? 'bg-green-500' : signal.signal === 'SELL' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{signal.symbol}</CardTitle>
            <Badge variant={signal.signal === 'BUY' ? 'default' : signal.signal === 'SELL' ? 'destructive' : 'outline'} 
                   className={signal.signal === 'BUY' ? 'bg-green-500 hover:bg-green-600' : 
                             signal.signal === 'SELL' ? '' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}>
              {signal.signal === 'BUY' ? 
                <TrendingUp className="mr-1 h-3 w-3" /> : 
                signal.signal === 'SELL' ? 
                <TrendingDown className="mr-1 h-3 w-3" /> : 
                <AlertCircle className="mr-1 h-3 w-3" />
              }
              {signal.signal}
            </Badge>
          </div>
          <CardDescription>
            Confidence: {Math.round(signal.confidence * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Price</span>
              <span className="font-medium">{formatPrice(signal.current_price)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Predicted Price</span>
              <span className={`font-medium ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                {formatPrice(signal.predicted_price)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Potential Return</span>
              <span className={`font-medium ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
                {isPriceUp ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">RSI</span>
              <span className="font-medium">
                {signal.rsi.toFixed(2)}
                {signal.rsi < 30 && <span className="text-green-500"> (Oversold)</span>}
                {signal.rsi > 70 && <span className="text-red-500"> (Overbought)</span>}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Trading Insights Component
export function TradingInsightsSummary() {
  const {
    signals,
    timestamp,
    isLoadingSignals,
    refetchSignals,
    signalsError,
  } = useAiTrading();
  
  const [showInsights, setShowInsights] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confetti, setConfetti] = useState<React.ReactNode[]>([]);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  
  // Handle data fetching with retries
  const handleRefetch = () => {
    console.log('Manually refreshing trading signals data...');
    setFetchAttempts(prev => prev + 1);
    refetchSignals();
  };
  
  // Log for debugging
  useEffect(() => {
    console.log('Trading Insights Summary - Current signals:', signals);
    console.log('Trading Insights Summary - Loading state:', isLoadingSignals);
    console.log('Trading Insights Summary - Error state:', signalsError);
    console.log('Trading Insights Summary - Fetch attempts:', fetchAttempts);
  }, [signals, isLoadingSignals, signalsError, fetchAttempts]);
  
  // Format relative time
  const lastUpdated = timestamp
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : "Unknown";

  // Group signals by type
  const topBuySignals = signals
    .filter(signal => signal.signal === 'BUY')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
    
  const topSellSignals = signals
    .filter(signal => signal.signal === 'SELL')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  // Create confetti effect when insights are shown
  useEffect(() => {
    if (showInsights && showConfetti) {
      setConfetti(generateConfetti(150));
      
      // Remove confetti after animation is complete
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showInsights, showConfetti]);
  
  const handleShowInsights = () => {
    setShowInsights(true);
    setShowConfetti(true);
    // You could also add sound effect here if desired
  };

  return (
    <>
      <style>{confettiStyles}</style>
      
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="confetti-container">
          {confetti}
        </div>
      )}
      
      {/* One-Click Insights Button */}
      <Button 
        size="lg" 
        className="flex items-center gap-2 mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg"
        onClick={handleShowInsights}
        disabled={isLoadingSignals}
      >
        <Sparkles className="h-5 w-5" />
        {isLoadingSignals ? 'Loading Trading Insights...' : 'One-Click Trading Insights'}
      </Button>
      
      {/* Insights Dialog */}
      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI Trading Insights Summary
            </DialogTitle>
            <DialogDescription>
              Here's your personalized trading insights based on market analysis and AI predictions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {/* Timestamp and Refresh */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                Last updated: {lastUpdated}
                {signalsError && (
                  <span className="ml-2 text-red-500 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Error fetching data
                  </span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className={`flex items-center gap-1 ${signalsError ? 'border-red-500 text-red-500 hover:bg-red-50' : ''}`}
                onClick={handleRefetch}
                disabled={isLoadingSignals}
              >
                <RefreshCw className="h-3 w-3" />
                {signalsError ? 'Retry' : 'Refresh'} {fetchAttempts > 0 ? `(${fetchAttempts})` : ''}
              </Button>
            </div>
            
            {isLoadingSignals ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : signalsError ? (
              <div className="text-center py-12 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-xl font-medium text-red-700">Error Loading Signals</h3>
                <p className="text-red-600 mb-4">We couldn't load the trading signals at this time.</p>
                <Button 
                  onClick={handleRefetch}
                  variant="destructive"
                  className="mt-2"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="buy" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="buy" className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Buy Signals ({topBuySignals.length})
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    Sell Signals ({topSellSignals.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="buy" className="mt-0">
                  {topBuySignals.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {topBuySignals.map((signal, index) => (
                        <SignalSummaryCard 
                          key={`${signal.symbol}-${index}`} 
                          signal={signal} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <h3 className="text-lg font-medium">No Buy Signals</h3>
                      <p className="text-muted-foreground">The AI hasn't detected any strong buy opportunities at the moment.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="sell" className="mt-0">
                  {topSellSignals.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {topSellSignals.map((signal, index) => (
                        <SignalSummaryCard 
                          key={`${signal.symbol}-${index}`} 
                          signal={signal} 
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <h3 className="text-lg font-medium">No Sell Signals</h3>
                      <p className="text-muted-foreground">The AI hasn't detected any strong sell indicators at the moment.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
            
            {/* Market Overview */}
            <div className="mt-6">
              <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5" />
                Market Sentiment Overview
              </h3>
              
              {signalsError ? (
                <Card className="border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center text-center py-6">
                      <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                      <h4 className="text-lg font-medium text-red-700">Market Sentiment Unavailable</h4>
                      <p className="text-sm text-red-600 mt-1 mb-3">Unable to calculate market sentiment due to data loading issues.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall Market Sentiment</span>
                        <Badge variant={topBuySignals.length > topSellSignals.length ? "default" : "destructive"}
                              className={topBuySignals.length > topSellSignals.length ? "bg-green-500 hover:bg-green-600" : ""}>
                          {topBuySignals.length > topSellSignals.length ? "Bullish" : "Bearish"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Strongest Buy Signal</span>
                        <span className="font-medium">
                          {topBuySignals.length > 0 ? topBuySignals[0].symbol : "None"}
                          {topBuySignals.length > 0 && ` (${Math.round(topBuySignals[0].confidence * 100)}%)`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Strongest Sell Signal</span>
                        <span className="font-medium">
                          {topSellSignals.length > 0 ? topSellSignals[0].symbol : "None"}
                          {topSellSignals.length > 0 && ` (${Math.round(topSellSignals[0].confidence * 100)}%)`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowInsights(false)}
            >
              Close
            </Button>
            <Button 
              className="flex items-center gap-1"
              asChild
            >
              <a href="/ai-trading">
                Full Trading Analysis
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}