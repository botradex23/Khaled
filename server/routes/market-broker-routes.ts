/**
 * Market Broker Routes
 * 
 * These routes use the MultiBrokerService to fetch market data from multiple brokers
 * with automatic fallback between them.
 * The primary strategy is to use Binance as the first choice, then OKX as fallback
 * when Binance is unavailable due to geo-restrictions or API issues.
 */

import { Router, Request, Response } from 'express';
import { MultiBrokerService } from '../api/brokers/multiBrokerService';
import { BrokerType } from '../api/brokers/interfaces';

// Create a multi-broker service singleton
const multiBrokerService = new MultiBrokerService([BrokerType.BINANCE, BrokerType.OKX]);

const router = Router();

/**
 * Get all ticker prices from all available brokers
 * @route GET /api/market-broker/tickers
 */
router.get('/tickers', async (req: Request, res: Response) => {
  try {
    // Use multi-broker service to get prices from any available broker
    const allPrices = await multiBrokerService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from any broker'
      });
    }
    
    res.json({
      success: true,
      source: multiBrokerService.getName(),
      timestamp: new Date().toISOString(),
      count: allPrices.length,
      data: allPrices
    });
  } catch (error: any) {
    console.error('Error in /api/market-broker/tickers:', error);
    
    res.status(500).json({
      success: false,
      error: 'api_error',
      message: 'Unable to fetch market price data from any broker',
      details: error.message
    });
  }
});

/**
 * Get 24hr ticker information for all symbols from all available brokers
 * @route GET /api/market-broker/24hr
 */
router.get('/24hr', async (req: Request, res: Response) => {
  try {
    // Check if a specific symbol was requested
    const { symbol } = req.params;
    
    if (symbol) {
      // Get 24hr ticker for a specific symbol
      const ticker = await multiBrokerService.get24hrTicker(symbol);
      
      if (!ticker) {
        return res.status(404).json({
          success: false,
          message: `24hr ticker data for ${symbol} not found from any broker`
        });
      }
      
      return res.json({
        success: true,
        source: multiBrokerService.getName(),
        timestamp: new Date().toISOString(),
        data: ticker
      });
    } else {
      // Get important symbols for filtering
      const importantSymbols = getImportantSymbols();
      
      // Get 24-hour data for the important symbols
      const responses = await Promise.allSettled(
        importantSymbols.map(symbol => multiBrokerService.get24hrTicker(symbol))
      );
      
      const data24hr = responses
        .filter(response => response.status === 'fulfilled' && response.value)
        .map(response => (response as PromiseFulfilledResult<any>).value);
      
      if (data24hr.length === 0) {
        return res.status(404).json({
          success: false,
          message: '24hr ticker data not found from any broker'
        });
      }
      
      return res.json({
        success: true,
        source: multiBrokerService.getName(),
        timestamp: new Date().toISOString(),
        count: data24hr.length,
        data: data24hr
      });
    }
  } catch (error: any) {
    console.error('Error in /api/market-broker/24hr:', error);
    
    res.status(500).json({
      success: false,
      error: 'api_error',
      message: 'Unable to fetch 24hr market data from any broker',
      details: error.message
    });
  }
});

/**
 * Get formatted market data for market overview page
 * @route GET /api/market-broker/markets
 */
router.get('/markets', async (req: Request, res: Response) => {
  try {
    // Get important symbols for filtering
    const importantSymbols = getImportantSymbols();
    
    // Use multi-broker service to get prices from any available broker
    const allPrices = await multiBrokerService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from any broker'
      });
    }
    
    // Get 24-hour data for the important symbols
    const responses = await Promise.allSettled(
      importantSymbols.map(symbol => multiBrokerService.get24hrTicker(symbol))
    );
    
    const tickerData: any = {};
    responses.forEach((response) => {
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
          source: multiBrokerService.getName(),
          timestamp: new Date().toISOString()
        };
      })
      .sort((a, b) => b.volume - a.volume); // Sort by volume descending
    
    res.json({
      success: true,
      source: multiBrokerService.getName(),
      timestamp: new Date().toISOString(),
      count: formattedData.length,
      data: formattedData
    });
  } catch (error: any) {
    console.error('Error in /api/market-broker/markets:', error);
    
    res.status(500).json({
      success: false,
      error: 'api_error',
      message: 'Unable to fetch market data from any broker',
      details: error.message
    });
  }
});

/**
 * Get price for a specific symbol from any available broker
 * @route GET /api/market-broker/price/:symbol
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  // Format the symbol properly (remove dashes if present)
  const formattedSymbol = symbol.replace('-', '').toUpperCase();
  
  console.log(`Processing price request for ${formattedSymbol} using multi-broker service`);
  
  try {
    console.log(`Trying brokers for ${formattedSymbol}`);
    const tickerPrice = await multiBrokerService.getSymbolPrice(formattedSymbol);
    
    if (tickerPrice) {
      console.log(`Successfully got price from ${multiBrokerService.getName()} for ${formattedSymbol}: ${tickerPrice.price}`);
      return res.json({
        success: true,
        source: multiBrokerService.getName(),
        symbol: tickerPrice.symbol,
        formattedSymbol: formatSymbolForDisplay(formattedSymbol),
        price: parseFloat(tickerPrice.price),
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`No price data from any broker for ${formattedSymbol}`);
    }
  } catch (error: any) {
    console.log(`All brokers failed for ${formattedSymbol}:`, error.message || 'Unknown error');
  }
  
  // If all sources failed
  return res.status(404).json({
    success: false,
    error: 'data_unavailable',
    message: `Price data for ${symbol} is not available from any broker`,
    details: 'Could not retrieve price from any broker'
  });
});

/**
 * Test endpoint to verify multi-broker integration is working
 * @route GET /api/market-broker/test
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Get broker status
    const status = await multiBrokerService.getApiStatus();
    
    // Try to get some simple data
    const btcPrice = await multiBrokerService.getSymbolPrice('BTCUSDT');
    
    res.json({
      success: true,
      activeBroker: multiBrokerService.getName(),
      status,
      btcPrice: btcPrice ? btcPrice.price : 'unavailable',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error testing multi-broker integration:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

function getImportantSymbols(): string[] {
  return [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT',
    'AVAXUSDT', 'UNIUSDT', 'SHIBUSDT', 'LTCUSDT', 'ATOMUSDT',
    'NEARUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT', 'XLMUSDT'
  ];
}

export default router;