import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewTradeDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for the form
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  
  // Fetch current market price
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  // Fetch available symbols from Binance
  useEffect(() => {
    // Fetch common trading pairs
    const fetchCommonPairs = async () => {
      try {
        const res = await apiRequest('GET', '/api/binance/market/tickers');
        const data = await res.json();
        
        // Filter out only USDT pairs
        const usdtPairs = data
          .filter((ticker: any) => ticker.symbol.endsWith('USDT'))
          .map((ticker: any) => ticker.symbol)
          .sort();
          
        setAvailableSymbols(usdtPairs);
      } catch (error) {
        console.error('Failed to fetch trading pairs:', error);
        // Fallback to common pairs if API fails
        setAvailableSymbols([
          'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
          'SOLUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT'
        ]);
      }
    };
    
    fetchCommonPairs();
  }, []);
  
  // Fetch current price for selected symbol
  useEffect(() => {
    const fetchPrice = async () => {
      if (!symbol) return;
      
      setIsLoadingPrice(true);
      try {
        const res = await apiRequest('GET', `/api/binance/market/price?symbol=${symbol}`);
        const data = await res.json();
        
        if (data && data.price) {
          setCurrentPrice(parseFloat(data.price));
          setEntryPrice(data.price);
        }
      } catch (error) {
        console.error('Failed to fetch price:', error);
        toast({
          title: "לא ניתן לקבל מחיר",
          description: "אירעה שגיאה בעת קבלת מחיר עדכני. אנא נסה שנית או הזן מחיר ידנית.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPrice(false);
      }
    };
    
    fetchPrice();
  }, [symbol]);
  
  // Mutation for creating a new trade
  const createTradeMutation = useMutation({
    mutationFn: async (tradeData: any) => {
      const res = await apiRequest('POST', '/api/paper-trading/trades', tradeData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "עסקה חדשה נוצרה",
        description: `יצרת בהצלחה עסקת ${direction === 'LONG' ? 'קנייה' : 'מכירה'} עבור ${symbol}`,
      });
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/stats'] });
      
      // Close the dialog
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "יצירת העסקה נכשלה",
        description: error.message || "לא ניתן ליצור את העסקה. אנא נסה שנית.",
        variant: "destructive",
      });
    }
  });
  
  // Handler for refreshing price
  const handleRefreshPrice = () => {
    const fetchPrice = async () => {
      if (!symbol) return;
      
      setIsLoadingPrice(true);
      try {
        const res = await apiRequest('GET', `/api/binance/market/price?symbol=${symbol}`);
        const data = await res.json();
        
        if (data && data.price) {
          setCurrentPrice(parseFloat(data.price));
          setEntryPrice(data.price);
          
          toast({
            title: "מחיר עודכן",
            description: `המחיר העדכני של ${symbol} הוא ${parseFloat(data.price).toFixed(2)} USDT`,
          });
        }
      } catch (error) {
        toast({
          title: "עדכון מחיר נכשל",
          description: "לא ניתן לעדכן את המחיר העדכני.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPrice(false);
      }
    };
    
    fetchPrice();
  };
  
  // Handler for submitting the form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!symbol) {
      toast({
        title: "שגיאת קלט",
        description: "אנא בחר זוג מסחר",
        variant: "destructive",
      });
      return;
    }
    
    if (!quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "שגיאת קלט",
        description: "אנא הזן כמות תקינה",
        variant: "destructive",
      });
      return;
    }
    
    if (!entryPrice || parseFloat(entryPrice) <= 0) {
      toast({
        title: "שגיאת קלט",
        description: "אנא הזן מחיר כניסה תקין",
        variant: "destructive",
      });
      return;
    }
    
    // Create trade object
    const tradeData = {
      symbol,
      quantity,
      entryPrice,
      direction,
      type: "MARKET"
    };
    
    // Submit trade
    createTradeMutation.mutate(tradeData);
  };
  
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>עסקה חדשה</DialogTitle>
        <DialogDescription>
          יצירת עסקה חדשה בחשבון ה-Paper Trading שלך
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          {/* Symbol selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="symbol" className="text-right">
              זוג מסחר
            </Label>
            <div className="col-span-3">
              <Select 
                value={symbol} 
                onValueChange={setSymbol}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר זוג מסחר" />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map((sym) => (
                    <SelectItem key={sym} value={sym}>
                      {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Direction selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              סוג עסקה
            </Label>
            <div className="col-span-3">
              <RadioGroup 
                value={direction} 
                onValueChange={(val) => setDirection(val as 'LONG' | 'SHORT')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="LONG" id="long" />
                  <Label htmlFor="long" className="flex items-center cursor-pointer">
                    <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                    קנייה (Long)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="SHORT" id="short" />
                  <Label htmlFor="short" className="flex items-center cursor-pointer">
                    <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                    מכירה (Short)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          {/* Quantity input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              כמות
            </Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0.00000001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="col-span-3"
              placeholder="הזן כמות"
            />
          </div>
          
          {/* Entry Price input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entryPrice" className="text-right">
              מחיר כניסה
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="entryPrice"
                type="number"
                step="any"
                min="0.00000001"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="flex-1"
                placeholder="הזן מחיר כניסה"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleRefreshPrice}
                disabled={isLoadingPrice}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingPrice ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Current market price display */}
          {currentPrice && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm text-muted-foreground">
                מחיר שוק נוכחי
              </span>
              <span className="col-span-3 text-sm">
                {isLoadingPrice ? (
                  <span className="flex items-center">
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    מעדכן מחיר...
                  </span>
                ) : (
                  <span>{currentPrice.toFixed(6)} USDT</span>
                )}
              </span>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            type="button" 
            onClick={onClose}
          >
            ביטול
          </Button>
          <Button 
            type="submit"
            disabled={createTradeMutation.isPending || isLoadingPrice}
          >
            {createTradeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                מבצע עסקה...
              </>
            ) : (
              'בצע עסקה'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}