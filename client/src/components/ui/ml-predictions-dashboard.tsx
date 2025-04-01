import React from 'react';
import { MLPredictionCard } from '@/components/ui/ml-prediction-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';

interface MLPredictionsDashboardProps {
  symbols?: string[];
  interval?: string;
  refetchInterval?: number;
}

export function MLPredictionsDashboard({
  symbols = ['BTCUSDT', 'ETHUSDT'],
  interval = '4h',
  refetchInterval = 60000 // 1 minute
}: MLPredictionsDashboardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <BrainCircuit className="h-5 w-5" />
          <CardTitle>AI Trading Predictions</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time machine learning predictions based on technical indicators and market patterns
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {symbols.map(symbol => (
            <MLPredictionCard
              key={symbol}
              symbol={symbol}
              interval={interval}
              refetchInterval={refetchInterval}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}