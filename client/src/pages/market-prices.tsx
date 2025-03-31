import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Search, TrendingUp, TrendingDown, Key, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export default function MarketPrices() {
  const { isAuthenticated, user } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ key: keyof MarketData; direction: 'asc' | 'desc' }>({
    key: 'symbol',
    direction: 'asc',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Keep track if user needs to set up API keys
  const [apiKeysSetup, setApiKeysSetup] = useState(false);
  
  // Check for API keys via API
  const { data: apiKeysData } = useQuery({
    queryKey: ['/api/users/api-keys/status'],
    queryFn: async () => {
      if (!isAuthenticated) return { hasValidApiKeys: false };
      try {
        const res = await fetch('/api/users/api-keys/status');
        if (!res.ok) throw new Error('Failed to fetch API key status');
        return await res.json();
      } catch (err) {
        console.error('Error checking API key status:', err);
        return { hasValidApiKeys: false };
      }
    },
    enabled: isAuthenticated,
    // Don't refetch too often since API keys don't change often
    refetchInterval: 60000,
  });

  // Fetch market data
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    source: string;
    timestamp: string;
    count: number;
    data: any[];
  }>({
    queryKey: ['/api/markets/binance/prices'],
    select: (response) => {
      // Transform the Binance response format to match our MarketData interface
      if (response?.success && Array.isArray(response.data)) {
        return {
          ...response,
          data: response.data.map((item: any) => ({
            symbol: item.symbol,
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            change24h: item.priceChangePercent || 0,
            volume24h: item.volume || 0,
            high24h: item.highPrice || item.price * 1.01, // Fallback if not available
            low24h: item.lowPrice || item.price * 0.99   // Fallback if not available
          }))
        };
      }
      return { success: false, source: '', timestamp: '', count: 0, data: [] };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Handle sorting
  const requestSort = (key: keyof MarketData) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  // Filter and sort market data
  const getFilteredAndSortedData = () => {
    if (!data || !data.data || !Array.isArray(data.data)) return [];

    let filteredData = [...data.data];

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredData = filteredData.filter(
        (market) => market.symbol.toLowerCase().includes(query)
      );
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

    return filteredData;
  };

  const filteredAndSortedData = getFilteredAndSortedData();

  // Format price based on value (different formatting for different ranges)
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    } else if (price >= 0.0001) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 });
    } else {
      return price.toExponential(4);
    }
  };

  // Format large numbers with appropriate abbreviations
  const formatLargeNumber = (num: number) => {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(2)}B`;
    } else if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(2)}K`;
    } else {
      return num.toFixed(2);
    }
  };

  // Effect to check if the user has API keys set up
  React.useEffect(() => {
    if (isAuthenticated && apiKeysData) {
      setApiKeysSetup(apiKeysData.hasValidApiKeys || false);
    }
  }, [isAuthenticated, apiKeysData]);
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Show API Keys Banner for authenticated users without API keys */}
        {isAuthenticated && !apiKeysSetup && (
          <div className="mb-6">
            <Alert variant="destructive" className="flex justify-between items-start bg-blue-50 border-blue-300 text-blue-900">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div>
                  <AlertTitle className="font-bold text-blue-800 mb-1">הגדרת מפתחות API נדרשת</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    <p className="mb-1">כדי לראות את הנתונים האישיים שלך ולבצע פעולות מסחר, עליך להגדיר את מפתחות ה-API שלך.</p>
                    <p className="text-sm">ללא מפתחות תקפים, תוכל לראות רק מחירי שוק ציבוריים.</p>
                  </AlertDescription>
                </div>
              </div>
              <Link href="/api-keys">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Key className="h-4 w-4 mr-1" />
                  הגדר מפתחות API
                </Button>
              </Link>
            </Alert>
          </div>
        )}
      
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold">Cryptocurrency Market</CardTitle>
            <CardDescription>
              Live market data for top cryptocurrencies
            </CardDescription>
            <div className="flex flex-col md:flex-row justify-between gap-4 mt-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search market..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  Updated every 30s
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {data?.count || 0} Markets
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, index) => (
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
                              {market.change24h > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : market.change24h < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : null}
                              <span>{market.change24h.toFixed(2)}%</span>
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
      </div>
    </Layout>
  );
}