/**
 * Markets Binance Router - Handles cryptocurrency price data from Binance API
 * Provides standardized API for getting cryptocurrency prices from Binance
 */
import { Router } from 'express';
import { binanceMarketService, Binance24hrTicker } from '../api/binance/marketPriceService';

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
    
    // קבל את כל המחירים מבינאנס
    const allPrices = await binanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from Binance'
      });
    }
    
    // קבל נתוני שינוי מחיר ל-24 שעות עבור מטבעות חשובים
    const importantSymbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'
    ];
    
    // קבל נתוני 24 שעות עבור המטבעות החשובים
    const stats24hrPromises = importantSymbols.map(symbol => 
      binanceMarketService.get24hrStats(symbol)
    );
    
    // מחכים שכל הקריאות יסתיימו
    const stats24hrResults = await Promise.allSettled(stats24hrPromises);
    
    // יצירת מפת שינויי מחירים ל-24 שעות
    const priceChangeMap = new Map<string, string>();
    
    stats24hrResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const data = result.value as Binance24hrTicker;
        priceChangeMap.set(data.symbol, data.priceChangePercent);
      }
    });
    
    // סינון המטבעות החשובים
    const majorCryptos = allPrices
      .filter(ticker => importantSymbols.includes(ticker.symbol))
      .map(ticker => {
        // חילוץ בסיס וציטוט מהסמל (לדוגמה, BTCUSDT -> BTC ו- USDT)
        const base = ticker.symbol.endsWith('USDT') 
          ? ticker.symbol.slice(0, -4) 
          : ticker.symbol;
        
        const baseName = getFullCryptoName(base);
        
        // קבל את אחוז השינוי ב-24 שעות אם קיים
        const priceChangePercent = priceChangeMap.has(ticker.symbol)
          ? parseFloat(priceChangeMap.get(ticker.symbol) || '0')
          : 0;
        
        return {
          symbol: ticker.symbol,
          shortSymbol: base,
          name: baseName,
          price: parseFloat(ticker.price),
          priceChangePercent, // כעת משתמשים בנתונים האמיתיים
          source: 'binance'
        };
      });
    
    // קבל מחיר ביטקוין לייחוס
    const btcTicker = allPrices.find(t => t.symbol === 'BTCUSDT');
    const btcPrice = btcTicker ? parseFloat(btcTicker.price) : 0;
    
    // חישוב סטטיסטיקות שוק משוערות (פשוטות)
    const totalMarketCap = btcPrice * 21000000; // חישוב פשוט
    const totalCoins = allPrices.length;
    
    // מצא את המטבע שעלה הכי הרבה (Top Gainer) ואת זה שירד הכי הרבה (Top Loser)
    const sortedByChange = [...majorCryptos].sort((a, b) => 
      b.priceChangePercent - a.priceChangePercent
    );
    
    const topGainer = sortedByChange.length > 0 ? sortedByChange[0] : null;
    const topLoser = sortedByChange.length > 0 ? sortedByChange[sortedByChange.length - 1] : null;
    
    // חישוב נתוני שליטה של BTC ו-ETH
    const ethTicker = allPrices.find(t => t.symbol === 'ETHUSDT');
    const ethPrice = ethTicker ? parseFloat(ethTicker.price) : 0;
    
    const btcMarketCap = btcPrice * 21000000; // 21 מיליון BTC בקירוב
    const ethMarketCap = ethPrice * 120000000; // 120 מיליון ETH בקירוב
    
    const totalCryptoMarketCap = totalMarketCap * 2.5; // הערכה גסה
    const btcDominance = btcMarketCap / totalCryptoMarketCap * 100;
    const ethDominance = ethMarketCap / totalCryptoMarketCap * 100;
    
    res.json({
      success: true,
      source: 'binance',
      timestamp: new Date().toISOString(),
      marketStats: {
        totalMarketCap: totalMarketCap,
        totalMarketCapFormatted: formatCurrency(totalMarketCap),
        totalCoins,
        btcDominance: `${btcDominance.toFixed(2)}%`,
        ethDominance: `${ethDominance.toFixed(2)}%`,
        totalVolume24h: formatCurrency(btcPrice * 1000000), // הערכה
        topGainer: topGainer ? {
          symbol: topGainer.shortSymbol,
          change: `+${topGainer.priceChangePercent.toFixed(2)}%`
        } : null,
        topLoser: topLoser ? {
          symbol: topLoser.shortSymbol,
          change: `${topLoser.priceChangePercent.toFixed(2)}%`
        } : null
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