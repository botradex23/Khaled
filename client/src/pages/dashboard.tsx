import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { Bot, StrategyType } from "@/types";
import { performanceChartData } from "@/lib/chart-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountBalanceCard, TradingHistoryCard } from "@/components/ui/account-overview";
import { PriceChart } from "@/components/ui/price-chart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  BarChart4, 
  PieChart as PieChartIcon,
  Wallet,
  RefreshCw,
  KeyRound,
  AlertCircle
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, checkSession, user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  
  // Check if user is authenticated
  useEffect(() => {
    const verifyAuth = async () => {
      await checkSession();
      
      // If the user isn't authenticated after checking session, redirect to login
      if (!isAuthenticated && !authLoading) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your dashboard.",
          variant: "destructive"
        });
        setLocation("/login");
      }
    };
    
    verifyAuth();
  }, [isAuthenticated, authLoading, checkSession, setLocation, toast]);
  
  // Fetch user's bots
  const { data: bots, isLoading: botsLoading } = useQuery<Bot[]>({
    queryKey: ['/api/bots'],
    enabled: isAuthenticated // Only fetch if user is authenticated
  });
  
  // Define API keys response type
  interface ApiKeysResponse {
    message: string;
    apiKeys: {
      okxApiKey: string | null;
      okxSecretKey: string | null;
      okxPassphrase: string | null;
      defaultBroker: string;
      useTestnet: boolean;
    };
  }
  
  // Fetch API keys status
  const { data: apiKeysData, isLoading: apiKeysLoading } = useQuery<ApiKeysResponse>({
    queryKey: ["/api/users/api-keys"],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    retry: 0, // Don't retry on failure
  });
  
  // Check if user needs to set up API keys (except for hindi1000hindi@gmail.com)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !apiKeysLoading && user) {
      const isHindi1000Hindi = user.email === "hindi1000hindi@gmail.com";
      
      // If user is not hindi1000hindi@gmail.com and doesn't have API keys set up
      if (!isHindi1000Hindi && apiKeysData) {
        // Check if API keys are missing
        if (!apiKeysData.apiKeys || 
            !apiKeysData.apiKeys.okxApiKey || 
            !apiKeysData.apiKeys.okxSecretKey || 
            !apiKeysData.apiKeys.okxPassphrase) {
          // Show dialog
          setShowApiKeyDialog(true);
        }
      }
    }
  }, [isAuthenticated, authLoading, apiKeysLoading, apiKeysData, user]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-24 pb-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Chart Card */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-medium">Market Chart</CardTitle>
                    <CardDescription>Live price data from Bitget</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                      Real-time
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PriceChart symbol="BTCUSDT" />
              </CardContent>
            </Card>

            {/* Account Balance Card */}
            <AccountBalanceCard />
          </div>

          {/* Active Bots Section */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-medium">Active Bots</CardTitle>
                  <CardDescription>Your automated trading strategies</CardDescription>
                </div>
                <Button className="flex items-center" onClick={() => window.location.href = "/bots"}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Bot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {botsLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading bots...</div>
              ) : bots && bots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bots.map(bot => (
                    <Card key={bot.id} className="bg-card/60">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-medium">{bot.name}</CardTitle>
                          <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {bot.strategy.toUpperCase()}
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2">{bot.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm text-muted-foreground">Monthly Return</div>
                          <div className="font-medium text-green-500">+{bot.monthlyReturn}%</div>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-sm text-muted-foreground">Risk Level</div>
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-1.5 h-6 mx-0.5 rounded-sm ${i < bot.riskLevel ? 'bg-primary' : 'bg-border'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = `/bots?id=${bot.id}`}>
                          <span>View Details</span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground mb-4">You don't have any active bots yet</p>
                  <Button onClick={() => window.location.href = "/bots"}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Bot
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics Tabs Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trading Activity Card - Real data from Bitget */}
            <div className="md:col-span-2">
              <TradingHistoryCard />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.alert("Deposit funds functionality coming soon!")}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Deposit Funds
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = "/markets"}>
                    <BarChart4 className="mr-2 h-4 w-4" />
                    Market Analysis
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.alert("Portfolio rebalance functionality coming soon!")}>
                    <PieChartIcon className="mr-2 h-4 w-4" />
                    Portfolio Rebalance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* API Key Setup Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <KeyRound className="h-5 w-5 mr-2 text-primary" />
              API Keys Required
            </DialogTitle>
            <DialogDescription>
              You need to set up your OKX API keys to access trading functionality.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Each user must configure their own API keys to access their personal OKX account data.
              </AlertDescription>
            </Alert>
            
            <p className="text-sm mb-6">
              Without API keys, you won't be able to view your account balance, execute trades, or use automated trading bots.
            </p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setLocation("/api-keys")} className="w-full">
              Set Up API Keys
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}