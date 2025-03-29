import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";

// Form schema
const formSchema = z.object({
  symbol: z.string().min(1, "חובה לבחור מטבע"),
  direction: z.enum(["LONG", "SHORT"], {
    required_error: "חובה לבחור כיוון לעסקה",
  }),
  quantity: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "כמות חייבת להיות מספר חיובי" }
  ),
  entryPrice: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "מחיר כניסה חייב להיות מספר חיובי" }
  ),
});

// Type for the selected market data
type MarketData = {
  symbol: string;
  currentPrice: number;
};

interface NewPaperTradeDialogProps {
  accountId?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export default function NewPaperTradeDialog({ 
  accountId,
  open: externalOpen,
  onOpenChange,
  onClose 
}: NewPaperTradeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  
  // שימוש ב-open החיצוני אם סופק, אחרת השתמש בערך הפנימי
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  
  // פונקציה לשינוי מצב הדיאלוג
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
    
    // כאשר הדיאלוג נסגר, קרא ל-onClose אם סופק
    if (!newOpen && onClose) {
      onClose();
    }
  };

  // Form definition
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: "",
      direction: "LONG",
      quantity: "",
      entryPrice: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // Fetch market data when dialog opens
  useEffect(() => {
    if (open) {
      fetchMarketData();
    }
  }, [open]);

  // Update entry price when symbol is selected
  useEffect(() => {
    if (selectedMarket) {
      form.setValue("entryPrice", selectedMarket.currentPrice.toString());
    }
  }, [selectedMarket, form]);

  // Fetch market data from Binance API
  const fetchMarketData = async () => {
    setIsLoadingMarkets(true);
    try {
      // בדיקה ראשונית - עם נתונים אמיתיים מבינאנס
      try {
        const response = await fetch("/api/binance/market/tickers", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          const responseData = await response.json();
          // אם התגובה מכילה שגיאה המציינת מגבלת מיקום גיאוגרפי
          if (responseData?.useFallback) {
            // נסה שוב עם נתוני גיבוי
            throw new Error("Geographic restriction");
          }
          throw new Error("Failed to fetch market data");
        }

        const data = await response.json();
        
        // אם הגענו לכאן, יש לנו נתונים תקינים
        const formattedMarkets = data
          .filter((ticker: any) => ticker.symbol.endsWith("USDT"))
          .map((ticker: any) => ({
            symbol: ticker.symbol,
            // השתמש במחיר האחרון אם קיים, אחרת השתמש במחיר הרגיל
            currentPrice: parseFloat(ticker.lastPrice || ticker.price),
          }))
          .sort((a: MarketData, b: MarketData) => a.symbol.localeCompare(b.symbol));

        setMarkets(formattedMarkets);
        return;
      } catch (initialError) {
        console.log("Initial fetch failed, trying fallback:", initialError);
        // נמשיך לנסות את אפשרות הגיבוי
      }

      // נסה לקבל נתוני גיבוי
      const fallbackResponse = await fetch("/api/binance/market/tickers?useFallback=true", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!fallbackResponse.ok) {
        throw new Error("Failed to fetch market data even with fallback");
      }

      const fallbackData = await fallbackResponse.json();
      
      // Transform the fallback data to our format
      const formattedMarkets = fallbackData
        .filter((ticker: any) => ticker.symbol.endsWith("USDT"))
        .map((ticker: any) => ({
          symbol: ticker.symbol,
          currentPrice: parseFloat(ticker.price),
        }))
        .sort((a: MarketData, b: MarketData) => a.symbol.localeCompare(b.symbol));

      setMarkets(formattedMarkets);
    } catch (error) {
      console.error("Error fetching market data:", error);
      toast({
        title: "שגיאה בטעינת נתוני שוק",
        description: "לא ניתן לטעון את מחירי המטבעות הנוכחיים",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMarkets(false);
    }
  };

  // Handle symbol selection
  const handleSymbolChange = (value: string) => {
    const market = markets.find((m) => m.symbol === value);
    if (market) {
      setSelectedMarket(market);
      form.setValue("symbol", value);
    }
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch("/api/paper-trading/positions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          symbol: values.symbol,
          direction: values.direction,
          quantity: parseFloat(values.quantity),
          entryPrice: parseFloat(values.entryPrice),
          type: "MARKET",
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create trade");
      }

      toast({
        title: "עסקה נוצרה בהצלחה",
        description: `נפתחה עסקת ${values.direction === "LONG" ? "קנייה" : "מכירה"} של ${values.symbol}`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/account"] });
      
      // Reset form and close dialog
      form.reset();
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        title: "שגיאה ביצירת העסקה",
        description: error.message || "אירעה שגיאה בעת יצירת העסקה החדשה",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* הסרנו את ה-DialogTrigger כי הדיאלוג נשלט חיצונית */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>יצירת עסקה חדשה</DialogTitle>
          <DialogDescription>
            צור עסקה חדשה במערכת ה-Paper Trading. נתוני המחיר מתעדכנים בזמן אמת מבורסת Binance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מטבע</FormLabel>
                  <Select
                    disabled={isLoadingMarkets || isSubmitting}
                    onValueChange={handleSymbolChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מטבע" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingMarkets ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : (
                        markets.map((market) => (
                          <SelectItem key={market.symbol} value={market.symbol}>
                            {market.symbol} (${market.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>כיוון העסקה</FormLabel>
                  <Select
                    disabled={isSubmitting}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר כיוון" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LONG">קנייה (Long)</SelectItem>
                      <SelectItem value="SHORT">מכירה (Short)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>כמות</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      type="number"
                      step="any"
                      placeholder="הזן כמות"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    כמות היחידות לקנייה/מכירה
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="entryPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מחיר כניסה</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      type="number"
                      step="any"
                      placeholder="מחיר כניסה"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    מחיר הכניסה לעסקה (מתעדכן לפי מחיר השוק)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                צור עסקה
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}