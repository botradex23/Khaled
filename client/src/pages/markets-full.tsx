import React, { useState, useEffect } from 'react';
import Header from '@/components/ui/header';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  Settings, 
  ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MarketErrorState } from '@/components/ui/market-error-state';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export default function MarketsFullPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [filteredData, setFilteredData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeMarketType, setActiveMarketType] = useState('usdt');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Function to fetch market data
  const fetchMarketData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all Binance markets
      const response = await fetch('/api/binance/all-markets');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch market data');
      }
      
      const data = await response.json();
      
      setMarketData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err.message || 'Failed to load market data');
      setMarketData([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter data based on active market type and search query
  useEffect(() => {
    if (!marketData || !Array.isArray(marketData)) {
      setFilteredData([]);
      return;
    }
    
    let filtered = [...marketData];
    
    // Filter by market type (USDT, BTC, ETH, etc.)
    if (activeMarketType) {
      filtered = filtered.filter(market => {
        if (activeMarketType === 'usdt') return market.symbol.endsWith('USDT');
        if (activeMarketType === 'btc') return market.symbol.endsWith('BTC');
        if (activeMarketType === 'eth') return market.symbol.endsWith('ETH');
        if (activeMarketType === 'bnb') return market.symbol.endsWith('BNB');
        return true; // Default case
      });
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(market => market.symbol.toLowerCase().includes(query));
    }
    
    setFilteredData(filtered);
  }, [marketData, activeMarketType, searchQuery]);
  
  // Initial data fetch and refresh interval
  useEffect(() => {
    fetchMarketData();
    
    // Set up interval to refresh data every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Format date to show "Last Updated: X minutes ago"
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Unknown';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  };
  
  // Format price based on value
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
  
  return (
    <div className="flex min-h-screen bg-background flex-col">
      <Header />
      <main className="flex-grow pt-16 px-4">
        <div className="max-w-7xl mx-auto py-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2 md:mb-0">Cryptex</h1>
            
            <div className="flex items-center space-x-2">
              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30">
                <span className="flex items-center gap-1">
                  <img src="https://cryptologos.cc/logos/binance-coin-bnb-logo.svg" alt="Binance" className="h-4 w-4" />
                  Binance
                  <CheckCircle className="h-3 w-3 ml-1" />
                </span>
              </Badge>
              
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Last Updated Card */}
          <Card className="mb-6 bg-blue-950 text-slate-100 border-slate-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-300" />
                <span className="text-sm">Last Updated</span>
                <span className="font-medium">{formatLastUpdated()}</span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={fetchMarketData} className="text-slate-300 hover:text-white">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </CardContent>
          </Card>
          
          {/* Market Type Tabs */}
          <div className="flex overflow-x-auto pb-2 mb-6">
            <Button
              variant={activeMarketType === 'usdt' ? "default" : "outline"}
              className={`mr-2 ${activeMarketType === 'usdt' ? "bg-primary" : "bg-card"}`}
              onClick={() => setActiveMarketType('usdt')}
            >
              USDT Markets
            </Button>
            <Button
              variant={activeMarketType === 'btc' ? "default" : "outline"}
              className={`mr-2 ${activeMarketType === 'btc' ? "bg-primary" : "bg-card"}`}
              onClick={() => setActiveMarketType('btc')}
            >
              BTC Markets
            </Button>
            <Button
              variant={activeMarketType === 'eth' ? "default" : "outline"}
              className={`mr-2 ${activeMarketType === 'eth' ? "bg-primary" : "bg-card"}`}
              onClick={() => setActiveMarketType('eth')}
            >
              ETH Markets
            </Button>
            <Button
              variant={activeMarketType === 'bnb' ? "default" : "outline"}
              className={`mr-2 ${activeMarketType === 'bnb' ? "bg-primary" : "bg-card"}`}
              onClick={() => setActiveMarketType('bnb')}
            >
              BNB Markets
            </Button>
          </div>
          
          {/* Main Content Card */}
          <Card className="bg-blue-950 text-white border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold">Binance Markets</CardTitle>
                  <CardDescription className="text-slate-300">
                    Live cryptocurrency market data from Binance
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-300">
                    Updated every 30s
                  </Badge>
                  <Badge className="bg-gray-600/30 text-gray-300">
                    {filteredData.length} Markets
                  </Badge>
                </div>
              </div>
              
              {/* Search and Filter */}
              <div className="mt-4 mb-2">
                <Input
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-4 py-4">
                  <div className="h-6 bg-blue-900/50 rounded w-1/3"></div>
                  <div className="h-6 bg-blue-900/50 rounded w-full"></div>
                  <div className="h-6 bg-blue-900/50 rounded w-full"></div>
                  <div className="h-6 bg-blue-900/50 rounded w-full"></div>
                  <div className="h-6 bg-blue-900/50 rounded w-2/3"></div>
                </div>
              ) : error ? (
                <MarketErrorState 
                  onRetry={fetchMarketData}
                  title="Unable to load market data"
                  message="There was an error fetching data from Binance. Please check your connection and try again."
                />
              ) : filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-300">No markets found matching your criteria</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveMarketType('usdt');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">24h Change</TableHead>
                        <TableHead className="text-right">24h Volume</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.slice(0, 50).map((market) => (
                        <TableRow key={market.symbol}>
                          <TableCell className="font-medium">{market.symbol}</TableCell>
                          <TableCell className="text-right font-mono">
                            ${formatPrice(market.price)}
                          </TableCell>
                          <TableCell 
                            className={`text-right ${
                              (market.change24h || 0) > 0 
                                ? 'text-green-500'
                                : (market.change24h || 0) < 0
                                ? 'text-red-500'
                                : ''
                            }`}
                          >
                            {(market.change24h || 0).toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">
                            ${(market.volume24h || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <span>Trade</span>
                                  <ChevronDown className="ml-1 h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.location.href = `/chart?symbol=${market.symbol}`}>
                                  View Chart
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.location.href = `/trade?symbol=${market.symbol}`}>
                                  Trade Now
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.location.href = `/bot/new?symbol=${market.symbol}`}>
                                  Create Bot
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredData.length > 50 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-400">
                        Showing 50 of {filteredData.length} markets. Refine your search to see more.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}