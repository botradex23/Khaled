import { bitgetService } from './bitgetService';
import { DEFAULT_PAIRS, ALWAYS_USE_DEMO } from './config';

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
    console.log(`Getting market data for symbols: ${symbols.join(', ')}`);
    
    try {
      // If ALWAYS_USE_DEMO is true, directly return demo data
      if (ALWAYS_USE_DEMO) {
        console.log('ALWAYS_USE_DEMO flag is enabled. Using demo market data.');
        return this.getDemoMarketData(symbols);
      }
      
      // Get all tickers from Bitget
      console.log('Fetching all tickers from Bitget...');
      const tickersResponse = await bitgetService.getAllTickers();
      console.log('Tickers response type:', typeof tickersResponse);
      console.log('Is array:', Array.isArray(tickersResponse));
      console.log('Response length:', Array.isArray(tickersResponse) ? tickersResponse.length : 'N/A');
      
      // Make sure we have an array of tickers
      const tickers = Array.isArray(tickersResponse) ? tickersResponse : [];
      
      // Filter tickers by requested symbols
      const filteredTickers = symbols.length > 0
        ? tickers.filter((ticker: any) => {
            return symbols.some(symbol => {
              // Try to match symbols which may have different formats
              return ticker.symbol === symbol || 
                    ticker.symbol.replace(/-/g, '') === symbol ||
                    ticker.symbol.replace(/_/g, '') === symbol;
            });
          })
        : tickers;
      
      // Log our matching results for debugging
      console.log(`All tickers count: ${Array.isArray(tickers) ? tickers.length : 0}`);
      console.log(`Matched tickers count: ${filteredTickers.length}`);
      console.log(`Requested symbols: ${symbols.join(', ')}`);
      console.log(`First few matches: ${filteredTickers.slice(0, 3).map((t: any) => t.symbol).join(', ')}`);
      
      // Map Bitget ticker to our MarketData interface
      return filteredTickers.map((ticker: any): MarketData => {
        // Use the change value directly from API response
        // Bitget provides change as decimal (e.g., 0.0189 for 1.89%)
        // Need to convert it to percentage
        const changePercent = ticker.change ? parseFloat(ticker.change) * 100 : 0;
        
        return {
          symbol: ticker.symbol,
          price: parseFloat(ticker.close),
          change24h: changePercent,
          volume24h: ticker.usdtVol ? parseFloat(ticker.usdtVol) : (
            ticker.quoteVol ? parseFloat(ticker.quoteVol) : (
              ticker.baseVol ? parseFloat(ticker.baseVol) : 0
            )
          ),
          high24h: parseFloat(ticker.high24h),
          low24h: parseFloat(ticker.low24h)
        };
      });
    } catch (error) {
      console.error('Error fetching market data from Bitget:', error);
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
   * @param interval - Time interval (e.g., '1min', '5min', '15min', '30min', '1h', '4h', '12h', '1day', '1week')
   * @param limit - Maximum number of results to return
   * @returns Array of candlestick data
   */
  async getCandlestickData(symbol: string, interval = '1h', limit = 100): Promise<KlineData[]> {
    try {
      // If ALWAYS_USE_DEMO is true, directly return demo data
      if (ALWAYS_USE_DEMO) {
        console.log('ALWAYS_USE_DEMO flag is enabled. Using demo candlestick data.');
        return this.getDemoCandlestickData(symbol, interval, limit);
      }
      
      // Map interval to Bitget's expected format if needed
      const mappedInterval = this.mapIntervalToBitget(interval);
      
      // Get candlestick data from Bitget
      const klineData = await bitgetService.getKlineData(symbol, mappedInterval, limit);
      
      // Bitget's kline data has format: [timestamp, open, high, low, close, volume]
      return klineData.map((item: any[]): KlineData => {
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
      console.error(`Error fetching candlestick data for ${symbol} from Bitget:`, error);
      return this.getDemoCandlestickData(symbol, interval, limit);
    }
  }
  
  /**
   * Map interval string to Bitget's expected format
   * @param interval - Our internal interval format
   * @returns Bitget's interval format
   */
  private mapIntervalToBitget(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '1h',
      '4h': '4h',
      '12h': '12h',
      '1d': '1day',
      '1w': '1week'
    };
    
    return mapping[interval] || '1h'; // Default to 1h if not found
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
    if (interval === '1m' || interval === '1min') intervalMs = 60 * 1000; // 1 minute
    if (interval === '5m' || interval === '5min') intervalMs = 5 * 60 * 1000; // 5 minutes
    if (interval === '15m' || interval === '15min') intervalMs = 15 * 60 * 1000; // 15 minutes
    if (interval === '30m' || interval === '30min') intervalMs = 30 * 60 * 1000; // 30 minutes
    if (interval === '4h') intervalMs = 4 * 60 * 60 * 1000; // 4 hours
    if (interval === '1d' || interval === '1day') intervalMs = 24 * 60 * 60 * 1000; // 1 day
    if (interval === '1w' || interval === '1week') intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
    
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
   * @returns Detailed market information including ticker, order book, and recent trades
   */
  async getMarketDetail(symbol: string): Promise<any> {
    try {
      // If ALWAYS_USE_DEMO is true, directly return demo data
      if (ALWAYS_USE_DEMO) {
        console.log('ALWAYS_USE_DEMO flag is enabled. Using demo market detail.');
        return this.getDemoMarketDetail(symbol);
      }
      
      // Get the ticker information for the specific symbol
      const ticker = await bitgetService.getTicker(symbol);
      
      // Get order book data - would need to implement this endpoint in bitgetService
      // const orderBook = await bitgetService.getOrderBook(symbol);
      
      // Get recent trades - would need to implement this endpoint in bitgetService
      // const trades = await bitgetService.getRecentTrades(symbol);
      
      // For now, we'll use demo data for orderBook and trades
      // since we haven't implemented those endpoints yet
      const demoData = this.getDemoMarketDetail(symbol);
      
      // Return combined market detail
      return {
        ticker,
        trades: demoData.trades,
        orderBook: demoData.orderBook
      };
    } catch (error) {
      console.error(`Error fetching market detail for ${symbol} from Bitget:`, error);
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
      close: basePrice.toString(),
      high24h: (basePrice * 1.02).toString(),
      low24h: (basePrice * 0.98).toString(),
      open: (basePrice * 0.995).toString(),
      baseVolume: (basePrice * 1000).toString(),
      quoteVolume: (basePrice * basePrice * 1000).toString(),
      usdtVolume: (basePrice * 1000).toString(),
      timestamp: Date.now()
    };
    
    // Generate recent trades
    const trades = Array.from({ length: 50 }, (_, i) => {
      const isBuy = Math.random() > 0.5;
      const tradePrice = basePrice * (0.999 + Math.random() * 0.002);
      const tradeSize = 0.01 + Math.random() * 2;
      
      return {
        id: `demo-${Date.now()}-${i}`,
        symbol,
        side: isBuy ? 'buy' : 'sell',
        price: tradePrice.toFixed(basePrice < 1 ? 6 : 2),
        quantity: tradeSize.toFixed(4),
        timestamp: new Date(Date.now() - i * 10000).toISOString(),
        total: (tradePrice * tradeSize).toFixed(2)
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