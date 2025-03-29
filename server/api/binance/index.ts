import { BinanceService } from './binanceService';

export { BinanceService };

// Function to create a BinanceService instance with user's credentials
export function createBinanceService(apiKey: string, secretKey: string, testnet: boolean = true): BinanceService {
  console.log('Creating Binance service with testnet:', testnet);
  return new BinanceService({ apiKey, secretKey, testnet });
}