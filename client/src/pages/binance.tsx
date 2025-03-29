import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ExternalLink, RefreshCw, Settings, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

// בינתיים נשתמש בסוג זמני עבור מטבעות ויתרות ביננס
interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
  total?: string;
  usdValue?: number;
}

interface BinanceApiStatus {
  hasBinanceApiKey: boolean;
  hasBinanceSecretKey: boolean;
  testnet: boolean;
}

export default function BinancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isApiKeysDialogOpen, setIsApiKeysDialogOpen] = useState(false);
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceSecretKey, setBinanceSecretKey] = useState('');
  const [useTestnet, setUseTestnet] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // שאילתה לבדיקת סטטוס מפתחות API של Binance
  const { 
    data: apiStatus, 
    isLoading: apiStatusLoading,
    refetch: refetchApiStatus
  } = useQuery<BinanceApiStatus>({
    queryKey: ['/api/users/binance-api-keys'],
    enabled: !!user, // רק אם המשתמש מחובר
    refetchOnWindowFocus: false
  });
  
  // פתיחה אוטומטית של חלונית הגדרת מפתחות ה-API כאשר אין מפתחות מוגדרים
  useEffect(() => {
    if (!apiStatusLoading && apiStatus && !apiStatus.hasBinanceApiKey && !apiStatus.hasBinanceSecretKey) {
      setIsApiKeysDialogOpen(true);
    }
  }, [apiStatus, apiStatusLoading]);

  // שאילתה לקבלת יתרות חשבון Binance
  const { 
    data: balances, 
    isLoading: balancesLoading,
    isError: balancesError,
    refetch: refetchBalances
  } = useQuery<BinanceBalance[]>({
    queryKey: ['/api/binance/account/balances'],
    enabled: !!apiStatus?.hasBinanceApiKey && !!apiStatus?.hasBinanceSecretKey,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const refreshBalances = () => {
    refetchBalances();
    toast({
      title: "מרענן נתונים",
      description: "מושך נתונים עדכניים מ-Binance...",
    });
  };

  const saveApiKeys = async () => {
    // וידוא תקינות קלט
    if (!binanceApiKey.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין מפתח API תקין",
        variant: "destructive"
      });
      return;
    }

    if (!binanceSecretKey.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין מפתח סודי תקין",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // קריאה לAPI לשמירת מפתחות Binance
      const response = await fetch("/api/users/binance-api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: binanceApiKey,
          secretKey: binanceSecretKey,
          testnet: useTestnet
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "מצוין!",
          description: "מפתחות API של Binance נשמרו בהצלחה",
          variant: "default"
        });
        
        // סגירת הדיאלוג ואיפוס שדות
        setIsApiKeysDialogOpen(false);
        setBinanceApiKey("");
        setBinanceSecretKey("");
        
        // רענון הנתונים
        refetchApiStatus();
        setTimeout(() => refetchBalances(), 1000); // קצת השהייה לפני ניסיון משיכת היתרות
      } else {
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

  // חישוב סך הכל שווי בדולרים של כל הנכסים
  const totalUsdValue = balances?.reduce((sum, balance) => 
    sum + (balance.usdValue || 0), 0) || 0;

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
        
        <div className="mt-4 md:mt-0 flex space-x-2">
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
                    <div className="text-destructive">שגיאה בטעינת נתונים</div>
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
                            <th className="pb-2 text-right">שווי ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balances
                            .filter(b => parseFloat(b.total || b.free) > 0)
                            .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
                            .map((balance) => (
                              <tr key={balance.asset} className="border-b">
                                <td className="py-3 font-medium">{balance.asset}</td>
                                <td className="py-3 text-right">{parseFloat(balance.free).toLocaleString()}</td>
                                <td className="py-3 text-right">{parseFloat(balance.locked).toLocaleString()}</td>
                                <td className="py-3 text-right">
                                  {parseFloat(balance.total || (
                                    parseFloat(balance.free) + parseFloat(balance.locked)
                                  ).toString()).toLocaleString()}
                                </td>
                                <td className="py-3 text-right">${(balance.usdValue || 0).toLocaleString()}</td>
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
            <CardHeader>
              <CardTitle>מחירי שוק</CardTitle>
              <CardDescription>מחירים עדכניים של מטבעות וטוקנים ב-Binance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <ExternalLink className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">יכולת זו בפיתוח</h3>
                <p>מחירי שוק עדכניים יהיו זמינים בקרוב.</p>
              </div>
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