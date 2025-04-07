import React from 'react';
import { Link } from 'wouter';
import DirectBinancePriceDisplay from "../components/DirectBinancePriceDisplay";
import { Button } from "../components/ui/button";
import { ArrowLeft } from 'lucide-react';

/**
 * Direct Binance Prices Page
 * 
 * This page displays real-time price data from the Binance API using
 * the official Binance SDK without any fallbacks or simulations.
 */
const DirectPricesPage: React.FC = () => {
  return (
    <div className="container px-4 py-8 mx-auto max-w-7xl">
      
      <div className="flex items-center mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Direct Binance Prices</h1>
          <p className="text-muted-foreground">
            Powered by the official Binance SDK, no fallbacks or simulations
          </p>
        </div>
      </div>
      
      <div className="grid gap-6">
        <DirectBinancePriceDisplay />
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-blue-800 font-medium mb-2">About Direct Binance API</h3>
          <p className="text-gray-700 text-sm mb-3">
            This page demonstrates direct integration with the Binance API using the official SDK. All price data shown here
            comes directly from Binance's servers with no fallbacks, simulations, or proxy layers.
          </p>
          <p className="text-gray-700 text-sm">
            The implementation uses the Python Binance connector library on the backend, providing reliable and accurate
            market data for trading decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DirectPricesPage;