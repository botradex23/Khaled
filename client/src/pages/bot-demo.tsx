import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Settings,
  History,
  BarChart3,
  TrendingUp,
  Play,
  Pause,
  RefreshCw,
  LineChart
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

export default function BotDemo() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["BTC-USDT"]);
  
  // Handle checkbox change for trading pairs
  const handleSymbolChange = (symbol: string, checked: boolean) => {
    if (checked) {
      setSelectedSymbols(prev => [...prev, symbol]);
    } else {
      setSelectedSymbols(prev => prev.filter(s => s !== symbol));
    }
  };
  
  // Available trading pairs
  const availableTradingPairs = [
    "BTC-USDT",
    "ETH-USDT",
    "SOL-USDT",
    "XRP-USDT",
    "BNB-USDT"
  ];
  
  return (
    <div className="flex flex-col min-h-screen bg-background dark">
      <Header />
      <main className="flex-grow pt-16 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Main Content - Performance Stats */}
            <div className="md:col-span-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">AI Grid Bot</h1>
                  <p className="text-muted-foreground mt-1">
                    Advanced AI-powered bot trading multiple cryptocurrencies
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Start Bot
                  </Button>
                </div>
              </div>
              
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Trades Card */}
                <Card className="bg-blue-950 border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-blue-300">Total Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <TrendingUp className="h-6 w-6 mr-2 text-blue-400" />
                      <span className="text-3xl font-bold text-blue-100">0</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Profit/Loss Card */}
                <Card className="bg-blue-950 border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-blue-300">Profit/Loss</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <BarChart3 className="h-6 w-6 mr-2 text-blue-400" />
                      <span className="text-3xl font-bold text-blue-100">0</span>
                      <span className="text-sm ml-2 text-blue-300">0%</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Bot Status Card */}
                <Card className="bg-blue-950 border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-blue-300">Bot Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Badge variant="outline" className="border-amber-500 text-amber-400 bg-amber-950">
                        <Pause className="h-3 w-3 mr-1" />
                        Paused
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Recent Trades Table */}
              <Card className="bg-blue-950 border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-white">Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-blue-800">
                        <TableHead className="text-blue-300">Date/Time</TableHead>
                        <TableHead className="text-blue-300">Type</TableHead>
                        <TableHead className="text-blue-300">Price</TableHead>
                        <TableHead className="text-blue-300">Amount</TableHead>
                        <TableHead className="text-blue-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-blue-800">
                        <TableCell colSpan={5} className="text-center py-8 text-blue-400">
                          No trading activity yet
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              {/* Trade Performance Chart */}
              <Card className="bg-blue-950 border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-white">Performance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { time: '00:00', value: 1000 },
                          { time: '04:00', value: 1000 },
                          { time: '08:00', value: 1000 },
                          { time: '12:00', value: 1000 },
                          { time: '16:00', value: 1000 },
                          { time: '20:00', value: 1000 },
                          { time: '24:00', value: 1000 },
                        ]}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fill: '#93c5fd' }} 
                          stroke="#1e3a8a" 
                        />
                        <YAxis 
                          tick={{ fill: '#93c5fd' }} 
                          stroke="#1e3a8a" 
                          domain={['dataMin - 100', 'dataMax + 100']} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#172554', 
                            borderColor: '#1e3a8a',
                            color: '#ffffff' 
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          fillOpacity={1}
                          fill="url(#colorValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar - Bot Parameters */}
            <div className="md:col-span-4 space-y-6">
              {/* Bot Parameters Card */}
              <Card className="bg-blue-950 border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-white">Bot Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Strategy Section */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Strategy</h3>
                    <div className="p-3 rounded-md bg-blue-900/30 text-blue-100">
                      GRID
                    </div>
                  </div>
                  
                  {/* Trading Cryptocurrencies Section */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Trading Cryptocurrencies</h3>
                    <div className="space-y-3">
                      {availableTradingPairs.map((pair) => (
                        <div key={pair} className="flex items-center space-x-2">
                          <Checkbox 
                            id={pair} 
                            checked={selectedSymbols.includes(pair)}
                            onCheckedChange={(checked) => {
                              if (typeof checked === 'boolean') {
                                handleSymbolChange(pair, checked);
                              }
                            }}
                            className="border-blue-400 text-blue-400 data-[state=checked]:bg-blue-600"
                          />
                          <label 
                            htmlFor={pair}
                            className="text-sm font-medium leading-none text-blue-100"
                          >
                            {pair}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Investment Section */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Investment</h3>
                    <div className="p-3 rounded-md bg-blue-900/30 text-blue-100">
                      $1000
                    </div>
                  </div>
                  
                  {/* Created On Section */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Created On</h3>
                    <div className="p-3 rounded-md bg-blue-900/30 text-blue-100">
                      27.3.2025
                    </div>
                  </div>
                  
                  {/* Bot Controls */}
                  <div className="pt-4 flex gap-3">
                    <Button variant="outline" className="w-1/2 border-blue-400 text-blue-300 hover:bg-blue-900/50">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button className="w-1/2 bg-green-600 hover:bg-green-700">
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Market Overview Card */}
              <Card className="bg-blue-950 border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-white">Market Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedSymbols.map((symbol) => (
                      <div key={symbol} className="p-3 rounded-md bg-blue-900/30">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-100">{symbol}</span>
                          <Badge variant="outline" className="border-green-500 text-green-400 bg-green-950">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            0.45%
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <div className="text-2xl font-bold text-white">$87,750.00</div>
                          <div className="text-xs text-blue-300 mt-1">Updated 1 min ago</div>
                        </div>
                      </div>
                    ))}
                    
                    {selectedSymbols.length === 0 && (
                      <div className="text-center py-6 text-blue-300">
                        <p>No cryptocurrencies selected</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}