import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { PriceChart } from "@/components/ui/price-chart";
import { TopMarketTickers, MarketTickerCard } from "@/components/ui/market-ticker";
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
  Copy,
  RefreshCw
} from "lucide-react";

// Define interfaces for our market data
interface MarketResponse {
  success: boolean;
  source: string;
  timestamp: string;
  count: number;
  data?: MarketData[];
  prices?: MarketData[];
}

interface MarketData {
  symbol: string;
  price: number;
  source: string;
  timestamp: string;
}

interface FormattedMarketData {
  symbol: string;
  baseSymbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  source: string;
}

interface MarketOverviewResponse {
  success: boolean;
  source: string;
  timestamp: string;
  marketStats: {
    totalMarketCap: number;
    totalMarketCapFormatted: string;
    totalCoins: number;
    btcDominance: string;
    ethDominance: string;
    totalVolume24h: string;
  };
  trendingCoins: TrendingCoin[];
}

interface TrendingCoin {
  symbol: string;
  shortSymbol: string;
  name: string;
  price: number;
  priceChangePercent: number;
  source: string;
}

// Coin name mapping
const coinNames: Record<string, string> = {
  "BTC": "Bitcoin",
  "ETH": "Ethereum",
  "SOL": "Solana",
  "BNB": "Binance Coin",
  "ADA": "Cardano",
  "XRP": "XRP",
  "DOT": "Polkadot",
  "DOGE": "Dogecoin",
  "AVAX": "Avalanche",
  "LINK": "Chainlink",
  "MATIC": "Polygon",
  "NEAR": "NEAR Protocol",
  "UNI": "Uniswap",
  "AAVE": "Aave",
  "ATOM": "Cosmos",
  "FTM": "Fantom"
};

// Market cap estimations (in billions)
const marketCapEstimates: Record<string, number> = {
  "BTC": 824.5,
  "ETH": 345.6,
  "SOL": 56.7,
  "BNB": 67.8,
  "ADA": 23.4,
  "XRP": 34.5,
  "DOT": 12.3,
  "DOGE": 11.2,
  "AVAX": 10.5,
  "LINK": 8.7,
  "MATIC": 7.5,
  "NEAR": 5.6,
  "UNI": 4.3,
  "AAVE": 3.9,
  "ATOM": 3.1,
  "FTM": 2.8
};

export default function Markets() {
  // This page displays Binance market data
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  
  // Fetch market data from our central market API
  const { data: marketsData, isLoading, error, refetch } = useQuery<MarketResponse>({
    queryKey: ["/api/market/prices"],
    refetchInterval: 30000 // refresh every 30 seconds
  });
  
  // Fetch market overview with trending coins
  const { data: marketOverview, isLoading: isOverviewLoading } = useQuery<MarketOverviewResponse>({
    queryKey: ["/api/markets/binance/overview"],
    refetchInterval: 60000 // refresh every minute
  });
  
  // Format data and add market cap estimates
  // Check if data exists in marketsData.data or marketsData.prices
  const sourceData = (marketsData?.data && Array.isArray(marketsData.data)) ? marketsData.data : 
                    (marketsData?.prices && Array.isArray(marketsData.prices)) ? marketsData.prices : [];
                    
  const markets = sourceData.length > 0
    ? sourceData.map((market: MarketData): FormattedMarketData => {
        // Extract base symbol (BTC from BTCUSDT)
        const symbol = market.symbol.endsWith('USDT') 
          ? market.symbol.slice(0, -4) 
          : market.symbol;
          
        return {
          symbol: market.symbol,
          baseSymbol: symbol,
          name: coinNames[symbol] || symbol,
          price: market.price,
          change24h: 0, // Will be replaced with real data in future
          marketCap: (marketCapEstimates[symbol] || 1) * 1_000_000_000,
          source: market.source || 'binance'
        };
      }) 
    : [];
  
  // Filter markets by search query
  const filteredMarkets = markets.filter((market: FormattedMarketData) => {
    const baseSymbol = market.baseSymbol || '';
    const name = market.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           baseSymbol.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
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
              <h1 className="text-3xl font-bold mb-2">Binance Markets</h1>
              <p className="text-muted-foreground">
                Real-time prices, charts and market data from Binance
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
                <CardTitle>Binance Markets Overview</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span>Top trending cryptocurrencies from Binance</span>
                  {isLoading ? (
                    <span className="text-xs text-muted-foreground flex items-center">
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      Updating...
                    </span>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 -my-1" 
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      <span className="text-xs">Refresh</span>
                    </Button>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {isLoading ? (
                    // Skeleton loader for market overview cards
                    Array(4).fill(0).map((_, i) => (
                      <Card key={i} className="bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-4 w-4" />
                          </div>
                          <div className="mt-2">
                            <Skeleton className="h-4 w-16 mb-1" />
                            <Skeleton className="h-6 w-20 mb-1" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : markets.length > 0 ? (
                    // Top 3 markets and market overview
                    <>
                      {markets.slice(0, 3).map((market: FormattedMarketData, index: number) => {
                        const isPositive = market.change24h >= 0;
                        const symbol = market.symbol.split('-')[0];
                        return (
                          <Card key={index} className="bg-card/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                {isPositive ? 
                                  <TrendingUp className="h-5 w-5 text-green-500" /> : 
                                  <TrendingDown className="h-5 w-5 text-red-500" />
                                }
                                <Star className="h-4 w-4 text-amber-400" />
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium">{symbol}</span>
                                  <span className="ml-1 text-xs text-muted-foreground">{coinNames[symbol] || symbol}</span>
                                </div>
                                <div className="flex items-baseline mt-1">
                                  <span className="text-xl font-bold">${market.price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}</span>
                                  <span className={`ml-2 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                                    {isPositive ? 
                                      <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                                      <ArrowDownRight className="h-3 w-3 mr-1" />
                                    }
                                    {Math.abs(market.change24h).toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      <Card className="bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Clock className="h-5 w-5 text-primary" />
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => window.alert("Market added to watchlist!")}>
                              <Bookmark className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                          <div className="mt-2">
                            <div className="text-sm">Total Market</div>
                            <div className="text-xl font-bold mt-1">$2.34T</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {markets.length} Coins
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : error ? (
                    <div className="col-span-4 p-4 text-center text-muted-foreground">
                      <p>Unable to load market data</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="col-span-4 p-4 text-center text-muted-foreground">
                      No market data available
                    </div>
                  )}
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
                          {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Skeleton className="h-6 w-6 rounded-full mr-2" />
                                    <div>
                                      <Skeleton className="h-4 w-24 mb-1" />
                                      <Skeleton className="h-3 w-12" />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Skeleton className="h-4 w-20 ml-auto" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Skeleton className="h-4 w-16 ml-auto" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Skeleton className="h-4 w-16 ml-auto" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-10 w-20" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : filteredMarkets.length > 0 ? (
                            filteredMarkets.map((market: FormattedMarketData, index: number) => {
                              // Extract base symbol (BTC from BTC-USDT)
                              const baseSymbol = market.symbol.split('-')[0];
                              const isPositive = market.change24h >= 0;
                              
                              return (
                                <TableRow 
                                  key={index} 
                                  className="cursor-pointer hover:bg-muted/40"
                                  onClick={() => handleCoinSelect(market.symbol)}
                                >
                                  <TableCell className="font-medium">{index + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                        {baseSymbol[0]}
                                      </div>
                                      <div>
                                        <div className="font-medium">{market.name}</div>
                                        <div className="text-xs text-muted-foreground">{baseSymbol}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className={`text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                    <div className="flex items-center justify-end">
                                      {isPositive ? 
                                        <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                      }
                                      {Math.abs(market.change24h).toFixed(2)}%
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${(market.marketCap / 1000000000).toFixed(1)}B
                                  </TableCell>
                                  <TableCell>
                                    <div className="h-10 w-20 flex items-center justify-center">
                                      <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
                                      </span>
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
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center">
                                No coins found matching your search.
                              </TableCell>
                            </TableRow>
                          )}
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
                      {/* Real-time price chart using our PriceChart component */}
                      <PriceChart symbol={selectedCoin} />
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
                        <div className="flex-1">
                          <Button className="w-full" onClick={() => window.location.href = "/bot-demo"}>
                            <Wallet className="mr-2 h-4 w-4" />
                            Buy
                          </Button>
                        </div>
                        <div className="flex-1">
                          <Button variant="outline" className="w-full" onClick={() => window.location.href = "/bot-demo"}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Trade
                          </Button>
                        </div>
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