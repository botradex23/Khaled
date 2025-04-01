import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { PremiumHeader } from '@/components/ui/premium-header';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { AnimatedChart } from '@/components/ui/animated-chart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Wallet,
  Disc3,
  Bot,
  History,
  Signal,
  AlertTriangle
} from 'lucide-react';

// Page animation variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Mock portfolio history data
// In a real app, this would come from your API
const generatePortfolioHistoryData = () => {
  const data = [];
  const today = new Date();
  const startValue = 100000;
  let currentValue = startValue;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some random fluctuation to create realistic data
    const change = (Math.random() * 6) - 3; // Random value between -3% and 3%
    currentValue = currentValue * (1 + (change / 100));
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(currentValue),
      btcValue: Math.round(currentValue / 69000 * 100) / 100
    });
  }
  
  return data;
};

// Mock daily profit/loss data
const generateDailyProfitLossData = () => {
  const data = [];
  const today = new Date();
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate random profit/loss between -2000 and 3000
    const profitLoss = Math.round((Math.random() * 5000) - 2000);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: profitLoss,
      profitPercent: Math.round((profitLoss / 100000) * 1000) / 10
    });
  }
  
  return data;
};

export default function EnhancedDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [portfolioData, setPortfolioData] = useState(generatePortfolioHistoryData());
  const [profitLossData, setProfitLossData] = useState(generateDailyProfitLossData());

  // Fetch account balance data 
  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['/api/okx/demo/account/balance'],
    queryFn: async () => {
      const res = await fetch('/api/okx/demo/account/balance');
      if (!res.ok) {
        throw new Error('Failed to fetch account balance');
      }
      return res.json();
    }
  });

  // Fetch active bots data
  const { data: botsData, isLoading: botsLoading } = useQuery({
    queryKey: ['/api/bots'],
    queryFn: async () => {
      const res = await fetch('/api/bots');
      if (!res.ok) {
        throw new Error('Failed to fetch bots data');
      }
      return res.json();
    }
  });

  // Calculate total balance
  const totalBalance = balanceData?.reduce((sum: number, asset: any) => {
    return sum + (asset.valueUSD || 0);
  }, 0) || 0;

  // Calculate 24h change (for demo, generate a random value)
  const [change24h, setChange24h] = useState({
    amount: 0,
    percentage: 0,
    positive: true
  });

  useEffect(() => {
    // Demo: Set a random 24h change value
    const changeAmount = Math.round(Math.random() * 5000 - 2000);
    setChange24h({
      amount: Math.abs(changeAmount),
      percentage: Math.round((changeAmount / totalBalance) * 1000) / 10,
      positive: changeAmount >= 0
    });
  }, [totalBalance]);

  const handleRefresh = () => {
    refetchBalance();
    toast({
      title: "Refreshing data",
      description: "Fetching latest account data...",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PremiumHeader />
      
      <motion.main 
        className="container px-4 pt-24 pb-16 mx-auto"
        initial="hidden"
        animate="visible"
        variants={pageVariants}
      >
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <motion.h1 
              className="text-3xl font-bold"
              variants={cardVariants}
            >
              Dashboard
            </motion.h1>
            <motion.p 
              className="text-muted-foreground"
              variants={cardVariants}
            >
              Welcome back! Here's an overview of your crypto portfolio
            </motion.p>
          </div>
          
          <motion.div 
            className="flex items-center gap-2"
            variants={cardVariants}
          >
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Deposit
            </Button>
          </motion.div>
        </div>
        
        {/* Main stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            title="Total Portfolio Value"
            description="Current total value of all assets"
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
            isLoading={balanceLoading}
          >
            <div className="space-y-2">
              <div className="text-3xl font-bold">${totalBalance.toLocaleString()}</div>
              <div className={`flex items-center text-sm ${change24h.positive ? 'text-green-500' : 'text-red-500'}`}>
                {change24h.positive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {change24h.positive ? '+' : '-'}${change24h.amount.toLocaleString()} ({change24h.percentage}%) 
                <span className="text-muted-foreground ml-1">24h</span>
              </div>
            </div>
          </DashboardCard>
          
          <DashboardCard
            title="Active Trading Bots"
            description="Currently running bot strategies"
            icon={<Bot className="h-5 w-5" />}
            variant="info"
            isLoading={botsLoading}
            actionButton={
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                <a href="/bots">
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            }
          >
            <div className="space-y-2">
              <div className="text-3xl font-bold">{botsData?.length || 0}</div>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Disc3 className="h-4 w-4 mr-1 text-green-500" />
                  <span>AI Grid Bots: {(botsData?.filter((bot: any) => bot.type === 'AI_GRID') || []).length}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Disc3 className="h-4 w-4 mr-1 text-blue-500" />
                  <span>DCA Bots: {(botsData?.filter((bot: any) => bot.type === 'DCA') || []).length}</span>
                </div>
              </div>
            </div>
          </DashboardCard>
          
          <DashboardCard
            title="Market Signals"
            description="Latest trading signals"
            icon={<Signal className="h-5 w-5" />}
            variant="warning"
            actionButton={
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                <a href="/signals">
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            }
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                  <span className="font-medium">BTC/USDT</span>
                </div>
                <div className="text-green-500 text-sm font-medium">+2.4%</div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                  <span className="font-medium">ETH/USDT</span>
                </div>
                <div className="text-red-500 text-sm font-medium">-1.2%</div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2 text-xs" asChild>
                <a href="/signals">
                  View All Signals
                </a>
              </Button>
            </div>
          </DashboardCard>
        </div>
        
        {/* Portfolio chart */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <DashboardCard
            title="Portfolio Performance"
            description="Track your portfolio's performance over time"
            icon={<BarChart3 className="h-5 w-5" />}
            variant="default"
            contentClassName="h-[350px] pb-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <Tabs defaultValue={timeRange} onValueChange={setTimeRange} className="w-full">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="7d">7D</TabsTrigger>
                    <TabsTrigger value="30d">30D</TabsTrigger>
                    <TabsTrigger value="90d">90D</TabsTrigger>
                    <TabsTrigger value="1y">1Y</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center text-sm">
                      <div className="h-3 w-3 rounded-full bg-primary mr-2"></div>
                      <span className="text-muted-foreground">Portfolio Value (USD)</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="h-3 w-3 rounded-full bg-orange-500 mr-2"></div>
                      <span className="text-muted-foreground">BTC Holdings</span>
                    </div>
                  </div>
                </div>
              </Tabs>
            </div>
            
            <div className="h-[280px]">
              <AnimatedChart 
                data={portfolioData}
                type="area"
                lines={[
                  { dataKey: 'value', stroke: 'hsl(var(--primary))', name: 'Portfolio Value (USD)' },
                  { dataKey: 'btcValue', stroke: 'hsl(25, 95%, 53%)', name: 'BTC Holdings', fill: 'hsla(25, 95%, 53%, 0.1)' }
                ]}
                showGrid={true}
                valuePrefix="$"
                gradientColors={['hsl(var(--primary))', 'hsla(var(--primary), 0.1)']}
              />
            </div>
          </DashboardCard>
        </div>
        
        {/* Bottom cards row (Daily P&L and Assets) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardCard
            title="Daily Profit/Loss"
            description="Your daily trading P&L"
            icon={<History className="h-5 w-5" />}
            variant="default"
            contentClassName="h-[300px]"
          >
            <div className="h-[280px]">
              <AnimatedChart 
                data={profitLossData}
                type="bar"
                lines={[
                  { 
                    dataKey: 'value', 
                    fill: 'hsla(142, 76%, 36%, 0.8)',
                    name: 'Profit/Loss (USD)'
                  }
                ]}
                showGrid={true}
                valuePrefix="$"
              />
            </div>
          </DashboardCard>
          
          <DashboardCard
            title="Your Assets"
            description="Overview of your cryptocurrency holdings"
            icon={<Wallet className="h-5 w-5" />}
            variant="default"
            isLoading={balanceLoading}
            contentClassName="max-h-[300px] overflow-auto"
          >
            {balanceData && balanceData.length > 0 ? (
              <div className="divide-y">
                {balanceData
                  .sort((a: any, b: any) => (b.valueUSD || 0) - (a.valueUSD || 0))
                  .slice(0, 6)
                  .map((asset: any, index: number) => (
                    <div key={index} className="py-3 px-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                          {asset.currency?.substring(0, 2) || '??'}
                        </div>
                        <div>
                          <div className="font-medium">{asset.currency}</div>
                          <div className="text-sm text-muted-foreground">{Number(asset.total).toLocaleString()} {asset.currency}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${Number(asset.valueUSD || 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          ${asset.pricePerUnit?.toLocaleString() || '0.00'} per coin
                        </div>
                      </div>
                    </div>
                  ))}
                  
                {balanceData.length > 6 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                    <a href="/portfolio">
                      View All Assets
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-1">No assets found</h3>
                <p className="text-muted-foreground text-sm mb-4">You don't have any cryptocurrencies yet.</p>
                <Button size="sm">Deposit Funds</Button>
              </div>
            )}
          </DashboardCard>
        </div>
      </motion.main>
    </div>
  );
}