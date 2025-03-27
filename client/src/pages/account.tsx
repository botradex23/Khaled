import React, { useEffect } from 'react';
import Layout from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { AccountBalanceCard, TradingHistoryCard } from '@/components/ui/account-overview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function Account() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6">
          <Skeleton className="h-12 w-[250px] mb-6" />
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Account Overview</h1>
        
        <Tabs defaultValue="overview" className="w-full space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="overview">Portfolio Overview</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <AccountBalanceCard />
          </TabsContent>
          
          <TabsContent value="transactions" className="space-y-6">
            <TradingHistoryCard />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}