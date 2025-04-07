import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './card';
import { Skeleton } from './skeleton';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface MarketPriceWidgetProps {
  symbol: string;
  name: string;
}

export const MarketPriceWidget = ({ symbol, name }: MarketPriceWidgetProps) => {
  const [price, setPrice] = useState<string | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        
        // First try the multi-broker service (which handles broker fallbacks)
        try {
          // Fetch ticker prices from multi-broker service
          const tickerResponse = await fetch(`/api/market-broker/ticker/${symbol}`);
          
          if (tickerResponse.ok) {
            const tickerData = await tickerResponse.json();
            
            if (tickerData && tickerData.price) {
              setPrice(parseFloat(tickerData.price).toFixed(2));
              // If we have change24h data
              if (tickerData.change24h !== undefined) {
                setChange(parseFloat(tickerData.change24h));
              }
              setError(null);
              setLoading(false);
              return; // Success, so exit early
            }
          }
        } catch (brokerError) {
          console.log('Multi-broker service failed, falling back to direct Binance API');
          // Continue to legacy routes if multi-broker failed
        }
        
        // Legacy routes (fallback)
        // Fetch ticker prices
        const tickerResponse = await fetch('/api/binance/market/tickers');
        const tickerData = await tickerResponse.json();
        
        // Fetch 24hr market data
        const market24hrResponse = await fetch('/api/binance/market/24hr');
        const market24hrData = await market24hrResponse.json();
        
        // Find the matching ticker for this symbol
        const ticker = Array.isArray(tickerData) ? 
          tickerData.find((t: any) => t.symbol === symbol) : null;
        
        const marketData = Array.isArray(market24hrData) ? 
          market24hrData.find((m: any) => m.symbol === symbol) : null;
        
        if (ticker && ticker.price) {
          setPrice(parseFloat(ticker.price).toFixed(2));
          
          // Only set change if we have valid market data
          if (marketData && marketData.priceChangePercent) {
            setChange(parseFloat(marketData.priceChangePercent));
          }
          
          setError(null);
        } else {
          setError('Symbol not found');
        }
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    
    // Set up an interval to refresh data every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice > 1000) {
      return `$${numPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else if (numPrice > 1) {
      return `$${numPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else {
      return `$${numPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{name}</h3>
            <p className="text-xs text-muted-foreground">{symbol}</p>
          </div>
          
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-destructive text-xs">Error</div>
          ) : (
            <div className="text-right">
              <div className="font-medium">{price ? formatPrice(price) : '-'}</div>
              {change !== null && (
                <div className={`text-xs flex items-center justify-end ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};