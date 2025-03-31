import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpDown, 
  Search, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export const MarketPricesTable = () => {
  // Table configuration state
  const [sortConfig, setSortConfig] = useState<{ key: keyof MarketData; direction: 'asc' | 'desc' }>({
    key: 'symbol',
    direction: 'asc',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'top' | 'stablecoins' | 'defi'>('all');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Define categories of cryptocurrencies
  const topCurrencies = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP', 'DOT', 'DOGE', 'AVAX', 'MATIC', 'ATOM', 'LINK', 'UNI', 'LTC', 'ALGO'];
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'UST', 'USDP', 'USDN', 'GUSD', 'FRAX'];
  const defiTokens = ['UNI', 'AAVE', 'CAKE', 'COMP', 'MKR', 'SNX', 'SUSHI', 'YFI', 'CRV', 'BAL', '1INCH', 'ALPHA', 'BADGER', 'BIFI', 'BNT', 'CVX', 'ENJ', 'FARM', 'FTM', 'HBAR', 'INJ', 'KNC', 'KAVA', 'LUNA', 'LINA', 'MANA', 'PERP', 'SAND', 'SRM', 'WAVES'];

  // Function to fetch market data
  const fetchMarketData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch ticker prices
      const tickersResponse = await fetch('/api/binance/market/tickers');
      if (!tickersResponse.ok) throw new Error('Failed to fetch ticker data');
      const tickersData = await tickersResponse.json();
      
      // Fetch 24hr market data
      const market24hrResponse = await fetch('/api/binance/market/24hr');
      if (!market24hrResponse.ok) throw new Error('Failed to fetch 24hr market data');
      const market24hrData = await market24hrResponse.json();
      
      // Process the data
      const processedData = processTickerData(tickersData, market24hrData);
      setMarketData(processedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to load market data');
      setMarketData([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data fetch and refresh interval
  useEffect(() => {
    fetchMarketData();
    
    // Set up interval to refresh data every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Process Binance ticker data into our MarketData format, combining with 24hr data
  const processTickerData = (
    tickers: Array<{ symbol: string; price: string; }> | undefined, 
    data24hr: Array<{ 
      symbol: string; 
      priceChangePercent: string;
      volume: string;
      quoteVolume: string;
      highPrice: string;
      lowPrice: string;
    }> | undefined
  ): MarketData[] => {
    if (!tickers || !Array.isArray(tickers)) return [];
    
    // Create a map of the 24hr data for fast lookups
    const data24hrMap = new Map();
    if (data24hr && Array.isArray(data24hr)) {
      data24hr.forEach(item => {
        data24hrMap.set(item.symbol, item);
      });
    }
    
    // Filter only USDT pairs for simplicity (e.g., BTCUSDT, ETHUSDT, etc.)
    return tickers
      .filter(ticker => ticker.symbol.endsWith('USDT'))
      .map(ticker => {
        // Get the 24hr data for this ticker if it exists
        const ticker24hr = data24hrMap.get(ticker.symbol);
        
        return {
          symbol: ticker.symbol, // Use the full symbol (BTCUSDT) instead of just the base currency
          price: parseFloat(ticker.price),
          change24h: ticker24hr ? parseFloat(ticker24hr.priceChangePercent) : 0,
          volume24h: ticker24hr ? parseFloat(ticker24hr.quoteVolume) : 0, // Using quoteVolume for USD volume
          high24h: ticker24hr ? parseFloat(ticker24hr.highPrice) : 0,
          low24h: ticker24hr ? parseFloat(ticker24hr.lowPrice) : 0
        } as MarketData;
      });
  };
  
  // Handle sorting
  const requestSort = (key: keyof MarketData) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };
  
  // Filter and sort market data
  const getFilteredAndSortedData = () => {
    if (!marketData || !Array.isArray(marketData)) return [];
    
    let filteredData = [...marketData];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredData = filteredData.filter(
        (market) => market.symbol.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (activeCategory !== 'all') {
      let categoryList: string[] = [];
      
      switch (activeCategory) {
        case 'top':
          categoryList = topCurrencies;
          break;
        case 'stablecoins':
          categoryList = stablecoins;
          break;
        case 'defi':
          categoryList = defiTokens;
          break;
      }
      
      filteredData = filteredData.filter(market => {
        // Extract base currency for category matching (e.g., BTC from BTCUSDT)
        const baseCurrency = market.symbol.replace('USDT', '');
        return categoryList.includes(baseCurrency);
      });
    }
    
    // Apply sorting
    filteredData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    // Limit to 10 records for dashboard display
    return filteredData.slice(0, 10);
  };
  
  const filteredAndSortedData = getFilteredAndSortedData();
  
  // Format price based on value (different formatting for different ranges)
  const formatPrice = (price: number | undefined) => {
    // Handle undefined or null values
    const value = price || 0;
    
    if (value >= 1000) {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (value >= 1) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    } else if (value >= 0.0001) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 });
    } else {
      return value.toExponential(4);
    }
  };
  
  // Format large numbers with appropriate abbreviations
  const formatLargeNumber = (num: number | undefined) => {
    // Handle undefined or null values
    const value = num || 0;
    
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K`;
    } else {
      return value.toFixed(2);
    }
  };
  
  return (
    <Card className="border shadow-sm bg-blue-950 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">Market Prices</CardTitle>
        <CardDescription className="text-slate-300">
          Current prices of cryptocurrencies and tokens on Binance
        </CardDescription>
        <div className="flex flex-col md:flex-row justify-between gap-4 mt-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search currency..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hover:bg-primary/10"
              onClick={fetchMarketData}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button 
            variant={activeCategory === 'all' ? "default" : "outline"} 
            size="sm" 
            className={`rounded-full ${activeCategory === 'all' ? "bg-primary text-white" : ""}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </Button>
          <Button 
            variant={activeCategory === 'top' ? "default" : "outline"} 
            size="sm" 
            className={`rounded-full ${activeCategory === 'top' ? "bg-primary text-white" : ""}`}
            onClick={() => setActiveCategory('top')}
          >
            Top Currencies
          </Button>
          <Button 
            variant={activeCategory === 'stablecoins' ? "default" : "outline"} 
            size="sm" 
            className={`rounded-full ${activeCategory === 'stablecoins' ? "bg-primary text-white" : ""}`}
            onClick={() => setActiveCategory('stablecoins')}
          >
            Stablecoins
          </Button>
          <Button 
            variant={activeCategory === 'defi' ? "default" : "outline"} 
            size="sm" 
            className={`rounded-full ${activeCategory === 'defi' ? "bg-primary text-white" : ""}`}
            onClick={() => setActiveCategory('defi')}
          >
            DeFi
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading market data</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try again later or contact support
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => requestSort('symbol')} className="cursor-pointer">
                    <div className="flex items-center">
                      Symbol
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => requestSort('price')} className="cursor-pointer text-right">
                    <div className="flex items-center justify-end">
                      Price (USD)
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => requestSort('change24h')} className="cursor-pointer text-right">
                    <div className="flex items-center justify-end">
                      24h Change
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => requestSort('volume24h')} className="cursor-pointer text-right">
                    <div className="flex items-center justify-end">
                      24h Volume
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => requestSort('high24h')} className="cursor-pointer text-right">
                    <div className="flex items-center justify-end">
                      24h High/Low
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      {searchQuery ? 'No results found for your search' : 'No market data available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((market) => (
                    <TableRow key={market.symbol}>
                      <TableCell className="font-medium">{market.symbol}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${formatPrice(market.price)}
                      </TableCell>
                      <TableCell 
                        className={`text-right ${
                          market.change24h > 0 
                            ? 'text-green-500'
                            : market.change24h < 0
                            ? 'text-red-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          {(market.change24h || 0) > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (market.change24h || 0) < 0 ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : null}
                          <span>{(market.change24h || 0).toFixed(2)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${formatLargeNumber(market.volume24h)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col">
                          <span className="text-green-500">${formatPrice(market.high24h)}</span>
                          <span className="text-red-500">${formatPrice(market.low24h)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};