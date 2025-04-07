import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Loader2, ArrowDownUp, FileText, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "../../lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select.tsx";
import type { PaperTradingAccount, PaperTradingTrade } from '@shared/schema';
import { Badge } from "./badge";

interface PaperTradingHistoryProps {
  account: PaperTradingAccount;
}

export default function PaperTradingHistory({ account }: PaperTradingHistoryProps) {
  const [filter, setFilter] = useState('all'); // 'all', 'open', 'closed'

  // Fetch trades
  const {
    data: trades = [],
    isLoading,
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

  // Filter trades based on selection
  const filteredTrades = trades.filter((trade: PaperTradingTrade) => {
    if (filter === 'open') return trade.status === 'OPEN';
    if (filter === 'closed') return trade.status === 'CLOSED';
    return true; // 'all'
  });

  // Sort trades by date, most recent first
  const sortedTrades = [...filteredTrades].sort((a: PaperTradingTrade, b: PaperTradingTrade) => {
    // Ensure the dates are valid before creating Date objects
    const dateA = a.openedAt ? new Date(a.openedAt) : new Date(0);
    const dateB = b.openedAt ? new Date(b.openedAt) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>Record of all your paper trading activities</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                <SelectItem value="open">Open Only</SelectItem>
                <SelectItem value="closed">Closed Only</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchTrades()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : sortedTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Exit Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>P&L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTrades.map((trade: PaperTradingTrade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="whitespace-nowrap">
                      {trade.openedAt ? new Date(trade.openedAt).toLocaleDateString() : '-'}
                      <div className="text-xs text-muted-foreground">
                        {trade.openedAt ? new Date(trade.openedAt).toLocaleTimeString() : ''}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>{trade.type}</TableCell>
                    <TableCell className={trade.direction === 'LONG' ? 'text-green-500' : 'text-red-500'}>
                      {trade.direction}
                    </TableCell>
                    <TableCell>${parseFloat(trade.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</TableCell>
                    <TableCell>
                      {trade.exitPrice 
                        ? `$${parseFloat(trade.exitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                        : '-'}
                    </TableCell>
                    <TableCell>{parseFloat(trade.quantity).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell>
                      <Badge variant={trade.status === 'OPEN' ? 'outline' : 'default'}>
                        {trade.status}
                      </Badge>
                      {trade.isAiGenerated && (
                        <Badge variant="secondary" className="ml-1">AI</Badge>
                      )}
                    </TableCell>
                    <TableCell 
                      className={
                        trade.status === 'CLOSED' 
                          ? parseFloat(trade.profitLoss || '0') >= 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                          : ''
                      }
                    >
                      {trade.status === 'CLOSED' 
                        ? `$${parseFloat(trade.profitLoss || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell
                      className={
                        trade.status === 'CLOSED' 
                          ? parseFloat(trade.profitLossPercent || '0') >= 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                          : ''
                      }
                    >
                      {trade.status === 'CLOSED' 
                        ? `${parseFloat(trade.profitLossPercent || '0').toFixed(2)}%`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No trade history found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter !== 'all' 
                ? `Try changing the filter or create a ${filter === 'open' ? 'new' : 'closed'} trade`
                : 'Create a new trade to get started'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}