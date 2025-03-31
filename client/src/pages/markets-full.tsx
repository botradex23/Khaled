import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Search, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";

// Define interfaces for our market data
interface BinanceMarketResponse {
  success: boolean;
  source: string;
  timestamp: string;
  count: number;
  data: BinanceMarketData[];
}

interface BinanceMarketData {
  symbol: string;
  baseSymbol: string;
  quoteSymbol: string;
  price: number;
  formattedPrice: string;
  source: string;
}

// Interface for 24hr price statistics
interface Binance24hrResponse {
  success: boolean;
  data: Binance24hrData[];
}

interface Binance24hrData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  volume: string;
  quoteVolume: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
}

// Combined market data after processing
interface ProcessedMarketData {
  symbol: string;
  baseSymbol: string;
  quoteSymbol: string;
  name: string;
  price: number;
  formattedPrice: string;
  priceChangePercent: number;
  volume: number;
  formattedVolume: string;
  high24h: number;
  low24h: number;
}

// Coin name mapping for popular cryptocurrencies
const coinNames: Record<string, string> = {
  "BTC": "Bitcoin",
  "ETH": "Ethereum",
  "SOL": "Solana",
  "BNB": "Binance Coin",
  "XRP": "XRP",
  "ADA": "Cardano",
  "DOT": "Polkadot",
  "DOGE": "Dogecoin",
  "AVAX": "Avalanche",
  "LINK": "Chainlink",
  "UNI": "Uniswap",
  "ATOM": "Cosmos",
  "LTC": "Litecoin",
  "FTM": "Fantom",
  "AAVE": "Aave",
  "ALGO": "Algorand",
  "APE": "ApeCoin",
  "APT": "Aptos",
  "ARB": "Arbitrum",
  "AXS": "Axie Infinity",
  "BCH": "Bitcoin Cash",
  "COMP": "Compound",
  "CRO": "Cronos",
  "DAI": "Dai",
  "DASH": "Dash",
  "EGLD": "MultiversX",
  "EOS": "EOS",
  "ETC": "Ethereum Classic",
  "FIL": "Filecoin",
  "FLOW": "Flow",
  "GALA": "Gala",
  "HBAR": "Hedera",
  "ICP": "Internet Computer",
  "IMX": "Immutable X",
  "INJ": "Injective",
  "MANA": "Decentraland",
  "MATIC": "Polygon",
  "NEAR": "NEAR Protocol",
  "OP": "Optimism",
  "SAND": "The Sandbox",
  "SHIB": "Shiba Inu",
  "SUI": "Sui",
  "TON": "Toncoin",
  "TRX": "TRON",
  "VET": "VeChain",
  "XLM": "Stellar",
  "XMR": "Monero",
  "XTZ": "Tezos",
  "ZEC": "Zcash",
  // Add more coins as needed
  "1INCH": "1inch",
  "AKRO": "Akropolis",
  "ALPHA": "Alpha Finance",
  "BAT": "Basic Attention Token",
  "CAKE": "PancakeSwap",
  "CHZ": "Chiliz",
  "COTI": "COTI",
  "ENJ": "Enjin Coin",
  "GRT": "The Graph",
  "KSM": "Kusama",
  "LUNA": "Terra Luna",
  "NEO": "NEO",
  "ONE": "Harmony",
  "QTUM": "Qtum",
  "REEF": "Reef",
  "REN": "Ren",
  "RSR": "Reserve Rights",
  "RVN": "Ravencoin",
  "SC": "Siacoin",
  "SKL": "SKALE",
  "SNX": "Synthetix",
  "STX": "Stacks",
  "SUSHI": "SushiSwap",
  "THETA": "Theta Network",
  "WRX": "WazirX",
  "XEM": "NEM",
  "XVG": "Verge",
  "YFI": "yearn.finance",
  "ZIL": "Zilliqa",
  "ZRX": "0x"
};

export default function MarketsFull() {
  // State for search and sorting
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'volume',
    direction: 'desc'
  });
  const [processedData, setProcessedData] = useState<ProcessedMarketData[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<string>("USDT");

  // Available quote currencies
  const quoteCurrencies = ["USDT", "BTC", "ETH", "BNB", "BUSD"];

  // Fetch all Binance markets
  const { 
    data: marketsData, 
    isLoading: isMarketsLoading, 
    error: marketsError,
    refetch: refetchMarkets 
  } = useQuery<BinanceMarketResponse>({
    queryKey: ["/api/binance/all-markets"],
    refetchInterval: 30000 // refresh every 30 seconds
  });

  // Fetch 24hr price statistics 
  const {
    data: priceStatsData,
    isLoading: isPriceStatsLoading,
    error: priceStatsError,
    refetch: refetchPriceStats
  } = useQuery<Binance24hrResponse>({
    queryKey: ["/api/binance/market/24hr"],
    refetchInterval: 30000
  });

  // Loading state based on both queries
  const isLoading = isMarketsLoading || isPriceStatsLoading;
  const hasError = marketsError || priceStatsError;

  // Refetch all data
  const refetchAll = () => {
    refetchMarkets();
    refetchPriceStats();
  };

  // Process and combine the data once both are available
  useEffect(() => {
    if (marketsData?.data && priceStatsData?.data) {
      const combinedData: ProcessedMarketData[] = marketsData.data.map(market => {
        // Find matching 24hr stats
        const stats = priceStatsData.data.find(
          stat => stat.symbol === market.symbol
        );

        // Format volume with appropriate precision based on value
        const volume = stats ? parseFloat(stats.quoteVolume) : 0;
        const formattedVolume = formatLargeNumber(volume);

        // Return processed market data with stats
        return {
          symbol: market.symbol,
          baseSymbol: market.baseSymbol,
          quoteSymbol: market.quoteSymbol,
          name: coinNames[market.baseSymbol] || market.baseSymbol,
          price: market.price,
          formattedPrice: market.formattedPrice,
          priceChangePercent: stats ? parseFloat(stats.priceChangePercent) : 0,
          volume: volume,
          formattedVolume: formattedVolume,
          high24h: stats ? parseFloat(stats.highPrice) : 0,
          low24h: stats ? parseFloat(stats.lowPrice) : 0,
        };
      });

      setProcessedData(combinedData);
    }
  }, [marketsData, priceStatsData]);

  // Format large numbers (e.g., for volume)
  function formatLargeNumber(num: number): string {
    if (num >= 1_000_000_000) {
      return `$${(num / 1_000_000_000).toFixed(2)}B`;
    } else if (num >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1_000) {
      return `$${(num / 1_000).toFixed(2)}K`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  }

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort the data
  const filteredAndSortedData = processedData
    // Filter by search query
    .filter(market => {
      const searchLower = searchQuery.toLowerCase();
      return (
        market.symbol.toLowerCase().includes(searchLower) ||
        market.baseSymbol.toLowerCase().includes(searchLower) ||
        (market.name && market.name.toLowerCase().includes(searchLower))
      );
    })
    // Filter by selected quote currency
    .filter(market => market.quoteSymbol === selectedQuote)
    // Sort the data
    .sort((a, b) => {
      const sortKey = sortConfig.key as keyof ProcessedMarketData;
      
      if (a[sortKey] === b[sortKey]) {
        // Secondary sort by volume if values are equal
        return b.volume - a.volume;
      }
      
      if (sortConfig.direction === 'asc') {
        // Handle string vs number comparisons
        return typeof a[sortKey] === 'string' 
          ? (a[sortKey] as string).localeCompare(b[sortKey] as string)
          : (a[sortKey] as number) - (b[sortKey] as number);
      } else {
        return typeof a[sortKey] === 'string'
          ? (b[sortKey] as string).localeCompare(a[sortKey] as string)
          : (b[sortKey] as number) - (a[sortKey] as number);
      }
    });

  // Get data summary
  const marketSummary = {
    totalMarkets: processedData.length,
    filteredMarkets: filteredAndSortedData.length,
    topGainers: [...processedData]
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, 3),
    topLosers: [...processedData]
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, 3)
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Binance Markets</h1>
              <p className="text-muted-foreground">
                Comprehensive list of all cryptocurrency markets from Binance
              </p>
            </div>
            <div className="relative w-full md:w-64 mt-4 md:mt-0">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Market Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Markets</p>
                    <h3 className="text-2xl font-bold mt-1">{marketsData?.count || 0}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {marketSummary.topGainers[0] && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Top Gainer</p>
                      <h3 className="text-xl font-bold mt-1">{marketSummary.topGainers[0].baseSymbol}</h3>
                      <div className="flex items-center text-green-500 mt-1">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        <span className="text-sm font-medium">{marketSummary.topGainers[0].priceChangePercent.toFixed(2)}%</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {marketSummary.topLosers[0] && (
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Top Loser</p>
                      <h3 className="text-xl font-bold mt-1">{marketSummary.topLosers[0].baseSymbol}</h3>
                      <div className="flex items-center text-red-500 mt-1">
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                        <span className="text-sm font-medium">{Math.abs(marketSummary.topLosers[0].priceChangePercent).toFixed(2)}%</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <h3 className="text-lg font-medium mt-1">
                      {marketsData?.timestamp 
                        ? new Date(marketsData.timestamp).toLocaleTimeString() 
                        : 'Unknown'}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 -ml-2 text-primary" 
                        onClick={refetchAll}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="text-xs">Refresh</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quote Currency Tabs */}
          <div className="mb-6">
            <Tabs 
              defaultValue={selectedQuote} 
              value={selectedQuote}
              onValueChange={(value) => setSelectedQuote(value)}
              className="w-full"
            >
              <TabsList className="mb-4">
                {quoteCurrencies.map(quote => (
                  <TabsTrigger key={quote} value={quote}>
                    {quote} Markets
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Markets Table */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold">Binance Markets</CardTitle>
              <CardDescription>
                Live cryptocurrency market data from Binance
              </CardDescription>
              <div className="flex flex-col md:flex-row justify-between gap-4 mt-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-normal">
                    Updated every 30s
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {filteredAndSortedData.length} Markets
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Unable to load market data</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error fetching data from Binance. Please check your connection and try again.
                  </p>
                  <Button onClick={refetchAll}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="w-12 cursor-pointer"
                          onClick={() => requestSort('baseSymbol')}
                        >
                          <div className="flex items-center">
                            #
                            {sortConfig.key === 'baseSymbol' && (
                              sortConfig.direction === 'asc' ? 
                                <ChevronUp className="h-4 w-4 ml-1" /> : 
                                <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => requestSort('name')}
                        >
                          <div className="flex items-center">
                            Name
                            {sortConfig.key === 'name' && (
                              sortConfig.direction === 'asc' ? 
                                <ChevronUp className="h-4 w-4 ml-1" /> : 
                                <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer"
                          onClick={() => requestSort('price')}
                        >
                          <div className="flex items-center justify-end">
                            Price
                            {sortConfig.key === 'price' && (
                              sortConfig.direction === 'asc' ? 
                                <ChevronUp className="h-4 w-4 ml-1" /> : 
                                <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer"
                          onClick={() => requestSort('priceChangePercent')}
                        >
                          <div className="flex items-center justify-end">
                            24h Change
                            {sortConfig.key === 'priceChangePercent' && (
                              sortConfig.direction === 'asc' ? 
                                <ChevronUp className="h-4 w-4 ml-1" /> : 
                                <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hidden md:table-cell"
                          onClick={() => requestSort('volume')}
                        >
                          <div className="flex items-center justify-end">
                            24h Volume
                            {sortConfig.key === 'volume' && (
                              sortConfig.direction === 'asc' ? 
                                <ChevronUp className="h-4 w-4 ml-1" /> : 
                                <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(10).fill(0).map((_, i) => (
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
                            <TableCell className="text-right hidden md:table-cell">
                              <Skeleton className="h-4 w-16 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredAndSortedData.length > 0 ? (
                        filteredAndSortedData.map((market, index) => {
                          const isPositive = market.priceChangePercent >= 0;
                          
                          return (
                            <TableRow 
                              key={market.symbol} 
                              className="cursor-pointer hover:bg-muted/40"
                            >
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                    <span className="text-xs font-medium">{market.baseSymbol.substring(0, 1)}</span>
                                  </div>
                                  <div>
                                    <div className="font-medium">{market.name}</div>
                                    <div className="text-xs text-muted-foreground">{market.baseSymbol}/{market.quoteSymbol}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${market.formattedPrice}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={`flex items-center justify-end ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                  {isPositive ? 
                                    <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                                    <ArrowDownRight className="h-3 w-3 mr-1" />
                                  }
                                  {Math.abs(market.priceChangePercent).toFixed(2)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                                {market.formattedVolume}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            {searchQuery ? (
                              <div>
                                <p className="text-muted-foreground">No markets found matching "{searchQuery}"</p>
                                <Button 
                                  variant="link" 
                                  className="mt-2" 
                                  onClick={() => setSearchQuery("")}
                                >
                                  Clear search
                                </Button>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No market data available</p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-xs text-muted-foreground">
                Data provided by Binance API
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refetchAll}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}