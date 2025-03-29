import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, ExternalLink, RefreshCw, Settings, TrendingUp, ArrowUpDown, ArrowDown, ArrowUp, Filter, RefreshCcw, PlusCircle, LineChart, BarChart3, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

// בינתיים נשתמש בסוג זמני עבור מטבעות ויתרות ביננס
interface BinanceBalance {
  asset?: string;  // שם המטבע בפורמט ביננס
  currency?: string;  // שם המטבע בפורמט שלנו
  free?: string | number;  // כמות זמינה בפורמט ביננס
  available?: string | number;  // כמות זמינה בפורמט שלנו
  locked?: string | number;  // כמות נעולה בפורמט ביננס
  frozen?: string | number;  // כמות נעולה בפורמט שלנו
  total?: string | number;  // סה"כ כמות
  usdValue?: number;  // שווי ב-USD בפורמט אחד
  valueUSD?: number;  // שווי ב-USD בפורמט אחר
  calculatedTotalValue?: number;  // שווי מחושב לפי הגיבוב שלנו
  pricePerUnit?: number;  // מחיר ליחידה
}

interface BinanceApiStatus {
  hasBinanceApiKey: boolean;
  hasBinanceSecretKey: boolean;
  testnet: boolean;
}

// מבנה נתונים עבור מחיר מטבע
interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

// מבנה נתונים עבור מידע מפורט על מטבע (24 שעות)
interface Binance24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// מבנה נתונים מעובד לתצוגה בטבלת מחירי שוק
interface MarketPriceDisplay {
  symbol: string;
  price: string;
  priceChangePercent: number;
  volume: string;
}

// ממשקים עבור Paper Trading
interface PaperTradingAccount {
  id: number;
  userId: number;
  initialBalance: string;
  currentBalance: string;
  totalProfitLoss: string;
  totalProfitLossPercent: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  createdAt: string;
  updatedAt: string;
}

interface PaperTradingPosition {
  id: number;
  accountId: number;
  symbol: string;
  entryPrice: string;
  quantity: string;
  direction: "LONG" | "SHORT";
  openedAt: string;
}

interface PaperTradingTrade {
  id: number;
  accountId: number;
  positionId: number | null;
  symbol: string;
  entryPrice: string;
  exitPrice: string | null;
  quantity: string;
  direction: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  profitLoss: string | null;
  profitLossPercent: string | null;
  fee: string;
  openedAt: string;
  closedAt: string | null;
  type: string;
  isAiGenerated: boolean;
  aiConfidence: string | null;
}

// רכיב Paper Trading
function PaperTradingContent() {
  const { toast } = useToast();
  const paperTradingQueryClient = useQueryClient();
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Import required components using React.lazy
  const PaperTradingDashboard = React.lazy(() => import('@/components/ui/paper-trading-dashboard'));
  const PaperTradingPositions = React.lazy(() => import('@/components/ui/paper-trading-positions'));
  const PaperTradingHistory = React.lazy(() => import('@/components/ui/paper-trading-history'));
  const PaperTradingStats = React.lazy(() => import('@/components/ui/paper-trading-stats').then(module => ({ default: module.PaperTradingStats })));
  const NewTradeDialog = React.lazy(() => import('@/components/ui/new-paper-trade-dialog'));

  // שאילתה לקבלת חשבון ה-Paper Trading
  const {
    data: account,
    isLoading: isAccountLoading,
    error: accountError,
    refetch: refetchAccount
  } = useQuery({
    queryKey: ['/api/paper-trading/account'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/paper-trading/account');
      return await res.json();
    }
  });

  // שאילתה לקבלת פוזיציות פתוחות
  const {
    data: positions,
    isLoading: isPositionsLoading,
    refetch: refetchPositions
  } = useQuery({
    queryKey: ['/api/paper-trading/positions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/paper-trading/positions');
      return await res.json();
    },
    enabled: !!account
  });

  // שאילתה לקבלת היסטוריית עסקאות
  const {
    data: trades,
    isLoading: isTradesLoading,
    refetch: refetchTrades
  } = useQuery({
    queryKey: ['/api/paper-trading/trades'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/paper-trading/trades');
      return await res.json();
    },
    enabled: !!account
  });

  // שאילתה לקבלת סטטיסטיקות
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/paper-trading/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/paper-trading/stats');
      return await res.json();
    },
    enabled: !!account
  });

  // מוטציה ליצירת חשבון
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/paper-trading/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initialBalance: 1000.0 // יתרה התחלתית $1000
        }),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "לא ניתן ליצור חשבון Paper Trading.");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "חשבון נוצר בהצלחה",
        description: "חשבון ה-Paper Trading שלך נוצר בהצלחה.",
      });
      paperTradingQueryClient.setQueryData(['/api/paper-trading/account'], data);
      refetchAccount();
    },
    onError: (error: any) => {
      console.error("Failed to create paper trading account:", error);
      toast({
        title: "יצירת חשבון נכשלה",
        description: error.message || "לא ניתן ליצור חשבון Paper Trading.",
        variant: "destructive",
      });
    }
  });

  // מוטציה לאיפוס חשבון
  const resetAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/paper-trading/account/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "לא ניתן לאפס את חשבון ה-Paper Trading.");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "חשבון אופס",
        description: "חשבון ה-Paper Trading שלך אופס בהצלחה.",
      });
      paperTradingQueryClient.setQueryData(['/api/paper-trading/account'], data);
      paperTradingQueryClient.invalidateQueries({ queryKey: ['/api/paper-trading/positions'] });
      paperTradingQueryClient.invalidateQueries({ queryKey: ['/api/paper-trading/trades'] });
      paperTradingQueryClient.invalidateQueries({ queryKey: ['/api/paper-trading/stats'] });
    },
    onError: (error: any) => {
      console.error("Failed to reset paper trading account:", error);
      toast({
        title: "איפוס חשבון נכשל",
        description: error.message || "לא ניתן לאפס את חשבון ה-Paper Trading.",
        variant: "destructive",
      });
    }
  });

  // מוטציה לסגירת פוזיציה
  const closePositionMutation = useMutation({
    mutationFn: async ({ id, price }: { id: number, price: number }) => {
      const res = await fetch(`/api/paper-trading/positions/${id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ exitPrice: price }),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "לא ניתן לסגור את הפוזיציה.");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "פוזיציה נסגרה",
        description: "הפוזיציה נסגרה בהצלחה.",
      });
      paperTradingQueryClient.invalidateQueries({ queryKey: ['/api/paper-trading/account'] });
      paperTradingQueryClient.invalidateQueries({ queryKey: ['/api/paper-trading/positions'] });
      paperTradingQueryClient.invalidateQueries({ queryKey: ['/api/paper-trading/trades'] });
      paperTradingQueryClient.invalidateQueries({ queryKey: ['/api/paper-trading/stats'] });
    },
    onError: (error: any) => {
      console.error("Failed to close position:", error);
      toast({
        title: "סגירת פוזיציה נכשלה",
        description: error.message || "לא ניתן לסגור את הפוזיציה.",
        variant: "destructive",
      });
    }
  });

  // בדיקה אם צריך ליצור חשבון
  useEffect(() => {
    // בדיקה האם יש צורך ליצור חשבון אוטומטית
    const checkAndCreateAccount = async () => {
      try {
        // נסה לקבל את פרטי החשבון הקיים
        const res = await fetch('/api/paper-trading/account', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (res.status === 404) {
          // אין חשבון, צריך ליצור חדש
          createAccountMutation.mutate();
          return;
        }
        
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            // יש חשבון קיים, נשתמש בו
            paperTradingQueryClient.setQueryData(['/api/paper-trading/account'], data);
            toast({
              title: "חשבון Paper Trading",
              description: "טוען נתוני חשבון קיים...",
            });
          }
        }
      } catch (error: any) {
        console.error("Error checking account:", error);
        // במקרה של שגיאה ננסה ליצור חשבון חדש
        createAccountMutation.mutate();
      }
    };
    
    // הפעל את הבדיקה רק אם אין חשבון וגם כשיש שגיאה
    if (!account || accountError) {
      checkAndCreateAccount();
    }
  }, [account, accountError]);

  // טיפול באיפוס חשבון
  const handleResetAccount = () => {
    if (confirm('האם אתה בטוח שברצונך לאפס את חשבון ה-Paper Trading? פעולה זו תסגור את כל הפוזיציות הפתוחות ותאפס את היתרה לסכום ההתחלתי.')) {
      resetAccountMutation.mutate();
    }
  };

  // טיפול בעסקה חדשה
  const handleNewTrade = () => {
    if (!account) {
      toast({
        title: "שגיאה",
        description: "אין לך חשבון Paper Trading פעיל. אנא יצור חשבון חדש.",
        variant: "destructive"
      });
      return;
    }
    
    // מדפיס מידע לדיבאגינג
    console.log("Opening new trade dialog, account ID:", account?.id);
    
    // הגדרת מצב הדיאלוג כפתוח
    setIsNewTradeOpen(true);
  };

  // רענון נתונים
  const refreshData = () => {
    refetchAccount();
    refetchPositions();
    refetchTrades();
    refetchStats();
    toast({
      title: "מרענן נתונים",
      description: "מושך נתונים עדכניים של Paper Trading...",
    });
  };

  // אם הנתונים נטענים
  if (isAccountLoading || createAccountMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-center">{createAccountMutation.isPending ? 'יוצר חשבון Paper Trading...' : 'טוען נתוני Paper Trading...'}</p>
      </div>
    );
  }

  // אם אין חשבון (ועדיין לא מנסים ליצור אחד)
  if (!account && !createAccountMutation.isPending) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">אין חשבון Paper Trading</h3>
        <p className="text-muted-foreground mb-4">
          אין לך עדיין חשבון Paper Trading. צור אחד כדי להתחיל לתרגל מסחר ללא סיכון.
        </p>
        <Button 
          onClick={() => createAccountMutation.mutate()} 
          disabled={createAccountMutation.isPending}
        >
          {createAccountMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              יוצר חשבון...
            </>
          ) : (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              צור חשבון Paper Trading
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* כפתורי פעולות */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <div className="flex items-center">
          <div className="mr-4">
            <div className="text-sm text-muted-foreground">יתרה נוכחית</div>
            <div className="text-2xl font-bold">${parseFloat(account?.currentBalance || "0").toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">רווח/הפסד</div>
            <div className={`text-xl font-semibold ${parseFloat(account?.totalProfitLoss || "0") >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${parseFloat(account?.totalProfitLoss || "0").toLocaleString()} 
              ({parseFloat(account?.totalProfitLossPercent || "0").toFixed(2)}%)
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isAccountLoading || isPositionsLoading || isTradesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAccountLoading || isPositionsLoading || isTradesLoading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetAccount}
            disabled={resetAccountMutation.isPending}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            אפס חשבון
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleNewTrade}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            עסקה חדשה
          </Button>
        </div>
      </div>

      {/* כרטיסיות */}
      <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="positions">פוזיציות פתוחות</TabsTrigger>
          <TabsTrigger value="history">היסטוריית עסקאות</TabsTrigger>
          <TabsTrigger value="analytics">ניתוח ביצועים</TabsTrigger>
        </TabsList>
        
        {/* סקירה כללית - תצוגת Dashboard */}
        <TabsContent value="overview">
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <PaperTradingDashboard account={account} />
          </React.Suspense>
        </TabsContent>
        
        {/* פוזיציות פתוחות */}
        <TabsContent value="positions">
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <PaperTradingPositions account={account} />
          </React.Suspense>
        </TabsContent>
        
        {/* היסטוריית עסקאות */}
        <TabsContent value="history">
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <PaperTradingHistory account={account} />
          </React.Suspense>
        </TabsContent>
        
        {/* ניתוח ביצועים */}
        <TabsContent value="analytics">
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <PaperTradingStats account={account} />
          </React.Suspense>
        </TabsContent>
      </Tabs>

      {/* דיאלוג עסקה חדשה */}
      {/* דיאלוג עסקה חדשה - אפשר להציג תמיד כי יש לו מצב open */}
      <Dialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen}>
        <React.Suspense fallback={
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-center">טוען טופס יצירת עסקה...</p>
            </div>
          </DialogContent>
        }>
          <NewTradeDialog 
            open={isNewTradeOpen} 
            onOpenChange={setIsNewTradeOpen} 
            accountId={account?.id}
          />
        </React.Suspense>
      </Dialog>
    </div>
  );
}

export default function BinancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isApiKeysDialogOpen, setIsApiKeysDialogOpen] = useState(false);
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceSecretKey, setBinanceSecretKey] = useState('');
  const [binanceAllowedIp, setBinanceAllowedIp] = useState("185.199.228.220");
  const [useTestnet, setUseTestnet] = useState(false);
  const [keysInitialized, setKeysInitialized] = useState(false); // מעקב אם המפתחות אותחלו כברל-false כדי להתחבר לסביבה האמיתית
  const [isSaving, setIsSaving] = useState(false);
  
  // משתנים למיון וסינון
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'symbol' | 'price' | 'priceChangePercent' | 'volume'>('volume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<'all' | 'stablecoins' | 'defi' | 'top'>('all');
  
  // יצירת משתנה מראש לחישוב השווי הכולל
  const [savedTotalValue, setSavedTotalValue] = useState<number>(() => {
    // נסה לקרוא את הערך האחרון מה-localStorage
    const savedValue = localStorage.getItem('binance_portfolio_value');
    return savedValue ? parseFloat(savedValue) : 0;
  });

  // שאילתה לבדיקת סטטוס מפתחות API של Binance
  const { 
    data: apiStatus, 
    isLoading: apiStatusLoading,
    refetch: refetchApiStatus
  } = useQuery<BinanceApiStatus>({
    queryKey: ['/api/binance/api-keys/status'],
    enabled: !!user, // רק אם המשתמש מחובר
    refetchOnWindowFocus: false
  });
  
  // פתיחה אוטומטית של חלונית הגדרת מפתחות ה-API כאשר אין מפתחות מוגדרים
  useEffect(() => {
    if (!apiStatusLoading && apiStatus && !apiStatus.hasBinanceApiKey && !apiStatus.hasBinanceSecretKey) {
      setIsApiKeysDialogOpen(true);
    }
  }, [apiStatus, apiStatusLoading]);
  
  // הגדרת ממשק לתשובת ה-API עם מפתחות API
  interface BinanceApiKeysResponse {
    success: boolean;
    apiKey: string;
    secretKey: string;
    allowedIp?: string;
    message?: string;
    isValid?: boolean;  // הוספת שדה לציון האם המפתחות תקינים
    testnet?: boolean;  // האם משתמשים בסביבת טסטנט
  }

  // שליפת מפתחות ה-API השמורים אוטומטית בטעינת הדף - בלי תלות בסטטוס
  const {
    data: savedApiKeys,
    isLoading: savedApiKeysLoading
  } = useQuery<BinanceApiKeysResponse>({
    queryKey: ['/api/binance/api-keys/full'],
    enabled: !!user, // רק בודק שהמשתמש מחובר, בלי תלות בסטטוס API
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // להימנע מבקשות חוזרות ונשנות לקבלת המפתחות
    queryFn: async () => {
      const response = await fetch('/api/binance/api-keys/full', {
        method: 'GET',
        credentials: 'include', // חשוב - מצרף קוקיס עבור אימות
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      return response.json();
    }
  });

  // טיפול בתוצאות שהתקבלו כאשר יש שינוי בנתונים
  useEffect(() => {
    if (savedApiKeys && savedApiKeys.success) {
      console.log("הטענת מפתחות API מהשרת בוצעה בהצלחה");
      
      // בדיקה אם יש מפתחות תקינים
      if (savedApiKeys.isValid && savedApiKeys.apiKey && savedApiKeys.secretKey) {
        // שמירת המפתחות מהשרת למשתני הדף (באופן שקוף למשתמש)
        // אלו ישמשו את הקריאות ל-API ללא צורך להציג חלונית עדכון
        setBinanceApiKey(savedApiKeys.apiKey);
        setBinanceSecretKey(savedApiKeys.secretKey);
        
        // עדכון כתובת IP מורשית אם נמצאה
        if (savedApiKeys.allowedIp) {
          setBinanceAllowedIp(savedApiKeys.allowedIp);
        }
        
        // כעת בצע התחברות אוטומטית עם המפתחות שהתקבלו
        const autoConnectWithSavedKeys = async () => {
          try {
            // בדיקה נוספת של אורך המפתחות לפני השליחה
            if (savedApiKeys.apiKey.length < 10 || savedApiKeys.secretKey.length < 10) {
              console.error("מפתחות API בפורמט לא תקין, אורך לא מספיק");
              toast({
                title: "שגיאה במפתחות API",
                description: "המפתחות השמורים בפורמט לא תקין. אנא הכנס מפתחות חדשים.",
                variant: "destructive"
              });
              setIsApiKeysDialogOpen(true);
              return;
            }
            
            console.log(`מנסה להתחבר עם מפתחות: API (${savedApiKeys.apiKey.length} תווים), Secret (${savedApiKeys.secretKey.length} תווים)`);
            
            // בצע שמירה של המפתחות לשרת (חיבור אוטומטי)
            const response = await fetch('/api/binance/api-keys', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                apiKey: savedApiKeys.apiKey,
                secretKey: savedApiKeys.secretKey,
                allowedIp: savedApiKeys.allowedIp || binanceAllowedIp
              }),
              credentials: 'include'
            });
            
            if (response.ok) {
              // עדכן את מצב המפתחות ורענן את המידע
              setKeysInitialized(true);
              refetchApiStatus();
              toast({
                title: "התחברות אוטומטית לביננס",
                description: "המפתחות הוטענו והפעלת החיבור בוצעה בהצלחה",
                variant: "default"
              });
            } else {
              console.error("ההתחברות האוטומטית נכשלה - תגובת שרת:", response.status);
              const errorData = await response.json();
              toast({
                title: "שגיאה בהתחברות אוטומטית",
                description: errorData.message || "אירעה שגיאה בהתחברות עם המפתחות השמורים",
                variant: "destructive"
              });
              setIsApiKeysDialogOpen(true);
            }
          } catch (error) {
            console.error("שגיאה בהתחברות אוטומטית:", error);
            toast({
              title: "שגיאה בהתחברות אוטומטית",
              description: "אירעה שגיאה בהתחברות עם המפתחות השמורים",
              variant: "destructive"
            });
            setIsApiKeysDialogOpen(true);
          }
        };
        
        // הפעל את החיבור האוטומטי רק אם המפתחות עוד לא אותחלו
        if (!keysInitialized) {
          autoConnectWithSavedKeys();
        }
      } else {
        // אם המפתחות לא תקינים, רק נרשום לקונסול ללא הצגת התראה
        console.log("המפתחות השמורים אינם תקינים או חסרים");
        
        // לא מציגים הודעה אוטומטית או פותחים חלונית, נאפשר למשתמש ללחוץ על כפתור הגדרות API בעצמו
        // המשתמש יוכל להגדיר את המפתחות דרך כפתור "הגדרות API" בראש הדף
      }
    }
  }, [savedApiKeys, binanceAllowedIp, keysInitialized, refetchApiStatus, toast, isApiKeysDialogOpen]);

  // שאילתה לקבלת יתרות חשבון Binance
  const { 
    data: balances, 
    isLoading: balancesLoading,
    isError: balancesError,
    refetch: refetchBalances
  } = useQuery<BinanceBalance[]>({
    queryKey: ['/api/binance/account/balances'],
    queryFn: async () => {
      try {
        console.log('Fetching Binance account balances...');
        const res = await fetch('/api/binance/account/balances', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Error fetching Binance balances:', errorData);
          throw new Error(errorData.message || 'Failed to fetch balances');
        }
        
        const data = await res.json();
        console.log('Successfully fetched Binance balances:', data.length);
        return data;
      } catch (error) {
        console.error('Error in balance fetch function:', error);
        throw error;
      }
    },
    enabled: !!apiStatus?.hasBinanceApiKey && !!apiStatus?.hasBinanceSecretKey,
    refetchOnWindowFocus: false,
    retry: 2, // נסה יותר פעמים במקרה של כישלון
    refetchInterval: 30000, // רענון אוטומטי כל 30 שניות
  });
  
  // חישוב סך הכל שווי בדולרים של כל הנכסים
  const totalUsdValue = balances?.reduce((sum: number, balance: BinanceBalance) => 
    sum + (balance.valueUSD || balance.usdValue || balance.calculatedTotalValue || 0), 0) || 0;
  
  // השתמש בlocalStorage כדי לאחסן את הערך של totalUsdValue
  useEffect(() => {
    // כאשר הערך של totalUsdValue משתנה, שמור אותו ב-localStorage
    if (totalUsdValue && totalUsdValue > 0) {
      console.log("Total portfolio value (simple calculation):", totalUsdValue.toFixed(2));
      localStorage.setItem('binance_portfolio_value', totalUsdValue.toString());
      // שמור גם במשתנה הלוקלי
      setSavedTotalValue(totalUsdValue);
    }
  }, [totalUsdValue]);
  
  // שאילתה לקבלת מחירי כל המטבעות ב-Binance
  const {
    data: tickerPrices,
    isLoading: tickerPricesLoading,
    isError: tickerPricesError,
    refetch: refetchTickerPrices
  } = useQuery<BinanceTickerPrice[]>({
    queryKey: ['/api/binance/market/tickers'],
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // רענון כל דקה
  });
  
  // שאילתה לקבלת מידע מפורט על 24 שעות אחרונות
  const {
    data: market24hrData,
    isLoading: market24hrLoading,
    isError: market24hrError,
    refetch: refetch24hrData
  } = useQuery<Binance24hrTicker[]>({
    queryKey: ['/api/binance/market/24hr'],
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // רענון כל דקה
  });
  
  // מיזוג הנתונים ממקורות שונים לתצוגה אחת
  const marketPrices = useMemo(() => {
    if (!tickerPrices || !market24hrData) return [];
    
    // מיפוי נתוני 24 שעות לפי סמל המטבע לגישה מהירה
    const marketDataMap = new Map<string, Binance24hrTicker>();
    market24hrData.forEach(item => {
      marketDataMap.set(item.symbol, item);
    });
    
    // לוקח רק את הזוגות עם USDT (או BTC או BNB או ETH לסחורות חדשות)
    return tickerPrices
      .filter((ticker: BinanceTickerPrice) => 
        ticker.symbol.endsWith('USDT') || 
        ticker.symbol.endsWith('BUSD')
      )
      .map((ticker: BinanceTickerPrice) => {
        const marketData = marketDataMap.get(ticker.symbol);
        return {
          symbol: ticker.symbol,
          price: ticker.price,
          priceChangePercent: marketData ? parseFloat(marketData.priceChangePercent) : 0,
          volume: marketData ? marketData.quoteVolume : '0'
        } as MarketPriceDisplay;
      });
  }, [tickerPrices, market24hrData]);
  
  // חשיבה מחדש על הפילטור והסידור של נתוני שוק
  const filteredAndSortedMarketPrices = useMemo(() => {
    if (!marketPrices) return [];
    
    // 1. פילטור לפי קטגוריה
    let filtered = [...marketPrices];

    // פילטור לפי קטגוריות
    if (filterCategory === 'stablecoins') {
      // סטייבלקוינס - מטבעות עם יציבות מחיר
      filtered = filtered.filter(ticker => 
        ticker.symbol.includes('USDT') || 
        ticker.symbol.includes('USDC') || 
        ticker.symbol.includes('BUSD') || 
        ticker.symbol.includes('DAI') ||
        ticker.symbol.includes('UST')
      );
    } else if (filterCategory === 'defi') {
      // טוקנים של DeFi
      const defiTokens = ['UNI', 'AAVE', 'COMP', 'SNX', 'MKR', 'YFI', 'CAKE', 'SUSHI', '1INCH', 'CRV'];
      filtered = filtered.filter(ticker => 
        defiTokens.some(token => ticker.symbol.includes(token))
      );
    } else if (filterCategory === 'top') {
      // מטבעות מובילים - לפי נפח מסחר
      filtered = filtered
        .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
        .slice(0, 20);
    }

    // 2. פילטור לפי חיפוש
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toUpperCase();
      filtered = filtered.filter(ticker => ticker.symbol.includes(term));
    }

    // 3. מיון
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = parseFloat(a.price) - parseFloat(b.price);
          break;
        case 'priceChangePercent':
          comparison = a.priceChangePercent - b.priceChangePercent;
          break;
        case 'volume':
          comparison = parseFloat(a.volume) - parseFloat(b.volume);
          break;
      }

      // כיוון המיון
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [marketPrices, searchTerm, sortField, sortDirection, filterCategory]);
  
  // פונקציה לרענון מחירי השוק
  const refetchMarketPrices = () => {
    refetchTickerPrices();
    refetch24hrData();
    toast({
      title: "מרענן מחירי שוק",
      description: "מושך נתונים עדכניים מ-Binance...",
    });
  };
  
  // מאחד את סטטוס הטעינה של מחירי השוק
  const marketPricesLoading = tickerPricesLoading || market24hrLoading;
  const marketPricesError = tickerPricesError || market24hrError;

  const refreshBalances = () => {
    refetchBalances();
    toast({
      title: "מרענן נתונים",
      description: "מושך נתונים עדכניים מ-Binance...",
    });
  };

  const saveApiKeys = async () => {
    // נקה את המפתחות מרווחים ותווים בעייתיים אחרים לפני הבדיקה
    const cleanedApiKey = binanceApiKey.replace(/\s+/g, '').trim();
    const cleanedSecretKey = binanceSecretKey.replace(/\s+/g, '').trim();
    
    // וידוא תקינות קלט
    if (!cleanedApiKey) {
      toast({
        title: "שגיאה",
        description: "נא להזין מפתח API תקין",
        variant: "destructive"
      });
      return;
    }

    if (cleanedApiKey.length < 10) {
      toast({
        title: "שגיאה",
        description: "מפתח ה-API נראה קצר מדי. מפתח API של Binance צריך להיות לפחות 10 תווים.",
        variant: "destructive"
      });
      return;
    }

    if (!cleanedSecretKey) {
      toast({
        title: "שגיאה",
        description: "נא להזין מפתח סודי תקין",
        variant: "destructive"
      });
      return;
    }
    
    if (cleanedSecretKey.length < 10) {
      toast({
        title: "שגיאה",
        description: "מפתח הסודי נראה קצר מדי. מפתח סודי של Binance צריך להיות לפחות 10 תווים.",
        variant: "destructive"
      });
      return;
    }
    
    // עדכן את המשתנים המקומיים עם הגרסה המנוקה
    setBinanceApiKey(cleanedApiKey);
    setBinanceSecretKey(cleanedSecretKey);

    setIsSaving(true);

    try {
      // הדפסת אורך המפתחות לפני השליחה לשרת (עבור דיבוג)
      console.log(`Sending API keys - API key length: ${binanceApiKey.trim().length}, Secret key length: ${binanceSecretKey.trim().length}`);
      
      // קריאה לAPI לשמירת מפתחות Binance
      const response = await fetch("/api/binance/api-keys", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: cleanedApiKey,
          secretKey: cleanedSecretKey,
          allowedIp: binanceAllowedIp ? binanceAllowedIp.trim().replace(/\s+/g, '') : "",
          testnet: useTestnet
        })
      });

      const data = await response.json();
      console.log("API response:", data);

      if (response.ok && data.success) {
        toast({
          title: "מצוין!",
          description: "מפתחות API של Binance נשמרו בהצלחה",
          variant: "default"
        });
        
        // סגירת הדיאלוג ושמירת ערכים - לא לאפס אותם כדי שיהיו זמינים בפעם הבאה
        setIsApiKeysDialogOpen(false);
        
        // רענון הנתונים
        refetchApiStatus();
        
        // רענון הנתונים של API keys כדי שיהיו זמינים למשתמש בפעם הבאה
        queryClient.invalidateQueries({ queryKey: ['/api/binance/api-keys/full'] });
        
        // עדכון הסטטוס של אתחול מפתחות
        setKeysInitialized(true);
        
        // רענון נתוני החשבון לאחר השהייה קלה
        setTimeout(() => {
          refetchBalances();
        }, 1000); // קצת השהייה לפני ניסיון משיכת היתרות
      } else {
        console.error("Failed to save API keys:", data);
        toast({
          title: "שגיאה בשמירת המפתחות",
          description: data.message || "אירעה שגיאה בלתי צפויה",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving Binance API keys:", error);
      toast({
        title: "שגיאה בשמירת המפתחות",
        description: "אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // מחיקת הכפילות - הערך כבר מוגדר למעלה

  // אם המשתמש לא מחובר, הפנייה לדף התחברות
  if (!authLoading && !user) {
    return <Redirect to="/login" />;
  }

  // תצוגת טעינה כאשר בודקים את סטטוס האימות
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </div>
    );
  }

  const hasValidApiKeys = apiStatus?.hasBinanceApiKey && apiStatus?.hasBinanceSecretKey;

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">חשבון Binance</h1>
          <p className="text-muted-foreground">
            צפה ונהל את הנכסים והמסחר שלך ב-Binance
            {apiStatus?.testnet && (
              <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                סביבת בדיקות
              </Badge>
            )}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex space-x-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/'}
            className="ml-2 rtl:mr-2 rtl:ml-0"
          >
            חזרה לדף הבית
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsApiKeysDialogOpen(true)}
            className="flex items-center"
          >
            <Settings className="mr-2 h-4 w-4" />
            הגדרות API
          </Button>
          {hasValidApiKeys && (
            <Button 
              variant="outline" 
              onClick={refreshBalances}
              disabled={balancesLoading}
              className="flex items-center"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${balancesLoading ? 'animate-spin' : ''}`} />
              רענן נתונים
            </Button>
          )}
        </div>
      </div>

      {/* לא נציג הודעת אזהרה יותר - נציג את חלונית ההגדרות ישירות במקום */}

      {/* כרטיסיות תוכן */}
      <Tabs defaultValue="balances" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="balances">יתרות</TabsTrigger>
          <TabsTrigger value="trades">היסטוריית מסחר</TabsTrigger>
          <TabsTrigger value="markets">מחירי שוק</TabsTrigger>
          <TabsTrigger value="paper-trading">
            Paper Trading
            <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300">
              חדש
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* תוכן כרטיסיית יתרות */}
        <TabsContent value="balances">
          {hasValidApiKeys ? (
            <div>
              {/* כרטיס סך הכל שווי */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>סך שווי הנכסים</CardTitle>
                  <CardDescription>שווי כולל של כל הנכסים בחשבון שלך</CardDescription>
                </CardHeader>
                <CardContent>
                  {balancesLoading ? (
                    <Skeleton className="h-10 w-40" />
                  ) : balancesError ? (
                    <div>
                      <div className="text-destructive mb-2">שגיאה בטעינת נתונים</div>
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>בעיית חיבור לשרתי Binance</AlertTitle>
                        <AlertDescription>
                          לא ניתן להתחבר לשרתי Binance. ייתכן שהשירות חסום באזורך הגיאוגרפי.
                          אנו ממליצים להשתמש ב-VPN או לנסות מאוחר יותר.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold">${totalUsdValue.toLocaleString()}</div>
                  )}
                </CardContent>
              </Card>

              {/* רשימת היתרות */}
              <Card>
                <CardHeader>
                  <CardTitle>יתרות מטבעות</CardTitle>
                  <CardDescription>רשימת כל המטבעות והטוקנים בחשבון שלך</CardDescription>
                </CardHeader>
                <CardContent>
                  {balancesLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : balancesError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>שגיאה בטעינת נתונים</AlertTitle>
                      <AlertDescription>
                        לא ניתן לטעון את יתרות החשבון. אנא בדוק את הגדרות ה-API שלך או נסה שוב מאוחר יותר.
                      </AlertDescription>
                    </Alert>
                  ) : balances && balances.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-2 text-left">מטבע</th>
                            <th className="pb-2 text-right">זמין</th>
                            <th className="pb-2 text-right">נעול</th>
                            <th className="pb-2 text-right">סה"כ</th>
                            <th className="pb-2 text-right">מחיר ליחידה ($)</th>
                            <th className="pb-2 text-right">שווי ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balances
                            // פילטור לפי יתרה חיובית (מציג רק מטבעות עם יתרה)
                            .filter(balance => {
                              // נשתמש בפונקציית עזר להמרה בטוחה
                              const getNumericValue = (value: string | number | undefined): number => {
                                if (value === undefined || value === null) return 0;
                                return typeof value === 'number' ? value : parseFloat(value || '0');
                              };
                              
                              const total = getNumericValue(balance.total);
                              const free = getNumericValue(balance.free || balance.available);
                              return total > 0 || free > 0;
                            })
                            .sort((a, b) => (b.valueUSD || b.usdValue || b.calculatedTotalValue || 0) - (a.valueUSD || a.usdValue || a.calculatedTotalValue || 0))
                            .map((balance) => (
                              <tr key={balance.asset || balance.currency} className="border-b">
                                <td className="py-3 font-medium">{balance.asset || balance.currency}</td>
                                <td className="py-3 text-right">
                                  {(() => {
                                    const getNumericValue = (value: string | number | undefined): number => {
                                      if (value === undefined || value === null) return 0;
                                      return typeof value === 'number' ? value : parseFloat(value || '0');
                                    };
                                    return getNumericValue(balance.free || balance.available).toLocaleString();
                                  })()}
                                </td>
                                <td className="py-3 text-right">
                                  {(() => {
                                    const getNumericValue = (value: string | number | undefined): number => {
                                      if (value === undefined || value === null) return 0;
                                      return typeof value === 'number' ? value : parseFloat(value || '0');
                                    };
                                    return getNumericValue(balance.locked || balance.frozen).toLocaleString();
                                  })()}
                                </td>
                                <td className="py-3 text-right">
                                  {(() => {
                                    const getNumericValue = (value: string | number | undefined): number => {
                                      if (value === undefined || value === null) return 0;
                                      return typeof value === 'number' ? value : parseFloat(value || '0');
                                    };
                                    return getNumericValue(balance.total).toLocaleString();
                                  })()}
                                </td>
                                <td className="py-3 text-right">${(balance.pricePerUnit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                                <td className="py-3 text-right">${(balance.valueUSD || balance.usdValue || balance.calculatedTotalValue || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      לא נמצאו יתרות בחשבון או שאין גישה למידע
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    מציג רק מטבעות עם יתרה חיובית
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshBalances}
                    disabled={balancesLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${balancesLoading ? 'animate-spin' : ''}`} />
                    רענן
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>אין גישה לנתונים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">מפתחות API נדרשים</h3>
                  <p className="text-muted-foreground mb-4">
                    כדי לראות את יתרות החשבון ב-Binance, עליך להגדיר את מפתחות ה-API שלך.
                  </p>
                  <Button onClick={() => setIsApiKeysDialogOpen(true)}>
                    הגדר מפתחות API
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* תוכן כרטיסיית היסטוריית מסחר */}
        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>היסטוריית מסחר</CardTitle>
              <CardDescription>העסקאות האחרונות בחשבון שלך</CardDescription>
            </CardHeader>
            <CardContent>
              {hasValidApiKeys ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">יכולת זו בפיתוח</h3>
                  <p>היסטוריית המסחר תהיה זמינה בקרוב.</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">מפתחות API נדרשים</h3>
                  <p className="text-muted-foreground mb-4">
                    כדי לראות את היסטוריית המסחר שלך ב-Binance, עליך להגדיר את מפתחות ה-API.
                  </p>
                  <Button onClick={() => setIsApiKeysDialogOpen(true)}>
                    הגדר מפתחות API
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* תוכן כרטיסיית מחירי שוק */}
        <TabsContent value="markets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>מחירי שוק</CardTitle>
                <CardDescription>מחירים עדכניים של מטבעות וטוקנים ב-Binance</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchMarketPrices()} 
                disabled={marketPricesLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${marketPricesLoading ? 'animate-spin' : ''}`} />
                רענן
              </Button>
            </CardHeader>
            <CardContent>
              {marketPricesLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : marketPricesError ? (
                <div>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>שגיאה בטעינת נתונים</AlertTitle>
                    <AlertDescription>
                      לא ניתן לטעון את מחירי השוק. ייתכן שהשירות חסום באזורך הגיאוגרפי.
                      אנו ממליצים להשתמש ב-VPN או לנסות מאוחר יותר.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="mt-6 rounded-lg border border-red-300 p-4 bg-red-50">
                    <h4 className="text-lg font-semibold mb-2 text-red-800">מידע חשוב על שימוש ב-Binance:</h4>
                    <p className="mb-2 text-red-800">
                      שירותי Binance עשויים להיות מוגבלים במדינות מסוימות. 
                      ההגבלה הנוכחית מקורה בהגבלת גישה גיאוגרפית מצד Binance.
                    </p>
                    <p className="text-red-800">
                      אם אתה רוצה להשתמש ב-Binance API, אנא השתמש ב-VPN.
                    </p>
                  </div>
                </div>
              ) : marketPrices && marketPrices.length > 0 ? (
                <div>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="חיפוש מטבע..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={filterCategory === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterCategory('all')}
                        className="flex items-center"
                      >
                        הכל
                      </Button>
                      <Button
                        variant={filterCategory === 'top' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterCategory('top')}
                        className="flex items-center"
                      >
                        מטבעות מובילים
                      </Button>
                      <Button
                        variant={filterCategory === 'stablecoins' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterCategory('stablecoins')}
                        className="flex items-center"
                      >
                        סטייבלקוינס
                      </Button>
                      <Button
                        variant={filterCategory === 'defi' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterCategory('defi')}
                        className="flex items-center"
                      >
                        DeFi
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="border-b">
                          <th 
                            className="pb-2 text-left cursor-pointer hover:text-primary"
                            onClick={() => {
                              if (sortField === 'symbol') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField('symbol');
                                setSortDirection('asc');
                              }
                            }}
                          >
                            <div className="flex items-center">
                              סמל
                              {sortField === 'symbol' && (
                                <span className="ml-1">
                                  {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                </span>
                              )}
                              {sortField !== 'symbol' && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                            </div>
                          </th>
                          <th 
                            className="pb-2 text-right cursor-pointer hover:text-primary"
                            onClick={() => {
                              if (sortField === 'price') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField('price');
                                setSortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center justify-end">
                              מחיר
                              {sortField === 'price' && (
                                <span className="ml-1">
                                  {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                </span>
                              )}
                              {sortField !== 'price' && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                            </div>
                          </th>
                          <th 
                            className="pb-2 text-right cursor-pointer hover:text-primary"
                            onClick={() => {
                              if (sortField === 'priceChangePercent') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField('priceChangePercent');
                                setSortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center justify-end">
                              שינוי 24 שעות
                              {sortField === 'priceChangePercent' && (
                                <span className="ml-1">
                                  {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                </span>
                              )}
                              {sortField !== 'priceChangePercent' && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                            </div>
                          </th>
                          <th 
                            className="pb-2 text-right cursor-pointer hover:text-primary"
                            onClick={() => {
                              if (sortField === 'volume') {
                                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField('volume');
                                setSortDirection('desc');
                              }
                            }}
                          >
                            <div className="flex items-center justify-end">
                              מחזור מסחר 24 שעות
                              {sortField === 'volume' && (
                                <span className="ml-1">
                                  {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                </span>
                              )}
                              {sortField !== 'volume' && <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedMarketPrices.map((ticker: MarketPriceDisplay) => (
                          <tr key={ticker.symbol} className="border-b">
                            <td className="py-3 font-medium">{ticker.symbol}</td>
                            <td className="py-3 text-right">${parseFloat(ticker.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                            <td className={`py-3 text-right ${ticker.priceChangePercent > 0 ? 'text-green-500' : ticker.priceChangePercent < 0 ? 'text-red-500' : ''}`}>
                              {ticker.priceChangePercent > 0 ? '+' : ''}{ticker.priceChangePercent}%
                            </td>
                            <td className="py-3 text-right">${parseFloat(ticker.volume).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  לא נמצאו מחירי שוק
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedMarketPrices.length ? `מציג ${filteredAndSortedMarketPrices.length} מטבעות מתוך ${marketPrices?.length || 0}` : ''}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* תוכן כרטיסיית Paper Trading */}
        <TabsContent value="paper-trading">
          <Card>
            <CardHeader>
              <CardTitle>Paper Trading</CardTitle>
              <CardDescription>תרגול מסחר עם כסף וירטואלי ללא סיכון</CardDescription>
            </CardHeader>
            <CardContent>
              {hasValidApiKeys ? (
                <div>
                  {balancesError || marketPricesError ? (
                    <div className="mb-6">
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>שים לב: בעיית חיבור לשרתי Binance</AlertTitle>
                        <AlertDescription>
                          זוהתה בעיית חיבור לשרתי Binance, אך Paper Trading עדיין פעיל.
                          נתוני מחירי השוק עשויים שלא להתעדכן בזמן אמת.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : null}
                  <PaperTradingContent />
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">מפתחות API נדרשים</h3>
                  <p className="text-muted-foreground mb-4">
                    כדי להשתמש ב-Paper Trading, עליך להגדיר את מפתחות ה-API של Binance תחילה.
                  </p>
                  <Button onClick={() => setIsApiKeysDialogOpen(true)}>
                    הגדר מפתחות API
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* דיאלוג הגדרת מפתחות API */}
      {/* לא נאפשר למשתמש לסגור את החלונית אם אין לו מפתחות מוגדרים */}
      <Dialog 
        open={isApiKeysDialogOpen} 
        onOpenChange={(open) => {
          // אם יש למשתמש מפתחות מוגדרים, נאפשר לו לסגור את החלונית
          // אחרת, נסגור את החלונית רק אם הוא מנסה לפתוח אותה (שזה לא אמור לקרות)
          if (hasValidApiKeys || open) {
            setIsApiKeysDialogOpen(open);
          }
        }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <img 
                src="https://bin.bnbstatic.com/static/images/common/favicon.ico" 
                alt="Binance Logo" 
                className="w-5 h-5 mr-2"
              />
              הגדר מפתחות API של Binance
            </DialogTitle>
            <DialogDescription>
              {hasValidApiKeys ? (
                <div className="flex items-center text-green-600 mt-1">
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  <span>מפתחות ה-API של Binance כבר הוגדרו. אתה יכול לעדכן אותם כאן.</span>
                </div>
              ) : (
                <span>הזן את מפתחות ה-API של Binance שלך כדי להתחיל לקבל ולנתח נתונים מחשבון ה-Binance שלך.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="binance-api-key" className="text-right">
                API Key
              </Label>
              <Input
                id="binance-api-key"
                value={binanceApiKey}
                onChange={(e) => setBinanceApiKey(e.target.value)}
                className="col-span-3"
                placeholder="הזן את מפתח ה-API של Binance שלך"
                autoComplete="off"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="binance-secret-key" className="text-right">
                Secret Key
              </Label>
              <Input
                id="binance-secret-key"
                value={binanceSecretKey}
                onChange={(e) => setBinanceSecretKey(e.target.value)}
                className="col-span-3"
                type="password"
                placeholder="הזן את המפתח הסודי של Binance שלך"
                autoComplete="off"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="binance-allowed-ip" className="text-right">
                כתובת IP מורשית
              </Label>
              <Input
                id="binance-allowed-ip"
                value={binanceAllowedIp}
                onChange={(e) => setBinanceAllowedIp(e.target.value)}
                className="col-span-3"
                placeholder="כתובת ה-IP שהגדרת ב-Binance"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="useTestnet" className="text-right">
                סביבת בדיקות
              </Label>
              <div className="flex items-center col-span-3">
                <Switch
                  id="useTestnet"
                  checked={useTestnet}
                  onCheckedChange={setUseTestnet}
                />
                <Label htmlFor="useTestnet" className="ml-2">
                  {useTestnet ? 'משתמש בסביבת בדיקות' : 'משתמש בסביבת הייצור (אמיתי)'}
                </Label>
              </div>
            </div>
            
            <Alert className="mt-2 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>הערה חשובה - הגדרת IP מורשה</AlertTitle>
              <AlertDescription>
                וודא שהוספת את כתובת ה-IP {binanceAllowedIp} לרשימת הכתובות המורשות בהגדרות API Key שלך ב-Binance. 
                כתובת ה-IP הזו משמשת את הפרוקסי שלנו להתחברות לשרתי Binance.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            {/* נציג כפתור ביטול רק אם כבר יש למשתמש מפתחות מוגדרים */}
            {hasValidApiKeys && (
              <Button variant="outline" onClick={() => setIsApiKeysDialogOpen(false)}>
                ביטול
              </Button>
            )}
            <Button 
              type="submit" 
              onClick={saveApiKeys}
              disabled={isSaving}
              className={`${
                hasValidApiKeys 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-yellow-500 hover:bg-yellow-600"
              } text-white`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  שמור מפתחות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}