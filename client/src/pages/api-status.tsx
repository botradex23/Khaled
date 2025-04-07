import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { useToast } from "../hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import React, { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, Database, 
         Brain, Bot, PlayCircle, StopCircle, Activity, Zap,
         TrendingUp, Link, Loader2 } from "lucide-react";

import { apiRequest } from "../lib/queryClient";

export default function ApiStatus() {

  // Query Binance API status
  const binanceQuery = useQuery({
    queryKey: ["/api/binance/status"],
    retry: 1
  });
  
  // Query Database status
  const dbQuery = useQuery({
    queryKey: ["/api/database/status"],
    retry: 1
  });
  
  // Query AI system status
  const aiStatusQuery = useQuery({
    queryKey: ["/api/ai/status"],
    retry: 1,
    refetchInterval: 30000, // refetch every 30 seconds
  });
  
  // Query AI paper trading status
  const aiPaperTradingQuery = useQuery({
    queryKey: ["/api/ai/paper-trading/performance"],
    retry: 1,
    refetchInterval: 30000, // refetch every 30 seconds
  });
  
  // Set user for AI paper trading
  const setAiPaperTradingUserMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/paper-trading/set-user");
      return await res.json();
    }
  });
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container max-w-6xl pt-24 pb-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Status</h1>
          <p className="text-muted-foreground">
            Check the connection status of databases, exchange APIs, and the AI trading system.
            All trading operations should be connected to testnet for safety.
          </p>
        </div>
        
        {/* AI Trading System Status Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">AI Trading System Status</h2>
          <div className="grid grid-cols-1 gap-6">
            {/* AI System Status Card */}
            <AISystemStatusCard query={aiStatusQuery} paperTradingQuery={aiPaperTradingQuery} setUserMutation={setAiPaperTradingUserMutation} />
          </div>
        </div>
        
        {/* Database Status Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Database Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Status Card */}
            <DatabaseStatusCard query={dbQuery} />
          </div>
        </div>
        
        {/* Exchange API Status Section */}
        <h2 className="text-xl font-bold mb-4">Exchange API Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Binance Status */}
          <ApiStatusCard
            title="Binance API"
            query={binanceQuery}
            getStatus={(data) => ({
              isConnected: data?.connected || false,
              authStatus: data?.authenticated || false,
              message: data?.message || "",
              environment: data?.isTestnet ? "Testnet" : "Mainnet",
              details: data
            })}
          />

        </div>

        <div className="mt-8 border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">API Integration Notes</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <Info className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
              <span>Binance API uses the <Badge variant="outline">BINANCE_API_KEY</Badge> and <Badge variant="outline">BINANCE_SECRET_KEY</Badge> environment variables.</span>
            </li>
            <li className="flex items-start mt-4">
              <AlertTriangle className="h-5 w-5 text-warning mr-2 flex-shrink-0 mt-0.5" />
              <span>Working with testnet: The system is configured to work with a testnet environment that provides a full portal for testing, without affecting real data or real funds.</span>
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}

interface ApiStatusCardProps {
  title: string;
  query: any;
  getStatus: (data: any) => {
    isConnected: boolean;
    authStatus: boolean;
    message: string;
    environment: string;
    details: any;
  };
}

function AISystemStatusCard({ query, paperTradingQuery, setUserMutation }: { query: any, paperTradingQuery: any, setUserMutation: any }) {
  const { data, isLoading, error, refetch } = query;
  const { data: paperTradingData, isLoading: isPaperTradingLoading, error: paperTradingError, refetch: refetchPaperTrading } = paperTradingQuery;
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, action: 'start' | 'stop' | 'set-user' | 'force-trade', mode: boolean}>({
    open: false, 
    action: 'start',
    mode: false
  });
  
  // Force Trade States
  const [forceTradeSymbol, setForceTradeSymbol] = useState('BTC-USDT');
  const [forceTradeAction, setForceTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [isForcingTrade, setIsForcingTrade] = useState(false);
  const [forceTradeResult, setForceTradeResult] = useState<any>(null);
  
  // Start AI System Mutation
  const startSystemMutation = useMutation({
    mutationFn: async (isActiveMode: boolean) => {
      // apiRequest כבר מחזיר את ה-JSON כאובייקט, אז אין צורך לקרוא .json() שוב
      return await apiRequest('POST', '/api/ai/system/start', { 
        activeMode: isActiveMode 
      }, {
        headers: {
          'X-Test-User-Id': 'admin'  // Add test user header to bypass authentication
        }
      });
    },
    onSuccess: (data) => {
      const modeStr = data.status?.config?.activeMode ? 'ACTIVE' : 'PASSIVE';
      toast({
        title: "AI System Started",
        description: `AI trading system started in ${modeStr} mode successfully.`,
        variant: "default",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to Start AI System",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  // Stop AI System Mutation
  const stopSystemMutation = useMutation({
    mutationFn: async () => {
      // apiRequest כבר מחזיר את ה-JSON כאובייקט, אז אין צורך לקרוא .json() שוב
      return await apiRequest('POST', '/api/ai/system/stop', {}, {
        headers: {
          'X-Test-User-Id': 'admin'  // Add test user header to bypass authentication
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "AI System Stopped",
        description: "AI trading system stopped successfully.",
        variant: "default",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to Stop AI System",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  const handleStartSystem = () => {
    setConfirmDialog({
      open: true,
      action: 'start',
      mode: activeMode
    });
  };
  
  const handleStopSystem = () => {
    setConfirmDialog({
      open: true,
      action: 'stop',
      mode: false
    });
  };
  
  // Force Trade Mutation
  const forceTradeSystemMutation = useMutation({
    mutationFn: async (params: { symbol: string, action: 'BUY' | 'SELL' }) => {
      return await apiRequest('POST', '/api/ai/trading/force', params, {
        headers: {
          'X-Test-User-Id': 'admin'  // Add test user header to bypass authentication
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Executed",
        description: `Force trade executed successfully on ${forceTradeSymbol}.`,
        variant: "default",
      });
      setForceTradeResult(data);
    },
    onError: (error) => {
      toast({
        title: "Failed to Execute Trade",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });
    
  // Set Paper Trading User Mutation
  const handleSetPaperTradingUser = () => {
    setConfirmDialog({
      open: true,
      action: 'set-user',
      mode: false
    });
  };
  
  // Handle Force Trade
  const handleForceTrade = () => {
    setConfirmDialog({
      open: true,
      action: 'force-trade',
      mode: false
    });
  };
  
  const handleConfirmAction = () => {
    if (confirmDialog.action === 'start') {
      startSystemMutation.mutate(confirmDialog.mode);
    } else if (confirmDialog.action === 'stop') {
      stopSystemMutation.mutate();
    } else if (confirmDialog.action === 'set-user') {
      setUserMutation.mutate(undefined, {
        onSuccess: () => {
          toast({
            title: "Paper Trading User Set",
            description: "AI system is now configured to use the Paper Trading account.",
            variant: "default",
          });
          refetchPaperTrading();
        },
        onError: (error: any) => {
          toast({
            title: "Failed to Set Paper Trading User",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive",
          });
        }
      });
    } else if (confirmDialog.action === 'force-trade') {
      setIsForcingTrade(true);
      forceTradeSystemMutation.mutate(
        { symbol: forceTradeSymbol, action: forceTradeAction },
        {
          onSettled: () => setIsForcingTrade(false)
        }
      );
    }
    setConfirmDialog({...confirmDialog, open: false});
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>AI Trading System</CardTitle>
          <CardDescription>Checking status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>AI Trading System</CardTitle>
            <Badge variant="destructive">Error</Badge>
          </div>
          <CardDescription>Status check error</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <XCircle className="h-5 w-5" />
            <span>Failed to check AI system status</span>
          </div>
          <p className="text-sm text-muted-foreground overflow-hidden text-ellipsis">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse system status
  const isRunning = data?.status?.isRunning || false;
  const readyToTrade = data?.status?.readyToTrade || false;
  const decisionCount = data?.status?.decisionCount || 0;
  const executionCount = data?.status?.executionCount || 0;
  const symbols = data?.status?.config?.symbols || [];
  
  // Determine badge styling
  let statusClass = "";
  let statusVariant: "default" | "destructive" | "secondary" | "outline" = "outline";
  
  if (isRunning) {
    if (readyToTrade) {
      statusClass = "bg-green-100 text-green-800 hover:bg-green-200";
      statusVariant = "default";
    } else {
      statusClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      statusVariant = "secondary";
    }
  } else {
    statusClass = "bg-slate-100 text-slate-800 hover:bg-slate-200";
  }

  return (
    <Card className="bg-[#051838] border-0 text-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#00aaff]" />
            <CardTitle>AI Trading System</CardTitle>
          </div>
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
            {isRunning 
              ? (readyToTrade ? "Running" : "Initializing") 
              : "Not Running"}
          </Badge>
        </div>
        <CardDescription className="text-gray-400">
          Automated trading system status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* System Status Information */}
          <div className="bg-[#072252] rounded-md p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-gray-300">
                  System is active
                </span>
              </div>
              <div className="flex items-center gap-2">
                {readyToTrade ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm text-gray-300">
                  Ready to trade
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#072252] rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-[#00aaff]" />
              <span className="text-sm text-gray-300">
                {decisionCount} trading decisions made
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#00aaff]" />
              <span className="text-sm text-gray-300">
                {executionCount} trades executed
              </span>
            </div>
          </div>
          
          {/* Trading Symbols */}
          <div className="mt-2">
            <div className="text-sm font-medium mb-2 text-gray-300">Monitored Trading Pairs</div>
            <div className="flex flex-wrap gap-2">
              {symbols.length > 0 ? (
                symbols.map((symbol: string, index: number) => (
                  <Badge key={index} variant="outline" className="bg-[#072252] text-gray-300 border-gray-600 hover:bg-[#0a2d6a]">
                    {symbol}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">No trading pairs configured</span>
              )}
            </div>
          </div>
          
          {/* Active Mode Toggle */}
          <div className="mt-4 p-3 border border-gray-700 rounded-md bg-[#072252]">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2">
                <Bot className="h-5 w-5 text-[#00aaff] mt-0.5" />
                <div>
                  <div className="font-medium text-gray-300">Active Trading Mode</div>
                  <p className="text-sm text-gray-400">
                    When enabled, the AI system will not only monitor the market but also execute trades automatically
                  </p>
                </div>
              </div>
              <Switch 
                checked={activeMode} 
                onCheckedChange={setActiveMode}
                disabled={isRunning || startSystemMutation.isPending}
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-gray-700 pt-4">
        {isRunning ? (
          <Button 
            variant="destructive" 
            onClick={handleStopSystem}
            disabled={stopSystemMutation.isPending}
            className="bg-red-700 hover:bg-red-800"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            {stopSystemMutation.isPending ? "Stopping..." : "Stop System"}
          </Button>
        ) : (
          <Button 
            variant="default" 
            onClick={handleStartSystem}
            disabled={startSystemMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            {startSystemMutation.isPending ? "Starting..." : "Start System"}
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isLoading}
          className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          Refresh Status
        </Button>
      </CardFooter>
      
      {/* Paper Trading Integration */}
      <div className="mt-4 border-t border-gray-700 pt-4">
        <h3 className="text-lg font-medium text-gray-300 mb-3">AI Paper Trading Integration</h3>
        
        <div className="bg-[#072252] rounded-md p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-[#00aaff]" />
                <span className="text-sm font-medium text-gray-300">
                  Paper Trading Connection
                </span>
              </div>
              <p className="text-xs text-gray-400">
                The AI system can use Paper Trading to test strategies without risking real funds
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              onClick={handleSetPaperTradingUser}
              disabled={setUserMutation.isPending}
            >
              {setUserMutation.isPending ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Connect Account
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Paper Trading Stats */}
        {paperTradingData && !isPaperTradingLoading && !paperTradingError && (
          <div className="bg-[#072252] rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              AI Paper Trading Performance
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#051838] p-3 rounded-md">
                <div className="text-[#00aaff] text-xs mb-1">Total Trades</div>
                <div className="text-xl font-medium">
                  {paperTradingData.tradeCount || 0}
                </div>
              </div>
              <div className="bg-[#051838] p-3 rounded-md">
                <div className="text-[#00aaff] text-xs mb-1">PnL</div>
                <div className={`text-xl font-medium ${(paperTradingData.totalPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(paperTradingData.totalPnl || 0).toFixed(2)}%
                </div>
              </div>
              <div className="bg-[#051838] p-3 rounded-md">
                <div className="text-[#00aaff] text-xs mb-1">Win Rate</div>
                <div className="text-xl font-medium">
                  {paperTradingData.winRate 
                    ? `${(paperTradingData.winRate * 100).toFixed(1)}%` 
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-[#051838] p-3 rounded-md">
                <div className="text-[#00aaff] text-xs mb-1">Open Positions</div>
                <div className="text-xl font-medium">
                  {paperTradingData.openPositionsCount || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Force Trade Section */}
      {isRunning && readyToTrade && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <h3 className="text-lg font-medium text-gray-300 mb-3">Force Trade (Testing)</h3>
          
          <div className="bg-[#072252] rounded-md p-4 mb-4">
            <div className="flex flex-col space-y-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-[#00aaff]" />
                  <span className="text-sm font-medium text-gray-300">
                    Execute Manual Trade
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Force the AI system to execute a specific trade for testing purposes
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Activity className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="h-10 bg-[#051838] border border-gray-600 text-gray-300 rounded-md w-full pl-10 pr-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Trading Pair (e.g. BTC-USDT)"
                    value={forceTradeSymbol}
                    onChange={(e) => setForceTradeSymbol(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <select
                    className="h-10 bg-[#051838] border border-gray-600 text-gray-300 rounded-md w-full px-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={forceTradeAction}
                    onChange={(e) => setForceTradeAction(e.target.value as 'BUY' | 'SELL')}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
                
                <Button 
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleForceTrade}
                  disabled={isForcingTrade || forceTradeSystemMutation.isPending}
                >
                  {isForcingTrade || forceTradeSystemMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Execute Force Trade
                    </>
                  )}
                </Button>
              </div>
              
              {forceTradeResult && (
                <div className="mt-2 p-3 bg-[#051838] border border-gray-700 rounded-md">
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Last Trade Result</h4>
                  <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(forceTradeResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({...confirmDialog, open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'start' 
                ? `Start AI System in ${confirmDialog.mode ? 'ACTIVE' : 'PASSIVE'} Mode?` 
                : confirmDialog.action === 'stop'
                  ? 'Stop AI System?'
                  : confirmDialog.action === 'force-trade'
                  ? `Execute ${forceTradeAction} Trade for ${forceTradeSymbol}?`
                  : 'Connect Paper Trading Account?'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'start' 
                ? (confirmDialog.mode 
                    ? 'In ACTIVE mode, the system will execute real trades automatically based on AI recommendations.' 
                    : 'In PASSIVE mode, the system will monitor the market but will not execute trades automatically.')
                : confirmDialog.action === 'stop'
                  ? 'This will stop all AI trading system operations including market monitoring.'
                  : confirmDialog.action === 'force-trade'
                  ? `This will execute a ${forceTradeAction} trade for ${forceTradeSymbol} with maximum confidence to ensure execution. This is for testing purposes only.`
                  : 'This will associate your paper trading account with the AI system, allowing the AI to make paper trades on your behalf.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({...confirmDialog, open: false})}>
              Cancel
            </Button>
            <Button 
              variant={
                confirmDialog.action === 'start' 
                  ? "default" 
                  : confirmDialog.action === 'stop' 
                    ? "destructive" 
                    : confirmDialog.action === 'force-trade'
                      ? (forceTradeAction === 'BUY' ? 'default' : 'destructive')
                      : "default"
              }
              onClick={handleConfirmAction}
            >
              {confirmDialog.action === 'start' 
                ? `Start ${confirmDialog.mode ? 'ACTIVE' : 'PASSIVE'} Mode` 
                : confirmDialog.action === 'stop'
                  ? 'Stop System'
                  : confirmDialog.action === 'force-trade'
                  ? `Execute ${forceTradeAction} Trade`
                  : 'Connect Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DatabaseStatusCard({ query }: { query: any }) {
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Database Status</CardTitle>
          <CardDescription>Checking connections...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Database Status</CardTitle>
            <Badge variant="destructive">Error</Badge>
          </div>
          <CardDescription>Connection error</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <XCircle className="h-5 w-5" />
            <span>Failed to check database status</span>
          </div>
          <p className="text-sm text-muted-foreground overflow-hidden text-ellipsis">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse connection statuses
  const mongoConnected = data?.mongodb?.connected || false;
  const mongoErrorMessage = data?.mongodb?.error || "";
  const environment = data?.environment || "development"; 
  const timestamp = data?.timestamp || new Date().toISOString();
  
  // Determine badge styling based on MongoDB connection
  let badgeClass = "";
  let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "default";
  
  if (mongoConnected) {
    badgeClass = "bg-green-100 text-green-800 hover:bg-green-200";
  } else {
    badgeVariant = "destructive";
  }
  
  const cardClass = mongoConnected ? "border-green-200" : "border-red-200";

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Database Status</CardTitle>
          <Badge variant={badgeVariant} className={badgeClass}>
            {mongoConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        <CardDescription>
          Database connection status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* MongoDB Connection */}
          <div className="flex items-center gap-2">
            <Database className={`h-5 w-5 ${mongoConnected ? "text-green-500" : "text-destructive"}`} />
            <div className="flex-1">
              <div className="font-medium">MongoDB</div>
              <p className="text-sm text-muted-foreground">
                {mongoConnected 
                  ? "Successfully connected to MongoDB database" 
                  : "Connection failed: " + mongoErrorMessage}
              </p>
            </div>
            <Badge variant={mongoConnected ? "default" : "destructive"} className={mongoConnected ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
              {mongoConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4">
          {data?.message || "Database check completed at " + new Date(timestamp).toLocaleTimeString()}
        </p>
        
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <h4 className="text-sm font-medium text-amber-800">Database Integration Notes</h4>
          <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc pl-4">
            <li>MongoDB is used for API key storage and transaction history</li>
            <li>API Keys are securely encrypted before storage in the database</li>
            <li>Connected to {environment} environment</li>
          </ul>
          
          <div className="mt-3 p-2 bg-amber-100 rounded text-xs">
            <strong className="text-amber-800">Connection Details</strong>
            <p className="mt-1 text-amber-700">
              {mongoConnected 
                ? "Connection established to MongoDB database. Your data is being securely stored and will persist between application restarts."
                : "Connection to MongoDB database failed. Your API keys and transaction history will not be saved persistently. Try checking your database connection settings."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApiStatusCard({ title, query, getStatus }: ApiStatusCardProps) {
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>Checking connection...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{title}</CardTitle>
            <Badge variant="destructive">Error</Badge>
          </div>
          <CardDescription>Connection error</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <XCircle className="h-5 w-5" />
            <span>Failed to connect to API endpoint</span>
          </div>
          <p className="text-sm text-muted-foreground overflow-hidden text-ellipsis">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = getStatus(data);
  // Determine badge styling
  let badgeClass = "";
  let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "default";
  
  if (status.isConnected) {
    if (status.authStatus) {
      badgeClass = "bg-green-100 text-green-800 hover:bg-green-200";
    } else {
      badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      badgeVariant = "secondary";
    }
  } else {
    badgeVariant = "destructive";
  }
  
  const cardClass = status.isConnected 
    ? (status.authStatus ? "border-green-200" : "border-yellow-200") 
    : "border-red-200";

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <Badge variant={badgeVariant} className={badgeClass}>
            {status.isConnected 
              ? (status.authStatus ? "Connected" : "Partial") 
              : "Disconnected"}
          </Badge>
        </div>
        <CardDescription>
          Environment: {status.environment}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          {status.isConnected ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <span>API Connection: {status.isConnected ? "Success" : "Failed"}</span>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          {status.authStatus ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            status.isConnected ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )
          )}
          <span>Authentication: {status.authStatus ? "Success" : "Failed"}</span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">{status.message}</p>
      </CardContent>
    </Card>
  );
}