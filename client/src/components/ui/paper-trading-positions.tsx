import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { PaperTradingAccount, PaperTradingPosition } from '@shared/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaperTradingPositionsProps {
  account: PaperTradingAccount;
}

export default function PaperTradingPositions({ account }: PaperTradingPositionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [closingPositionId, setClosingPositionId] = useState<number | null>(null);

  // Fetch positions
  const {
    data: positions = [],
    isLoading,
    refetch: refetchPositions
  } = useQuery({
    queryKey: ['/api/paper-trading/positions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/paper-trading/positions');
      return await res.json();
    }
  });

  // Close position mutation
  const closePositionMutation = useMutation({
    mutationFn: async ({ positionId, exitPrice }: { positionId: number, exitPrice: number }) => {
      const res = await apiRequest('POST', `/api/paper-trading/positions/${positionId}/close`, {
        exitPrice
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Position Closed',
        description: 'Your position has been closed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/account'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/stats'] });
      setClosingPositionId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Close Position',
        description: error.message || 'There was an error closing your position.',
        variant: 'destructive',
      });
      setClosingPositionId(null);
    }
  });

  // Handle close position
  const handleClosePosition = async (position: PaperTradingPosition) => {
    // In a real app, we'd fetch the current market price
    // For now, let's simulate by using a price close to the entry price
    try {
      setClosingPositionId(position.id);

      // We'll simulate a slight market movement for demo purposes
      // In a real implementation, you would get the current market price from an API
      const currentMarketPrice = position.currentPrice 
        ? parseFloat(position.currentPrice)
        : parseFloat(position.entryPrice) * (1 + (Math.random() * 0.02 - 0.01)); // +/- 1%

      // Close the position with the current market price
      await closePositionMutation.mutateAsync({
        positionId: position.id,
        exitPrice: currentMarketPrice
      });
    } catch (error) {
      console.error('Error closing position:', error);
      setClosingPositionId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Open Positions</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchPositions()}
            disabled={isLoading}
          >
            <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>Your currently active trading positions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : positions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Entry Price</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>P&L %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position: PaperTradingPosition) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{position.symbol}</TableCell>
                  <TableCell className={position.direction === 'LONG' ? 'text-green-500' : 'text-red-500'}>
                    {position.direction}
                  </TableCell>
                  <TableCell>${parseFloat(position.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</TableCell>
                  <TableCell>
                    ${position.currentPrice 
                      ? parseFloat(position.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                      : '-'}
                  </TableCell>
                  <TableCell>{parseFloat(position.quantity).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell>
                  <TableCell className={parseFloat(position.currentProfitLoss || '0') >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ${parseFloat(position.currentProfitLoss || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className={parseFloat(position.currentProfitLossPercent || '0') >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {parseFloat(position.currentProfitLossPercent || '0').toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleClosePosition(position)}
                      disabled={closePositionMutation.isPending && closingPositionId === position.id}
                    >
                      {closePositionMutation.isPending && closingPositionId === position.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span className="ml-2">Close</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No open positions</p>
            <p className="text-sm text-muted-foreground mt-1">Create a new trade to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}