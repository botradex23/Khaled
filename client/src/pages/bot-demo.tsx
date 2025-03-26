import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriceChart } from "@/components/ui/price-chart";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AccountBalanceCard } from "@/components/ui/account-overview";
import { MarketTickerCard } from "@/components/ui/market-ticker";
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  BarChart,
  LineChart,
  Clock,
  Settings,
  Play,
  Pause,
  History,
  RefreshCw
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Trading Bot Demo Data
const botPerformanceData = [
  { date: "Mar 01", value: 10000 },
  { date: "Mar 05", value: 10240 },
  { date: "Mar 10", value: 10180 },
  { date: "Mar 15", value: 10350 },
  { date: "Mar 20", value: 10520 },
  { date: "Mar 25", value: 10680 },
  { date: "Mar 26", value: 10790 },
];

// Bot activity history data
const botActivityData = [
  { time: "2023-03-26 05:32:10", action: "BUY", pair: "BTC-USDT", amount: "0.02", price: "87742.5" },
  { time: "2023-03-25 18:45:23", action: "SELL", pair: "SOL-USDT", amount: "5.0", price: "144.23" },
  { time: "2023-03-25 12:21:05", action: "BUY", pair: "ETH-USDT", amount: "0.5", price: "2077.11" },
  { time: "2023-03-24 22:05:17", action: "SELL", pair: "BTC-USDT", amount: "0.015", price: "86303.3" },
  { time: "2023-03-24 14:32:44", action: "BUY", pair: "SOL-USDT", amount: "8.0", price: "138.13" },
];

export default function BotDemo() {
  const [botRunning, setBotRunning] = useState(true);
  
  // Fetch account balances
  const { data: balanceData } = useQuery({
    queryKey: ["/api/okx/account/balance"],
    refetchInterval: 30000 // 30 seconds refresh
  });
  
  // Extract relevant balance data
  const balances = Array.isArray(balanceData) ? balanceData : [];
  
  // Check if we have balance data to display
  const hasFunds = balances.length > 0 && balances.some(b => b.total > 0);
  
  // Calculate total portfolio value
  const totalValue = balances.reduce((sum, asset) => sum + asset.valueUSD, 0);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Grid Trading Bot Demo</h1>
              <p className="text-muted-foreground">
                Real-time performance of your automated trading bot
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                onClick={() => setBotRunning(!botRunning)}
                variant={botRunning ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {botRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {botRunning ? "Stop Bot" : "Start Bot"}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Bot Status Card */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <span className={`relative flex h-3 w-3 mr-2`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${botRunning ? 'bg-green-400' : 'bg-gray-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${botRunning ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  </span>
                  Bot Status
                </CardTitle>
                <CardDescription>
                  {botRunning ? "Active and trading" : "Currently paused"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Strategy</span>
                    <Badge>Grid Trading</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trading Pair</span>
                    <span className="text-sm">BTC-USDT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Grid Range</span>
                    <span className="text-sm">$80,000 - $95,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Grid Levels</span>
                    <span className="text-sm">10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Running Since</span>
                    <span className="text-sm">March 20, 2023</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Bot Efficiency</span>
                      <span>87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Bot Performance Graph */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Bot Performance
                </CardTitle>
                <CardDescription>
                  Total Profit: +7.9% ($790.00)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={botPerformanceData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value) => `$${value.toLocaleString()}`}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Market Data and Account Balance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Tabs defaultValue="balance">
                <TabsList className="mb-4">
                  <TabsTrigger value="balance">
                    <Wallet className="h-4 w-4 mr-2" />
                    Account Balance
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    <History className="h-4 w-4 mr-2" />
                    Trading Activity
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Bot Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="balance" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Portfolio Value</CardTitle>
                      <CardDescription>
                        {hasFunds 
                          ? `Currently managing ${balances.filter(b => b.total > 0).length} cryptocurrencies` 
                          : "Connect to your OKX account to view real balances"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <span className="text-3xl font-bold">
                            ${totalValue > 0 
                              ? totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : "10,790.00"}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {hasFunds ? (
                            balances
                              .filter(asset => asset.total > 0)
                              .sort((a, b) => b.valueUSD - a.valueUSD)
                              .slice(0, 5)
                              .map((asset) => {
                                const percentage = (asset.valueUSD / totalValue) * 100;
                                return (
                                  <div key={asset.currency} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">{asset.currency}</span>
                                      <span>${asset.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={percentage} className="h-2" />
                                      <span className="text-xs text-muted-foreground w-12 text-right">
                                        {percentage.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                          ) : (
                            // Demo portfolio allocation if no real data available
                            <>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">BTC</span>
                                  <span>$5,500.00</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={51} className="h-2" />
                                  <span className="text-xs text-muted-foreground w-12 text-right">51.0%</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">ETH</span>
                                  <span>$2,200.00</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={20.4} className="h-2" />
                                  <span className="text-xs text-muted-foreground w-12 text-right">20.4%</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">USDT</span>
                                  <span>$1,800.00</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={16.7} className="h-2" />
                                  <span className="text-xs text-muted-foreground w-12 text-right">16.7%</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">SOL</span>
                                  <span>$1,290.00</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={11.9} className="h-2" />
                                  <span className="text-xs text-muted-foreground w-12 text-right">11.9%</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="activity">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Recent Bot Activity</CardTitle>
                      <CardDescription>Latest trades executed by your bot</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {botActivityData.map((activity, index) => (
                          <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">{activity.pair}</div>
                              <Badge variant={activity.action === "BUY" ? "default" : "destructive"}>
                                {activity.action}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground mt-1">
                              <div>Amount: {activity.amount}</div>
                              <div>Price: ${parseFloat(activity.price).toLocaleString()}</div>
                              <div className="text-xs">{new Date(activity.time).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="settings">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Bot Configuration</CardTitle>
                      <CardDescription>Adjust your trading parameters</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Trading Pair</label>
                            <div className="flex items-center mt-1 p-2 border rounded-md">
                              <span>BTC-USDT</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Strategy Type</label>
                            <div className="flex items-center mt-1 p-2 border rounded-md">
                              <span>Grid Trading</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Upper Price Bound</label>
                            <div className="flex items-center mt-1 p-2 border rounded-md">
                              <span>$95,000</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Lower Price Bound</label>
                            <div className="flex items-center mt-1 p-2 border rounded-md">
                              <span>$80,000</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Grid Levels</label>
                            <div className="flex items-center mt-1 p-2 border rounded-md">
                              <span>10</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Investment Amount</label>
                            <div className="flex items-center mt-1 p-2 border rounded-md">
                              <span>$10,000</span>
                            </div>
                          </div>
                        </div>
                        <div className="pt-4">
                          <Button disabled className="w-full">
                            <Settings className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Changes to bot configuration are disabled in demo mode
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="space-y-6">
              {/* Market Prices */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Live Market Prices</CardTitle>
                  <CardDescription>Key cryptocurrency pairs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MarketTickerCard symbol="BTC-USDT" />
                  <div className="text-xs text-center text-muted-foreground mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-8 px-2 -my-1"
                      onClick={() => window.location.href = "/markets"}
                    >
                      View All Markets
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Price Chart */}
              <div className="hidden lg:block">
                <PriceChart symbol="BTC-USDT" />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}