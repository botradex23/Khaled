import React, { useEffect, useState } from 'react';
import Layout from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { AccountBalanceCard, TradingHistoryCard } from '@/components/ui/account-overview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';

export default function Account() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Fetch account balance data to display total portfolio value
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["/api/okx/demo/account/balance"],
    refetchInterval: 15000 // 15 seconds refresh
  });

  // Do not redirect - demo mode is enabled for non-authenticated users 
  // We're using demo data API endpoints that don't require authentication

  // Calculate total portfolio value
  const calculateTotalValue = () => {
    if (!balanceData || !Array.isArray(balanceData) || balanceData.length === 0) {
      return 0;
    }
    
    // Sum up the USD value of all assets
    return balanceData.reduce((total, asset) => total + asset.valueUSD, 0);
  };
  
  // Get the number of assets
  const getAssetCount = () => {
    if (!balanceData || !Array.isArray(balanceData)) {
      return 0;
    }
    return balanceData.length;
  };

  if (isLoading || isBalanceLoading) {
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
  
  // Calculate the total portfolio value
  const totalPortfolioValue = calculateTotalValue();
  const assetCount = getAssetCount();

  return (
    <Layout>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Account Overview</h1>
          <div className="bg-blue-950 rounded-lg p-6 shadow-md">
            <h2 className="text-lg text-blue-300 font-medium mb-2">Current portfolio value</h2>
            <div className="flex justify-between items-center">
              <span className="text-4xl font-bold text-white">${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className="bg-blue-900 text-blue-100 px-3 py-1 rounded-full text-sm">
                {assetCount} {assetCount === 1 ? 'Asset' : 'Assets'}
              </span>
            </div>
          </div>
        </div>
        
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