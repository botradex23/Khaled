import React from 'react';
import Layout from "../components/layout";
import { PortfolioCharts } from "../components/ui/portfolio-charts";
import { CurrentBalances } from "../components/ui/current-balances";
import { useAuth } from "../hooks/use-auth";
import { useLocation } from 'wouter';
import { Skeleton } from "../components/ui/skeleton";

export default function DashboardOverview() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6">
          <Skeleton className="h-12 w-[300px] mb-6" />
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>
        
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <CurrentBalances />
          <PortfolioCharts />
        </div>
      </div>
    </Layout>
  );
}