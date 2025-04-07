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
} from "../components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.tsx";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card.tsx";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import { 
  Plus, 
  Minus, 
  Clock, 
  ArrowRight, 
  DollarSign, 
  BarChart3,
  TrendingUp,
  Calendar,
  Repeat
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

// Form schema for DCA bot
const dcaBotFormSchema = z.object({
  name: z.string().min(1, "הכנס שם לבוט"),
  symbol: z.string().min(1, "בחר זוג מסחר"),
  totalInvestment: z.string().min(1, "הכנס סכום השקעה"),
  initialInvestment: z.string().min(1, "הכנס השקעה התחלתית"),
  investmentAmount: z.string().min(1, "הכנס סכום לכל רכישה"),
  interval: z.string().min(1, "בחר תדירות רכישה"),
});

type DcaBotFormValues = z.infer<typeof dcaBotFormSchema>;

export default function DcaBot() {
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

  // Time intervals for DCA
  const timeIntervals = [
    { value: "1h", label: "שעתי" },
    { value: "4h", label: "כל 4 שעות" },
    { value: "12h", label: "כל 12 שעות" },
    { value: "1d", label: "יומי" },
    { value: "3d", label: "כל 3 ימים" },
    { value: "1w", label: "שבועי" },
    { value: "2w", label: "כל שבועיים" },
    { value: "1M", label: "חודשי" },
  ];

  // Bot creation form
  const form = useForm<DcaBotFormValues>({
    resolver: zodResolver(dcaBotFormSchema),
    defaultValues: {
      name: "DCA Bot",
      symbol: "BTCUSDT",
      totalInvestment: "1000",
      initialInvestment: "200",
      investmentAmount: "50",
      interval: "1d",
    },
  });

  // Query to get bot status
  const { data: botStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ['/api/bots/dca', botId],
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
    queryKey: ['/api/bots/dca/trades', botId],
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
    mutationFn: async (data: DcaBotFormValues) => {
      const parameters = {
        symbol: data.symbol,
        initialInvestment: parseFloat(data.initialInvestment),
        investmentAmount: parseFloat(data.investmentAmount),
        interval: data.interval,
        totalInvestment: parseFloat(data.totalInvestment),
      };
      
      const response = await fetch('/api/bots/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          strategy: 'dca',
          description: "Dollar-cost averaging strategy for cryptocurrency investments",
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
        title: "בוט DCA נוצר בהצלחה",
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
  const onSubmit = (data: DcaBotFormValues) => {
    createBotMutation.mutate(data);
  };

  // Sample performance data for bot
  const performanceData = [
    { date: "Jan 1", value: 1000, price: 65000 },
    { date: "Jan 8", value: 1050, price: 63000 },
    { date: "Jan 15", value: 1030, price: 61000 },
    { date: "Jan 22", value: 1080, price: 64000 },
    { date: "Jan 29", value: 1120, price: 66000 },
    { date: "Feb 5", value: 1150, price: 68000 },
    { date: "Feb 12", value: 1190, price: 69000 },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">בוט DCA</h1>
            <p className="text-muted-foreground">
              רכישה עקבית ואוטומטית של מטבעות קריפטו בפרקי זמן קבועים
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
                  <CardTitle>יצירת בוט DCA חדש</CardTitle>
                  <CardDescription>
                    בוט DCA מבצע רכישות עקביות בפרקי זמן קבועים ללא תלות במחיר השוק
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

                      <FormField
                        control={form.control}
                        name="initialInvestment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>השקעה התחלתית</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="number" min="0" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              סכום הרכישה הראשונית לביצוע מיד עם הפעלת הבוט
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="investmentAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>סכום לכל רכישה</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="number" min="10" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormDescription>
                              הסכום שיושקע בכל מחזור רכישה
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>תדירות רכישה</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר תדירות רכישה" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timeIntervals.map((interval) => (
                                  <SelectItem key={interval.value} value={interval.value}>
                                    {interval.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              באיזו תדירות הבוט יבצע רכישות אוטומטיות
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createBotMutation.isPending}
                      >
                        {createBotMutation.isPending ? "מייצר בוט..." : "צור בוט DCA"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{botStatus?.name || "DCA Bot"}</CardTitle>
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

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="initialInvestment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>השקעה התחלתית</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" min="0" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="investmentAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>סכום לכל רכישה</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input type="number" min="10" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>תדירות רכישה</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר תדירות רכישה" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timeIntervals.map((interval) => (
                                  <SelectItem key={interval.value} value={interval.value}>
                                    {interval.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                          name="DCA Portfolio Value ($)"
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
                  <CardTitle className="text-lg">סטטיסטיקות DCA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <Repeat className="h-4 w-4 mr-2 text-primary" />
                        <span>תדירות רכישה</span>
                      </div>
                      <span className="font-medium">{botStatus?.stats?.interval || "יומי"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-primary" />
                        <span>רכישה אחרונה</span>
                      </div>
                      <span className="font-medium">{botStatus?.stats?.lastPurchase || "לא בוצע"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-primary" />
                        <span>רכישה הבאה</span>
                      </div>
                      <span className="font-medium">{botStatus?.stats?.nextPurchase || "לא מתוזמן"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-primary" />
                        <span>סכום להשקעה בכל רכישה</span>
                      </div>
                      <span className="font-medium">${botStatus?.stats?.investmentAmount || "50"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                        <span>מחיר רכישה ממוצע</span>
                      </div>
                      <span className="font-medium">${botStatus?.stats?.averagePrice || "לא זמין"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                        <span>סה"כ שווי</span>
                      </div>
                      <span className="font-medium">${botStatus?.stats?.totalValue || "0"}</span>
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
                          <th className="text-right py-3 px-4">מטבע</th>
                          <th className="text-right py-3 px-4">כמות</th>
                          <th className="text-right py-3 px-4">מחיר</th>
                          <th className="text-right py-3 px-4">סכום כולל</th>
                          <th className="text-right py-3 px-4">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {botTrades.map((trade: any) => (
                          <tr key={trade.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              {new Date(trade.timestamp).toLocaleString('he-IL')}
                            </td>
                            <td className="py-3 px-4">{trade.symbol}</td>
                            <td className="py-3 px-4">{trade.quantity.toFixed(6)}</td>
                            <td className="py-3 px-4">${trade.price.toFixed(2)}</td>
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