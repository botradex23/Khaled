/**
 * Markets Router V3 - Handles cryptocurrency price data
 * Focused on a clean, standardized API for getting cryptocurrency prices
 */
import { Router } from 'express';
import { okxService } from '../api/okx/okxService';

const router = Router();

/**
 * Get fresh prices for all cryptocurrencies or specific ones
 * This is a public endpoint that doesn't require authentication
 * 
 * @route GET /api/markets/v3/prices
 * @param {string} symbols - Optional comma-separated list of currency symbols (e.g., "BTC,ETH,SOL")
 * @returns {Array} Array of cryptocurrency prices
 */
router.get('/v3/prices', async (req, res) => {
  try {
    // Parse the symbols parameter
    const symbols = req.query.symbols 
      ? (req.query.symbols as string).split(',').map(s => s.trim().toUpperCase())
      : [];
    
    console.log(`[markets-v3] Fetching prices${symbols.length ? ` for ${symbols.join(', ')}` : ' for all currencies'}`);
    
    // Make a direct request to OKX ticker endpoint to get the latest prices
    const tickerResponse = await okxService.makePublicRequest<any>(
      '/api/v5/market/tickers?instType=SPOT'
    );
    
    if (tickerResponse.code !== '0' || !Array.isArray(tickerResponse.data)) {
      console.error('[markets-v3] Invalid response from OKX API:', tickerResponse);
      throw new Error('Failed to fetch cryptocurrency prices');
    }
    
    // Process all pairs and extract price data
    const pricesMap: Record<string, number> = {};
    
    tickerResponse.data.forEach((ticker: any) => {
      // Handle both USDT pairs (most common) and USD pairs
      if (ticker.instId && (ticker.instId.includes('-USDT') || ticker.instId.includes('-USD'))) {
        const parts = ticker.instId.split('-');
        const currency = parts[0];
        
        // Only include requested symbols if a filter was provided
        if (symbols.length === 0 || symbols.includes(currency)) {
          if (currency && ticker.last) {
            const price = parseFloat(ticker.last);
            pricesMap[currency] = price;
          }
        }
      }
    });
    
    // Always ensure USDT and USDC are 1.0 (these are stablecoins pegged to USD)
    if (symbols.length === 0 || symbols.includes('USDT')) {
      pricesMap['USDT'] = 1.0;
    }
    if (symbols.length === 0 || symbols.includes('USDC')) {
      pricesMap['USDC'] = 1.0;
    }
    
    // Convert to array format
    const prices = Object.entries(pricesMap).map(([currency, price]) => ({
      currency,
      price,
      lastUpdated: new Date().toISOString()
    }));
    
    // Sort by market cap (approximately - put major coins first)
    const majorCoins = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE'];
    prices.sort((a, b) => {
      const aIndex = majorCoins.indexOf(a.currency);
      const bIndex = majorCoins.indexOf(b.currency);
      
      // If both are major coins, sort by the predefined order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is a major coin, it should come first
      if (aIndex !== -1) {
        return -1;
      }
      // If only b is a major coin, it should come first
      if (bIndex !== -1) {
        return 1;
      }
      // For non-major coins, sort alphabetically
      return a.currency.localeCompare(b.currency);
    });
    
    console.log(`[markets-v3] Retrieved ${prices.length} cryptocurrency prices from OKX`);
    res.json(prices);
  } catch (err: any) {
    console.error('[markets-v3] Error fetching prices:', err);
    res.status(500).json({ 
      error: 'Failed to fetch cryptocurrency prices',
      message: err.message 
    });
  }
});

/**
 * Get fresh price for a single cryptocurrency
 * 
 * @route GET /api/markets/v3/price/:currency
 * @param {string} currency - Currency symbol (e.g., "BTC")
 * @returns {Object} Price data for the specified currency
 */
router.get('/v3/price/:currency', async (req, res) => {
  try {
    const currency = req.params.currency.toUpperCase();
    
    console.log(`[markets-v3] Fetching price for ${currency}`);
    
    // Common stablecoins that are always worth $1
    const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP'];
    if (stablecoins.includes(currency)) {
      return res.json({
        currency,
        price: 1.0,
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Make a direct request to OKX ticker endpoint
    const pairSymbol = `${currency}-USDT`;
    const tickerResponse = await okxService.makePublicRequest<any>(
      `/api/v5/market/ticker?instId=${pairSymbol}`
    );
    
    if (tickerResponse.code !== '0' || !Array.isArray(tickerResponse.data) || !tickerResponse.data.length) {
      // Try USD pair as fallback
      const usdPairSymbol = `${currency}-USD`;
      const fallbackResponse = await okxService.makePublicRequest<any>(
        `/api/v5/market/ticker?instId=${usdPairSymbol}`
      );
      
      if (fallbackResponse.code !== '0' || !Array.isArray(fallbackResponse.data) || !fallbackResponse.data.length) {
        throw new Error(`No price data available for ${currency}`);
      }
      
      const ticker = fallbackResponse.data[0];
      return res.json({
        currency,
        price: parseFloat(ticker.last),
        lastUpdated: new Date().toISOString()
      });
    }
    
    const ticker = tickerResponse.data[0];
    res.json({
      currency,
      price: parseFloat(ticker.last),
      lastUpdated: new Date().toISOString()
    });
  } catch (err: any) {
    console.error(`[markets-v3] Error fetching price for ${req.params.currency}:`, err);
    res.status(500).json({ 
      error: `Failed to fetch price for ${req.params.currency}`,
      message: err.message 
    });
  }
});

export default router;