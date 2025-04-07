import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "./button";

interface MarketErrorStateProps {
  onRetry: () => void;
  title?: string;
  message?: string;
}

export function MarketErrorState({ 
  onRetry, 
  title = 'Unable to load market data',
  message = 'There was an error fetching data from Binance. Please check your connection and try again.'
}: MarketErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">
        {title}
      </h3>
      
      <p className="text-slate-400 mb-6 max-w-md">
        {message}
      </p>
      
      <Button 
        variant="outline" 
        className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-300"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}