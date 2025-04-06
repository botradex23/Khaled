import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, StrategyType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  ArrowRight, 
  Search, 
  Plus, 
  Filter, 
  BarChart3, 
  Play, 
  Pause, 
  Settings, 
  Trash2, 
  TrendingUp,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  X,
  Key
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { 
  gridChartData, 
  dcaChartData, 
  macdChartData 
} from "@/lib/chart-data";
import { useToast } from "@/hooks/use-toast";

export default function Bots() {
  // State for the filter and search inputs
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showBotDetails, setShowBotDetails] = useState<boolean>(false);
  const [selectedTradingPair, setSelectedTradingPair] = useState<string>("");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false);
  
  // Use auth and toast hooks
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  
  // Define API keys response type
  interface ApiKeysResponse {
    message: string;
    apiKeys: {
      binanceApiKey: string | null;
      binanceSecretKey: string | null;
      defaultBroker: string;
      useTestnet: boolean;
    };
  }
  
  // Fetch API keys status
  const { data: apiKeysData, isLoading: apiKeysLoading } = useQuery<ApiKeysResponse>({
    queryKey: ["/api/users/api-keys"],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    retry: 0, // Don't retry on failure
  });
  
  // Fetch bots data
  const { data: bots, isLoading, refetch } = useQuery<Bot[]>({
    queryKey: ['/api/bots'],
  });
  
  // Check if user needs to set up API keys (except for hindi1000hindi@gmail.com)
  useEffect(() => {
    if (isAuthenticated && !apiKeysLoading && user) {
      const isHindi1000Hindi = user.email === "hindi1000hindi@gmail.com";
      
      // If user is not hindi1000hindi@gmail.com and doesn't have API keys set up
      if (!isHindi1000Hindi && apiKeysData) {
        // Check if API keys are missing
        if (!apiKeysData.apiKeys || 
            !apiKeysData.apiKeys.binanceApiKey || 
            !apiKeysData.apiKeys.binanceSecretKey) {
          // Show dialog
          setShowApiKeyDialog(true);
        }
      }
    }
  }, [isAuthenticated, apiKeysLoading, apiKeysData, user]);
  
  // Start bot mutation
  const startBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const response = await fetch(`/api/binance/bots/${botId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start bot');
      }
      return await response.json();
    },
    onSuccess: (data, botId) => {
      toast({
        title: "בוט הופעל בהצלחה",
        description: "הבוט שלך החל לסחור",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בהפעלת הבוט",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const response = await fetch(`/api/binance/bots/${botId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stop bot');
      }
      return await response.json();
    },
    onSuccess: (data, botId) => {
      toast({
        title: "בוט הופסק בהצלחה",
        description: "הבוט שלך הפסיק לסחור",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעצירת הבוט",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update bot parameters mutation
  const updateBotParametersMutation = useMutation({
    mutationFn: async ({ botId, parameters }: { botId: number, parameters: any }) => {
      const response = await fetch(`/api/binance/bots/${botId}/parameters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update bot parameters');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "עדכון פרמטרים הצליח",
        description: "הפרמטרים של הבוט עודכנו בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      setShowBotDetails(false);
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעדכון פרמטרים",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter and search functionality
  const filteredBots = bots?.filter(bot => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by status
    const matchesStatus = 
      statusFilter === "all" ? true : 
      statusFilter === "active" ? !!bot.isRunning : 
      statusFilter === "paused" ? !bot.isRunning : 
      true;
    
    return matchesSearch && matchesStatus;
  });
  
  // Sample performance data for bot detail view
  const botPerformanceData = [
    { date: "Jan 1", value: 1000 },
    { date: "Jan 5", value: 1020 },
    { date: "Jan 10", value: 1080 },
    { date: "Jan 15", value: 1050 },
    { date: "Jan 20", value: 1120 },
    { date: "Jan 25", value: 1200 },
    { date: "Jan 30", value: 1250 }
  ];
  
  // Get chart data based on strategy type
  const getChartDataForStrategy = (strategy: StrategyType) => {
    switch (strategy) {
      case "grid":
        return gridChartData;
      case "dca":
        return dcaChartData;
      case "macd":
        return macdChartData;
      default:
        return gridChartData;
    }
  };
  
  // Available trading pairs from Binance
  const tradingPairs = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "BNBUSDT"
  ];
  
  // Handle trading pair change
  const handleTradingPairChange = (pair: string) => {
    setSelectedTradingPair(pair);
  };
  
  // Effect to set the currently selected trading pair and symbols when bot changes
  useEffect(() => {
    if (selectedBot) {
      setSelectedTradingPair(selectedBot.tradingPair || 'BTCUSDT');
      
      // Try to extract the symbols from bot parameters if available
      try {
        if (selectedBot.parameters) {
          const params = JSON.parse(selectedBot.parameters);
          if (params.symbols && Array.isArray(params.symbols)) {
            setSelectedSymbols(params.symbols);
          } else {
            // Fallback to setting just the trading pair if no symbols array
            setSelectedSymbols([selectedBot.tradingPair || 'BTCUSDT']);
          }
        } else {
          setSelectedSymbols([selectedBot.tradingPair || 'BTCUSDT']);
        }
      } catch (e) {
        // If JSON parsing fails, just set the trading pair
        setSelectedSymbols([selectedBot.tradingPair || 'BTCUSDT']);
      }
    }
  }, [selectedBot]);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Your Trading Bots</h1>
              <p className="text-muted-foreground">
                Manage and monitor your automated crypto trading strategies
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
              <Link href="/ai-grid-bot">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create AI Grid Bot
                </Button>
              </Link>
              <div className="dropdown-root relative">
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Other Bots</span>
                </Button>
                <div className="dropdown-content absolute right-0 mt-2 w-56 origin-top-right rounded-md shadow-lg bg-background border z-10">
                  <div className="py-1">
                    <Link href="/dca-bot" className="block px-4 py-2 text-sm hover:bg-secondary">DCA Bot</Link>
                    <Link href="/macd-bot" className="block px-4 py-2 text-sm hover:bg-secondary">MACD Trading Bot</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="active" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between">
              <TabsList>
                <TabsTrigger value="active">Active Bots</TabsTrigger>
                <TabsTrigger value="marketplace">Bot Marketplace</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <div className="flex space-x-2 mt-4 md:mt-0">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search bots..."
                    className="pl-8 w-full md:w-60"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bots</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="active" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-10">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Loading your bots...</p>
                </div>
              ) : filteredBots && filteredBots.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredBots.map(bot => (
                    <Card key={bot.id} className="overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <CardTitle className="text-xl">{bot.name}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-1">
                              {bot.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center space-x-1">
                            {bot.isRunning ? (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => stopBotMutation.mutate(bot.id)}
                                disabled={stopBotMutation.isPending}
                              >
                                {stopBotMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Pause className="h-4 w-4 text-amber-500" />
                                )}
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => startBotMutation.mutate(bot.id)}
                                disabled={startBotMutation.isPending}
                              >
                                {startBotMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                // Set selected bot for detailed view
                                setSelectedBot(bot);
                                setShowBotDetails(true);
                              }}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {bot.strategy.toUpperCase()}
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                            +{bot.monthlyReturn}% Monthly
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            Min ${bot.minInvestment}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getChartDataForStrategy(bot.strategy)}>
                              <defs>
                                <linearGradient id={`color-${bot.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  borderColor: 'hsl(var(--border))',
                                  borderRadius: '0.5rem'
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                fill={`url(#color-${bot.id})`}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t pt-4 flex justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Risk Level</span>
                          <div className="flex items-center mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-1.5 h-6 mx-0.5 rounded-sm ${i < bot.riskLevel ? 'bg-primary' : 'bg-border'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <Link href="/bot-demo">
                          <Button variant="outline" size="sm">
                            <span>Performance Details</span>
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="py-10">
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">You don't have any active bots yet</p>
                    <Link href="/ai-grid-bot">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create AI Grid Bot
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="marketplace">
              <Card>
                <CardHeader>
                  <CardTitle>Bot Marketplace</CardTitle>
                  <CardDescription>
                    Discover pre-built trading strategies created by expert traders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* AI Grid Trading Bot */}
                    <Card className="border-2 border-primary/70">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">AI Grid Trading</CardTitle>
                          <div className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-500">
                            NEW
                          </div>
                        </div>
                        <CardDescription>
                          AI-powered grid bot that optimizes parameters
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={gridChartData}>
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={false}
                              />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Avg. Monthly Return</span>
                            <span className="text-sm font-medium">+7.5%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Risk Level</span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1 h-4 mx-0.5 rounded-sm ${i < 3 ? 'bg-primary' : 'bg-border'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Link href="/ai-grid-bot" className="w-full">
                          <Button className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Create AI Grid Bot
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                    
                    {/* DCA Strategy */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">DCA Bot</CardTitle>
                          <div className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                            BEGINNER
                          </div>
                        </div>
                        <CardDescription>
                          Dollar-cost averaging for long-term investing
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dcaChartData}>
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={false}
                              />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Avg. Monthly Return</span>
                            <span className="text-sm font-medium">+3.8%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Risk Level</span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1 h-4 mx-0.5 rounded-sm ${i < 1 ? 'bg-primary' : 'bg-border'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Link href="/bot-demo" className="w-full">
                          <Button className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Deploy This Strategy
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                    
                    {/* MACD Strategy */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">MACD Trend</CardTitle>
                          <div className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                            ADVANCED
                          </div>
                        </div>
                        <CardDescription>
                          Technical analysis using MACD indicators
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={macdChartData}>
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={false}
                              />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Avg. Monthly Return</span>
                            <span className="text-sm font-medium">+7.5%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Risk Level</span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1 h-4 mx-0.5 rounded-sm ${i < 3 ? 'bg-primary' : 'bg-border'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Link href="/bot-demo" className="w-full">
                          <Button className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Deploy This Strategy
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>
                    Detailed performance metrics for all your trading bots
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* Performance Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center">
                            <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
                            <div className="text-2xl font-bold">+12.5%</div>
                            <p className="text-sm text-muted-foreground">Overall Return</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center">
                            <BarChart3 className="h-8 w-8 text-primary mb-2" />
                            <div className="text-2xl font-bold">73%</div>
                            <p className="text-sm text-muted-foreground">Win Rate</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex flex-col items-center">
                            <RefreshCw className="h-8 w-8 text-amber-500 mb-2" />
                            <div className="text-2xl font-bold">182</div>
                            <p className="text-sm text-muted-foreground">Total Trades</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Performance Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Bot Performance Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={botPerformanceData}
                              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(value) => `$${value.toLocaleString()}`}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  borderColor: 'hsl(var(--border))',
                                  borderRadius: '0.5rem'
                                }}
                                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
                              />
                              <Line
                                name="AI Grid Trading Bot"
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                activeDot={{ r: 8 }}
                              />
                              {/* Add more lines for different bots */}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Bot Comparison Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Bot Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Bot Name</TableHead>
                              <TableHead>Strategy</TableHead>
                              <TableHead>Return</TableHead>
                              <TableHead>Risk Level</TableHead>
                              <TableHead>Win Rate</TableHead>
                              <TableHead>Trades</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBots?.map(bot => (
                              <TableRow key={bot.id}>
                                <TableCell className="font-medium">{bot.name}</TableCell>
                                <TableCell className="capitalize">{bot.strategy}</TableCell>
                                <TableCell className="text-green-500">+{bot.monthlyReturn}%</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <div 
                                        key={i} 
                                        className={`w-1 h-4 mx-0.5 rounded-sm ${i < bot.riskLevel ? 'bg-primary' : 'bg-border'}`} 
                                      />
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>{70 + Math.floor(Math.random() * 20)}%</TableCell>
                                <TableCell>{Math.floor(Math.random() * 100) + 50}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      
      {/* Bot details dialog */}
      <Dialog open={showBotDetails} onOpenChange={setShowBotDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{selectedBot?.name}</DialogTitle>
              <div className={`px-2 py-1 text-xs rounded-full ${selectedBot?.isRunning 
                ? 'bg-green-500/10 text-green-500' 
                : 'bg-amber-500/10 text-amber-500'}`}>
                {selectedBot?.isRunning ? 'Active' : 'Paused'}
              </div>
            </div>
            <DialogDescription>
              {selectedBot?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Performance metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 mr-2 text-primary" />
                    <span className="text-2xl font-bold">{selectedBot?.totalTrades || 0}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Profit/Loss</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 mr-2 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{selectedBot?.profitLoss || '0.00'}</div>
                      <div className={`text-sm ${
                        parseFloat(selectedBot?.profitLossPercent || '0') >= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {selectedBot?.profitLossPercent || '0.00%'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent trades table */}
            <div>
              <h3 className="text-lg font-medium mb-2">Recent Trades</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price (USD)</TableHead>
                      <TableHead>Amount (Crypto)</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Loading state if no trades yet */}
                    {selectedBot?.totalTrades === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          {selectedBot?.isRunning 
                            ? <div className="flex flex-col items-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                <p className="text-muted-foreground">
                                  Bot is running and looking for trading opportunities...
                                </p>
                              </div>
                            : <div className="text-muted-foreground">
                                No trading activity yet
                              </div>
                          }
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* If we have trades to show */}
                    {selectedBot?.totalTrades && selectedBot?.totalTrades > 0 && (
                      <>
                        <TableRow>
                          <TableCell>
                            <div className="font-medium">12:42 PM</div>
                            <div className="text-xs text-muted-foreground">Today</div>
                          </TableCell>
                          <TableCell className="flex items-center">
                            <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                            Buy
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">$87,310.00</span>
                              <span className="text-xs text-muted-foreground">USD Value</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">0.00023</span>
                              <span className="text-xs text-muted-foreground">BTC</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-green-500/10 text-green-500">
                              <Check className="mr-1 h-3 w-3" />
                              Executed
                            </span>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>
                            <div className="font-medium">11:27 AM</div>
                            <div className="text-xs text-muted-foreground">Today</div>
                          </TableCell>
                          <TableCell className="flex items-center">
                            <div className="mr-2 h-2 w-2 rounded-full bg-red-500"></div>
                            Sell
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">$87,450.00</span>
                              <span className="text-xs text-muted-foreground">USD Value</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">0.00051</span>
                              <span className="text-xs text-muted-foreground">BTC</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-green-500/10 text-green-500">
                              <Check className="mr-1 h-3 w-3" />
                              Executed
                            </span>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* Bot settings/parameters */}
            <div>
              <h3 className="text-lg font-medium mb-2">Bot Parameters</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Strategy</span>
                  <span className="font-medium">{selectedBot?.strategy.toUpperCase()}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Trading Cryptocurrencies</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {tradingPairs.map(pair => (
                      <div key={pair} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox 
                          id={`pair-${pair}`} 
                          checked={selectedSymbols.includes(pair)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSymbols(prev => [...prev, pair]);
                            } else {
                              setSelectedSymbols(prev => prev.filter(s => s !== pair));
                            }
                          }}
                        />
                        <label
                          htmlFor={`pair-${pair}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {pair}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Investment</span>
                  <span className="font-medium">${selectedBot?.totalInvestment || '0'}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-muted-foreground">Created On</span>
                  <span className="font-medium">
                    {selectedBot?.createdAt 
                      ? new Date(selectedBot.createdAt).toLocaleDateString() 
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              {selectedBot?.isRunning ? (
                <Button 
                  variant="outline" 
                  className="gap-1" 
                  onClick={() => {
                    stopBotMutation.mutate(selectedBot.id);
                    setShowBotDetails(false);
                  }}
                >
                  <Pause className="h-4 w-4" />
                  Stop Bot
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  className="gap-1" 
                  onClick={() => {
                    startBotMutation.mutate(selectedBot?.id || 0);
                    setShowBotDetails(false);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Start Bot
                </Button>
              )}
              <Button 
                variant="secondary" 
                className="gap-1" 
                onClick={() => {
                  // Update bot parameters with multiple trading pairs
                  if (selectedBot && selectedSymbols.length > 0) {
                    updateBotParametersMutation.mutate({
                      botId: selectedBot.id,
                      parameters: {
                        symbols: selectedSymbols,
                        riskPercentage: 2,
                        autoAdjustRange: true
                      }
                    });
                  } else if (selectedSymbols.length === 0) {
                    toast({
                      title: "Cryptocurrency Selection Required",
                      description: "Please select at least one cryptocurrency to trade",
                      variant: "destructive"
                    });
                  } else {
                    toast({
                      title: "No Changes Made",
                      description: "Bot parameters remain unchanged"
                    });
                  }
                }}
                disabled={updateBotParametersMutation.isPending}
              >
                {updateBotParametersMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                Update Parameters
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowBotDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog 
        open={showApiKeyDialog} 
        onOpenChange={(open) => {
          setShowApiKeyDialog(open);
        }}
      >
        <DialogContent 
          className="sm:max-w-[500px]"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              API Keys Required
            </DialogTitle>
            <DialogDescription>
              You need to set up your API keys to use the trading bots.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="mb-2 font-medium">Why API Keys are needed:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Connect securely to your exchange account</li>
                <li>Allow the bot to execute trades on your behalf</li>
                <li>Monitor your balance and trading history</li>
              </ul>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Your API keys are stored securely and are only used for the specific actions you authorize.
            </p>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Later
            </Button>
            <Button 
              className="gap-1" 
              onClick={() => {
                setShowApiKeyDialog(false);
                setLocation("/api-keys");
              }}
            >
              <Key className="h-4 w-4" />
              Set Up API Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}