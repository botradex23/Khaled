import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, DollarSign, TrendingUp, TrendingDown, BarChart3, LineChart, ArrowUpDown, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { PaperTradingAccount, PaperTradingPosition, PaperTradingTrade } from '@shared/schema';
import ResetPaperAccountDialog from './reset-paper-account-dialog';

interface PaperTradingDashboardProps {
  account: PaperTradingAccount;
}

export default function PaperTradingDashboard({ account }: PaperTradingDashboardProps) {
  // Fetch positions
  const {
    data: positions = [],
    isLoading: isPositionsLoading,
    refetch: refetchPositions
  } = useQuery({
    queryKey: ['/api/paper-trading/positions'],
    queryFn: async () => {
      const res = await fetch('/api/paper-trading/positions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch positions');
      }
      
      return await res.json();
    }
  });

  // Fetch trades
  const {
    data: trades = [],
    isLoading: isTradesLoading,
    refetch: refetchTrades
  } = useQuery({
    queryKey: ['/api/paper-trading/trades'],
    queryFn: async () => {
      const res = await fetch('/api/paper-trading/trades', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch trading history');
      }
      
      return await res.json();
    }
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/paper-trading/stats'],
    queryFn: async () => {
      const res = await fetch('/api/paper-trading/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch trading statistics');
      }
      
      return await res.json();
    }
  });

  // Calculate current equity
  const calculateEquity = () => {
    if (!account) return 0;
    
    // Get the balance and any unrealized profit/loss from open positions
    const balance = parseFloat(account.currentBalance);
    const unrealizedPnL = positions.reduce((total: number, position: PaperTradingPosition) => {
      return total + parseFloat(position.currentProfitLoss || '0');
    }, 0);
    
    return balance + unrealizedPnL;
  };

  const equity = calculateEquity();

  // Refresh all data
  const refreshAllData = () => {
    refetchPositions();
    refetchTrades();
    refetchStats();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Account Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Account Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(account.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Initial Balance: ${parseFloat(account.initialBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Equity Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Equity
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Includes unrealized P&L from open positions
            </p>
          </CardContent>
        </Card>

        {/* Total P&L Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total P&L
            </CardTitle>
            {parseFloat(account.totalProfitLoss || '0') >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parseFloat(account.totalProfitLoss || '0') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${parseFloat(account.totalProfitLoss || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {parseFloat(account.totalProfitLossPercent || '0').toFixed(2)}% overall return
            </p>
          </CardContent>
        </Card>

        {/* Open Positions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Open Positions
            </CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              Total Trades: {account.totalTrades}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity Card */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <div className="flex items-center space-x-2">
                <ResetPaperAccountDialog accountId={account.id} />
                <Button variant="outline" size="sm" onClick={refreshAllData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            <CardDescription>Your most recent trading activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isTradesLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : trades.length > 0 ? (
              <div className="space-y-4">
                {trades
                  .sort((a: PaperTradingTrade, b: PaperTradingTrade) => {
                    // Ensure dates are valid
                    const dateA = a.openedAt ? new Date(a.openedAt) : new Date(0);
                    const dateB = b.openedAt ? new Date(b.openedAt) : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 5)
                  .map((trade: PaperTradingTrade) => (
                    <div key={trade.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {trade.openedAt ? new Date(trade.openedAt).toLocaleDateString() : '-'} • {trade.direction} • {trade.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${parseFloat(trade.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </p>
                        <p className="text-sm">
                          {parseFloat(trade.quantity).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })} units
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No trades yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Positions Overview Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
            <CardDescription>Your currently active positions</CardDescription>
          </CardHeader>
          <CardContent>
            {isPositionsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : positions.length > 0 ? (
              <div className="space-y-4">
                {positions.slice(0, 3).map((position: PaperTradingPosition) => (
                  <div key={position.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{position.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {position.direction} • Entry: ${parseFloat(position.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${parseFloat(position.currentProfitLoss || '0') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${parseFloat(position.currentProfitLoss || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm">
                        {parseFloat(position.currentProfitLossPercent || '0').toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
                {positions.length > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-sm text-muted-foreground">
                      + {positions.length - 3} more positions
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No open positions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}