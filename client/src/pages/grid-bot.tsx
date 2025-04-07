import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { BotControlPanel } from "../components/bots/bot-control-panel";

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
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import { 
  ArrowRight, 
  DollarSign, 
  BarChart3,
  TrendingUp,
  ArrowUpDown,
  Grid3x3,
  ArrowUp,
  ArrowDown,
  CircleDot,
  Info,
  TrendingDown
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Form schema for Grid bot
const gridBotFormSchema = z.object({
  name: z.string().min(1, "הכנס שם לבוט"),
  symbol: z.string().min(1, "בחר זוג מסחר"),
  totalInvestment: z.string().min(1, "הכנס סכום השקעה"),
  upperPrice: z.string().min(1, "הכנס מחיר עליון"),
  lowerPrice: z.string().min(1, "הכנס מחיר תחתון"),
  gridCount: z.coerce.number().min(2).max(50),
});

type GridBotFormValues = z.infer<typeof gridBotFormSchema>;

export default function GridBot() {
  const [activeTab, setActiveTab] = useState("settings");
  const [botId, setBotId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Auth state
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Popular trading pairs
  const tradingPairs = [
    "BTCUSDT", 
    "ETHUSDT", 
    "SOLUSDT", 
    "BNBUSDT", 
    "XRPUSDT", 
    "ADAUSDT", 
    "DOGEUSDT", 
    "DOTUSDT"
  ];

  // Bot creation form
  const form = useForm<GridBotFormValues>({
    resolver: zodResolver(gridBotFormSchema),
    defaultValues: {
      name: "Grid Trading Bot",
      symbol: "BTCUSDT",
      totalInvestment: "1000",
      upperPrice: "",
      lowerPrice: "",
      gridCount: 5,
    },
  });

  // Get current price for the selected symbol
  const { data: priceData } = useQuery({
    queryKey: ['/api/market/price', form.watch('symbol')],
    queryFn: async () => {
      const symbol = form.watch('symbol');
      if (!symbol) return null;
      
      const response = await fetch(`/api/market/prices?symbols=${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch price data');
      }
      
      return response.json();
    },
    enabled: !!form.watch('symbol'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update current price when data is fetched
  useEffect(() => {
    if (priceData && priceData.length > 0) {
      setCurrentPrice(parseFloat(priceData[0].price));
    }
  }, [priceData]);

  // Set default upper and lower prices based on current price
  useEffect(() => {
    if (currentPrice && !form.getValues('upperPrice') && !form.getValues('lowerPrice')) {
      const upperPrice = (currentPrice * 1.05).toFixed(2);
      const lowerPrice = (currentPrice * 0.95).toFixed(2);
      form.setValue('upperPrice', upperPrice);
      form.setValue('lowerPrice', lowerPrice);
    }
  }, [currentPrice, form]);

  // Query to get bot status
  const { data: botStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ['/api/bots/grid', botId],
    queryFn: async () => {
      if (!botId) return null;
      
      const response = await fetch(`/api/bots/${botId}/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch bot status');
      }
      
      return response.json();
    },
    enabled: !!botId,
    refetchInterval: 10000, // Refresh every 10 seconds when active
  });

  // Query to get bot trades
  const { data: botTrades, isLoading: isTradesLoading } = useQuery({
    queryKey: ['/api/bots/grid/trades', botId],
    queryFn: async () => {
      if (!botId) return [];
      
      const response = await fetch(`/api/bots/${botId}/trades`);
      if (!response.ok) {
        throw new Error('Failed to fetch bot trades');
      }
      
      return response.json();
    },
    enabled: !!botId,
    refetchInterval: 10000, // Refresh every 10 seconds when active
  });

  // Mutation to create bot
  const createBotMutation = useMutation({
    mutationFn: async (data: GridBotFormValues) => {
      const parameters = {
        symbol: data.symbol,
        totalInvestment: parseFloat(data.totalInvestment),
        upperPrice: parseFloat(data.upperPrice),
        lowerPrice: parseFloat(data.lowerPrice),
        gridCount: data.gridCount,
      };
      
      const response = await fetch('/api/bots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          strategy: 'grid',
          description: "Classic grid trading strategy for cryptocurrency markets",
          parameters,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create bot');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "בוט Grid נוצר בהצלחה",
        description: "הבוט נוצר ומוכן להפעלה",
      });
      setBotId(data.id);
      setActiveTab("status");
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת הבוט",
        description: error.message,
        variant: "destructive",
      });
      
      // Check if there's an API key error in the message
      if (error.message.includes('API key') || error.message.includes('credentials')) {
        setShowApiKeyDialog(true);
      }
    },
  });

  // Effect to update bot running status
  useEffect(() => {
    if (botStatus) {
      setIsRunning(botStatus.isRunning);
    }
  }, [botStatus]);

  // Handle form submission
  const onSubmit = (data: GridBotFormValues) => {
    if (parseFloat(data.upperPrice) <= parseFloat(data.lowerPrice)) {
      toast({
        title: "שגיאה בהגדרות",
        description: "המחיר העליון חייב להיות גבוה מהמחיר התחתון",
        variant: "destructive",
      });
      return;
    }
    
    createBotMutation.mutate(data);
  };

  // Calculate estimated profit
  const calculateEstimatedProfit = () => {
    const upperPrice = parseFloat(form.getValues('upperPrice') || '0');
    const lowerPrice = parseFloat(form.getValues('lowerPrice') || '0');
    const gridCount = form.getValues('gridCount');
    
    if (upperPrice <= lowerPrice || gridCount < 2) return 0;
    
    const priceRange = upperPrice - lowerPrice;
    const gridSize = priceRange / (gridCount - 1);
    const potentialProfitPerGrid = gridSize / lowerPrice * 100;
    
    return potentialProfitPerGrid.toFixed(2);
  };

  // Generate grid levels for visualization
  const generateGridLevels = () => {
    const upperPrice = parseFloat(form.getValues('upperPrice') || '0');
    const lowerPrice = parseFloat(form.getValues('lowerPrice') || '0');
    const gridCount = form.getValues('gridCount');
    
    if (upperPrice <= lowerPrice || gridCount < 2) return [];
    
    const gridLevels = [];
    const gridStep = (upperPrice - lowerPrice) / (gridCount - 1);
    
    for (let i = 0; i < gridCount; i++) {
      const price = lowerPrice + i * gridStep;
      gridLevels.push({
        level: i + 1,
        price: parseFloat(price.toFixed(2)),
      });
    }
    
    return gridLevels;
  };

  // Sample performance data for bot
  const performanceData = [
    { date: "Jan 1", value: 1000, price: 65000 },
    { date: "Jan 5", value: 1030, price: 63000 },
    { date: "Jan 10", value: 1060, price: 68000 },
    { date: "Jan 15", value: 1040, price: 62000 },
    { date: "Jan 20", value: 1080, price: 65000 },
    { date: "Jan 25", value: 1120, price: 69000 },
    { date: "Jan 30", value: 1150, price: 66000 },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">בוט Grid</h1>
            <p className="text-muted-foreground">
              אסטרטגיית מסחר גריד לרווחים קבועים בשוק הקריפטו
            </p>
          </div>
          <Link href="/bots">
            <Button variant="outline">
              חזרה לעמוד הבוטים
            </Button>
          </Link>
        </div>

        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex">
            <TabsTrigger value="settings">הגדרות</TabsTrigger>
            <TabsTrigger value="status" disabled={!botId}>סטטיסטיקות</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            {!botId ? (
              <Card>
                <CardHeader>
                  <CardTitle>יצירת בוט Grid חדש</CardTitle>
                  <CardDescription>
                    בוט Grid מבצע רכישות ומכירות אוטומטיות לפי רמות מחיר קבועות מראש
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>שם הבוט</FormLabel>
                            <FormControl>
                              <Input placeholder="הכנס שם לבוט" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>זוג מסחר</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר זוג מסחר" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {tradingPairs.map((pair) => (
                                  <SelectItem key={pair} value={pair}>
                                    {pair}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {currentPrice && `מחיר נוכחי: $${currentPrice.toFixed(2)}`}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="totalInvestment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>סכום השקעה כולל</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="number" min="100" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              סך כל הסכום שיושקע בבוט זה
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="upperPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>מחיר עליון</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" min="0" step="0.01" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormDescription>
                                רמת המחיר העליונה של הגריד
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lowerPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>מחיר תחתון</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" min="0" step="0.01" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormDescription>
                                רמת המחיר התחתונה של הגריד
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="gridCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מספר רמות בגריד</FormLabel>
                            <FormControl>
                              <Input type="number" min="2" max="50" {...field} />
                            </FormControl>
                            <FormDescription>
                              מספר הרמות בגריד (מומלץ בין 3-10)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Grid Visualization */}
                      {parseFloat(form.watch('upperPrice')) > 0 && 
                       parseFloat(form.watch('lowerPrice')) > 0 && 
                       form.watch('gridCount') >= 2 && (
                        <div className="border rounded-lg p-4 mt-6">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium">הדמיית רמות הגריד</h3>
                            <div className="text-xs text-muted-foreground px-2 py-1 bg-primary/10 rounded">
                              רווח פוטנציאלי לגריד: ~{calculateEstimatedProfit()}%
                            </div>
                          </div>
                          
                          <div className="relative mt-5 h-64">
                            {/* Upper Boundary */}
                            <div className="absolute top-0 left-0 right-0 flex justify-between items-center py-1 border-t border-dashed">
                              <div className="flex items-center">
                                <ArrowUp className="h-4 w-4 text-primary mr-1" />
                                <span className="text-xs">גבול עליון</span>
                              </div>
                              <span className="text-xs font-medium">${form.watch('upperPrice')}</span>
                            </div>
                            
                            {/* Grid Levels */}
                            <div className="absolute top-12 bottom-12 left-0 right-0">
                              {generateGridLevels().map((level, index) => {
                                const position = (index / (form.watch('gridCount') - 1)) * 100;
                                return (
                                  <div 
                                    key={level.level}
                                    className={`absolute left-0 right-0 flex justify-between items-center py-1 border-t ${
                                      index === 0 || index === form.watch('gridCount') - 1 
                                        ? 'border-transparent' 
                                        : 'border-dashed border-muted'
                                    }`}
                                    style={{ top: `${100 - position}%` }}
                                  >
                                    {index !== 0 && index !== form.watch('gridCount') - 1 && (
                                      <>
                                        <div className="flex items-center">
                                          <CircleDot className="h-3 w-3 text-primary/70 mr-1" />
                                          <span className="text-xs">רמה {level.level}</span>
                                        </div>
                                        <span className="text-xs">${level.price}</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Lower Boundary */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center py-1 border-t border-dashed">
                              <div className="flex items-center">
                                <ArrowDown className="h-4 w-4 text-primary mr-1" />
                                <span className="text-xs">גבול תחתון</span>
                              </div>
                              <span className="text-xs font-medium">${form.watch('lowerPrice')}</span>
                            </div>
                            
                            {/* Current Price */}
                            {currentPrice && (
                              <div 
                                className="absolute left-0 right-0 flex justify-between items-center py-1 border-t border-primary"
                                style={{ 
                                  top: `${100 - ((currentPrice - parseFloat(form.watch('lowerPrice'))) / 
                                  (parseFloat(form.watch('upperPrice')) - parseFloat(form.watch('lowerPrice'))) * 100)}%` 
                                }}
                              >
                                <div className="flex items-center">
                                  <TrendingUp className="h-4 w-4 text-primary mr-1" />
                                  <span className="text-xs">מחיר נוכחי</span>
                                </div>
                                <span className="text-xs font-semibold">${currentPrice.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 text-xs text-muted-foreground">
                            <div className="flex items-start">
                              <Info className="h-3 w-3 mr-1 mt-0.5" />
                              <p>הבוט יקנה כאשר המחיר יורד וימכור כאשר המחיר עולה בין הרמות המוגדרות</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createBotMutation.isPending}
                      >
                        {createBotMutation.isPending ? "מייצר בוט..." : "צור בוט Grid"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{botStatus?.name || "Grid Bot"}</CardTitle>
                    <div className={`px-2 py-1 text-xs rounded-full ${isRunning 
                      ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                      : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                      {isRunning ? 'פעיל' : 'מושהה'}
                    </div>
                  </div>
                  <CardDescription>
                    הגדרות הבוט הנוכחיות - ניתן לערוך פרמטרים
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-6">
                      <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>זוג מסחר</FormLabel>
                            <FormControl>
                              <Input readOnly {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="totalInvestment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>סכום השקעה כולל</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="upperPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>מחיר עליון</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" step="0.01" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lowerPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>מחיר תחתון</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" step="0.01" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="gridCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מספר רמות בגריד</FormLabel>
                            <FormControl>
                              <Input type="number" min="2" max="50" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="justify-between flex-col sm:flex-row gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setBotId(null);
                      setActiveTab("settings");
                    }}
                  >
                    הגדר בוט חדש
                  </Button>
                  
                  <BotControlPanel botId={botId} isRunning={isRunning} />
                </CardFooter>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="status">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ביצועי הבוט</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Area 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary)/0.2)" 
                          name="Grid Portfolio Value ($)"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="price" 
                          stroke="hsl(var(--muted-foreground))" 
                          name="Asset Price ($)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">סטטיסטיקות Grid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <Grid3x3 className="h-4 w-4 mr-2 text-primary" />
                        <span>רמות בגריד</span>
                      </div>
                      <span className="font-medium">{botStatus?.stats?.gridLevels?.length || form.watch('gridCount')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <ArrowUp className="h-4 w-4 mr-2 text-primary" />
                        <span>גבול עליון</span>
                      </div>
                      <span className="font-medium">${botStatus?.stats?.upperPrice || form.watch('upperPrice')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <ArrowDown className="h-4 w-4 mr-2 text-primary" />
                        <span>גבול תחתון</span>
                      </div>
                      <span className="font-medium">${botStatus?.stats?.lowerPrice || form.watch('lowerPrice')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <ArrowUpDown className="h-4 w-4 mr-2 text-primary" />
                        <span>מחיר נוכחי</span>
                      </div>
                      <span className="font-medium">${botStatus?.stats?.currentPrice || currentPrice?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                        <span>עסקאות קנייה</span>
                      </div>
                      <span className="font-medium">{botStatus?.stats?.buyOrders || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <TrendingDown className="h-4 w-4 mr-2 text-primary" />
                        <span>עסקאות מכירה</span>
                      </div>
                      <span className="font-medium">{botStatus?.stats?.sellOrders || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                        <span>רווח/הפסד</span>
                      </div>
                      <span className={`font-medium ${
                        (botStatus?.profitLoss || 0) >= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {(botStatus?.profitLoss || 0) >= 0 ? '+' : ''}{botStatus?.profitLossPercent || '0%'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Grid Visualization */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">מצב הגריד הנוכחי</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-64 border rounded-md">
                  {botStatus?.stats?.gridLevels ? (
                    <>
                      {/* Upper Boundary */}
                      <div className="absolute top-0 left-0 right-0 flex justify-between items-center py-1 border-t border-dashed">
                        <div className="flex items-center">
                          <ArrowUp className="h-4 w-4 text-primary mr-1" />
                          <span className="text-xs">גבול עליון</span>
                        </div>
                        <span className="text-xs font-medium">${botStatus.stats.upperPrice}</span>
                      </div>
                      
                      {/* Grid Levels */}
                      <div className="absolute top-12 bottom-12 left-0 right-0">
                        {botStatus.stats.gridLevels.map((level: number, index: number) => {
                          const upperPrice = botStatus.stats.upperPrice;
                          const lowerPrice = botStatus.stats.lowerPrice;
                          const position = ((level - lowerPrice) / (upperPrice - lowerPrice)) * 100;
                          
                          return (
                            <div 
                              key={index}
                              className="absolute left-0 right-0 flex justify-between items-center py-1 border-t border-dashed border-muted"
                              style={{ top: `${100 - position}%` }}
                            >
                              <div className="flex items-center">
                                <CircleDot className="h-3 w-3 text-primary/70 mr-1" />
                                <span className="text-xs">רמה {index + 1}</span>
                              </div>
                              <span className="text-xs">${level.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Lower Boundary */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center py-1 border-t border-dashed">
                        <div className="flex items-center">
                          <ArrowDown className="h-4 w-4 text-primary mr-1" />
                          <span className="text-xs">גבול תחתון</span>
                        </div>
                        <span className="text-xs font-medium">${botStatus.stats.lowerPrice}</span>
                      </div>
                      
                      {/* Current Price */}
                      {botStatus.stats.currentPrice && (
                        <div 
                          className="absolute left-0 right-0 flex justify-between items-center py-1 border-t border-primary"
                          style={{ 
                            top: `${100 - ((botStatus.stats.currentPrice - botStatus.stats.lowerPrice) / 
                            (botStatus.stats.upperPrice - botStatus.stats.lowerPrice) * 100)}%` 
                          }}
                        >
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 text-primary mr-1" />
                            <span className="text-xs">מחיר נוכחי</span>
                          </div>
                          <span className="text-xs font-semibold">${botStatus.stats.currentPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      טוען נתוני גריד...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Transactions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">היסטוריית עסקאות</CardTitle>
              </CardHeader>
              <CardContent>
                {isTradesLoading ? (
                  <div className="text-center py-4">טוען נתונים...</div>
                ) : botTrades && botTrades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-3 px-4">תאריך</th>
                          <th className="text-right py-3 px-4">כיוון</th>
                          <th className="text-right py-3 px-4">רמת גריד</th>
                          <th className="text-right py-3 px-4">מחיר</th>
                          <th className="text-right py-3 px-4">כמות</th>
                          <th className="text-right py-3 px-4">סכום</th>
                          <th className="text-right py-3 px-4">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {botTrades.map((trade: any) => (
                          <tr key={trade.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              {new Date(trade.timestamp).toLocaleString('he-IL')}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                trade.side === 'buy' 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : 'bg-red-500/10 text-red-500'
                              }`}>
                                {trade.side === 'buy' ? 'קנייה' : 'מכירה'}
                              </span>
                            </td>
                            <td className="py-3 px-4">{trade.gridLevel || 'N/A'}</td>
                            <td className="py-3 px-4">${trade.price.toFixed(2)}</td>
                            <td className="py-3 px-4">{trade.quantity.toFixed(6)}</td>
                            <td className="py-3 px-4">${trade.total.toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                trade.status === 'executed' 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : trade.status === 'pending'
                                  ? 'bg-orange-500/10 text-orange-500'
                                  : 'bg-red-500/10 text-red-500'
                              }`}>
                                {trade.status === 'executed' ? 'בוצע' : 
                                trade.status === 'pending' ? 'ממתין' : 'נכשל'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    לא קיימות עסקאות להצגה
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}