import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Skeleton } from "./skeleton";
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "../../hooks/use-auth";
import { PortfolioHistoryItem } from "../../types/portfolio.ts";

export function PortfolioCharts() {
  const { isAuthenticated } = useAuth();
  
  // Fetch portfolio history from API
  const { data: portfolioHistory, isLoading: isHistoryLoading } = useQuery<PortfolioHistoryItem[]>({
    queryKey: [isAuthenticated ? '/api/portfolio/history' : '/api/portfolio/demo/history'],
  });
  
  // State to hold Chart.js objects
  const [chartScripts, setChartScripts] = useState(false);
  
  // Function to load Chart.js from CDN
  useEffect(() => {
    // Only load Chart.js if it's not already loaded
    if (!window.Chart && !chartScripts) {
      const chartScript = document.createElement('script');
      chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      chartScript.async = true;
      chartScript.onload = () => {
        setChartScripts(true);
      };
      document.body.appendChild(chartScript);
      
      return () => {
        document.body.removeChild(chartScript);
      };
    } else if (window.Chart) {
      setChartScripts(true);
    }
  }, [chartScripts]);
  
  // Initialize charts when Chart.js is loaded and data is available
  useEffect(() => {
    if (chartScripts && portfolioHistory && Array.isArray(portfolioHistory) && window.Chart) {
      // Generate portfolio value chart
      const valueChartCtx = document.getElementById('portfolioValueChart') as HTMLCanvasElement;
      if (valueChartCtx) {
        // Destroy existing chart instance if it exists
        const existingChart = window.Chart.getChart(valueChartCtx);
        if (existingChart) {
          existingChart.destroy();
        }
        
        new window.Chart(valueChartCtx, {
          type: 'line',
          data: {
            labels: portfolioHistory.map((item: PortfolioHistoryItem) => item.date),
            datasets: [{
              label: 'Portfolio Value',
              data: portfolioHistory.map((item: PortfolioHistoryItem) => item.totalValue),
              fill: true,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 1)',
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    return `$${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                }
              },
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                }
              },
              y: {
                beginAtZero: false,
                ticks: {
                  callback: function(value: any) {
                    return '$' + value.toLocaleString();
                  }
                }
              }
            }
          }
        });
      }
      
      // Generate daily profit/loss chart
      const profitLossChartCtx = document.getElementById('dailyProfitLossChart') as HTMLCanvasElement;
      if (profitLossChartCtx) {
        // Destroy existing chart instance if it exists
        const existingChart = window.Chart.getChart(profitLossChartCtx);
        if (existingChart) {
          existingChart.destroy();
        }
        
        new window.Chart(profitLossChartCtx, {
          type: 'bar',
          data: {
            labels: portfolioHistory.map((item: PortfolioHistoryItem) => item.date),
            datasets: [{
              label: 'Daily Profit/Loss',
              data: portfolioHistory.map((item: PortfolioHistoryItem) => item.dailyChange),
              backgroundColor: portfolioHistory.map((item: PortfolioHistoryItem) => 
                item.dailyChange >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
              ),
              borderColor: portfolioHistory.map((item: PortfolioHistoryItem) => 
                item.dailyChange >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
              ),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    const value = context.parsed.y;
                    const percent = portfolioHistory[context.dataIndex].dailyChangePercent;
                    return `${value >= 0 ? '+' : ''}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${value >= 0 ? '+' : ''}${percent.toFixed(2)}%)`;
                  }
                }
              },
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                }
              },
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value: any) {
                    return '$' + value.toLocaleString();
                  }
                }
              }
            }
          }
        });
      }
    }
  }, [chartScripts, portfolioHistory]);
  
  if (isHistoryLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Loading your portfolio data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="value">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="value">Value History</TabsTrigger>
              <TabsTrigger value="profit">Daily P/L</TabsTrigger>
            </TabsList>
            <TabsContent value="value" className="pt-4">
              <Skeleton className="h-[300px] w-full" />
            </TabsContent>
            <TabsContent value="profit" className="pt-4">
              <Skeleton className="h-[300px] w-full" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // If no history data is available, show demo message
  if (!portfolioHistory || !Array.isArray(portfolioHistory) || portfolioHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Historical portfolio data visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground mb-2">
              No historical portfolio data available.
            </p>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground">
                Log in and connect your exchange API to track your portfolio performance
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
        <CardDescription>30-day portfolio value and daily profit/loss</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="value">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="value">Value History</TabsTrigger>
            <TabsTrigger value="profit">Daily P/L</TabsTrigger>
          </TabsList>
          <TabsContent value="value" className="pt-4">
            <div className="h-[300px] w-full">
              <canvas id="portfolioValueChart"></canvas>
            </div>
          </TabsContent>
          <TabsContent value="profit" className="pt-4">
            <div className="h-[300px] w-full">
              <canvas id="dailyProfitLossChart"></canvas>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}