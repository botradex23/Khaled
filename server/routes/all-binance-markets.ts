/**
 * All Binance Markets Router - Provides access to the full list of Binance market prices
 */
import { Router, Request, Response } from 'express';
import { binanceMarketService } from '../api/binance/marketPriceService';
import { pythonBinanceBridge } from '../api/binance/python-binance-bridge';
import { log } from '../vite';

const router = Router();

/**
 * GET /api/binance/all-markets
 * Returns all available market pairs from Binance
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    log('Fetching all Binance market pairs', 'api');
    
    // Use the Python bridge to get all prices from Binance
    const allPrices = await pythonBinanceBridge.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      // Fallback to the original TypeScript implementation
      const fallbackPrices = await binanceMarketService.getAllPrices();
      
      if (!fallbackPrices || fallbackPrices.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No price data available from Binance'
        });
      }
      
      log('Using fallback TypeScript implementation for Binance markets', 'api');
      
      // Process the prices with the original method
      const processedFallbackPrices = processMarketData(fallbackPrices);
      
      return res.json({
        success: true,
        source: 'binance-fallback',
        timestamp: new Date().toISOString(),
        count: processedFallbackPrices.length,
        data: processedFallbackPrices
      });
    }
    
    // Process the prices to add additional data
    const processedPrices = processMarketData(allPrices);
    
    // Return all processed prices
    res.json({
      success: true,
      source: 'binance-python',
      timestamp: new Date().toISOString(),
      count: processedPrices.length,
      data: processedPrices
    });
  } catch (error: any) {
    log(`Error fetching all Binance markets: ${error.message}`, 'api');
    
    // Try fallback to original TypeScript implementation
    try {
      log('Attempting fallback to TypeScript implementation', 'api');
      const fallbackPrices = await binanceMarketService.getAllPrices();
      
      if (fallbackPrices && fallbackPrices.length > 0) {
        // Process the prices with the original method
        const processedFallbackPrices = processMarketData(fallbackPrices);
        
        return res.json({
          success: true,
          source: 'binance-fallback',
          timestamp: new Date().toISOString(),
          count: processedFallbackPrices.length,
          data: processedFallbackPrices
        });
      }
    } catch (fallbackError) {
      log(`Fallback also failed: ${fallbackError}`, 'api');
    }
    
    // Check for geo-restriction error (specific error message from the service)
    if (error.message.includes('restricted in your region')) {
      return res.status(403).json({
        success: false,
        error: 'geo_restricted',
        message: 'Binance API access is not available in your region',
        details: error.message
      });
    }
    
    // Other API errors
    res.status(500).json({
      success: false,
      error: 'api_error',
      message: `Error fetching Binance markets data`,
      details: error.message
    });
  }
});

/**
 * Process raw market data into a standardized format
 */
function processMarketData(prices: any[]) {
  return prices.map(ticker => {
    // Extract base and quote from symbol (e.g., BTCUSDT -> BTC and USDT)
    let baseSymbol = ticker.symbol;
    let quoteSymbol = '';
    
    // Check for common quote currencies
    const quotes = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];
    for (const quote of quotes) {
      if (ticker.symbol.endsWith(quote)) {
        baseSymbol = ticker.symbol.slice(0, -quote.length);
        quoteSymbol = quote;
        break;
      }
    }
    
    // Handle price which might be string or number
    const priceValue = typeof ticker.price === 'string' ? parseFloat(ticker.price) : ticker.price;
    
    return {
      symbol: ticker.symbol,
      baseSymbol,
      quoteSymbol,
      price: priceValue,
      formattedPrice: formatPrice(priceValue),
      source: 'binance'
    };
  });
}

/**
 * Format price to appropriate precision based on value
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toFixed(2);
  } else if (price >= 1) {
    return price.toFixed(4);
  } else if (price >= 0.0001) {
    return price.toFixed(6);
  } else {
    return price.toFixed(8);
  }
}

export default router;