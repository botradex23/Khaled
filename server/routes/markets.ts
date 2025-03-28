/**
 * נתיבי API למחירי שוק ונתוני מטבעות קריפטו
 * Routing for market prices and cryptocurrency data
 */

import { Router, Request, Response } from 'express';
import marketPriceService from '../api/okx/marketPriceService';
import { log } from '../vite';

const router = Router();

/**
 * קבלת כל מחירי השוק הזמינים
 * GET /api/markets/prices
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    // רענון המטמון אם הפרמטר refresh קיים
    const forceRefresh = req.query.refresh === 'true';
    
    // שליפת כל המחירים
    const prices = await marketPriceService.getAllCurrencyPrices(forceRefresh);
    
    // החזרת התשובה
    res.json(prices);
  } catch (error: any) {
    log(`Error fetching all prices: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to fetch market prices', details: error.message });
  }
});

/**
 * קבלת מחיר של מטבע מסוים
 * GET /api/markets/price/:symbol
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    if (!symbol) {
      return res.status(400).json({ error: 'Currency symbol is required' });
    }
    
    // רענון המטמון אם הפרמטר refresh קיים
    const forceRefresh = req.query.refresh === 'true';
    
    // שליפת המחיר
    const price = await marketPriceService.getCurrencyPrice(symbol, forceRefresh);
    
    if (price === null) {
      return res.status(404).json({ error: `Price for ${symbol} not found` });
    }
    
    // החזרת תשובה מפורטת יותר
    res.json({
      symbol: symbol,
      price: price,
      updated: new Date().toISOString()
    });
  } catch (error: any) {
    log(`Error fetching price for ${req.params.symbol}: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to fetch price', details: error.message });
  }
});

/**
 * קבלת מחירים של מספר מטבעות
 * POST /api/markets/batch-prices
 * Body: { symbols: ["BTC", "ETH", "XRP"] }
 */
router.post('/batch-prices', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Array of currency symbols is required' });
    }
    
    // רענון המטמון אם הפרמטר refresh קיים
    const forceRefresh = req.query.refresh === 'true';
    
    // מטמון כל המחירים כבר מעודכן אחרי הקריאה הראשונה
    await marketPriceService.getAllCurrencyPrices(forceRefresh);
    
    // שליפת מחירים לכל המטבעות המבוקשים
    const results = [];
    for (const symbol of symbols) {
      const price = await marketPriceService.getCurrencyPrice(symbol, false); // לא צריך לרענן שוב
      results.push({
        symbol: symbol,
        price: price,
        found: price !== null
      });
    }
    
    // החזרת כל התוצאות
    res.json({
      timestamp: new Date().toISOString(),
      totalRequested: symbols.length,
      totalFound: results.filter(r => r.found).length,
      prices: results
    });
  } catch (error: any) {
    log(`Error fetching batch prices: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to fetch batch prices', details: error.message });
  }
});

/**
 * מציאת צמד מסחר מתאים עבור מטבע
 * GET /api/markets/trading-pair/:symbol
 */
router.get('/trading-pair/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    if (!symbol) {
      return res.status(400).json({ error: 'Currency symbol is required' });
    }
    
    // קבלת העדפות זוגות מסחר מהשאילתה
    let preferences = ['USDT', 'USD', 'BTC']; // ברירת מחדל
    if (req.query.quote && typeof req.query.quote === 'string') {
      const customPrefs = req.query.quote.split(',');
      if (customPrefs.length > 0) {
        preferences = customPrefs;
      }
    }
    
    // כדי לוודא שהמטמון מעודכן
    await marketPriceService.getAllCurrencyPrices(req.query.refresh === 'true');
    
    // מציאת צמד מסחר מתאים
    const tradingPair = marketPriceService.findBestTradingPair(symbol, preferences);
    
    if (!tradingPair) {
      return res.status(404).json({ 
        error: `No trading pair found for ${symbol}`,
        suggestions: [
          `Try different quote preferences (current: ${preferences.join(',')})`,
          `Check if the currency symbol is correct`
        ]
      });
    }
    
    // החזרת הצמד המתאים
    res.json({
      baseSymbol: symbol,
      tradingPair: tradingPair,
      preferences: preferences
    });
  } catch (error: any) {
    log(`Error finding trading pair for ${req.params.symbol}: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to find trading pair', details: error.message });
  }
});

/**
 * אילוץ רענון המטמון של המחירים
 * POST /api/markets/refresh-cache
 */
router.post('/refresh-cache', async (req: Request, res: Response) => {
  try {
    // רענון המטמון
    await marketPriceService.refreshPriceCache();
    
    // שליפת המחירים המעודכנים
    const prices = await marketPriceService.getAllCurrencyPrices();
    
    // החזרת התשובה
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      priceCount: prices.length,
      message: 'Price cache refreshed successfully'
    });
  } catch (error: any) {
    log(`Error refreshing price cache: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to refresh price cache', details: error.message });
  }
});

export default router;