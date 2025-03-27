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
   * This function has been expanded to handle a wider range of coins
   */
  async getMarketData(symbols: string[] = DEFAULT_PAIRS): Promise<MarketData[]> {
    try {
      // Get all tickers to avoid multiple API calls (getting ALL spot market data)
      const response = await okxService.makePublicRequest<OkxResponse<MarketTicker>>('/api/v5/market/tickers?instType=SPOT');
      
      if (response.code !== '0') {
        throw new Error(`Failed to fetch market data: ${response.msg}`);
      }
      
      // Filter and format response data
      const marketData: MarketData[] = [];
      
      // First, check if we need all USDT pairs (for asset valuation)
      const needAllUsdtPairs = symbols.some(s => s === 'ALL_USDT_PAIRS');
      
      // Important debugging for market data
      console.log(`Received ${response.data.length} market tickers from OKX API`);
      console.log('Sample ticker data:', response.data[0]);
      
      for (const ticker of response.data) {
        // Extract currency from trading pair (e.g., "BTC-USDT" => "BTC")
        const [baseCurrency, quoteCurrency] = ticker.instId.split('-');
        
        // For asset valuation, we want all pairs ending with USDT
        const isTradingPair = symbols.includes(ticker.instId);
        const isUsdtPair = quoteCurrency === 'USDT';
        
        // Include the ticker if it's either explicitly requested or we need all USDT pairs
        if (isTradingPair || (needAllUsdtPairs && isUsdtPair)) {
          // Calculate price change percentage
          const lastPrice = parseFloat(ticker.last);
          const openPrice = parseFloat(ticker.sodUtc0);
          const changePercent = openPrice > 0 
            ? ((lastPrice - openPrice) / openPrice) * 100 
            : 0;
          
          // Validate price before adding (ensure it's a valid number and reasonable)
          if (!isNaN(lastPrice) && lastPrice > 0) {
            // Log major cryptocurrency prices for debugging
            if (['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XRP-USDT', 'BNB-USDT'].includes(ticker.instId)) {
              console.log(`Market price for ${ticker.instId}: $${lastPrice}`);
            }
            
            marketData.push({
              symbol: ticker.instId,
              price: lastPrice,
              change24h: parseFloat(changePercent.toFixed(2)),
              volume24h: parseFloat(ticker.vol24h),
              high24h: parseFloat(ticker.high24h),
              low24h: parseFloat(ticker.low24h)
            });
          } else {
            console.warn(`Invalid price for ${ticker.instId}: ${ticker.last}`);
          }
        }
      }
      
      if (marketData.length === 0) {
        console.warn(`No market data found for requested symbols: ${symbols.join(', ')}`);
      } else {
        console.log(`Retrieved market data for ${marketData.length} symbols`);
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
      const response = await okxService.getKlineData(symbol, interval, limit);
      
      if (response.code !== '0') {
        throw new Error(`Failed to fetch candlestick data: ${response.msg}`);
      }
      
      // Process and format candlestick data
      // OKX returns an array of arrays: [[timestamp, open, high, low, close, vol, volCcy], [...], ...]
      return response.data.map((candle: any) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
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
      console.log(`[API DEBUG] Getting market detail for ${symbol}`);
      const response = await okxService.makePublicRequest<OkxResponse<MarketTicker>>(`/api/v5/market/ticker?instId=${symbol}`);
      
      console.log(`[API DEBUG] Response received:`, JSON.stringify(response, null, 2));
      
      if (response.code !== '0' || !response.data[0]) {
        console.error(`[API ERROR] Failed API response:`, response);
        throw new Error(`Failed to fetch market detail: ${response.msg}`);
      }
      
      const ticker = response.data[0];
      console.log(`[API DEBUG] Ticker data:`, JSON.stringify(ticker, null, 2));
      
      const lastPrice = parseFloat(ticker.last);
      const openPrice = parseFloat(ticker.sodUtc0);
      const changePercent = openPrice > 0 
        ? ((lastPrice - openPrice) / openPrice) * 100 
        : 0;
      
      const result = {
        symbol: ticker.instId,
        price: lastPrice,
        change24h: parseFloat(changePercent.toFixed(2)),
        volume24h: parseFloat(ticker.vol24h),
        high24h: parseFloat(ticker.high24h),
        low24h: parseFloat(ticker.low24h),
        bidPrice: parseFloat(ticker.bidPx),
        askPrice: parseFloat(ticker.askPx)
      };
      
      console.log(`[API DEBUG] Formatted market detail:`, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch market details for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the current price for a specific trading pair
   * @param symbol - The trading pair symbol (e.g., BTC-USDT)
   * @returns The current price as a number, or 0 if not found
   */
  async getMarketPrice(symbol: string): Promise<number> {
    try {
      console.log(`Fetching current price for ${symbol}...`);
      const response = await okxService.makePublicRequest<OkxResponse<MarketTicker>>(`/api/v5/market/ticker?instId=${symbol}`);
      
      if (response.code !== '0' || !response.data[0]) {
        console.warn(`Failed to fetch price for ${symbol}: ${response.msg}`);
        return 0;
      }
      
      const ticker = response.data[0];
      const price = parseFloat(ticker.last);
      console.log(`Current price for ${symbol}: ${price}`);
      return price;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      return 0;
    }
  }
}

// Create and export default instance
export const marketService = new MarketService();