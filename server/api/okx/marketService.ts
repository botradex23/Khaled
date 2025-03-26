import { okxService } from './okxService';
import { DEFAULT_PAIRS } from './config';

// Define response types
interface MarketTicker {
  instId: string;        // Instrument ID, e.g., BTC-USDT
  last: string;          // Last traded price
  askPx: string;         // Best ask price
  bidPx: string;         // Best bid price
  vol24h: string;        // 24-hour trading volume
  volCcy24h: string;     // 24-hour trading volume in currency
  high24h: string;       // 24-hour high
  low24h: string;        // 24-hour low
  sodUtc0: string;       // Open price (00:00 UTC)
  sodUtc8: string;       // Open price (08:00 UTC)
  priceChangePercent: string;  // Calculated price change percentage
}

interface OkxResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

// Service for fetching market data
export class MarketService {
  /**
   * Get market tickers for default or specified trading pairs
   */
  async getMarketData(symbols: string[] = DEFAULT_PAIRS): Promise<MarketData[]> {
    try {
      // Get all tickers to avoid multiple API calls
      const response = await okxService.makePublicRequest<OkxResponse<MarketTicker>>('/api/v5/market/tickers?instType=SPOT');
      
      if (response.code !== '0') {
        throw new Error(`Failed to fetch market data: ${response.msg}`);
      }
      
      // Filter and format response data
      const marketData: MarketData[] = [];
      
      for (const ticker of response.data) {
        // Skip if not in our symbols list
        if (!symbols.includes(ticker.instId)) {
          continue;
        }
        
        // Calculate price change percentage
        const lastPrice = parseFloat(ticker.last);
        const openPrice = parseFloat(ticker.sodUtc0);
        const changePercent = openPrice > 0 
          ? ((lastPrice - openPrice) / openPrice) * 100 
          : 0;
        
        marketData.push({
          symbol: ticker.instId,
          price: lastPrice,
          change24h: parseFloat(changePercent.toFixed(2)),
          volume24h: parseFloat(ticker.vol24h),
          high24h: parseFloat(ticker.high24h),
          low24h: parseFloat(ticker.low24h)
        });
      }
      
      return marketData;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      throw error;
    }
  }
  
  /**
   * Get candlestick data for a specific trading pair
   */
  async getCandlestickData(symbol: string, interval = '1H', limit = 100): Promise<any> {
    try {
      // Use the okxService.getKlineData method which has the correct parameter handling
      const response = await okxService.getKlineData(symbol, interval, limit) as OkxResponse<string[][]>;
      
      if (response.code !== '0') {
        throw new Error(`Failed to fetch candlestick data: ${response.msg}`);
      }
      
      // Process and format candlestick data
      // OKX returns an array of arrays: [[timestamp, open, high, low, close, vol, volCcy], [...], ...]
      return response.data.map((candle: any) => ({
        timestamp: candle[0] as string,
        open: parseFloat(candle[1] as string),
        high: parseFloat(candle[2] as string),
        low: parseFloat(candle[3] as string),
        close: parseFloat(candle[4] as string),
        volume: parseFloat(candle[5] as string)
      }));
    } catch (error) {
      console.error(`Failed to fetch candlestick data for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get detailed market information for a specific trading pair
   */
  async getMarketDetail(symbol: string): Promise<any> {
    try {
      const response = await okxService.makePublicRequest<OkxResponse<MarketTicker>>(`/api/v5/market/ticker?instId=${symbol}`);
      
      if (response.code !== '0' || !response.data[0]) {
        throw new Error(`Failed to fetch market detail: ${response.msg}`);
      }
      
      const ticker = response.data[0];
      const lastPrice = parseFloat(ticker.last);
      const openPrice = parseFloat(ticker.sodUtc0);
      const changePercent = openPrice > 0 
        ? ((lastPrice - openPrice) / openPrice) * 100 
        : 0;
      
      return {
        symbol: ticker.instId,
        price: lastPrice,
        change24h: parseFloat(changePercent.toFixed(2)),
        volume24h: parseFloat(ticker.vol24h),
        high24h: parseFloat(ticker.high24h),
        low24h: parseFloat(ticker.low24h),
        bidPrice: parseFloat(ticker.bidPx),
        askPrice: parseFloat(ticker.askPx)
      };
    } catch (error) {
      console.error(`Failed to fetch market details for ${symbol}:`, error);
      throw error;
    }
  }
}

// Create and export default instance
export const marketService = new MarketService();