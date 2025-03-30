/**
 * Markets Binance Router - Handles cryptocurrency price data from Binance API
 * Provides standardized API for getting cryptocurrency prices from Binance
 */
import { Router } from 'express';
import { binanceMarketService } from '../api/binance/marketPriceService';

const router = Router();

/**
 * Get fresh prices for all cryptocurrencies or specific ones from Binance
 * This is a public endpoint that doesn't require authentication
 * 
 * @route GET /api/markets/binance/prices
 * @param {string} symbols - Optional comma-separated list of currency symbols (e.g., "BTCUSDT,ETHUSDT,SOLUSDT")
 * @returns {Array} Array of cryptocurrency prices
 */
router.get('/prices', async (req, res) => {
  try {
    // Parse the symbols parameter
    const symbols = req.query.symbols 
      ? (req.query.symbols as string).split(',').map(s => s.trim().toUpperCase())
      : [];
    
    console.log(`[markets-binance] Fetching prices${symbols.length ? ` for ${symbols.join(', ')}` : ' for all currencies'}`);
    
    // Get all prices from Binance
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from Binance'
      });
    }
    
    // Filter if symbols were specified
    const filteredPrices = symbols.length > 0
      ? allPrices.filter(ticker => symbols.includes(ticker.symbol))
      : allPrices;
    
    // Format the response
    const formattedPrices = filteredPrices.map(ticker => ({
      symbol: ticker.symbol,
      price: parseFloat(ticker.price),
      source: 'binance',
      timestamp: new Date().toISOString()
    }));
    
    res.json({
      success: true,
      source: 'binance',
      timestamp: new Date().toISOString(),
      count: formattedPrices.length,
      data: formattedPrices
    });
  } catch (error: any) {
    console.error('[markets-binance] Error fetching prices:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching prices: ${error.message}`
    });
  }
});

/**
 * Get market overview with trending coins from Binance
 * 
 * @route GET /api/markets/binance/overview
 * @returns {Object} Market overview data
 */
router.get('/overview', async (req, res) => {
  try {
    console.log('[markets-binance] Fetching market overview');
    
    // Get all prices from Binance
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from Binance'
      });
    }
    
    // Get important symbols in Binance format
    const importantSymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'
    ];
    
    // Filter important cryptocurrencies
    const majorCryptos = allPrices
      .filter(ticker => importantSymbols.includes(ticker.symbol))
      .map(ticker => {
        // Extract base and quote from symbol (e.g., BTCUSDT -> BTC and USDT)
        const base = ticker.symbol.endsWith('USDT') 
          ? ticker.symbol.slice(0, -4) 
          : ticker.symbol;
        
        const baseName = getFullCryptoName(base);
        
        return {
          symbol: ticker.symbol,
          shortSymbol: base,
          name: baseName,
          price: parseFloat(ticker.price),
          priceChangePercent: 0, // We'd need 24h data for this
          source: 'binance'
        };
      });
    
    // Get Bitcoin price for reference
    const btcTicker = allPrices.find(t => t.symbol === 'BTCUSDT');
    const btcPrice = btcTicker ? parseFloat(btcTicker.price) : 0;
    
    // Calculate rough market stats (simplified)
    const totalMarketCap = btcPrice * 21000000; // Simplified calculation
    const totalCoins = allPrices.length;
    
    res.json({
      success: true,
      source: 'binance',
      timestamp: new Date().toISOString(),
      marketStats: {
        totalMarketCap: totalMarketCap,
        totalMarketCapFormatted: formatCurrency(totalMarketCap),
        totalCoins,
        btcDominance: '42.31%', // Placeholder
        ethDominance: '19.54%', // Placeholder
        totalVolume24h: formatCurrency(btcPrice * 1000000) // Placeholder
      },
      trendingCoins: majorCryptos
    });
  } catch (error: any) {
    console.error('[markets-binance] Error fetching market overview:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching market overview: ${error.message}`
    });
  }
});

// Helper functions

/**
 * Format a number as a currency string
 * @param {number} value - The value to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

/**
 * Get full cryptocurrency name from symbol
 * @param {string} symbol - Cryptocurrency symbol
 * @returns {string} Full name
 */
function getFullCryptoName(symbol: string): string {
  const nameMap: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'BNB': 'Binance Coin',
    'SOL': 'Solana',
    'XRP': 'XRP',
    'ADA': 'Cardano',
    'DOGE': 'Dogecoin',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'LINK': 'Chainlink',
    'AVAX': 'Avalanche',
    'UNI': 'Uniswap',
    'SHIB': 'Shiba Inu',
    'LTC': 'Litecoin',
    'ATOM': 'Cosmos',
    'NEAR': 'NEAR Protocol',
    'BCH': 'Bitcoin Cash',
    'FIL': 'Filecoin',
    'TRX': 'TRON',
    'XLM': 'Stellar'
  };
  
  return nameMap[symbol] || symbol;
}

export default router;