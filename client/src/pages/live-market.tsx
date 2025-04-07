import { useEffect, useState } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "../components/ui/skeleton";
import { useToast } from "../hooks/use-toast";

// Interface for the price data
interface MarketPrice {
  symbol: string;
  price: string;
  priceChangePercent?: string;
  volume?: string;
}

// API response type
interface MarketPricesResponse {
  success?: boolean;
  prices?: MarketPrice[];
  data?: MarketPrice[];
  error?: string;
}

export default function LiveMarketPage() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const { toast } = useToast();
  
  // Using TanStack Query to fetch market prices
  const { 
    data, 
    error, 
    isLoading, 
    refetch 
  } = useQuery<MarketPricesResponse>({
    queryKey: ['/api/market/prices'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  useEffect(() => {
    if (data?.prices) {
      setPrices(data.prices);
    } else if (data?.data) {
      setPrices(data.data);
    }
  }, [data]);
  
  useEffect(() => {
    if (error) {
      toast({
        title: "שגיאה בהבאת נתוני שוק",
        description: "לא הצלחנו לקבל את נתוני השוק. נתונים אינם זמינים כעת.",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  // Use all available market prices without filtering
  const filteredPrices = prices
    ? prices.sort((a, b) => a.symbol.localeCompare(b.symbol))
    : [];
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">מחירי קריפטו בזמן אמת</h1>
        <Button onClick={() => refetch()} disabled={isLoading}>רענן מחירים</Button>
      </div>
      
      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>טוען נתוני שוק...</CardTitle>
            <CardDescription>אנא המתן</CardDescription>
          </CardHeader>
          <CardContent>
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between items-center mb-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Card className="bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">שגיאה בהבאת נתוני שוק</CardTitle>
            <CardDescription>
              לא הצלחנו לקבל את נתוני השוק בגלל בעיות גישה לבורסה.
              מחירים אינם זמינים כעת.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>נסה שוב</Button>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && !error && (
        <>
          {filteredPrices.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>מחירי מטבעות קריפטו</CardTitle>
                <CardDescription>מחירים עדכניים ממקור אותנטי</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPrices.map((ticker) => (
                    <div 
                      key={ticker.symbol} 
                      className="flex justify-between p-4 rounded-lg border"
                    >
                      <div className="font-medium">{ticker.symbol}</div>
                      <div className="flex flex-col items-end">
                        <div className="font-bold">${parseFloat(ticker.price).toFixed(4)}</div>
                        {ticker.priceChangePercent && (
                          <div className={`text-xs ${parseFloat(ticker.priceChangePercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {parseFloat(ticker.priceChangePercent) >= 0 ? '▲' : '▼'} 
                            {Math.abs(parseFloat(ticker.priceChangePercent)).toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>אין מחירים זמינים</CardTitle>
                <CardDescription>לא נמצאו נתוני מחירים</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => refetch()}>נסה שוב</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}