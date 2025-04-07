import React from "react";
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod'; // ← תוקן כאן
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.tsx";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";

// Form schema
const tradeFormSchema = z.object({
  symbol: z.string().min(1, { message: 'Symbol is required' }),
  direction: z.enum(['LONG', 'SHORT'], {
    required_error: 'Direction is required',
  }),
  entryPrice: z.string().min(1, { message: 'Entry price is required' })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Entry price must be a positive number',
    }),
  quantity: z.string().min(1, { message: 'Quantity is required' })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Quantity must be a positive number',
    }),
  type: z.enum(['MARKET', 'LIMIT'], {
    required_error: 'Order type is required',
  }),
  isAiGenerated: z.boolean().default(false),
  aiConfidence: z.string().optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

interface NewTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number | undefined;
}

export default function NewTradeDialog({ open, onOpenChange, accountId }: NewTradeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [symbolInput, setSymbolInput] = useState('');

  const defaultSymbols = [
    'BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'XRP-USDT', 'SOL-USDT',
    'ADA-USDT', 'DOGE-USDT', 'SHIB-USDT', 'AVAX-USDT', 'DOT-USDT',
  ];

  const { data: binanceTickers } = useQuery({
    queryKey: ['/api/binance/market/tickers'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/binance/market/tickers');
        return await res.json();
      } catch (error) {
        console.error('Failed to fetch tickers:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      symbol: '',
      direction: 'LONG',
      entryPrice: '',
      quantity: '',
      type: 'MARKET',
      isAiGenerated: false,
      aiConfidence: '',
    },
  });

  const selectedSymbol = form.watch('symbol');
  useEffect(() => {
    if (selectedSymbol && binanceTickers) {
      const ticker = binanceTickers.find(
        (t: any) => t.symbol === selectedSymbol.replace('-', '')
      );
      if (ticker?.price) {
        form.setValue('entryPrice', ticker.price);
      }
    }
  }, [selectedSymbol, binanceTickers, form]);

  const filteredSymbols = symbolInput
    ? [...defaultSymbols, ...binanceTickers?.map((t: any) =>
        t.symbol.replace(/([A-Z0-9]+)([A-Z0-9]+)/g, '$1-$2')
      ) || []]
        .filter((sym: string) => sym.toLowerCase().includes(symbolInput.toLowerCase()))
        .filter((sym: string, i: number, self: string[]) => self.indexOf(sym) === i)
        .slice(0, 10)
    : defaultSymbols;

  const createTradeMutation = useMutation({
    mutationFn: async (values: TradeFormValues) => {
      if (!accountId) throw new Error('No paper trading account found');
      const res = await apiRequest('POST', '/api/paper-trading/trades', {
        ...values,
        entryPrice: values.entryPrice.toString(),
        quantity: values.quantity.toString(),
        aiConfidence: values.isAiGenerated ? values.aiConfidence : null,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: 'Trade Created', description: 'Your paper trade has been created successfully.' });
      form.reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/paper-trading/account'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Trade',
        description: error.message || 'There was an error creating your trade.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: TradeFormValues) => {
    createTradeMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Paper Trade</DialogTitle>
          <DialogDescription>
            Add a new simulated trade to your paper trading account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Pair</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trading pair" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="flex items-center px-3 pb-2">
                        <Input
                          placeholder="Search symbols..."
                          value={symbolInput}
                          onChange={(e) => setSymbolInput(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      {filteredSymbols.map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Choose the cryptocurrency pair to trade</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LONG">Long (Buy)</SelectItem>
                        <SelectItem value="SHORT">Short (Sell)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select order type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MARKET">Market</SelectItem>
                        <SelectItem value="LIMIT">Limit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entryPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Price</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isAiGenerated"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>AI-Generated Trade</FormLabel>
                    <FormDescription>Mark this trade as generated by AI</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch('isAiGenerated') && (
              <FormField
                control={form.control}
                name="aiConfidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Confidence Level</FormLabel>
                    <FormControl>
                      <Input placeholder="0.75" {...field} />
                    </FormControl>
                    <FormDescription>Enter a value between 0 and 1 (e.g. 0.75)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={createTradeMutation.isPending || !accountId}>
                {createTradeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Trade'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}