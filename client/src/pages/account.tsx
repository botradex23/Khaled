import React, { useEffect } from 'react';
import Layout from "../components/layout";
import { useAuth } from "../hooks/use-auth";
import { useLocation } from 'wouter';
import { AccountBalanceCard, TradingHistoryCard } from "../components/ui/account-overview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { useQuery } from '@tanstack/react-query';
import { usePortfolioValue } from "../hooks/use-portfolio-value";

export default function Account() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Fetch account balance data to display total portfolio value
  // For authenticated users, use their API keys
  // For non-authenticated users, use the demo endpoint
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: [isAuthenticated ? "/api/binance/account/balance" : "/api/binance/demo/account/balance"],
    refetchInterval: 15000 // 15 seconds refresh
  });

  // Do not redirect - demo mode is enabled for non-authenticated users 
  // We're using demo data API endpoints that don't require authentication

  // Log the balanceData to understand its structure
  useEffect(() => {
    if (balanceData && Array.isArray(balanceData) && balanceData.length > 0) {
      console.log("Balance Data sample:", balanceData[0]);
    }
  }, [balanceData]);
  
  // Get the number of assets
  const getAssetCount = () => {
    if (!balanceData || !Array.isArray(balanceData)) {
      return 0;
    }
    return balanceData.length;
  };

  // Use the portfolio value context
  const { totalValue, isLoading: isPortfolioLoading } = usePortfolioValue();

  if (isLoading || isBalanceLoading || isPortfolioLoading) {
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
  
  // Use the total value from context
  const totalPortfolioValue = totalValue;
  const assetCount = getAssetCount();

  return (
    <Layout>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Account Overview</h1>
          <div className="bg-blue-950 rounded-lg p-6 shadow-md">
            <h2 className="text-lg text-blue-300 font-medium mb-2">Current portfolio value</h2>
            <div className="flex justify-between items-center">
              <span className="text-4xl font-bold text-white">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="bg-blue-900 text-blue-100 px-3 py-1 rounded-full text-sm">
                {assetCount} {assetCount === 1 ? 'Asset' : 'Assets'}
              </span>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="flex items-center">
                <div className="w-6 h-6 flex items-center justify-center mr-2 bg-blue-800 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-4 h-4 text-blue-200">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-blue-300 text-xs">Available</span>
                  <span className="text-white text-sm font-medium">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="w-24 bg-blue-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center">
                <div className="w-6 h-6 flex items-center justify-center mr-2 bg-blue-800 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-4 h-4 text-blue-200">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-blue-300 text-xs">Frozen</span>
                  <span className="text-white text-sm font-medium">$0.00</span>
                </div>
              </div>
              <div className="w-24 bg-blue-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: '0%' }}></div>
              </div>
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