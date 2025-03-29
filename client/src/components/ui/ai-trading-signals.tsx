import { useAiTrading, TradingSignal } from "@/hooks/useAiTrading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrainCircuit, TrendingUp, TrendingDown, Clock, RefreshCw, BarChart3, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function AITradingSignals() {
  const {
    signals,
    timestamp,
    isLoadingSignals,
    refetchSignals,
    getSignalStatus,
    getPriceChangePercent,
    executeTrade,
    isExecutingTrade
  } = useAiTrading();

  // Format the timestamp to relative time
  const lastUpdated = timestamp
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : "Unknown";

  // Group signals by action (BUY, SELL, HOLD)
  const buySignals = signals.filter(signal => signal.signal === 'BUY');
  const sellSignals = signals.filter(signal => signal.signal === 'SELL');
  const holdSignals = signals.filter(signal => signal.signal === 'HOLD');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const getSignalBadge = (signalType: string) => {
    switch (signalType) {
      case 'BUY':
        return <Badge className="bg-green-500">BUY</Badge>;
      case 'SELL':
        return <Badge className="bg-red-500">SELL</Badge>;
      default:
        return <Badge variant="outline">HOLD</Badge>;
    }
  };

  const SignalTable = ({ signals }: { signals: TradingSignal[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Current Price</TableHead>
          <TableHead>Predicted</TableHead>
          <TableHead>RSI</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Signal</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {signals.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              No signals available
            </TableCell>
          </TableRow>
        ) : (
          signals.map((signal) => {
            const priceChangePercent = getPriceChangePercent(signal);
            const signalId = `${signal.symbol}-${signal.timestamp}`;
            
            return (
              <TableRow key={signalId}>
                <TableCell className="font-medium">{signal.symbol}</TableCell>
                <TableCell>{formatPrice(signal.current_price)}</TableCell>
                <TableCell className="flex items-center">
                  {formatPrice(signal.predicted_price)}
                  <span className={`ml-2 ${priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChangePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {Math.abs(priceChangePercent).toFixed(2)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className={
                    signal.rsi > 70 ? 'text-red-500' : 
                    signal.rsi < 30 ? 'text-green-500' : 
                    'text-yellow-500'
                  }>
                    {signal.rsi.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className={`h-2.5 rounded-full ${
                        signal.confidence > 0.7 ? 'bg-green-500' : 
                        signal.confidence > 0.4 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`} 
                      style={{ width: `${signal.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs">{(signal.confidence * 100).toFixed(0)}%</span>
                </TableCell>
                <TableCell>{getSignalBadge(signal.signal)}</TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => executeTrade({ signalId })}
                    disabled={isExecutingTrade}
                  >
                    {isExecutingTrade ? "Processing..." : "Execute"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            AI Trading Signals
          </CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last updated: {lastUpdated}
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => refetchSignals()}
          disabled={isLoadingSignals}
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingSignals ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              All Signals ({signals.length})
            </TabsTrigger>
            <TabsTrigger value="buy" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Buy ({buySignals.length})
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Sell ({sellSignals.length})
            </TabsTrigger>
            <TabsTrigger value="hold" className="flex items-center gap-1">
              <ArrowRight className="h-4 w-4" />
              Hold ({holdSignals.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <SignalTable signals={signals} />
          </TabsContent>
          
          <TabsContent value="buy">
            <SignalTable signals={buySignals} />
          </TabsContent>
          
          <TabsContent value="sell">
            <SignalTable signals={sellSignals} />
          </TabsContent>
          
          <TabsContent value="hold">
            <SignalTable signals={holdSignals} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}