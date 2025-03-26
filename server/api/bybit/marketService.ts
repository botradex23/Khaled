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
      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Using demo market data.');
          return this.getDemoMarketData(symbols);
        }
      }

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
      return this.getDemoMarketData(symbols);
    }
  }
  
  /**
   * Get demo market data when API is unavailable
   * @param symbols - Array of trading pair symbols
   * @returns Demo market data
   */
  private getDemoMarketData(symbols: string[] = DEFAULT_PAIRS): MarketData[] {
    // Base prices for common crypto assets (approximate values)
    const basePrices: Record<string, number> = {
      'BTCUSDT': 35000 + (Math.random() * 2000 - 1000), // Random price between 34000-36000
      'ETHUSDT': 2100 + (Math.random() * 100 - 50),     // Random price between 2050-2150
      'SOLUSDT': 80 + (Math.random() * 8 - 4),          // Random price between 76-84
      'DOGEUSDT': 0.07 + (Math.random() * 0.01 - 0.005), // Random price between 0.065-0.075
      'XRPUSDT': 0.48 + (Math.random() * 0.05 - 0.025),  // Random price between 0.455-0.505
      'BNBUSDT': 225 + (Math.random() * 15 - 7.5),      // Random price between 217.5-232.5
      'ADAUSDT': 0.32 + (Math.random() * 0.03 - 0.015), // Random price between 0.305-0.335
      'MATICUSDT': 0.55 + (Math.random() * 0.05 - 0.025), // Random price between 0.525-0.575
      'AVAXUSDT': 22 + (Math.random() * 2 - 1),         // Random price between 21-23
      'DOTUSDT': 4.8 + (Math.random() * 0.5 - 0.25)     // Random price between 4.55-5.05
    };
    
    return symbols.map(symbol => {
      // Default to a random price if symbol not in our price list
      const basePrice = basePrices[symbol] || 10 + (Math.random() * 5);
      const priceChange = (Math.random() * 10) - 5; // -5% to +5% change
      
      // Calculate high and low based on current price and change
      const high = basePrice * (1 + Math.abs(priceChange) / 100 + 0.02);
      const low = basePrice * (1 - Math.abs(priceChange) / 100 - 0.01);
      
      // Random volume between 1000-100000, weighted by price
      const volume = (1000 + Math.random() * 99000) * (basePrice < 1 ? 100 : 1);
      
      return {
        symbol,
        price: parseFloat(basePrice.toFixed(basePrice < 1 ? 6 : 2)),
        change24h: parseFloat(priceChange.toFixed(2)),
        volume24h: parseFloat(volume.toFixed(0)),
        high24h: parseFloat(high.toFixed(basePrice < 1 ? 6 : 2)),
        low24h: parseFloat(low.toFixed(basePrice < 1 ? 6 : 2))
      };
    });
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
      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Using demo candlestick data.');
          return this.getDemoCandlestickData(symbol, interval, limit);
        }
      }

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
      return this.getDemoCandlestickData(symbol, interval, limit);
    }
  }
  
  /**
   * Generate demo candlestick data when API is unavailable
   * @param symbol - Trading pair symbol
   * @param interval - Time interval
   * @param limit - Maximum number of results
   * @returns Demo candlestick data
   */
  private getDemoCandlestickData(symbol: string, interval: string, limit: number): KlineData[] {
    // Get the base price for this symbol
    const basePrices: Record<string, number> = {
      'BTCUSDT': 35000,
      'ETHUSDT': 2100,
      'SOLUSDT': 80,
      'DOGEUSDT': 0.07,
      'XRPUSDT': 0.48,
      'BNBUSDT': 225,
      'ADAUSDT': 0.32,
      'MATICUSDT': 0.55,
      'AVAXUSDT': 22,
      'DOTUSDT': 4.8
    };
    
    const basePrice = basePrices[symbol] || 10;
    const volatility = basePrice * 0.05; // 5% volatility
    
    // Calculate interval in milliseconds
    let intervalMs = 60 * 60 * 1000; // Default to 1 hour
    if (interval === '1') intervalMs = 60 * 1000; // 1 minute
    if (interval === '5') intervalMs = 5 * 60 * 1000; // 5 minutes
    if (interval === '15') intervalMs = 15 * 60 * 1000; // 15 minutes
    if (interval === '30') intervalMs = 30 * 60 * 1000; // 30 minutes
    if (interval === '240') intervalMs = 4 * 60 * 60 * 1000; // 4 hours
    if (interval === 'D') intervalMs = 24 * 60 * 60 * 1000; // 1 day
    if (interval === 'W') intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
    if (interval === 'M') intervalMs = 30 * 24 * 60 * 60 * 1000; // 1 month
    
    // Generate kline data
    const now = Date.now();
    let currentPrice = basePrice;
    const result: KlineData[] = [];
    
    for (let i = 0; i < limit; i++) {
      // Generate a random price movement (-volatility to +volatility)
      const priceChange = (Math.random() * 2 - 1) * volatility;
      
      // Create a trend where price generally moves in one direction
      // but can reverse temporarily
      if (i % 10 === 0) {
        // Every 10 candles, potentially reverse the trend
        currentPrice = basePrice * (0.9 + Math.random() * 0.2); // 90-110% of base price
      } else {
        // Otherwise, apply the random price change
        currentPrice += priceChange;
      }
      
      // Ensure price doesn't go too low
      if (currentPrice < basePrice * 0.5) {
        currentPrice = basePrice * 0.5;
      }
      
      // Generate a candlestick with open, high, low, close
      const timestamp = now - (limit - i) * intervalMs;
      const open = currentPrice;
      const close = currentPrice + (Math.random() * 2 - 1) * (volatility * 0.5);
      const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
      
      // Generate a realistic volume
      const volume = basePrice * 100 + Math.random() * basePrice * 900;
      
      result.push({
        timestamp: new Date(timestamp).toISOString(),
        open: parseFloat(open.toFixed(basePrice < 1 ? 6 : 2)),
        high: parseFloat(high.toFixed(basePrice < 1 ? 6 : 2)),
        low: parseFloat(low.toFixed(basePrice < 1 ? 6 : 2)),
        close: parseFloat(close.toFixed(basePrice < 1 ? 6 : 2)),
        volume: parseFloat(volume.toFixed(0))
      });
    }
    
    return result;
  }

  /**
   * Get detailed market information for a specific trading pair
   * @param symbol - Trading pair symbol (e.g., BTCUSDT)
   * @returns Detailed market information
   */
  /**
   * Process ticker response data
   */
  private processTickerData(data: any): any {
    return data?.result?.list?.[0] || {};
  }
  
  /**
   * Process trades response data
   */
  private processTradesData(data: any): any[] {
    return data?.result?.list || [];
  }
  
  /**
   * Process orderbook response data
   */
  private processOrderbookData(data: any): { asks: any[], bids: any[] } {
    return {
      asks: data?.result?.a || [],
      bids: data?.result?.b || []
    };
  }
  
  async getMarketDetail(symbol: string): Promise<any> {
    try {
      // Check for geo-restrictions first by trying a simple ping request
      try {
        await bybitService.ping();
      } catch (pingError: any) {
        // Check if the error is related to geo-restriction (CloudFront 403)
        if (pingError.response && pingError.response.status === 403 && 
            (pingError.response.data && typeof pingError.response.data === 'string' && 
             pingError.response.data.includes('CloudFront'))) {
          console.log('Detected geo-restriction from Bybit API. Using demo market detail.');
          return this.getDemoMarketDetail(symbol);
        }
      }

      // Get the ticker information for the specific symbol
      const tickerResponse = await bybitService.makePublicRequest<any>('/v5/market/tickers', {
        category: 'spot',
        symbol
      });
      
      // Get recent trades
      const tradesResponse = await bybitService.makePublicRequest<any>('/v5/market/recent-trade', {
        category: 'spot',
        symbol,
        limit: 50
      });
      
      // Get order book (bid/ask)
      const orderBookResponse = await bybitService.makePublicRequest<any>('/v5/market/orderbook', {
        category: 'spot',
        symbol,
        limit: 50
      });
      
      // Return combined market detail using helper methods
      return {
        ticker: this.processTickerData(tickerResponse),
        trades: this.processTradesData(tradesResponse),
        orderBook: this.processOrderbookData(orderBookResponse)
      };
    } catch (error) {
      console.error(`Error fetching market detail for ${symbol} from Bybit:`, error);
      return this.getDemoMarketDetail(symbol);
    }
  }
  
  /**
   * Generate demo market detail when API is unavailable
   * @param symbol - Trading pair symbol
   * @returns Demo market detail
   */
  private getDemoMarketDetail(symbol: string): any {
    // Get base price for this symbol
    const basePrices: Record<string, number> = {
      'BTCUSDT': 35000,
      'ETHUSDT': 2100,
      'SOLUSDT': 80,
      'DOGEUSDT': 0.07,
      'XRPUSDT': 0.48,
      'BNBUSDT': 225,
      'ADAUSDT': 0.32,
      'MATICUSDT': 0.55
    };
    
    const basePrice = basePrices[symbol] || 100;
    
    // Generate ticker data
    const ticker = {
      symbol,
      lastPrice: basePrice.toString(),
      askPrice: (basePrice * 1.001).toString(),
      bidPrice: (basePrice * 0.999).toString(),
      volume24h: (basePrice * 1000).toString(),
      turnover24h: (basePrice * basePrice * 1000).toString(),
      highPrice24h: (basePrice * 1.02).toString(),
      lowPrice24h: (basePrice * 0.98).toString(),
      prevPrice24h: (basePrice * 0.995).toString(),
      price24hPcnt: '0.005' // 0.5% change
    };
    
    // Generate recent trades
    const trades = Array.from({ length: 50 }, (_, i) => {
      const isBuy = Math.random() > 0.5;
      const tradePrice = basePrice * (0.999 + Math.random() * 0.002);
      const tradeSize = 0.01 + Math.random() * 2;
      
      return {
        id: `demo-${Date.now()}-${i}`,
        symbol,
        side: isBuy ? 'Buy' : 'Sell',
        price: tradePrice.toFixed(basePrice < 1 ? 6 : 2),
        size: tradeSize.toFixed(4),
        timestamp: new Date(Date.now() - i * 10000).toISOString(),
        value: (tradePrice * tradeSize).toFixed(2)
      };
    });
    
    // Generate orderbook
    const generateOrders = (side: 'ask' | 'bid', count: number) => {
      const orders = [];
      let currentPrice = side === 'ask' 
        ? basePrice * 1.001 // Start asks slightly above market price
        : basePrice * 0.999; // Start bids slightly below market price
      
      const priceStep = side === 'ask' ? 0.0005 : -0.0005;
      
      for (let i = 0; i < count; i++) {
        const price = currentPrice * (1 + priceStep * i);
        const size = 0.1 + Math.random() * 5;
        
        orders.push({
          price: price.toFixed(basePrice < 1 ? 6 : 2),
          size: size.toFixed(4)
        });
      }
      
      return orders;
    };
    
    const orderBook = {
      asks: generateOrders('ask', 50),
      bids: generateOrders('bid', 50)
    };
    
    return {
      ticker,
      trades,
      orderBook
    };
  }
}

// Export a singleton instance
export const marketService = new MarketService();