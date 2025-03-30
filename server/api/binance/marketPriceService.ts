import axios from 'axios';

// Base URLs for Binance API
const BINANCE_BASE_URL = 'https://api.binance.com';
const BINANCE_TEST_URL = 'https://testnet.binance.vision';

/**
 * Service for fetching market price data from Binance public API
 */
export class BinanceMarketPriceService {
  private baseUrl: string;
  
  constructor(useTestnet: boolean = false) {
    this.baseUrl = useTestnet ? BINANCE_TEST_URL : BINANCE_BASE_URL;
    console.log(`Binance Market Price Service initialized with base URL: ${this.baseUrl}`);
  }
  
  /**
   * Get the current price for all available symbols
   * @returns Array of ticker prices
   */
  async getAllPrices(): Promise<BinanceTickerPrice[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/ticker/price`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        console.log(`Successfully fetched ${response.data.length} prices from Binance`);
        return response.data;
      } else {
        console.error('Unexpected response format from Binance:', response.data);
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching all prices from Binance:', error.message);
      return [];
    }
  }
  
  /**
   * Get the current price for a specific symbol
   * @param symbol The trading pair symbol (e.g., "BTCUSDT")
   * @returns Ticker price or null if not found
   */
  async getSymbolPrice(symbol: string): Promise<BinanceTickerPrice | null> {
    try {
      // Convert symbol format if needed (e.g., "BTC-USDT" -> "BTCUSDT")
      const formattedSymbol = symbol.replace('-', '');
      
      const response = await axios.get(
        `${this.baseUrl}/api/v3/ticker/price`, 
        { params: { symbol: formattedSymbol } }
      );
      
      if (response.status === 200 && response.data?.symbol) {
        console.log(`Successfully fetched price for ${symbol} from Binance: ${response.data.price}`);
        return response.data;
      } else {
        console.error('Unexpected response format from Binance:', response.data);
        return null;
      }
    } catch (error: any) {
      console.error(`Error fetching price for ${symbol} from Binance:`, error.message);
      return null;
    }
  }
  
  /**
   * Get 24hr ticker price change statistics for a specific symbol or all symbols
   * @param symbol Optional symbol to get data for specific pair
   * @returns Array of 24hr ticker statistics
   */
  async get24hrStats(symbol?: string): Promise<Binance24hrTicker[] | Binance24hrTicker | null> {
    try {
      const params: any = {};
      if (symbol) {
        // Convert symbol format if needed (e.g., "BTC-USDT" -> "BTCUSDT")
        params.symbol = symbol.replace('-', '');
      }
      
      const response = await axios.get(
        `${this.baseUrl}/api/v3/ticker/24hr`, 
        { params }
      );
      
      if (response.status === 200) {
        if (symbol) {
          console.log(`Successfully fetched 24hr stats for ${symbol} from Binance`);
          return response.data;
        } else {
          console.log(`Successfully fetched 24hr stats for all symbols from Binance (${response.data.length} pairs)`);
          return response.data;
        }
      } else {
        console.error('Unexpected response format from Binance:', response.data);
        return null;
      }
    } catch (error: any) {
      console.error(`Error fetching 24hr stats from Binance:`, error.message);
      return null;
    }
  }
  
  /**
   * Convert OKX symbol format to Binance format
   * @param okxSymbol Symbol in OKX format (e.g., "BTC-USDT")
   * @returns Symbol in Binance format (e.g., "BTCUSDT")
   */
  static convertOkxToBinanceSymbol(okxSymbol: string): string {
    return okxSymbol.replace('-', '');
  }
  
  /**
   * Convert Binance symbol format to OKX format
   * @param binanceSymbol Symbol in Binance format (e.g., "BTCUSDT")
   * @returns Symbol in OKX format (e.g., "BTC-USDT")
   */
  static convertBinanceToOkxSymbol(binanceSymbol: string): string {
    // For USDT pairs like BTCUSDT -> BTC-USDT
    if (binanceSymbol.endsWith('USDT')) {
      return binanceSymbol.replace('USDT', '-USDT');
    } 
    // For USDC pairs like BTCUSDC -> BTC-USDC
    else if (binanceSymbol.endsWith('USDC')) {
      return binanceSymbol.replace('USDC', '-USDC');
    }
    // For other quote currencies, try to find the split point
    else {
      // Common quote currencies
      const quoteCurrencies = ['BTC', 'ETH', 'BNB', 'BUSD', 'USD'];
      
      for (const quote of quoteCurrencies) {
        if (binanceSymbol.endsWith(quote)) {
          return binanceSymbol.replace(quote, `-${quote}`);
        }
      }
      
      // If we can't determine the split point, return the original
      return binanceSymbol;
    }
  }
  
  /**
   * Get currency pairs for the most important cryptocurrencies and convert them to Binance format
   * @returns Array of symbols in Binance format
   */
  static getImportantCurrencyPairs(): string[] {
    const okxPairs = [
      'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT',
      'DOGE-USDT', 'ADA-USDT', 'MATIC-USDT', 'AVAX-USDT', 'DOT-USDT',
      'UNI-USDT', 'LINK-USDT', 'SHIB-USDT', 'LTC-USDT', 'ATOM-USDT',
      'NEAR-USDT', 'BCH-USDT', 'FIL-USDT', 'TRX-USDT', 'XLM-USDT'
    ];
    
    return okxPairs.map(pair => BinanceMarketPriceService.convertOkxToBinanceSymbol(pair));
  }
}

// Type definitions
export interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

export interface Binance24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// Create a default instance for the service
export const binanceMarketService = new BinanceMarketPriceService(false);