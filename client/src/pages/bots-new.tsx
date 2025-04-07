import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import { useAuth } from "../hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { ArrowUpRight, Bot, ChevronRight, ChevronsUp, LineChart, Plus, ShieldCheck, Sliders, Waves } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { z } from "zod";
import { BotMarketplace } from "../components/layout/bot-marketplace";

// Strategy type from backend
export enum StrategyType {
  GRID = "GRID",
  DCA = "DCA",
  MACD = "MACD",
  AI_GRID = "AI_GRID"
}

// Trading bot interface from backend
interface TradingBot {
  id: number;
  userId: number;
  name: string;
  description: string;
  pair: string;
  exchange: string;
  strategy: string;
  status: string;
  parameters: Record<string, any>;
  profitLoss: string;
  profitLossPercentage: string;
  createdAt: string;
  updatedAt: string;
}

// User API keys interface
interface ApiKeysResponse {
  message: string;
  apiKeys: {
    binanceApiKey: string | null;
    binanceSecretKey: string | null;
    defaultBroker: string;
    useTestnet: boolean;
  };
}

export default function Bots() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isApiKeysAvailable, setIsApiKeysAvailable] = useState(false);

  // Query user's API keys to check if they're set up
  const { data: apiKeysData, isLoading: isLoadingApiKeys, error: apiKeysError } = useQuery({
    queryKey: ['/api/user/api-keys'],
    enabled: isAuthenticated,
  });

  // Effect to check API keys when data is available
  useEffect(() => {
    if (apiKeysData && (apiKeysData as ApiKeysResponse).apiKeys) {
      const keys = (apiKeysData as ApiKeysResponse).apiKeys;
      if (keys.binanceApiKey && keys.binanceSecretKey) {
        setIsApiKeysAvailable(true);
      }
    }
  }, [apiKeysData]);

  // Query user's trading bots
  const { data: botsData, isLoading: isLoadingBots, error: botsError } = useQuery({
    queryKey: ['/api/binance/bots'],
    enabled: isAuthenticated && isApiKeysAvailable,
  });

  // Mutation to start/stop bot
  const toggleBotStatusMutation = useMutation({
    mutationFn: async ({ botId, action }: { botId: number, action: 'start' | 'stop' }) => {
      const url = `/api/binance/bots/${botId}/${action}`;
      const options = { method: 'POST' };
      return apiRequest(url, options as any);
    }
  });
  
  // Handle mutation success/error
  useEffect(() => {
    if (toggleBotStatusMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['/api/binance/bots'] });
      toast({
        title: "Success",
        description: "Bot status updated successfully",
      });
    } else if (toggleBotStatusMutation.isError) {
      const error = toggleBotStatusMutation.error as Error;
      toast({
        title: "Failed to update bot status",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toggleBotStatusMutation.isSuccess, toggleBotStatusMutation.isError, toggleBotStatusMutation.error, queryClient, toast]);

  const handleToggleBotStatus = (botId: number, currentStatus: string) => {
    const action = currentStatus === 'RUNNING' ? 'stop' : 'start';
    toggleBotStatusMutation.mutate({ botId, action });
  };

  // Mock sample data for chart
  const getChartDataForStrategy = (strategy: StrategyType) => {
    // In a real implementation, this would fetch data from the API
    const baseData = [10, 41, 35, 51, 49, 62, 69, 91, 148];
    
    switch(strategy) {
      case StrategyType.GRID:
        return [...baseData.map(val => val * 1.2)];
      case StrategyType.DCA:
        return [...baseData.map(val => val * 0.9)];
      case StrategyType.MACD:
        return [...baseData.map(val => val * 1.5)];
      case StrategyType.AI_GRID:
        return [...baseData.map(val => val * 1.8)];
      default:
        return baseData;
    }
  };

  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Bots</h1>
            <p className="text-muted-foreground">
              Configure and manage automated trading strategies
            </p>
          </div>

          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full md:w-auto md:flex">
              <TabsTrigger value="overview" className="md:w-auto">Overview</TabsTrigger>
              <TabsTrigger value="marketplace" className="md:w-auto">Bot Marketplace</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Bots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Array.isArray(botsData) ? botsData.filter((bot: TradingBot) => bot.status === 'RUNNING').length : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {Array.isArray(botsData) ? botsData.length : 0} total bots
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Profit/Loss
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      +$1,248.33
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +5.2% all time
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Risk Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2 items-center">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <div>
                      <div className="text-sm font-medium">Protected</div>
                      <div className="text-xs text-muted-foreground">
                        5% max portfolio risk
                      </div>
                    </div>
                    <Link href="/risk-management" className="ml-auto">
                      <Button variant="outline" size="sm">
                        Settings
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {isApiKeysAvailable ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Your Trading Bots</h2>
                    <Link href="/grid-bot">
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Bot
                      </Button>
                    </Link>
                  </div>
                  
                  {isLoadingBots ? (
                    <div className="text-center py-8">Loading your bots...</div>
                  ) : botsError ? (
                    <Card className="border-destructive">
                      <CardContent className="pt-6">
                        <div className="text-center text-destructive">
                          <p className="mb-2">Failed to load your trading bots</p>
                          <Button 
                            variant="outline" 
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/binance/bots'] })}
                          >
                            Try Again
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : Array.isArray(botsData) && botsData.length > 0 ? (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Strategy</TableHead>
                            <TableHead>Pair</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Profit/Loss</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(botsData) && botsData.map((bot: TradingBot) => (
                            <TableRow key={bot.id}>
                              <TableCell>
                                <div className="font-medium">{bot.name}</div>
                                <div className="text-xs text-muted-foreground">{bot.description}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {bot.strategy.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>{bot.pair}</TableCell>
                              <TableCell>
                                <Badge 
                                  className={bot.status === 'RUNNING' ? 'bg-green-600' : 'bg-yellow-600'}
                                >
                                  {bot.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className={`font-medium ${Number(bot.profitLoss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {Number(bot.profitLoss) >= 0 ? '+' : ''}{bot.profitLoss}
                                  <span className="text-xs ml-1">({bot.profitLossPercentage}%)</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleToggleBotStatus(bot.id, bot.status)}
                                  >
                                    {bot.status === 'RUNNING' ? 'Stop' : 'Start'}
                                  </Button>
                                  <Button variant="outline" size="sm">Edit</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Trading Bots Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Get started by creating your first automated trading bot
                        </p>
                        <Link href="/grid-bot">
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Bot
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Sliders className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">API Keys Required</h3>
                    <p className="text-muted-foreground mb-4">
                      You need to configure your exchange API keys to create and manage trading bots
                    </p>
                    <Link href="/api-keys">
                      <Button>
                        <ChevronRight className="mr-2 h-4 w-4" />
                        Configure API Keys
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="marketplace" className="space-y-6">
              <BotMarketplace />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}