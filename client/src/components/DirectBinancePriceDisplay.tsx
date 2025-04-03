import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, AlertCircle, AlertTriangle, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { directBinanceApi, BinanceTickerPrice, ApiError } from '@/lib/direct-binance-api';

/**
 * Component for displaying real-time prices directly from Binance API
 */
const DirectBinancePriceDisplay: React.FC = () => {
  const [prices, setPrices] = useState<BinanceTickerPrice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [singlePrice, setSinglePrice] = useState<BinanceTickerPrice | null>(null);
  const [singleLoading, setSingleLoading] = useState<boolean>(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAllPrices, setShowAllPrices] = useState<boolean>(false);

  // State for geo-restriction errors
  const [isGeoRestricted, setIsGeoRestricted] = useState<boolean>(false);
  const [geoRestrictedMessage, setGeoRestrictedMessage] = useState<string>('');

  // Function to fetch top cryptocurrency pairs
  const fetchTopPairs = async () => {
    setLoading(true);
    setError(null);
    setIsGeoRestricted(false);
    
    try {
      // Use the new getTopPairs method for better performance
      const data = await directBinanceApi.getTopPairs();
      setPrices(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching top pairs:', err);
      
      // Check if this is a geo-restriction error
      if (err && typeof err === 'object' && 'geo_restricted' in err && (err as ApiError).geo_restricted) {
        setIsGeoRestricted(true);
        setGeoRestrictedMessage((err as ApiError).message || 'Binance API is geo-restricted in this region');
        setError(null);
      } else {
        setError('Failed to fetch prices from Binance API');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Legacy function to fetch all prices (keeping for backwards compatibility)
  const fetchAllPrices = async () => {
    setLoading(true);
    setError(null);
    setIsGeoRestricted(false);
    
    try {
      const data = await directBinanceApi.getAllPrices();
      setPrices(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching all prices:', err);
      
      // Check if this is a geo-restriction error
      if (err && typeof err === 'object' && 'geo_restricted' in err && (err as ApiError).geo_restricted) {
        setIsGeoRestricted(true);
        setGeoRestrictedMessage((err as ApiError).message || 'Binance API is geo-restricted in this region');
        setError(null);
      } else {
        setError('Failed to fetch prices from Binance API');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch a single price
  const fetchSinglePrice = async (symbol: string) => {
    if (!symbol) return;
    
    setSingleLoading(true);
    setSingleError(null);
    try {
      const data = await directBinanceApi.getSymbolPrice(symbol);
      setSinglePrice(data);
    } catch (err) {
      console.error(`Error fetching price for ${symbol}:`, err);
      
      // Check if this is a geo-restriction error
      if (err && typeof err === 'object' && 'geo_restricted' in err && (err as ApiError).geo_restricted) {
        setSingleError(`Binance API is geo-restricted in this region`);
        
        // Also update the global geo-restriction status
        setIsGeoRestricted(true);
        setGeoRestrictedMessage((err as ApiError).message || 'Binance API is geo-restricted in this region');
      } else {
        setSingleError(`Failed to fetch price for ${symbol}`);
      }
      
      setSinglePrice(null);
    } finally {
      setSingleLoading(false);
    }
  };

  // Fetch prices on component mount
  useEffect(() => {
    fetchTopPairs();
  }, []);

  // Format price with commas, e.g. 48,235.75
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num < 0.01 
      ? num.toFixed(8) 
      : num < 1 
        ? num.toFixed(6)
        : num < 1000 
          ? num.toFixed(2) 
          : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Filter prices based on search query
  const filteredPrices = prices.filter(p => {
    return p.symbol.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort prices with popular pairs at the top
  const sortedPrices = [...filteredPrices].sort((a, b) => {
    const popularPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'];
    const aPopularIndex = popularPairs.indexOf(a.symbol);
    const bPopularIndex = popularPairs.indexOf(b.symbol);
    
    if (aPopularIndex !== -1 && bPopularIndex !== -1) {
      return aPopularIndex - bPopularIndex;
    }
    if (aPopularIndex !== -1) return -1;
    if (bPopularIndex !== -1) return 1;
    
    return a.symbol.localeCompare(b.symbol);
  });

  // Display only the first 10 prices unless showAllPrices is true
  const displayPrices = showAllPrices 
    ? sortedPrices 
    : sortedPrices.slice(0, 10);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Real-Time Binance Prices</CardTitle>
            <CardDescription>
              Live data from the official Binance API - no simulations or fallbacks
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchTopPairs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Geo-restriction warning alert */}
        {isGeoRestricted && (
          <Alert variant="destructive" className="mb-6 border-amber-500 bg-amber-50 dark:border-amber-700 dark:bg-amber-950">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <div className="ml-3">
              <AlertTitle className="text-amber-800 dark:text-amber-300">Geo-restriction Detected</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400 mt-1">
                <p>{geoRestrictedMessage}</p>
                <p className="mt-1 text-sm">Binance API access is not available from this server location.</p>
              </AlertDescription>
            </div>
          </Alert>
        )}
      
        {/* Single price lookup section */}
        <div className="mb-6">
          <div className="text-sm font-medium mb-2">Quick Price Lookup</div>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter symbol (e.g., BTCUSDT)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => fetchSinglePrice(searchQuery)}
              disabled={singleLoading || !searchQuery}
            >
              {singleLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Get Price'}
            </Button>
          </div>

          {/* Single price result */}
          {singlePrice && (
            <div className="mt-4 p-4 bg-primary/5 rounded-md">
              <div className="flex justify-between items-center">
                <div className="font-semibold">{singlePrice.symbol}</div>
                <div className="text-2xl font-bold">${formatPrice(singlePrice.price)}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1 text-right">
                Direct from Binance API
              </div>
            </div>
          )}

          {/* Single price error */}
          {singleError && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-destructive">Error</div>
                <div className="text-sm">{singleError}</div>
              </div>
            </div>
          )}
        </div>

        {/* Top trading pairs section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium">Top Trading Pairs</div>
            {lastUpdated && (
              <div className="text-xs text-muted-foreground">
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Error message (non-geo-restriction errors) */}
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-destructive">Connection Error</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Price list */}
              <div className="rounded-md border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 text-sm font-medium">Symbol</th>
                      <th className="text-right p-2 text-sm font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPrices.length > 0 ? (
                      displayPrices.map((price) => (
                        <tr key={price.symbol} className="border-t">
                          <td className="p-2 text-sm">{price.symbol}</td>
                          <td className="p-2 text-sm text-right font-mono">
                            ${formatPrice(price.price)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-sm text-muted-foreground">
                          {searchQuery ? 'No matching symbols found' : 'No price data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Show more/less button */}
              {filteredPrices.length > 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setShowAllPrices(!showAllPrices)}
                >
                  {showAllPrices ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show All ({filteredPrices.length} prices)
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          Powered by the official Binance SDK
        </div>
        <Badge variant="outline" className="text-xs">
          Direct API
        </Badge>
      </CardFooter>
    </Card>
  );
};

export default DirectBinancePriceDisplay;