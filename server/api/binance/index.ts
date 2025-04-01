/**
 * Binance API Module
 * Re-exports functionality from binanceService.ts
 */

import { 
  BinanceApiService, 
  createBinanceServiceWithCustomCredentials, 
  binanceService,
  BinanceApiConfig,
  BinanceAccountInfo
} from './binanceService';

export {
  BinanceApiService,
  createBinanceServiceWithCustomCredentials,
  binanceService,
  BinanceApiConfig,
  BinanceAccountInfo
};