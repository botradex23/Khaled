import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Skeleton } from "./skeleton";
import { Badge } from "./badge";
import { useAuth } from "../../hooks/use-auth";
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import { Input } from "./input";
import { AssetBalance } from "../../types/portfolio.ts";

export function CurrentBalances() {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBalances, setFilteredBalances] = useState<AssetBalance[]>([]);
  
  // Fetch balances from endpoint
  const { data: balances, isLoading } = useQuery<AssetBalance[]>({
    queryKey: [isAuthenticated ? '/api/portfolio/balances' : '/api/portfolio/demo/balances'],
    // This would fetch real data in a production environment
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Total portfolio value
  const totalValue = balances?.reduce((sum, asset) => sum + asset.value, 0) || 0;
  
  // Filter balances when search term changes
  useEffect(() => {
    if (balances) {
      if (searchTerm.trim() === '') {
        setFilteredBalances(balances);
      } else {
        const term = searchTerm.toLowerCase();
        setFilteredBalances(
          balances.filter(asset => asset.symbol.toLowerCase().includes(term))
        );
      }
    }
  }, [searchTerm, balances]);
  
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
  
  // Create pie chart when Chart.js is loaded and data is available
  useEffect(() => {
    if (chartScripts && balances && balances.length > 0 && window.Chart) {
      // Get only assets with significant value (> 1% of portfolio)
      const significantAssets = balances.filter(asset => 
        asset.value / totalValue > 0.01
      );
      
      // Group smaller assets into "Others" category
      const otherAssets = balances.filter(asset => 
        asset.value / totalValue <= 0.01
      );
      
      const otherValue = otherAssets.reduce((sum, asset) => sum + asset.value, 0);
      
      // Prepare data for chart
      const chartData = [
        ...significantAssets.map(asset => ({
          symbol: asset.symbol,
          value: asset.value
        }))
      ];
      
      // Add "Others" category if there are any small assets
      if (otherValue > 0) {
        chartData.push({
          symbol: 'Others',
          value: otherValue
        });
      }
      
      // Generate random colors for each asset
      const generateColor = (index: number) => {
        const colors = [
          'rgba(59, 130, 246, 0.8)',  // Blue
          'rgba(16, 185, 129, 0.8)',  // Green
          'rgba(249, 115, 22, 0.8)',  // Orange
          'rgba(236, 72, 153, 0.8)',  // Pink
          'rgba(139, 92, 246, 0.8)',  // Purple
          'rgba(234, 179, 8, 0.8)',   // Yellow
          'rgba(14, 165, 233, 0.8)',  // Sky
          'rgba(168, 85, 247, 0.8)',  // Violet
          'rgba(239, 68, 68, 0.8)',   // Red
          'rgba(20, 184, 166, 0.8)',  // Teal
        ];
        
        return colors[index % colors.length];
      };
      
      // Draw allocation chart
      const allocationChartCtx = document.getElementById('portfolioAllocationChart') as HTMLCanvasElement;
      if (allocationChartCtx) {
        // Destroy existing chart instance if it exists
        const existingChart = window.Chart.getChart(allocationChartCtx);
        if (existingChart) {
          existingChart.destroy();
        }
        
        new window.Chart(allocationChartCtx, {
          type: 'doughnut',
          data: {
            labels: chartData.map(item => item.symbol),
            datasets: [{
              data: chartData.map(item => item.value),
              backgroundColor: chartData.map((_, index) => generateColor(index)),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  boxWidth: 15,
                  padding: 15
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    const value = context.parsed;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
                  }
                }
              }
            },
            cutout: '70%'
          }
        });
      }
    }
  }, [chartScripts, balances, totalValue]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Balances</CardTitle>
          <CardDescription>Loading your asset data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between mb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <div>
              <Skeleton className="h-[250px] w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If no balances are available, show appropriate message
  if (!balances || balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Balances</CardTitle>
          <CardDescription>Your cryptocurrency holdings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground mb-2">
              No balance data available.
            </p>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground">
                Log in and connect your exchange API to see your real balances
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
        <CardTitle>Current Balances</CardTitle>
        <CardDescription>Your cryptocurrency holdings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <Badge variant="outline">
            {balances.length} {balances.length === 1 ? 'Asset' : 'Assets'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center mb-4">
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="overflow-auto max-h-[250px]">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-xs">
                    <th className="text-left px-2 py-1 rounded-l-md">Asset</th>
                    <th className="text-right px-2 py-1">Balance</th>
                    <th className="text-right px-2 py-1">Price</th>
                    <th className="text-right px-2 py-1 rounded-r-md">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((asset) => (
                    <tr key={asset.symbol} className="text-sm border-b border-muted/10 last:border-0">
                      <td className="px-2 py-2">
                        <div className="font-medium">{asset.symbol}</div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {asset.quantity.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: asset.quantity < 0.01 ? 8 : asset.quantity < 1 ? 6 : 4
                        })}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex flex-col items-end">
                          <div>${asset.price.toLocaleString(undefined, { 
                            maximumFractionDigits: asset.price < 1 ? 6 : 2
                          })}</div>
                          {asset.changePercent24h !== undefined && (
                            <div className={`text-xs flex items-center ${asset.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {asset.changePercent24h >= 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {asset.changePercent24h >= 0 ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-2">Portfolio Allocation</div>
            <div className="h-[250px] w-full flex items-center justify-center">
              <canvas id="portfolioAllocationChart"></canvas>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}