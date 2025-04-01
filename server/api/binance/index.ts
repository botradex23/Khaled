import { BinanceService } from './binanceService';
import { binanceMarketService } from './marketPriceService';
import { pythonBinanceBridge } from './python-binance-bridge';

export { BinanceService, binanceMarketService, pythonBinanceBridge };

// Function to create a BinanceService instance with user's credentials
export function createBinanceService(apiKey: string, secretKey: string, testnet: boolean = true): BinanceService {
  // If no API key is provided but we have environment variables, use those instead
  // This is useful for testing and when creating services for public endpoints
  if ((!apiKey || apiKey === 'dummy') && process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY) {
    console.log('Using environment Binance API keys instead of provided keys');
    apiKey = process.env.BINANCE_API_KEY;
    secretKey = process.env.BINANCE_SECRET_KEY;
  }
  
  console.log('Creating Binance service with testnet:', testnet);
  return new BinanceService({ apiKey, secretKey, testnet });
}