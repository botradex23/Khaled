import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
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
} from "lucide-react";

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
});

type BotFormValues = z.infer<typeof botFormSchema>;

// Define the AI Grid Bot creation page
export default function AIGridBot() {
  const [activeTab, setActiveTab] = useState("settings");
  const [botId, setBotId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

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
    },
  });

  // Get market data for the selected pair
  const selectedPair = form.watch("symbol");
  const { data: marketData = [] } = useQuery<any[]>({
    queryKey: ['/api/bitget/markets', selectedPair],
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
      };

      return apiRequest("POST", "/api/bitget/bots", {
        name: data.name,
        strategy: "grid",
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
      return apiRequest("POST", `/api/bitget/bots/${id}/start`);
    },
    onSuccess: () => {
      setIsRunning(true);
      toast({
        title: "Bot Started",
        description: "Your trading bot is now running",
      });
      
      // Refetch bot status
      queryClient.invalidateQueries({ queryKey: ['/api/bitget/bots', botId, 'status'] });
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
      return apiRequest("POST", `/api/bitget/bots/${id}/stop`);
    },
    onSuccess: () => {
      setIsRunning(false);
      toast({
        title: "Bot Stopped",
        description: "Your trading bot has been stopped",
      });
      
      // Refetch bot status
      queryClient.invalidateQueries({ queryKey: ['/api/bitget/bots', botId, 'status'] });
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
    queryKey: ['/api/bitget/bots', botId, 'status'],
    enabled: !!botId,
    refetchInterval: isRunning ? 10000 : false,
  });

  // Get bot performance data
  const {
    data: performanceData = [],
    isLoading: isLoadingPerformance,
  } = useQuery<any[]>({
    queryKey: ['/api/bitget/bots', botId, 'performance'],
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
                    <CardFooter>
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
              {botId ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          <span>Bot Status</span>
                          {isRunning ? (
                            <Badge variant="default" className="ml-2 bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Running
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2">
                              <AlertCircle className="mr-1 h-3 w-3" /> Stopped
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingStatus ? (
                          <div className="flex justify-center py-8">
                            <div className="loader"></div>
                          </div>
                        ) : botStatus?.stats ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Profit/Loss</p>
                                <p className={`text-2xl font-bold ${
                                  botStatus.stats.profitLoss.startsWith('-') 
                                    ? 'text-red-500' 
                                    : 'text-green-500'
                                }`}>
                                  {botStatus.stats.profitLoss}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Trades Executed</p>
                                <p className="text-2xl font-bold">{botStatus.stats.executionCount}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Last Activity</p>
                              <p className="text-base">
                                {new Date(botStatus.stats.lastExecuted).toLocaleString()}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Bot Type</p>
                              <div className="flex items-center">
                                {botStatus.stats.botType === 'AI-Powered' ? (
                                  <>
                                    <Brain className="h-4 w-4 mr-1 text-primary" />
                                    <span>AI-Powered Grid Trading</span>
                                  </>
                                ) : (
                                  <>
                                    <Grid3x3 className="h-4 w-4 mr-1" />
                                    <span>Standard Grid Trading</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Active Since</p>
                              <p className="text-base">
                                {new Date(botStatus.stats.activeSince).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p>No status information available</p>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        {isRunning ? (
                          <Button
                            variant="destructive"
                            onClick={() => botId && stopBotMutation.mutate(botId)}
                            disabled={stopBotMutation.isPending}
                          >
                            <Square className="mr-2 h-4 w-4" />
                            {stopBotMutation.isPending ? "Stopping..." : "Stop Bot"}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => botId && startBotMutation.mutate(botId)}
                            disabled={startBotMutation.isPending}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {startBotMutation.isPending ? "Starting..." : "Start Bot"}
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => setActiveTab("trades")}>
                          <History className="mr-2 h-4 w-4" />
                          View Trades
                        </Button>
                      </CardFooter>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Performance</CardTitle>
                        <CardDescription>
                          Bot performance over time
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {isLoadingPerformance ? (
                          <div className="flex justify-center py-12">
                            <div className="loader"></div>
                          </div>
                        ) : performanceData && performanceData.length > 0 ? (
                          <div className="pt-2 px-2 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={performanceData}
                                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="date" 
                                  tick={{ fontSize: 12 }} 
                                  tickFormatter={(date) => {
                                    // Format date string to shorter version (MM-DD)
                                    const d = new Date(date);
                                    return `${d.getMonth()+1}/${d.getDate()}`;
                                  }}
                                />
                                <YAxis 
                                  tick={{ fontSize: 12 }} 
                                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                                />
                                <Tooltip 
                                  formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Return"]}
                                  labelFormatter={(date) => `Date: ${date}`}
                                />
                                <Legend />
                                <Line
                                  type="monotone"
                                  dataKey="cumulativeReturn"
                                  name="Cumulative Return"
                                  stroke="#8884d8"
                                  activeDot={{ r: 8 }}
                                  strokeWidth={2}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="return"
                                  name="Daily Return"
                                  stroke="#82ca9d"
                                  strokeWidth={1}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="py-12 text-center">
                            <p>No performance data available yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-medium mb-2">No Bot Created Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Please create a new Grid Trading Bot to see its status here
                    </p>
                    <Button onClick={() => setActiveTab("settings")}>
                      Create New Bot
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Trades Tab */}
            <TabsContent value="trades" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trading History</CardTitle>
                  <CardDescription>
                    Recent trades executed by your bot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStatus ? (
                    <div className="flex justify-center py-8">
                      <div className="loader"></div>
                    </div>
                  ) : botStatus?.trades && botStatus.trades.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="text-left font-medium p-2">Time</th>
                            <th className="text-left font-medium p-2">Action</th>
                            <th className="text-left font-medium p-2">Pair</th>
                            <th className="text-right font-medium p-2">Amount</th>
                            <th className="text-right font-medium p-2">Price</th>
                            <th className="text-right font-medium p-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {botStatus.trades.map((trade: any) => (
                            <tr key={trade.id} className="border-t border-border">
                              <td className="p-2 text-sm">
                                {new Date(trade.time).toLocaleString()}
                              </td>
                              <td className="p-2">
                                <Badge variant={trade.action === "BUY" ? "default" : "secondary"}>
                                  {trade.action}
                                </Badge>
                              </td>
                              <td className="p-2">{trade.pair}</td>
                              <td className="p-2 text-right">{trade.amount}</td>
                              <td className="p-2 text-right">${trade.price}</td>
                              <td className="p-2 text-right">${trade.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-medium mb-2">No Trades Yet</h3>
                      <p className="text-muted-foreground">
                        Once your bot starts trading, the history will appear here
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
      
      <style dangerouslySetInnerHTML={{ __html: `
        .loader {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 3px solid var(--primary);
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}