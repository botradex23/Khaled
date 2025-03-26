import { useState } from "react";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Bookmark, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Wallet,
  BarChart3,
  Copy
} from "lucide-react";

// Sample market data
const cryptoMarkets = [
  { 
    id: 1, 
    name: "Bitcoin", 
    symbol: "BTC", 
    price: 42356.78, 
    change24h: 2.34, 
    volume24h: 28945123765, 
    marketCap: 824567890123,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 10 + 40)
  },
  { 
    id: 2, 
    name: "Ethereum", 
    symbol: "ETH", 
    price: 2846.92, 
    change24h: -1.23, 
    volume24h: 17283945610, 
    marketCap: 345678901234,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 5 + 28)
  },
  { 
    id: 3, 
    name: "Solana", 
    symbol: "SOL", 
    price: 128.45, 
    change24h: 5.67, 
    volume24h: 8723456789, 
    marketCap: 56789012345,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 10 + 120)
  },
  { 
    id: 4, 
    name: "Cardano", 
    symbol: "ADA", 
    price: 0.58, 
    change24h: 0.34, 
    volume24h: 2345678901, 
    marketCap: 23456789012,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 0.1 + 0.55)
  },
  { 
    id: 5, 
    name: "Binance Coin", 
    symbol: "BNB", 
    price: 345.67, 
    change24h: -0.78, 
    volume24h: 3456789012, 
    marketCap: 67890123456,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 15 + 340)
  },
  { 
    id: 6, 
    name: "XRP", 
    symbol: "XRP", 
    price: 0.62, 
    change24h: 1.23, 
    volume24h: 1234567890, 
    marketCap: 34567890123,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 0.05 + 0.60)
  },
  { 
    id: 7, 
    name: "Polkadot", 
    symbol: "DOT", 
    price: 7.89, 
    change24h: -2.34, 
    volume24h: 987654321, 
    marketCap: 12345678901,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 0.8 + 7.5)
  },
  { 
    id: 8, 
    name: "Dogecoin", 
    symbol: "DOGE", 
    price: 0.087, 
    change24h: 3.45, 
    volume24h: 876543210, 
    marketCap: 11234567890,
    sparkline: Array.from({ length: 20 }, () => Math.random() * 0.01 + 0.08)
  }
];

// Convert sparkline data to chart format
const getSparklineData = (sparkline: number[]) => {
  return sparkline.map((value, index) => ({
    name: index.toString(),
    value
  }));
};

// Sample detailed market data for selected coin
const bitcoinDetailData = [
  { time: "00:00", price: 42100 },
  { time: "04:00", price: 42300 },
  { time: "08:00", price: 42200 },
  { time: "12:00", price: 42500 },
  { time: "16:00", price: 42800 },
  { time: "20:00", price: 42400 },
  { time: "24:00", price: 42600 }
];

export default function Markets() {
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  
  // Filter crypto markets by search query
  const filteredMarkets = cryptoMarkets.filter(market => 
    market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle coin selection for detailed view
  const handleCoinSelect = (symbol: string) => {
    setSelectedCoin(symbol);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Crypto Markets</h1>
              <p className="text-muted-foreground">
                Real-time prices, charts and market data
              </p>
            </div>
            <div className="relative w-full md:w-64 mt-4 md:mt-0">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coins..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Market Overview</CardTitle>
                <CardDescription>Top trending cryptocurrencies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <Star className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">BTC</span>
                          <span className="ml-1 text-xs text-muted-foreground">Bitcoin</span>
                        </div>
                        <div className="flex items-baseline mt-1">
                          <span className="text-xl font-bold">${cryptoMarkets[0].price.toLocaleString()}</span>
                          <span className="ml-2 text-xs text-green-500 flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            {cryptoMarkets[0].change24h}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        <Star className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">ETH</span>
                          <span className="ml-1 text-xs text-muted-foreground">Ethereum</span>
                        </div>
                        <div className="flex items-baseline mt-1">
                          <span className="text-xl font-bold">${cryptoMarkets[1].price.toLocaleString()}</span>
                          <span className="ml-2 text-xs text-red-500 flex items-center">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            {Math.abs(cryptoMarkets[1].change24h)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <Bookmark className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">SOL</span>
                          <span className="ml-1 text-xs text-muted-foreground">Solana</span>
                        </div>
                        <div className="flex items-baseline mt-1">
                          <span className="text-xl font-bold">${cryptoMarkets[2].price.toLocaleString()}</span>
                          <span className="ml-2 text-xs text-green-500 flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            {cryptoMarkets[2].change24h}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Clock className="h-5 w-5 text-primary" />
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => window.alert("Market added to watchlist!")}>
                          <Bookmark className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm">Market Cap</div>
                        <div className="text-xl font-bold mt-1">$2.34T</div>
                        <div className="text-xs text-muted-foreground mt-1">24h Volume: $98.7B</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Tabs defaultValue="all">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All Coins</TabsTrigger>
                    <TabsTrigger value="trending">Trending</TabsTrigger>
                    <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
                    <TabsTrigger value="losers">Top Losers</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="space-y-4">
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">24h Change</TableHead>
                            <TableHead className="text-right">Market Cap</TableHead>
                            <TableHead className="text-right w-20">Chart</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMarkets.map((market, index) => (
                            <TableRow 
                              key={market.id} 
                              className="cursor-pointer hover:bg-muted/40"
                              onClick={() => handleCoinSelect(market.symbol)}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                    {market.symbol[0]}
                                  </div>
                                  <div>
                                    <div className="font-medium">{market.name}</div>
                                    <div className="text-xs text-muted-foreground">{market.symbol}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className={`text-right ${market.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                <div className="flex items-center justify-end">
                                  {market.change24h >= 0 ? 
                                    <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                                    <ArrowDownRight className="h-3 w-3 mr-1" />
                                  }
                                  {Math.abs(market.change24h)}%
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                ${(market.marketCap / 1000000000).toFixed(1)}B
                              </TableCell>
                              <TableCell>
                                <div className="h-10 w-20">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={getSparklineData(market.sparkline)}>
                                      <Line 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke={market.change24h >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                                        strokeWidth={1.5}
                                        dot={false}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.alert(`${market.name} added to favorites!`);
                                  }}
                                >
                                  <Star className={`h-4 w-4 ${index < 2 ? 'text-amber-400' : 'text-muted-foreground'}`} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="trending">
                    <div className="py-8 text-center text-muted-foreground">
                      Select "All Coins" tab to view the complete market data
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="gainers">
                    <div className="py-8 text-center text-muted-foreground">
                      Select "All Coins" tab to view the complete market data
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="losers">
                    <div className="py-8 text-center text-muted-foreground">
                      Select "All Coins" tab to view the complete market data
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Market Highlights / Coin Detail */}
            <Card>
              {selectedCoin ? (
                <>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                            {selectedCoin[0]}
                          </div>
                          {selectedCoin === "BTC" ? "Bitcoin" : selectedCoin === "ETH" ? "Ethereum" : "Solana"}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 ml-1"
                            onClick={() => window.alert(`${selectedCoin} symbol copied to clipboard!`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center">
                          {selectedCoin}
                          <div className={`ml-2 text-xs px-2 py-0.5 rounded-full ${selectedCoin === "BTC" ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                            Rank #{selectedCoin === "BTC" ? "1" : selectedCoin === "ETH" ? "2" : "3"}
                          </div>
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => window.alert(`${selectedCoin} added to favorites!`)}
                      >
                        <Star className="h-4 w-4 text-amber-400" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold">
                          ${selectedCoin === "BTC" ? "42,356.78" : selectedCoin === "ETH" ? "2,846.92" : "128.45"}
                        </span>
                        <span className={`ml-2 text-sm flex items-center ${selectedCoin === "ETH" ? 'text-red-500' : 'text-green-500'}`}>
                          {selectedCoin === "ETH" ? (
                            <>
                              <ArrowDownRight className="h-4 w-4 mr-1" />
                              1.23%
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                              {selectedCoin === "BTC" ? "2.34%" : "5.67%"}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {selectedCoin === "BTC" ? "₿ 1.00000000" : selectedCoin === "ETH" ? "Ξ 1.00000000" : "◎ 1.00000000"}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <Tabs defaultValue="1d">
                        <TabsList className="w-full mb-4">
                          <TabsTrigger value="1h" className="flex-1">1H</TabsTrigger>
                          <TabsTrigger value="1d" className="flex-1">1D</TabsTrigger>
                          <TabsTrigger value="1w" className="flex-1">1W</TabsTrigger>
                          <TabsTrigger value="1m" className="flex-1">1M</TabsTrigger>
                          <TabsTrigger value="1y" className="flex-1">1Y</TabsTrigger>
                        </TabsList>
                        
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={bitcoinDetailData}
                              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis 
                                dataKey="time" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12 }}
                                stroke="hsl(var(--muted-foreground))"
                              />
                              <YAxis 
                                domain={['dataMin - 200', 'dataMax + 200']}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12 }}
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(value) => `$${value}`}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  borderColor: 'hsl(var(--border))',
                                  borderRadius: '0.5rem' 
                                }}
                                formatter={(value: any) => [`$${value}`, 'Price']}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="price" 
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Tabs>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-muted p-3">
                          <div className="text-xs text-muted-foreground">Market Cap</div>
                          <div className="font-medium mt-1">
                            {selectedCoin === "BTC" ? "$824.5B" : selectedCoin === "ETH" ? "$345.6B" : "$56.7B"}
                          </div>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <div className="text-xs text-muted-foreground">24h Volume</div>
                          <div className="font-medium mt-1">
                            {selectedCoin === "BTC" ? "$28.9B" : selectedCoin === "ETH" ? "$17.2B" : "$8.7B"}
                          </div>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <div className="text-xs text-muted-foreground">Circulating Supply</div>
                          <div className="font-medium mt-1">
                            {selectedCoin === "BTC" ? "19.48M" : selectedCoin === "ETH" ? "120.3M" : "435.6M"}
                          </div>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <div className="text-xs text-muted-foreground">All-Time High</div>
                          <div className="font-medium mt-1">
                            {selectedCoin === "BTC" ? "$69,045" : selectedCoin === "ETH" ? "$4,878" : "$259.96"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          className="flex-1"
                          onClick={() => window.alert(`Opening buy interface for ${selectedCoin}...`)}
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          Buy
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => window.alert(`Opening trading interface for ${selectedCoin}...`)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Trade
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>Market Highlights</CardTitle>
                    <CardDescription>
                      Select a coin from the list to view details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Card className="bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex items-center mb-2">
                            <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                            <h3 className="font-medium">Market Overview</h3>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Global Market Cap</span>
                              <span className="text-sm font-medium">$2.34T</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">24h Volume</span>
                              <span className="text-sm font-medium">$98.7B</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">BTC Dominance</span>
                              <span className="text-sm font-medium">41.2%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Active Cryptocurrencies</span>
                              <span className="text-sm font-medium">10,482</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex items-center mb-2">
                            <Star className="h-5 w-5 text-amber-400 mr-2" />
                            <h3 className="font-medium">Top Gainers (24h)</h3>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                  S
                                </div>
                                <div>
                                  <div className="text-sm font-medium">SOL</div>
                                  <div className="text-xs text-muted-foreground">Solana</div>
                                </div>
                              </div>
                              <div className="text-green-500 text-sm">+5.67%</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                  D
                                </div>
                                <div>
                                  <div className="text-sm font-medium">DOGE</div>
                                  <div className="text-xs text-muted-foreground">Dogecoin</div>
                                </div>
                              </div>
                              <div className="text-green-500 text-sm">+3.45%</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                  B
                                </div>
                                <div>
                                  <div className="text-sm font-medium">BTC</div>
                                  <div className="text-xs text-muted-foreground">Bitcoin</div>
                                </div>
                              </div>
                              <div className="text-green-500 text-sm">+2.34%</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Button 
                        className="w-full"
                        onClick={() => setSearchQuery("")}
                      >
                        View All Markets
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}