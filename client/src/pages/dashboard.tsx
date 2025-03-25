import { useQuery } from "@tanstack/react-query";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { Bot, StrategyType } from "@/types";
import { performanceChartData, assetAllocationData } from "@/lib/chart-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  BarChart4, 
  PieChart as PieChartIcon,
  Wallet
} from "lucide-react";

export default function Dashboard() {
  // Fetch user's bots
  const { data: bots, isLoading } = useQuery<Bot[]>({
    queryKey: ['/api/bots'],
  });
  
  // Sample portfolio data
  const portfolioValue = 15420.65;
  const portfolioChange = 3.2;
  const isPositiveChange = portfolioChange > 0;
  
  // Placeholder trading activity data
  const recentTrades = [
    { id: 1, type: "BUY", asset: "BTC", amount: 0.05, price: 42356.78, time: "2 hours ago" },
    { id: 2, type: "SELL", asset: "ETH", amount: 1.2, price: 2456.32, time: "5 hours ago" },
    { id: 3, type: "BUY", asset: "SOL", amount: 10, price: 132.45, time: "Yesterday" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Portfolio Value Card */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-medium">Portfolio Value</CardTitle>
                <CardDescription>Your total portfolio performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline mb-4">
                  <h2 className="text-3xl font-bold">${portfolioValue.toLocaleString()}</h2>
                  <span className={`ml-2 text-sm flex items-center ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositiveChange ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                    {Math.abs(portfolioChange)}%
                  </span>
                </div>
                
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={performanceChartData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                        formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Asset Allocation Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-medium">Asset Allocation</CardTitle>
                <CardDescription>Your portfolio distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {assetAllocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                        formatter={(value: any) => [`${value}%`, 'Allocation']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Bots Section */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-medium">Active Bots</CardTitle>
                  <CardDescription>Your automated trading strategies</CardDescription>
                </div>
                <Button className="flex items-center" onClick={() => window.location.href = "/bots"}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Bot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading bots...</div>
              ) : bots && bots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bots.map(bot => (
                    <Card key={bot.id} className="bg-card/60">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-medium">{bot.name}</CardTitle>
                          <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {bot.strategy.toUpperCase()}
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2">{bot.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm text-muted-foreground">Monthly Return</div>
                          <div className="font-medium text-green-500">+{bot.monthlyReturn}%</div>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-sm text-muted-foreground">Risk Level</div>
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-1.5 h-6 mx-0.5 rounded-sm ${i < bot.riskLevel ? 'bg-primary' : 'bg-border'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = `/bots?id=${bot.id}`}>
                          <span>View Details</span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground mb-4">You don't have any active bots yet</p>
                  <Button onClick={() => window.location.href = "/bots"}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Bot
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics Tabs Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trading Activity */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl font-medium">Trading Activity</CardTitle>
                <CardDescription>Recent trades executed by your bots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-5 bg-muted/40 p-3 font-medium">
                    <div>Type</div>
                    <div>Asset</div>
                    <div>Amount</div>
                    <div>Price</div>
                    <div>Time</div>
                  </div>
                  {recentTrades.map(trade => (
                    <div key={trade.id} className="grid grid-cols-5 p-3 border-t">
                      <div className={trade.type === "BUY" ? "text-green-500" : "text-red-500"}>
                        {trade.type}
                      </div>
                      <div>{trade.asset}</div>
                      <div>{trade.amount}</div>
                      <div>${trade.price.toLocaleString()}</div>
                      <div className="text-muted-foreground">{trade.time}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => window.location.href = "/markets"}>
                    View All Trades
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.alert("Deposit funds functionality coming soon!")}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Deposit Funds
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = "/markets"}>
                    <BarChart4 className="mr-2 h-4 w-4" />
                    Market Analysis
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.alert("Portfolio rebalance functionality coming soon!")}>
                    <PieChartIcon className="mr-2 h-4 w-4" />
                    Portfolio Rebalance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}