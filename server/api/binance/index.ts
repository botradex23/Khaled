/**
 * Binance API Module
 * Re-exports functionality from binanceService.ts
 */

import { 
  BinanceApiService, 
  createBinanceServiceWithCustomCredentials, 
  binanceService
} from './binanceService';

export {
  BinanceApiService, 
  createBinanceServiceWithCustomCredentials, 
  binanceService
};