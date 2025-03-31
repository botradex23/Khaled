import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import BotExplanationGuide from "@/components/bots/bot-explanation-guide";
import RiskManagementSection from "@/components/bots/risk-management-section";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Brain,
  TrendingUp,
  BarChart,
  Grid3x3,
  Play,
  Square,
  History,
  Settings,
  AreaChart,
  Wallet,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Key,
  ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertTitle } from "@/components/ui/alert";

// Define form schema
const botFormSchema = z.object({
  name: z.string().min(3, "Bot name must be at least 3 characters"),
  symbol: z.string().min(1, "Trading pair is required"),
  totalInvestment: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 100,
    { message: "Investment must be at least $100" }
  ),
  upperPrice: z.string().optional(),
  lowerPrice: z.string().optional(),
  gridCount: z.string().optional(),
  useAI: z.boolean().default(true),
  
  // Risk management fields
  stopLossPercentage: z.number().min(0.5).max(20).default(5),
  takeProfitPercentage: z.number().min(0.5).max(50).default(15),
  maxInvestmentPerTrade: z.string().default("100"),
  emergencyStopEnabled: z.boolean().default(true),
  useAdaptiveRiskAdjustment: z.boolean().default(false),
});

type BotFormValues = z.infer<typeof botFormSchema>;

// Define the AI Grid Bot creation page
export default function AIGridBot() {
  const [activeTab, setActiveTab] = useState("settings");
  const [botId, setBotId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Auth state
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Popular trading pairs
  const tradingPairs = [
    "BTCUSDT", 
    "ETHUSDT", 
    "SOLUSDT", 
    "BNBUSDT", 
    "XRPUSDT", 
    "ADAUSDT", 
    "DOGEUSDT", 
    "DOTUSDT"
  ];

  // Bot creation form
  const form = useForm<BotFormValues>({
    resolver: zodResolver(botFormSchema),
    defaultValues: {
      name: "AI Grid Trading Bot",
      symbol: "BTCUSDT",
      totalInvestment: "1000",
      useAI: true,
      // Risk management defaults
      stopLossPercentage: 5,
      takeProfitPercentage: 15,
      maxInvestmentPerTrade: "100",
      emergencyStopEnabled: true,
      useAdaptiveRiskAdjustment: false,
    },
  });

  // Define API keys response type
  interface ApiKeysResponse {
    message: string;
    apiKeys: {
      okxApiKey: string | null;
      okxSecretKey: string | null;
      okxPassphrase: string | null;
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
  
  // Check if user needs to set up API keys (except for hindi1000hindi@gmail.com)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !apiKeysLoading && user) {
      const isHindi1000Hindi = user.email === "hindi1000hindi@gmail.com";
      
      // If user is not hindi1000hindi@gmail.com and doesn't have API keys set up
      if (!isHindi1000Hindi && apiKeysData) {
        // Check if API keys are missing
        if (!apiKeysData.apiKeys || 
            !apiKeysData.apiKeys.okxApiKey || 
            !apiKeysData.apiKeys.okxSecretKey || 
            !apiKeysData.apiKeys.okxPassphrase) {
          // Show dialog
          setShowApiKeyDialog(true);
        }
      }
    }
  }, [isAuthenticated, authLoading, apiKeysLoading, apiKeysData, user]);
  
  // Get market data for the selected pair
  const selectedPair = form.watch("symbol");
  const { data: marketData = [] } = useQuery<any[]>({
    queryKey: ['/api/okx/markets', selectedPair],
    enabled: !!selectedPair,
    refetchInterval: 30000,
  });

  // Use current price for price range suggestions
  useEffect(() => {
    if (marketData && marketData.length > 0) {
      const currentPrice = marketData[0].price;
      if (currentPrice) {
        // When using AI, we let the AI determine optimal grid levels
        if (!form.getValues("useAI")) {
          // For manual setup, suggest a range based on ±5% from current price
          const upperPrice = (currentPrice * 1.05).toFixed(2);
          const lowerPrice = (currentPrice * 0.95).toFixed(2);
          form.setValue("upperPrice", upperPrice);
          form.setValue("lowerPrice", lowerPrice);
          form.setValue("gridCount", "5");
        }
      }
    }
  }, [marketData, form]);

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (data: BotFormValues) => {
      // Format the data for the API
      const gridParameters = {
        symbol: data.symbol,
        upperPrice: data.upperPrice ? parseFloat(data.upperPrice) : undefined,
        lowerPrice: data.lowerPrice ? parseFloat(data.lowerPrice) : undefined,
        gridCount: data.gridCount ? parseInt(data.gridCount, 10) : undefined,
        totalInvestment: parseFloat(data.totalInvestment),
        useAI: data.useAI,
        // Risk management parameters
        stopLossPercentage: data.stopLossPercentage,
        takeProfitPercentage: data.takeProfitPercentage,
        maxInvestmentPerTrade: data.maxInvestmentPerTrade ? parseFloat(data.maxInvestmentPerTrade) : 100,
        emergencyStopEnabled: data.emergencyStopEnabled,
        useAdaptiveRiskAdjustment: data.useAdaptiveRiskAdjustment,
      };

      return apiRequest("POST", "/api/bots", {
        name: data.name,
        strategy: "ai_grid", // Changed to AI_GRID strategy
        description: data.useAI 
          ? "AI-powered grid trading bot that automatically analyzes market conditions" 
          : "Grid trading bot with manual configuration",
        parameters: gridParameters,
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Bot Created Successfully",
        description: "Your AI Grid Trading Bot has been created.",
      });
      
      // Store the bot ID and navigate to the appropriate tab
      if (response.bot && response.bot.id) {
        setBotId(response.bot.id);
        setActiveTab("status");
        
        // Auto-start the bot if AI is enabled
        if (form.getValues("useAI")) {
          startBotMutation.mutate(response.bot.id);
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Bot",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Start bot mutation
  const startBotMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("POST", `/api/bots/${id}/start`);
    },
    onSuccess: () => {
      setIsRunning(true);
      toast({
        title: "Bot Started",
        description: "Your trading bot is now running",
      });
      
      // Refetch bot status
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId, 'status'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Bot",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("POST", `/api/bots/${id}/stop`);
    },
    onSuccess: () => {
      setIsRunning(false);
      toast({
        title: "Bot Stopped",
        description: "Your trading bot has been stopped",
      });
      
      // Refetch bot status
      queryClient.invalidateQueries({ queryKey: ['/api/bots', botId, 'status'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Stop Bot",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Get bot status
  const {
    data: botStatus = { stats: {}, trades: [] },
    isLoading: isLoadingStatus,
  } = useQuery<{ stats: any, trades: any[] }>({
    queryKey: ['/api/bots', botId, 'status'],
    enabled: !!botId,
    refetchInterval: isRunning ? 10000 : false,
  });

  // Get bot performance data
  const {
    data: performanceData = [],
    isLoading: isLoadingPerformance,
  } = useQuery<any[]>({
    queryKey: ['/api/bots', botId, 'performance'],
    enabled: !!botId,
    refetchInterval: isRunning ? 30000 : false,
  });

  // Handle form submission
  const onSubmit = (data: BotFormValues) => {
    createBotMutation.mutate(data);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-16 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center">
              <Brain className="mr-2 h-8 w-8 text-primary" />
              AI Grid Trading Bot
            </h1>
            <p className="text-muted-foreground text-lg">
              Create an AI-powered grid trading bot that automatically optimizes parameters based on market conditions
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings" disabled={createBotMutation.isPending}>
                <Settings className="h-4 w-4 mr-2" />
                Bot Setup
              </TabsTrigger>
              <TabsTrigger value="status" disabled={!botId}>
                <AreaChart className="h-4 w-4 mr-2" />
                Bot Status
              </TabsTrigger>
              <TabsTrigger value="trades" disabled={!botId}>
                <History className="h-4 w-4 mr-2" />
                Trading History
              </TabsTrigger>
            </TabsList>

            {/* Bot Setup Tab */}
            <TabsContent value="settings" className="space-y-4">
              <BotExplanationGuide botType="ai-grid" />
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Grid Trading Bot Configuration</CardTitle>
                      <CardDescription>
                        Configure your automated trading bot to buy low and sell high automatically
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bot Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="symbol"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trading Pair</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select trading pair" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tradingPairs.map((pair) => (
                                    <SelectItem key={pair} value={pair}>
                                      {pair}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="totalInvestment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Investment (USDT)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="100"
                                step="100"
                              />
                            </FormControl>
                            <FormDescription>
                              Minimum investment: $100 USDT
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="useAI"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between p-4 rounded-lg border">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">AI-Powered Optimization</FormLabel>
                              <FormDescription>
                                Let AI analyze market conditions and optimize grid parameters for maximum profits.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {!form.watch("useAI") && (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 pt-4 border-t">
                          <FormField
                            control={form.control}
                            name="upperPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Upper Price</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="0.01" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="lowerPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Lower Price</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="0.01" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="gridCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Grid Count</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="3" max="20" step="1" />
                                </FormControl>
                                <FormDescription>
                                  Number of grid levels (3-20)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <RiskManagementSection botType="ai-grid" />
                      <Button
                        type="submit"
                        className="w-full md:w-auto"
                        disabled={createBotMutation.isPending}
                      >
                        {createBotMutation.isPending ? "Creating Bot..." : "Create Grid Trading Bot"}
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>

              <Card>
                <CardHeader>
                  <CardTitle>How Grid Trading Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="flex flex-col items-center text-center p-4">
                      <Grid3x3 className="h-12 w-12 mb-2 text-primary" />
                      <h3 className="text-lg font-medium mb-2">Define Price Grid</h3>
                      <p className="text-muted-foreground">
                        Create a grid of price levels between upper and lower limits
                      </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4">
                      <ArrowDownRight className="h-12 w-12 mb-2 text-green-500" />
                      <h3 className="text-lg font-medium mb-2">Buy Low</h3>
                      <p className="text-muted-foreground">
                        Automatically place buy orders when price falls to lower grid levels
                      </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4">
                      <ArrowUpRight className="h-12 w-12 mb-2 text-primary" />
                      <h3 className="text-lg font-medium mb-2">Sell High</h3>
                      <p className="text-muted-foreground">
                        Automatically sell when price rises to higher grid levels
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bot Status Tab */}
            <TabsContent value="status" className="space-y-4">
              {isLoadingStatus ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Bot Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Status</p>
                              <p className="text-sm text-muted-foreground">Current bot state</p>
                            </div>
                            <Badge variant={isRunning ? "default" : "outline"}>
                              {isRunning ? (
                                <div className="flex items-center">
                                  <span className="h-2 w-2 mr-1 rounded-full bg-green-500 animate-pulse"></span>
                                  Running
                                </div>
                              ) : "Stopped"}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Trading Pair</p>
                              <p className="text-sm text-muted-foreground">Current market</p>
                            </div>
                            <Badge variant="secondary">{botStatus?.stats?.symbol || form.getValues("symbol")}</Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Total Investment</p>
                              <p className="text-sm text-muted-foreground">Capital allocated</p>
                            </div>
                            <div className="font-semibold">${botStatus?.stats?.totalInvestment || form.getValues("totalInvestment")}</div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Profit/Loss</p>
                              <p className="text-sm text-muted-foreground">Current performance</p>
                            </div>
                            <div className={`font-semibold ${
                              botStatus?.stats?.profitLossPercent?.startsWith("+") 
                                ? "text-green-500" 
                                : "text-red-500"
                            }`}>
                              {botStatus?.stats?.profitLossPercent || "0.00%"} (${botStatus?.stats?.profitLoss || "0.00"})
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Total Trades</p>
                              <p className="text-sm text-muted-foreground">Completed transactions</p>
                            </div>
                            <div className="font-semibold">{botStatus?.stats?.totalTrades || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        {isRunning ? (
                          <Button 
                            onClick={() => stopBotMutation.mutate(botId!)} 
                            disabled={stopBotMutation.isPending}
                            variant="destructive"
                            className="w-full"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            {stopBotMutation.isPending ? "Stopping..." : "Stop Bot"}
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => startBotMutation.mutate(botId!)} 
                            disabled={startBotMutation.isPending}
                            className="w-full"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {startBotMutation.isPending ? "Starting..." : "Start Bot"}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Bot Parameters</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {botStatus?.stats?.useAI && (
                            <div className="rounded-md bg-primary/10 p-4 border border-primary/20 mb-4">
                              <div className="flex items-start">
                                <Brain className="h-5 w-5 mr-2 text-primary" />
                                <div>
                                  <p className="font-semibold">AI-Powered Optimization Active</p>
                                  <p className="text-sm text-muted-foreground">
                                    This bot uses machine learning algorithms to automatically optimize grid parameters based on market conditions.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Strategy</p>
                              <p className="text-sm text-muted-foreground">Trading method</p>
                            </div>
                            <Badge>Grid Trading</Badge>
                          </div>
                          
                          {!botStatus?.stats?.useAI && (
                            <>
                              <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-none">Upper Price</p>
                                  <p className="text-sm text-muted-foreground">Highest grid level</p>
                                </div>
                                <div className="font-semibold">${botStatus?.stats?.upperPrice || "N/A"}</div>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-none">Lower Price</p>
                                  <p className="text-sm text-muted-foreground">Lowest grid level</p>
                                </div>
                                <div className="font-semibold">${botStatus?.stats?.lowerPrice || "N/A"}</div>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-none">Grid Count</p>
                                  <p className="text-sm text-muted-foreground">Number of grid levels</p>
                                </div>
                                <div className="font-semibold">{botStatus?.stats?.gridCount || "N/A"}</div>
                              </div>
                            </>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">Last Started</p>
                              <p className="text-sm text-muted-foreground">Bot activation time</p>
                            </div>
                            <div className="font-semibold">
                              {botStatus?.stats?.lastStartedAt 
                                ? new Date(botStatus.stats.lastStartedAt).toLocaleString() 
                                : "N/A"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Chart</CardTitle>
                      <CardDescription>Portfolio value over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        {isLoadingPerformance ? (
                          <div className="flex justify-center items-center h-full">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        ) : performanceData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                              <XAxis 
                                dataKey="timestamp" 
                                tickFormatter={(timestamp) => {
                                  const date = new Date(timestamp);
                                  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                                }}
                              />
                              <YAxis />
                              <CartesianGrid strokeDasharray="3 3" />
                              <Tooltip 
                                formatter={(value) => [`$${value}`, "Portfolio Value"]}
                                labelFormatter={(timestamp) => {
                                  const date = new Date(timestamp);
                                  return date.toLocaleString();
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#8884d8" 
                                strokeWidth={2}
                                activeDot={{ r: 8 }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex justify-center items-center h-full text-muted-foreground">
                            <p>No performance data available yet</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Trading History Tab */}
            <TabsContent value="trades" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trading History</CardTitle>
                  <CardDescription>Recent bot transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStatus ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : botStatus?.trades && botStatus.trades.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground tracking-wider">Time</th>
                              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground tracking-wider">Type</th>
                              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground tracking-wider">Price</th>
                              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground tracking-wider">Size</th>
                              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground tracking-wider">Value</th>
                              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground tracking-wider">Profit/Loss</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-background">
                            {botStatus.trades.map((trade, index) => (
                              <tr key={index}>
                                <td className="py-3 px-4 text-sm">
                                  {new Date(trade.timestamp).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                                    {trade.side === 'buy' ? 'BUY' : 'SELL'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm font-medium">
                                  ${parseFloat(trade.price).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {parseFloat(trade.size).toFixed(5)}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  ${(parseFloat(trade.price) * parseFloat(trade.size)).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {trade.profit ? (
                                    <span className={trade.profit > 0 ? 'text-green-500' : 'text-red-500'}>
                                      {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)} USD
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Trading History Yet</h3>
                      <p className="text-muted-foreground">
                        Your bot's trading history will appear here once it starts making trades.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      
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
            <DialogTitle className="flex items-center">
              <Key className="w-6 h-6 mr-2 text-primary" />
              API Keys Required
            </DialogTitle>
            <DialogDescription>
              You need to configure your OKX API keys before creating a trading bot.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className="mb-4">
              <AlertTitle className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Trading requires API access
              </AlertTitle>
              <p className="mt-2">To use the AI Grid Bot, you need to provide your OKX API keys with trading permissions.</p>
            </Alert>
            
            <p className="mb-4">
              Please set up your API keys to continue. This is required for the trading bot to execute trades on your behalf.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Later
            </Button>
            <Button onClick={() => {
              setShowApiKeyDialog(false);
              setLocation("/api-keys");
            }} className="gap-2">
              Set Up API Keys <ArrowRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}