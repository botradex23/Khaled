import { bybitService } from './bybitService';
import { DEFAULT_PAIRS } from './config';

// Interface for Bybit market ticker
interface BybitTicker {
  symbol: string;        // Symbol name
  lastPrice: string;     // Last traded price
  askPrice: string;      // Best ask price
  bidPrice: string;      // Best bid price
  volume24h: string;     // 24-hour volume in base asset
  turnover24h: string;   // 24-hour turnover in quote asset
  highPrice24h: string;  // 24-hour high price
  lowPrice24h: string;   // 24-hour low price
  prevPrice24h: string;  // 24-hour open price
  price24hPcnt: string;  // 24-hour price change percentage
}

// Interface for processed market data
interface MarketData {
  symbol: string;
  price: number;
  change24h: number;     // Percentage change
  volume24h: number;
  high24h: number;
  low24h: number;
}

// Interface for kline/candlestick data
interface KlineData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class MarketService {
  /**
   * Get market tickers for default or specified trading pairs
   * @param symbols - Array of trading pair symbols (e.g., BTCUSDT, ETHUSDT)
   * @returns Array of processed market data
   */
  async getMarketData(symbols: string[] = DEFAULT_PAIRS): Promise<MarketData[]> {
    try {
      // Get all tickers
      const response = await bybitService.makePublicRequest<{
        list: BybitTicker[];
      }>('/v5/market/tickers', {
        category: 'spot'
      });
      
      const tickers = response.list;
      
      // Filter tickers by requested symbols
      const filteredTickers = symbols.length > 0
        ? tickers.filter((ticker: BybitTicker) => symbols.includes(ticker.symbol))
        : tickers;
      
      // Map Bybit ticker to our MarketData interface
      return filteredTickers.map((ticker: BybitTicker): MarketData => {
        // Parse the percentage change string (e.g. "0.0123" for 1.23%)
        const changePercent = parseFloat(ticker.price24hPcnt) * 100;
        
        return {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(changePercent.toFixed(2)),
          volume24h: parseFloat(ticker.volume24h),
          high24h: parseFloat(ticker.highPrice24h),
          low24h: parseFloat(ticker.lowPrice24h)
        };
      });
    } catch (error) {
      console.error('Error fetching market data from Bybit:', error);
      
      // Return empty array on failure
      return [];
    }
  }

  /**
   * Get candlestick data for a specific trading pair
   * @param symbol - Trading pair symbol (e.g., BTCUSDT)
   * @param interval - Time interval (e.g., '1', '5', '15', '30', '60', '240', 'D', 'W', 'M')
   * @param limit - Maximum number of results to return
   * @returns Array of candlestick data
   */
  async getCandlestickData(symbol: string, interval = '60', limit = 100): Promise<KlineData[]> {
    try {
      // Using any type for response to avoid TypeScript errors
      const response: any = await bybitService.makePublicRequest('/v5/market/kline', {
        category: 'spot',
        symbol,
        interval,
        limit
      });
      
      // Bybit returns kline data in an array format:
      // [timestamp, open, high, low, close, volume, turnover]
      return response.list.map((item: string[]): KlineData => {
        return {
          timestamp: new Date(parseInt(item[0])).toISOString(),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        };
      });
    } catch (error) {
      console.error(`Error fetching candlestick data for ${symbol} from Bybit:`, error);
      
      // Return empty array on failure
      return [];
    }
  }

  /**
   * Get detailed market information for a specific trading pair
   * @param symbol - Trading pair symbol (e.g., BTCUSDT)
   * @returns Detailed market information
   */
  async getMarketDetail(symbol: string): Promise<any> {
    try {
      // Get the ticker information for the specific symbol
      const tickerResponse = await bybitService.makePublicRequest('/v5/market/tickers', {
        category: 'spot',
        symbol
      });
      
      // Get recent trades
      const tradesResponse = await bybitService.makePublicRequest('/v5/market/recent-trade', {
        category: 'spot',
        symbol,
        limit: 50
      });
      
      // Get order book (bid/ask)
      const orderBookResponse = await bybitService.makePublicRequest('/v5/market/orderbook', {
        category: 'spot',
        symbol,
        limit: 50
      });
      
      // Return combined market detail
      return {
        ticker: tickerResponse.list[0],
        trades: tradesResponse.list,
        orderBook: {
          asks: orderBookResponse.a,
          bids: orderBookResponse.b
        }
      };
    } catch (error) {
      console.error(`Error fetching market detail for ${symbol} from Bybit:`, error);
      
      // Return null on failure
      return null;
    }
  }
}

// Export a singleton instance
export const marketService = new MarketService();