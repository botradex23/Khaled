import { useState, useEffect } from 'react';
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Loader2, RefreshCw, PlusCircle, BarChart3, LineChart, ArrowUpDown, RefreshCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PaperTradingDashboard from '../components/ui/paper-trading-dashboard';
import PaperTradingPositions from '../components/ui/paper-trading-positions';
import PaperTradingHistory from '../components/ui/paper-trading-history';
import PaperTradingStats from '../components/ui/paper-trading-stats';
import NewTradeDialog from './new-paper-trade-dialog';
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";

export default function PaperTradingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch paper trading account
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
    },
    enabled: !!user
  });

  // Reset account mutation
  const resetAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/paper-trading/account/reset');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account Reset',
        description: 'Your paper trading account has been reset successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset your paper trading account.',
        variant: 'destructive',
      });
    }
  });

  // Create account if it doesn't exist
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/paper-trading/account', {
        initialBalance: 1000.0 // Default $1000 initial balance
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account Created',
        description: 'Your paper trading account has been created successfully.',
      });
      refetchAccount();
    },
    onError: (error: any) => {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create your paper trading account.',
        variant: 'destructive',
      });
    }
  });

  // Check if we need to create an account
  useEffect(() => {
    if (user && accountError) {
      createAccountMutation.mutate();
    }
  }, [user, accountError]);

  // Handle reset account
  const handleResetAccount = () => {
    if (confirm('Are you sure you want to reset your paper trading account? This will close all positions and reset your balance to the initial amount.')) {
      resetAccountMutation.mutate();
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold mb-4">Please log in to access Paper Trading</h2>
        <p className="text-center mb-8">You need to be logged in to use the paper trading feature.</p>
      </div>
    );
  }

  if (isAccountLoading || createAccountMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-center">{createAccountMutation.isPending ? 'Creating your paper trading account...' : 'Loading your paper trading account...'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col items-start justify-between mb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Paper Trading</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Practice trading with virtual money without any risk
          </p>
        </div>
        <div className="mt-4 flex space-x-2 md:mt-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchAccount()}
            disabled={isAccountLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetAccount}
            disabled={resetAccountMutation.isPending}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reset Account
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setIsNewTradeOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Trade
          </Button>
        </div>
      </div>

      {account ? (
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="positions">Open Positions</TabsTrigger>
            <TabsTrigger value="history">Trade History</TabsTrigger>
            <TabsTrigger value="stats">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <PaperTradingDashboard account={account} />
          </TabsContent>
          
          <TabsContent value="positions">
            <PaperTradingPositions account={account} />
          </TabsContent>
          
          <TabsContent value="history">
            <PaperTradingHistory account={account} />
          </TabsContent>
          
          <TabsContent value="stats">
            <PaperTradingStats account={account} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Paper Trading Account</CardTitle>
            <CardDescription>
              You don't have a paper trading account yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createAccountMutation.mutate()} 
              disabled={createAccountMutation.isPending}
            >
              {createAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Paper Trading Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Trade Dialog */}
      <NewTradeDialog 
        open={isNewTradeOpen} 
        onOpenChange={setIsNewTradeOpen} 
        accountId={account?.id} 
      />
    </div>
  );
}