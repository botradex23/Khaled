import { Router, Request, Response } from 'express';
import { binanceMarketService, BinanceTickerPrice } from '../api/binance/marketPriceService';

const router = Router();

/**
 * Get all market prices from Binance
 * @route GET /api/binance/market-prices
 */
router.get('/market-prices', async (req: Request, res: Response) => {
  try {
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from Binance'
      });
    }
    
    res.json({
      success: true,
      source: 'binance',
      timestamp: new Date().toISOString(),
      count: allPrices.length,
      data: allPrices
    });
  } catch (error: any) {
    console.error('Error in /api/binance/market-prices:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching market prices: ${error.message}`
    });
  }
});

/**
 * Get formatted market data for market overview page
 * @route GET /api/binance/markets
 */
router.get('/markets', async (req: Request, res: Response) => {
  try {
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from Binance'
      });
    }
    
    // Get 24-hour data for the important symbols
    const importantSymbols = getBinanceImportantSymbols();
    const responses = await Promise.allSettled(
      importantSymbols.map(symbol => binanceMarketService.get24hrStats(symbol))
    );
    
    const tickerData: any = {};
    responses.forEach((response, index) => {
      if (response.status === 'fulfilled' && response.value) {
        const data = response.value as any;
        tickerData[data.symbol] = data;
      }
    });
    
    // Format the data for the market view
    const formattedData = allPrices
      .filter(ticker => importantSymbols.includes(ticker.symbol))
      .map(ticker => {
        const stats = tickerData[ticker.symbol] || {};
        return {
          symbol: ticker.symbol,
          formattedSymbol: formatSymbolForDisplay(ticker.symbol),
          price: parseFloat(ticker.price),
          priceChangePercent: stats.priceChangePercent 
            ? parseFloat(stats.priceChangePercent) 
            : 0,
          volume: stats.volume 
            ? parseFloat(stats.volume) 
            : 0,
          high24h: stats.highPrice 
            ? parseFloat(stats.highPrice) 
            : parseFloat(ticker.price),
          low24h: stats.lowPrice 
            ? parseFloat(stats.lowPrice) 
            : parseFloat(ticker.price),
          source: 'binance',
          timestamp: new Date().toISOString()
        };
      })
      .sort((a, b) => b.volume - a.volume); // Sort by volume descending
    
    res.json({
      success: true,
      source: 'binance',
      timestamp: new Date().toISOString(),
      count: formattedData.length,
      data: formattedData
    });
  } catch (error: any) {
    console.error('Error in /api/binance/markets:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching market data: ${error.message}`
    });
  }
});

/**
 * Get the total market overview with stats
 * @route GET /api/binance/market-overview
 */
router.get('/market-overview', async (req: Request, res: Response) => {
  try {
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from Binance'
      });
    }
    
    // Get Bitcoin price for reference
    const btcTicker = allPrices.find(t => t.symbol === 'BTCUSDT');
    const btcPrice = btcTicker ? parseFloat(btcTicker.price) : 0;
    
    // Calculate total market stats
    // Note: This is just an estimation based on top coins
    const totalMarketCap = btcPrice * 21000000; // Simplified calculation
    
    // Get top 10 coins by market cap (dummy logic for now)
    const topCoins = getTopCoinsByMarketCap(allPrices);
    
    res.json({
      success: true,
      source: 'binance',
      timestamp: new Date().toISOString(),
      overview: {
        totalMarketCap: totalMarketCap.toFixed(2),
        totalCoins: allPrices.length,
        btcDominance: '42.31%', // Placeholder
        ethDominance: '19.54%', // Placeholder
        topGainer: topCoins.length > 0 ? topCoins[0].symbol : 'N/A',
        topLoser: 'N/A'
      },
      topCoins
    });
  } catch (error: any) {
    console.error('Error in /api/binance/market-overview:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching market overview: ${error.message}`
    });
  }
});

/**
 * Get price for a specific symbol
 * @route GET /api/binance/price/:symbol
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    // Format the symbol properly for Binance (remove dashes if present)
    const formattedSymbol = symbol.replace('-', '').toUpperCase();
    
    const tickerPrice = await binanceMarketService.getSymbolPrice(formattedSymbol);
    
    if (!tickerPrice) {
      return res.status(404).json({
        success: false,
        message: `No price data available for ${symbol}`
      });
    }
    
    res.json({
      success: true,
      source: 'binance',
      symbol: tickerPrice.symbol,
      formattedSymbol: formatSymbolForDisplay(tickerPrice.symbol),
      price: parseFloat(tickerPrice.price),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`Error in /api/binance/price/${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      message: `Error fetching price: ${error.message}`
    });
  }
});

// Helper functions

function formatSymbolForDisplay(symbol: string): { base: string, quote: string } {
  // Common quote assets
  const quoteAssets = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'BNB'];
  
  let base = symbol;
  let quote = '';
  
  for (const quoteAsset of quoteAssets) {
    if (symbol.endsWith(quoteAsset)) {
      base = symbol.substring(0, symbol.length - quoteAsset.length);
      quote = quoteAsset;
      break;
    }
  }
  
  return { base, quote };
}

function getBinanceImportantSymbols(): string[] {
  return [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT',
    'AVAXUSDT', 'UNIUSDT', 'SHIBUSDT', 'LTCUSDT', 'ATOMUSDT',
    'NEARUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT', 'XLMUSDT'
  ];
}

function getTopCoinsByMarketCap(prices: BinanceTickerPrice[]): any[] {
  // Market cap data would require additional API calls
  // For now we'll use a simplified approach based on major coins
  const topSymbols = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', shortName: 'BTC' },
    { symbol: 'ETHUSDT', name: 'Ethereum', shortName: 'ETH' },
    { symbol: 'BNBUSDT', name: 'Binance Coin', shortName: 'BNB' },
    { symbol: 'SOLUSDT', name: 'Solana', shortName: 'SOL' },
    { symbol: 'XRPUSDT', name: 'XRP', shortName: 'XRP' },
    { symbol: 'ADAUSDT', name: 'Cardano', shortName: 'ADA' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', shortName: 'DOGE' },
    { symbol: 'MATICUSDT', name: 'Polygon', shortName: 'MATIC' },
    { symbol: 'DOTUSDT', name: 'Polkadot', shortName: 'DOT' },
    { symbol: 'AVAXUSDT', name: 'Avalanche', shortName: 'AVAX' }
  ];
  
  return topSymbols
    .map(coin => {
      const price = prices.find(p => p.symbol === coin.symbol);
      if (!price) return null;
      
      return {
        symbol: coin.symbol,
        name: coin.name,
        shortName: coin.shortName,
        price: parseFloat(price.price),
        priceChangePercent: 0 // We'd need 24h data for this
      };
    })
    .filter(Boolean);
}

export default router;