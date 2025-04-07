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
import { Slider } from "../components/ui/slider";
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
  Zap,
  AlertTriangle,
  TrendingDown,
  Clock,
  Activity
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

// Form schema for MACD bot
const macdBotFormSchema = z.object({
  name: z.string().min(1, "הכנס שם לבוט"),
  symbol: z.string().min(1, "בחר זוג מסחר"),
  totalInvestment: z.string().min(1, "הכנס סכום השקעה"),
  fastPeriod: z.coerce.number().min(5).max(20),
  slowPeriod: z.coerce.number().min(10).max(50),
  signalPeriod: z.coerce.number().min(5).max(20),
  takeProfitPercentage: z.coerce.number().min(1).max(20),
  stopLossPercentage: z.coerce.number().min(1).max(20),
});

type MacdBotFormValues = z.infer<typeof macdBotFormSchema>;

export default function MacdBot() {
  const [activeTab, setActiveTab] = useState("settings");
  const [botId, setBotId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false);
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
  const form = useForm<MacdBotFormValues>({
    resolver: zodResolver(macdBotFormSchema),
    defaultValues: {
      name: "MACD Trend Bot",
      symbol: "BTCUSDT",
      totalInvestment: "1000",
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      takeProfitPercentage: 5,
      stopLossPercentage: 3,
    },
  });

  // Query to get bot status
  const { data: botStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ['/api/bots/macd', botId],
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
    queryKey: ['/api/bots/macd/trades', botId],
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
    mutationFn: async (data: MacdBotFormValues) => {
      const parameters = {
        symbol: data.symbol,
        totalInvestment: parseFloat(data.totalInvestment),
        fastPeriod: data.fastPeriod,
        slowPeriod: data.slowPeriod,
        signalPeriod: data.signalPeriod,
        takeProfitPercentage: data.takeProfitPercentage,
        stopLossPercentage: data.stopLossPercentage,
      };
      
      const response = await fetch('/api/bots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          strategy: 'macd',
          description: "Technical analysis bot using MACD indicators for optimal entry and exit",
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
        title: "בוט MACD נוצר בהצלחה",
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
  const onSubmit = (data: MacdBotFormValues) => {
    createBotMutation.mutate(data);
  };

  // Sample performance data for bot
  const performanceData = [
    { date: "Jan 1", value: 1000, macd: 0.5, signal: 0.2 },
    { date: "Jan 5", value: 950, macd: -0.2, signal: 0.1 },
    { date: "Jan 10", value: 980, macd: -0.3, signal: -0.1 },
    { date: "Jan 15", value: 1050, macd: 0.3, signal: 0 },
    { date: "Jan 20", value: 1120, macd: 0.6, signal: 0.2 },
    { date: "Jan 25", value: 1080, macd: 0.3, signal: 0.4 },
    { date: "Jan 30", value: 1150, macd: 0.2, signal: 0.3 },
  ];

  // Sample trades for demonstration
  const sampleTrades = [
    {
      id: "trade-1",
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      symbol: "BTCUSDT",
      side: "buy",
      price: 65800,
      quantity: 0.01,
      total: 658,
      status: "executed",
      macdValue: 0.45,
      signalValue: 0.2,
      reason: "MACD crossed above signal line"
    },
    {
      id: "trade-2",
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      symbol: "BTCUSDT",
      side: "sell",
      price: 69200,
      quantity: 0.01,
      total: 692,
      status: "executed",
      macdValue: -0.3,
      signalValue: 0.1,
      reason: "MACD crossed below signal line"
    },
    {
      id: "trade-3",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      symbol: "BTCUSDT",
      side: "buy",
      price: 67500,
      quantity: 0.01,
      total: 675,
      status: "executed",
      macdValue: 0.35,
      signalValue: 0.15,
      reason: "MACD crossed above signal line"
    }
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">בוט MACD</h1>
            <p className="text-muted-foreground">
              אסטרטגיית מסחר המבוססת על אינדיקטור MACD לזיהוי מגמות מחיר
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
                  <CardTitle>יצירת בוט MACD חדש</CardTitle>
                  <CardDescription>
                    בוט המבוסס על אינדיקטור MACD (Moving Average Convergence Divergence) לזיהוי נקודות כניסה ויציאה
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
                        <div>
                          <h3 className="text-lg font-medium mb-4">פרמטרים של MACD</h3>
                          
                          <FormField
                            control={form.control}
                            name="fastPeriod"
                            render={({ field: { onChange, value, ...field } }) => (
                              <FormItem className="mb-6">
                                <div className="flex justify-between">
                                  <FormLabel>Fast EMA Period</FormLabel>
                                  <span className="text-muted-foreground">{value}</span>
                                </div>
                                <FormControl>
                                  <Slider
                                    min={5}
                                    max={20}
                                    step={1}
                                    defaultValue={[value]}
                                    onValueChange={(vals) => onChange(vals[0])}
                                    className="mt-2"
                                  />
                                </FormControl>
                                <FormDescription>
                                  תקופת EMA קצרה (ברירת מחדל: 12)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="slowPeriod"
                            render={({ field: { onChange, value, ...field } }) => (
                              <FormItem className="mb-6">
                                <div className="flex justify-between">
                                  <FormLabel>Slow EMA Period</FormLabel>
                                  <span className="text-muted-foreground">{value}</span>
                                </div>
                                <FormControl>
                                  <Slider
                                    min={10}
                                    max={50}
                                    step={1}
                                    defaultValue={[value]}
                                    onValueChange={(vals) => onChange(vals[0])}
                                    className="mt-2"
                                  />
                                </FormControl>
                                <FormDescription>
                                  תקופת EMA ארוכה (ברירת מחדל: 26)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="signalPeriod"
                            render={({ field: { onChange, value, ...field } }) => (
                              <FormItem>
                                <div className="flex justify-between">
                                  <FormLabel>Signal Period</FormLabel>
                                  <span className="text-muted-foreground">{value}</span>
                                </div>
                                <FormControl>
                                  <Slider
                                    min={5}
                                    max={20}
                                    step={1}
                                    defaultValue={[value]}
                                    onValueChange={(vals) => onChange(vals[0])}
                                    className="mt-2"
                                  />
                                </FormControl>
                                <FormDescription>
                                  תקופת קו האות (ברירת מחדל: 9)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-4">ניהול סיכונים</h3>
                          
                          <FormField
                            control={form.control}
                            name="takeProfitPercentage"
                            render={({ field: { onChange, value, ...field } }) => (
                              <FormItem className="mb-6">
                                <div className="flex justify-between">
                                  <FormLabel>Take Profit</FormLabel>
                                  <span className="text-muted-foreground">{value}%</span>
                                </div>
                                <FormControl>
                                  <Slider
                                    min={1}
                                    max={20}
                                    step={0.5}
                                    defaultValue={[value]}
                                    onValueChange={(vals) => onChange(vals[0])}
                                    className="mt-2"
                                  />
                                </FormControl>
                                <FormDescription>
                                  אחוז הרווח שבו הבוט יסגור עסקה
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="stopLossPercentage"
                            render={({ field: { onChange, value, ...field } }) => (
                              <FormItem>
                                <div className="flex justify-between">
                                  <FormLabel>Stop Loss</FormLabel>
                                  <span className="text-muted-foreground">{value}%</span>
                                </div>
                                <FormControl>
                                  <Slider
                                    min={1}
                                    max={20}
                                    step={0.5}
                                    defaultValue={[value]}
                                    onValueChange={(vals) => onChange(vals[0])}
                                    className="mt-2"
                                  />
                                </FormControl>
                                <FormDescription>
                                  אחוז ההפסד שבו הבוט יסגור עסקה
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-4 mt-6">
                            <div className="flex">
                              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                              <div>
                                <h4 className="text-sm font-medium text-amber-500">הערה חשובה</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  אסטרטגיית MACD נחשבת לאסטרטגיה ברמת סיכון בינונית-גבוהה. מומלץ להשתמש בסכומים קטנים בתחילת הדרך ולבדוק את ביצועי הבוט.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createBotMutation.isPending}
                      >
                        {createBotMutation.isPending ? "מייצר בוט..." : "צור בוט MACD"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{botStatus?.name || "MACD Bot"}</CardTitle>
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
                      <div className="grid md:grid-cols-2 gap-6">
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
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="fastPeriod"
                          render={({ field: { onChange, value, ...field } }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Fast EMA</FormLabel>
                                <span className="text-muted-foreground">{value}</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={5}
                                  max={20}
                                  step={1}
                                  defaultValue={[value]}
                                  onValueChange={(vals) => onChange(vals[0])}
                                  className="mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="slowPeriod"
                          render={({ field: { onChange, value, ...field } }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Slow EMA</FormLabel>
                                <span className="text-muted-foreground">{value}</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={10}
                                  max={50}
                                  step={1}
                                  defaultValue={[value]}
                                  onValueChange={(vals) => onChange(vals[0])}
                                  className="mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="signalPeriod"
                          render={({ field: { onChange, value, ...field } }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Signal</FormLabel>
                                <span className="text-muted-foreground">{value}</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={5}
                                  max={20}
                                  step={1}
                                  defaultValue={[value]}
                                  onValueChange={(vals) => onChange(vals[0])}
                                  className="mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="takeProfitPercentage"
                          render={({ field: { onChange, value, ...field } }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Take Profit</FormLabel>
                                <span className="text-muted-foreground">{value}%</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={20}
                                  step={0.5}
                                  defaultValue={[value]}
                                  onValueChange={(vals) => onChange(vals[0])}
                                  className="mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="stopLossPercentage"
                          render={({ field: { onChange, value, ...field } }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Stop Loss</FormLabel>
                                <span className="text-muted-foreground">{value}%</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={20}
                                  step={0.5}
                                  defaultValue={[value]}
                                  onValueChange={(vals) => onChange(vals[0])}
                                  className="mt-2"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
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
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" domain={[-1, 1]} />
                        <Tooltip />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          name="Portfolio Value ($)"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="macd" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          name="MACD"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="signal" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          name="Signal"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">סטטיסטיקות MACD</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-primary" />
                        <span>מצב מגמה נוכחית</span>
                      </div>
                      <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                        botStatus?.stats?.currentTrend === 'UPTREND' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : botStatus?.stats?.currentTrend === 'DOWNTREND'
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                      }`}>
                        {botStatus?.stats?.currentTrend === 'UPTREND' ? 'מגמת עליה' : 
                         botStatus?.stats?.currentTrend === 'DOWNTREND' ? 'מגמת ירידה' : 'מגמה צידית'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <ArrowUpDown className="h-4 w-4 mr-2 text-primary" />
                        <span>ערך MACD נוכחי</span>
                      </div>
                      <span className="font-medium">
                        {botStatus?.stats?.currentMacd?.toFixed(4) || "0.0000"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-primary" />
                        <span>ערך Signal נוכחי</span>
                      </div>
                      <span className="font-medium">
                        {botStatus?.stats?.currentSignal?.toFixed(4) || "0.0000"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                        <span>פוזיציה נוכחית</span>
                      </div>
                      <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                        botStatus?.stats?.currentPosition === 'LONG' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : botStatus?.stats?.currentPosition === 'SHORT'
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {botStatus?.stats?.currentPosition === 'LONG' ? 'LONG' : 
                        botStatus?.stats?.currentPosition === 'SHORT' ? 'SHORT' : 'ללא פוזיציה'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        <span>זמן העסקה האחרונה</span>
                      </div>
                      <span className="font-medium">
                        {botStatus?.stats?.lastTradeTime ? new Date(botStatus.stats.lastTradeTime).toLocaleString('he-IL') : "לא בוצע"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <TrendingDown className="h-4 w-4 mr-2 text-primary" />
                        <span>Stop Loss נוכחי</span>
                      </div>
                      <span className="font-medium">
                        {botStatus?.stats?.currentStopLoss ? `$${botStatus.stats.currentStopLoss.toFixed(2)}` : "לא מוגדר"}
                      </span>
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
                          <th className="text-right py-3 px-4">מחיר</th>
                          <th className="text-right py-3 px-4">כמות</th>
                          <th className="text-right py-3 px-4">סכום</th>
                          <th className="text-right py-3 px-4">MACD</th>
                          <th className="text-right py-3 px-4">Signal</th>
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
                            <td className="py-3 px-4">${trade.price.toFixed(2)}</td>
                            <td className="py-3 px-4">{trade.quantity.toFixed(6)}</td>
                            <td className="py-3 px-4">${trade.total.toFixed(2)}</td>
                            <td className="py-3 px-4">{trade.macdValue?.toFixed(4) || 'N/A'}</td>
                            <td className="py-3 px-4">{trade.signalValue?.toFixed(4) || 'N/A'}</td>
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