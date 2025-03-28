import { Request, Response, Router } from 'express';
import * as marketPriceService from '../../api/okx/marketPriceService';
import { log } from '../../vite';

const router = Router();

/**
 * קבלת כל מחירי השוק הזמינים
 * GET /api/markets/prices
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    // רענון המטמון אם הפרמטר refresh קיים
    const forceRefresh = req.query.refresh === 'true';
    
    // מגבלת מספר המחירים להחזרה
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    // סינון לפי מטבעות ספציפיים
    let filterSymbols = req.query.symbols ? (req.query.symbols as string).split(',') : undefined;
    
    // דגל לבדוק אם נרצה פורמט חדש או ישן
    const isStructuredFormat = req.query.format === 'structured';
    const isJsonFormat = req.query.format === 'json';
    const isForceStructured = req.query.usestructured === 'true';
    
    // תמיד נוודא שיש לנו רשימת מטבעות מוגדרת
    // אתחול מערך ברירת מחדל למטבעות נפוצים
    const defaultCoins = ['BTC', 'ETH', 'XRP', 'USDT', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'MATIC'];
    
    // אם ביקשו פורמט מובנה או JSON
    let useStructuredFormat = isStructuredFormat || isJsonFormat || isForceStructured;
    
    // כאשר משתמשים בטיפוס JSON או STRUCTURED, תמיד משתמשים בפורמט המובנה
    if (req.query.hasOwnProperty('structured') || 
        req.query.hasOwnProperty('structure') || 
        req.query.hasOwnProperty('usestructured') || 
        isStructuredFormat || 
        isJsonFormat) {
      // נשתמש בפורמט מובנה עם המטבעות שצוינו או ברירת מחדל
      useStructuredFormat = true;
    }
    
    // אם אין מטבעות ספציפיים ולא מבקשים פורמט מיוחד, נחזיר את הכל
    if (!useStructuredFormat && (!filterSymbols || filterSymbols.length === 0)) {
      // שליפת כל המחירים ללא סינון
      let prices = await marketPriceService.getAllCurrencyPrices(forceRefresh);
      
      // להחזיר רק את המחירים המבוקשים אם הוגדרה מגבלה
      if (limit && !isNaN(limit) && limit > 0) {
        prices = prices.slice(0, limit);
      }
      
      // החזרת התשובה
      res.json(prices);
      return;
    }
    
    // מכאן והלאה אנחנו עובדים עם פורמט מובנה או סינון מטבעות
    
    // אם אין מטבעות מוגדרים ומבקשים פורמט מיוחד, נשתמש ברשימת ברירת מחדל
    if (useStructuredFormat && (!filterSymbols || filterSymbols.length === 0)) {
      filterSymbols = defaultCoins;
    }
    
    // כעת חייב להיות לנו מערך מטבעות לא ריק
    const symbols = filterSymbols || [];
    
    // שליפת המחירים עבור המטבעות המבוקשים בלבד
    const filteredPrices = await marketPriceService.getAllCurrencyPrices(forceRefresh, symbols);
    
    // חיפוש המחיר המתאים עבור כל מטבע מבוקש
    const results = symbols.map(symbol => {
      const foundPrice = filteredPrices.find(p => 
        p.symbol === symbol || 
        p.base === symbol || 
        (p.symbol && p.symbol.includes('-') && p.symbol.split('-')[0] === symbol)
      );
      
      return {
        symbol: symbol,
        price: foundPrice ? foundPrice.price : null,
        found: !!foundPrice,
        timestamp: foundPrice ? foundPrice.timestamp : new Date().getTime(),
        source: foundPrice ? foundPrice.source : null
      };
    });
    
    // סינון רק תוצאות שנמצאו
    const foundResults = results.filter(r => r.found);
    
    // הגבלת כמות התוצאות אם נדרש
    const limitedResults = limit && !isNaN(limit) && limit > 0 
      ? foundResults.slice(0, limit) 
      : foundResults;
    
    // החזרת תשובה בפורמט מובנה
    res.json({
      timestamp: new Date().toISOString(),
      totalRequested: symbols.length,
      totalFound: foundResults.length,
      prices: limitedResults
    });
    
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
    
    // השתמש בחיפוש לפי סינון (יעיל יותר)
    const filteredPrices = await marketPriceService.getAllCurrencyPrices(forceRefresh, symbols);
    
    // המרה לפורמט התשובה הרצוי
    const results = symbols.map(symbol => {
      // חיפוש המחיר המתאים ברשימה המסוננת
      const foundPrice = filteredPrices.find(p => 
        p.symbol === symbol || 
        p.base === symbol || 
        (p.symbol && p.symbol.includes('-') && p.symbol.split('-')[0] === symbol)
      );
      
      return {
        symbol: symbol,
        price: foundPrice ? foundPrice.price : null,
        found: !!foundPrice
      };
    });
    
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