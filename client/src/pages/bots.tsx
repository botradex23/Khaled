import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  RefreshCw
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
import { gridChartData, dcaChartData, macdChartData } from "@/lib/chart-data";

export default function Bots() {
  // State for the filter and search inputs
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch bots data
  const { data: bots, isLoading } = useQuery<Bot[]>({
    queryKey: ['/api/bots'],
  });
  
  // Filter and search functionality
  const filteredBots = bots?.filter(bot => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // For now we don't have active/inactive status in the Bot type, so we just return all
    const matchesStatus = statusFilter === "all" ? true : true;
    
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
            <Button className="mt-4 md:mt-0">
              <Plus className="mr-2 h-4 w-4" />
              Create New Bot
            </Button>
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
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Play className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Settings className="h-4 w-4" />
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
                        <Button variant="outline" size="sm">
                          <span>Performance Details</span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="py-10">
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">You don't have any active bots yet</p>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Bot
                    </Button>
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
                    {/* Grid Trading Strategy */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">Grid Trading</CardTitle>
                          <div className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                            POPULAR
                          </div>
                        </div>
                        <CardDescription>
                          Buy low and sell high within a price range
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
                            <span className="text-sm font-medium">+5.2%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Risk Level</span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1 h-4 mx-0.5 rounded-sm ${i < 2 ? 'bg-primary' : 'bg-border'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Deploy This Strategy
                        </Button>
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
                        <Button className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Deploy This Strategy
                        </Button>
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
                        <Button className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Deploy This Strategy
                        </Button>
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
                                name="Grid Trading Bot"
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
    </div>
  );
}