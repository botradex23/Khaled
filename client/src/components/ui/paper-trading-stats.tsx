import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, PieChart, TrendingUp, TrendingDown, Percent, DollarSign, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { PaperTradingAccount } from '@shared/schema';

interface PaperTradingStatsProps {
  account: PaperTradingAccount;
}

export default function PaperTradingStats({ account }: PaperTradingStatsProps) {
  // Fetch stats
  const {
    data: stats,
    isLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/paper-trading/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/paper-trading/stats');
      return await res.json();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">Analyze your paper trading performance</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchStats()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : stats ? (
        <>
          {/* Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Win Rate
                </CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.winningTrades} winning / {stats.totalTrades} total trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average P&L
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${parseFloat(stats.averageProfitLoss) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${parseFloat(stats.averageProfitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {parseFloat(stats.averageProfitLossPercent).toFixed(2)}% per trade
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total P&L
                </CardTitle>
                {parseFloat(stats.totalProfitLoss) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${parseFloat(stats.totalProfitLoss) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${parseFloat(stats.totalProfitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {parseFloat(stats.totalProfitLossPercent).toFixed(2)}% overall return
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Trades
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTrades}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.winningTrades} winning / {stats.losingTrades} losing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Analytics Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Detailed analysis of your trading results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Initial Balance</p>
                      <p className="text-xl">${parseFloat(account.initialBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Current Balance</p>
                      <p className="text-xl">${parseFloat(account.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Account Created</p>
                      <p className="text-xl">{new Date(account.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Reset</p>
                      <p className="text-xl">{account.lastResetAt ? new Date(account.lastResetAt).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-2">Performance Insights</h3>
                    <ul className="space-y-2 text-sm">
                      {parseFloat(stats.totalProfitLoss) >= 0 ? (
                        <li className="flex items-center text-green-500">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Your account is profitable with a {parseFloat(stats.totalProfitLossPercent).toFixed(2)}% return
                        </li>
                      ) : (
                        <li className="flex items-center text-red-500">
                          <TrendingDown className="h-4 w-4 mr-2" />
                          Your account is down {Math.abs(parseFloat(stats.totalProfitLossPercent)).toFixed(2)}% from initial balance
                        </li>
                      )}
                      
                      {stats.winRate > 50 ? (
                        <li className="flex items-center text-green-500">
                          <Percent className="h-4 w-4 mr-2" />
                          Your win rate of {stats.winRate.toFixed(1)}% is above average
                        </li>
                      ) : (
                        <li className="flex items-center text-muted-foreground">
                          <Percent className="h-4 w-4 mr-2" />
                          Consider improving your win rate of {stats.winRate.toFixed(1)}%
                        </li>
                      )}
                      
                      {stats.totalTrades < 10 ? (
                        <li className="flex items-center text-muted-foreground">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Complete more trades to gain better statistical insights
                        </li>
                      ) : (
                        <li className="flex items-center text-muted-foreground">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          You've completed {stats.totalTrades} trades, giving good statistical data
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Win/Loss Distribution</CardTitle>
                <CardDescription>Breakdown of your trading outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-52">
                  {/* In a real implementation, use a charting library like recharts */}
                  <div className="w-full max-w-xs">
                    <div className="relative pt-1 mb-8">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                            {stats.winningTrades} Winning Trades ({stats.winRate.toFixed(0)}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">
                            {stats.losingTrades} Losing Trades ({(100 - stats.winRate).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex h-4 mb-4 overflow-hidden text-xs bg-gray-200 rounded">
                        <div 
                          style={{ width: `${stats.winRate}%` }} 
                          className="flex flex-col justify-center text-center text-white bg-green-500 shadow-none whitespace-nowrap"
                        >
                        </div>
                        <div 
                          style={{ width: `${100 - stats.winRate}%` }} 
                          className="flex flex-col justify-center text-center text-white bg-red-500 shadow-none whitespace-nowrap"
                        >
                        </div>
                      </div>
                    </div>

                    {/* Simple P&L History Visualization */}
                    <h3 className="font-medium mb-4 text-center">Profit/Loss Distribution</h3>
                    <div className="flex items-end justify-between h-32 border-b border-l relative">
                      <div className="absolute left-0 top-0 h-full border-l border-dashed border-gray-300"></div>
                      <div className="absolute left-0 top-1/2 w-full border-b border-dashed border-gray-300"></div>
                      <div className="absolute left-0 bottom-0 w-full border-b border-gray-300"></div>
                      
                      {/* Winning Trade Bar */}
                      <div className="flex-1 mx-1">
                        <div 
                          className="bg-green-500 w-full" 
                          style={{ 
                            height: `${Math.min(100, (stats.winningTrades / Math.max(1, stats.totalTrades)) * 100)}%`,
                            minHeight: '4px'
                          }}
                        ></div>
                        <div className="text-xs mt-1 text-center">Win</div>
                      </div>
                      
                      {/* Losing Trade Bar */}
                      <div className="flex-1 mx-1">
                        <div 
                          className="bg-red-500 w-full" 
                          style={{ 
                            height: `${Math.min(100, (stats.losingTrades / Math.max(1, stats.totalTrades)) * 100)}%`,
                            minHeight: '4px'
                          }}
                        ></div>
                        <div className="text-xs mt-1 text-center">Loss</div>
                      </div>

                      {/* Average P&L Bar */}
                      <div className="flex-1 mx-1">
                        <div 
                          className={`${parseFloat(stats.averageProfitLoss) >= 0 ? 'bg-green-500' : 'bg-red-500'} w-full`}
                          style={{ 
                            height: `${Math.min(100, Math.abs(parseFloat(stats.averageProfitLossPercent)) * 5)}%`,
                            minHeight: '4px'
                          }}
                        ></div>
                        <div className="text-xs mt-1 text-center">Avg</div>
                      </div>

                      {/* Total P&L Bar */}
                      <div className="flex-1 mx-1">
                        <div 
                          className={`${parseFloat(stats.totalProfitLoss) >= 0 ? 'bg-green-500' : 'bg-red-500'} w-full`}
                          style={{ 
                            height: `${Math.min(100, Math.abs(parseFloat(stats.totalProfitLossPercent)) * 2)}%`,
                            minHeight: '4px'
                          }}
                        ></div>
                        <div className="text-xs mt-1 text-center">Total</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No trading statistics available yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete some trades to generate statistics
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}