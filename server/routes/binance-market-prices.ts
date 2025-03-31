import { Router, Request, Response } from 'express';
import { binanceMarketService, BinanceTickerPrice } from '../api/binance/marketPriceService';
import { okxService } from '../api/okx/okxService';

const router = Router();

/**
 * Get all market prices from OKX (primary) or Binance (fallback)
 * @route GET /api/binance/market-prices
 */
router.get('/market-prices', async (req: Request, res: Response) => {
  try {
    // Try OKX first since it's more reliable in all regions
    try {
      const okxTickersResponse = await okxService.getMarketTickers();
      
      if (okxTickersResponse && okxTickersResponse.code === '0' && okxTickersResponse.data && okxTickersResponse.data.length > 0) {
        // Format OKX data to match Binance format for compatibility
        const formattedOkxPrices = okxTickersResponse.data.map((ticker: any) => ({
          symbol: ticker.instId.replace('-', ''), // Convert BTC-USDT to BTCUSDT
          price: ticker.last,
          source: 'okx'
        }));
        
        return res.json({
          success: true,
          source: 'okx',
          timestamp: new Date().toISOString(),
          count: formattedOkxPrices.length,
          data: formattedOkxPrices
        });
      }
    } catch (okxError: any) {
      console.log('OKX API error, trying Binance as fallback:', okxError?.message || 'Unknown error');
    }
    
    // Fallback to Binance if OKX fails
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from market providers'
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
    
    // Check for geo-restriction error (specific error message from Binance service)
    if (error.message.includes('restricted in your region')) {
      return res.status(403).json({
        success: false,
        error: 'geo_restricted',
        message: 'Market data is not available in your region',
        details: error.message
      });
    }
    
    // Other API errors
    res.status(500).json({
      success: false,
      error: 'api_error',
      message: 'Unable to fetch market price data',
      details: error.message
    });
  }
});

/**
 * Get formatted market data for market overview page
 * @route GET /api/binance/markets
 */
router.get('/markets', async (req: Request, res: Response) => {
  try {
    // Get important symbols for filtering
    const importantSymbols = getBinanceImportantSymbols();
    
    // Try OKX first since it's more reliable in all regions
    try {
      const okxTickersResponse = await okxService.getMarketTickers();
      
      if (okxTickersResponse && okxTickersResponse.code === '0' && okxTickersResponse.data && okxTickersResponse.data.length > 0) {
        // Convert symbols from OKX format to Binance format for compatibility
        // OKX uses BTC-USDT format while Binance uses BTCUSDT
        const formattedOkxData = okxTickersResponse.data
          .filter((ticker: any) => {
            // Convert from OKX format (BTC-USDT) to Binance format (BTCUSDT) for filtering
            const binanceFormatSymbol = ticker.instId.replace('-', '');
            return importantSymbols.includes(binanceFormatSymbol);
          })
          .map((ticker: any) => {
            const binanceFormatSymbol = ticker.instId.replace('-', '');
            // Calculate price change - OKX might use different field names
            let priceChangePercent = 0;
            if ('chg24h' in ticker) {
              priceChangePercent = parseFloat((ticker as any).chg24h || '0');
            } else if (ticker.open24h && ticker.last) {
              // Calculate manually if needed
              const openPrice = parseFloat(ticker.open24h);
              const currentPrice = parseFloat(ticker.last);
              if (openPrice > 0) {
                priceChangePercent = ((currentPrice - openPrice) / openPrice) * 100;
              }
            }
            
            return {
              symbol: binanceFormatSymbol,
              formattedSymbol: formatSymbolForDisplay(binanceFormatSymbol),
              price: parseFloat(ticker.last),
              priceChangePercent: priceChangePercent,
              volume: parseFloat(ticker.vol24h || '0'),
              high24h: parseFloat(ticker.high24h || ticker.last),
              low24h: parseFloat(ticker.low24h || ticker.last),
              source: 'okx',
              timestamp: new Date().toISOString()
            };
          })
          .sort((a: any, b: any) => b.volume - a.volume);
          
        return res.json({
          success: true,
          source: 'okx',
          timestamp: new Date().toISOString(),
          count: formattedOkxData.length,
          data: formattedOkxData
        });
      }
    } catch (okxError: any) {
      console.log('OKX API error, trying Binance as fallback:', okxError?.message || 'Unknown error');
    }
    
    // Fallback to Binance if OKX fails
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from market providers'
      });
    }
    
    // Get 24-hour data for the important symbols
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
    
    // Check for geo-restriction error
    if (error.message.includes('restricted in your region')) {
      return res.status(403).json({
        success: false,
        error: 'geo_restricted',
        message: 'Market data is not available in your region',
        details: error.message
      });
    }
    
    // Other API errors
    res.status(500).json({
      success: false,
      error: 'api_error',
      message: 'Unable to fetch market data',
      details: error.message
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
    
    // Check for geo-restriction error
    if (error.message.includes('restricted in your region')) {
      return res.status(403).json({
        success: false,
        error: 'geo_restricted',
        message: 'Market overview data is not available in your region',
        details: error.message
      });
    }
    
    // Other API errors
    res.status(500).json({
      success: false,
      error: 'api_error',
      message: 'Unable to fetch market overview data',
      details: error.message
    });
  }
});

/**
 * Get price for a specific symbol
 * @route GET /api/binance/price/:symbol
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  // Format the symbol properly for Binance (remove dashes if present)
  const formattedSymbol = symbol.replace('-', '').toUpperCase();
  
  console.log(`Processing price request for ${formattedSymbol}`);
  
  // Try WebSocket cache first (fastest and most reliable)
  const livePrices = binanceMarketService.getAllLatestPrices();
  console.log(`Found ${livePrices.length} live prices in cache`);
  
  const livePrice = livePrices.find(p => p.symbol === formattedSymbol);
  if (livePrice) {
    console.log(`Found live WebSocket price for ${formattedSymbol}: ${livePrice.price}`);
    return res.json({
      success: true,
      source: 'binance-websocket',
      symbol: formattedSymbol,
      formattedSymbol: formatSymbolForDisplay(formattedSymbol),
      price: livePrice.price,
      timestamp: new Date(livePrice.timestamp).toISOString()
    });
  } else {
    console.log(`No WebSocket price found for ${formattedSymbol}, checking Binance API`);
  }
  
  // Try OKX fallback if WebSocket isn't available
  try {
    // Convert from Binance format to OKX format (e.g., BTCUSDT -> BTC-USDT)
    const okxSymbol = formattedSymbol.endsWith('USDT') 
      ? `${formattedSymbol.slice(0, -4)}-USDT`
      : formattedSymbol.endsWith('USDC')
        ? `${formattedSymbol.slice(0, -4)}-USDC`
        : formattedSymbol; // Fallback
    
    console.log(`Trying OKX API for ${formattedSymbol} (${okxSymbol})`);
    const okxTicker = await okxService.getTicker(okxSymbol);
    
    // Check if API returns an error code (symbol not found)
    if (okxTicker.code !== '0') {
      console.log(`OKX API error for ${okxSymbol}: ${okxTicker.msg || 'Unknown error'}`);
      return res.status(404).json({
        success: false,
        error: 'symbol_not_found',
        message: `Symbol ${symbol} not found on any exchange`,
        details: okxTicker.msg || 'Unknown error'
      });
    }
    
    if (okxTicker && okxTicker.data && okxTicker.data[0]) {
      const ticker = okxTicker.data[0];
      console.log(`Successfully got price from OKX for ${okxSymbol}: ${ticker.last}`);
      return res.json({
        success: true,
        source: 'okx',
        symbol: formattedSymbol,
        formattedSymbol: formatSymbolForDisplay(formattedSymbol),
        price: parseFloat(ticker.last),
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`No price data from OKX for ${okxSymbol}`);
    }
  } catch (okxError: any) {
    console.log(`OKX API error for ${formattedSymbol}:`, okxError?.message || 'Unknown error');
  }
  
  // Try Binance API as a last resort
  try {
    console.log(`Trying Binance API for ${formattedSymbol}`);
    const tickerPrice = await binanceMarketService.getSymbolPrice(formattedSymbol);
    
    if (tickerPrice) {
      console.log(`Successfully got price from Binance API for ${formattedSymbol}: ${tickerPrice.price}`);
      return res.json({
        success: true,
        source: 'binance',
        symbol: tickerPrice.symbol,
        formattedSymbol: formatSymbolForDisplay(tickerPrice.symbol),
        price: parseFloat(tickerPrice.price),
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`No price data from Binance for ${formattedSymbol}`);
    }
  } catch (binanceError: any) {
    console.log(`Binance API error for ${formattedSymbol}:`, binanceError.message || 'Unknown error');
    
    // If we get here, neither WebSocket, OKX, nor Binance worked
    if (binanceError.isGeoRestricted) {
      return res.status(403).json({
        success: false,
        error: 'geo_restricted',
        message: `Price data for ${symbol} is not available in your region`,
        details: binanceError.message
      });
    }
  }
  
  // If all sources failed
  return res.status(404).json({
    success: false,
    error: 'data_unavailable',
    message: `Price data for ${symbol} is not available from any provider`,
    details: 'Could not retrieve price from WebSocket, Binance API, or OKX API'
  });
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