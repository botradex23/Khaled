import { Request, Response, Router } from 'express';
import * as marketPriceService from '../../server/api/okx/marketPriceService';
import { log } from '../../server/vite';

const router = Router();

/**
 * API שמספק מידע על מחירי שוק של מטבעות קריפטו
 * GET /api/markets/v2/prices - מחזיר את כל המחירים או מחירים מסוננים לפי סמלים
 * 
 * פרמטרים אפשריים:
 * - symbols: רשימת סמלי מטבעות מופרדים בפסיקים (BTC,ETH,XRP)
 * - refresh: true/false - האם לרענן את המטמון
 * - limit: מספר תוצאות מקסימלי להחזרה
 */
router.get('/v2/prices', async (req: Request, res: Response) => {
  try {
    // פרמטרים מהבקשה
    const forceRefresh = req.query.refresh === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const symbols = req.query.symbols ? (req.query.symbols as string).split(',') : undefined;
    
    // רשימת מטבעות ברירת מחדל למקרה שלא צוינו סמלים
    const defaultCoins = ['BTC', 'ETH', 'XRP', 'USDT', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK'];
    
    // שימוש ברשימת ברירת מחדל אם לא סופקו סמלים
    const targetSymbols = symbols && symbols.length > 0 ? symbols : defaultCoins;
    
    // קבלת מחירים (עם רענון מטמון אם נדרש)
    const allPrices = await marketPriceService.getAllCurrencyPrices(forceRefresh);
    
    // סינון המחירים לפי הסמלים המבוקשים
    const filteredPrices = marketPriceService.filterCurrencyPrices(allPrices, targetSymbols);
    
    // מיפוי לפורמט התשובה
    const results = targetSymbols.map(symbol => {
      // חיפוש המחיר המתאים
      const foundPrice = filteredPrices.find(p => 
        p.symbol === symbol || 
        p.base === symbol || 
        (p.symbol && p.symbol.split('-')[0] === symbol)
      );
      
      return {
        symbol,
        price: foundPrice?.price || null,
        found: !!foundPrice,
        source: foundPrice?.source || null,
        timestamp: foundPrice?.timestamp || Date.now()
      };
    });
    
    // סינון התוצאות שנמצאו
    const foundResults = results.filter(r => r.found);
    
    // הגבלת מספר התוצאות אם נדרש
    const limitedResults = limit && !isNaN(limit) && limit > 0 
      ? foundResults.slice(0, limit) 
      : foundResults;
    
    // בניית התשובה המובנית
    res.json({
      timestamp: new Date().toISOString(),
      totalRequested: targetSymbols.length,
      totalFound: foundResults.length,
      prices: limitedResults
    });
    
  } catch (error: any) {
    log(`Error in /api/markets/v2/prices: ${error.message}`, 'api');
    res.status(500).json({ 
      error: 'Failed to fetch market prices',
      details: error.message
    });
  }
});

/**
 * קבלת מידע על מחיר מטבע ספציפי
 * GET /api/markets/v2/price/:symbol
 */
router.get('/v2/price/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    if (!symbol) {
      return res.status(400).json({ error: 'Currency symbol is required' });
    }
    
    const forceRefresh = req.query.refresh === 'true';
    const price = await marketPriceService.getCurrencyPrice(symbol, forceRefresh);
    
    if (price === null) {
      return res.status(404).json({ 
        error: `Price for ${symbol} not found`,
        suggestion: 'Try a different symbol or check that the symbol is correct'
      });
    }
    
    // החזרת תשובה מובנית
    res.json({
      symbol,
      price,
      found: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    log(`Error in /api/markets/v2/price/:symbol: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to fetch price', details: error.message });
  }
});

/**
 * קבלת מחירים של מספר מטבעות בבת אחת
 * POST /api/markets/v2/batch-prices
 * Body: { symbols: ["BTC", "ETH", "XRP"] }
 */
router.post('/v2/batch-prices', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ 
        error: 'Array of currency symbols is required',
        example: { symbols: ["BTC", "ETH", "XRP"] }
      });
    }
    
    const forceRefresh = req.query.refresh === 'true';
    const filteredPrices = await marketPriceService.getAllCurrencyPrices(forceRefresh, symbols);
    
    // המרה לפורמט תשובה אחיד
    const results = symbols.map(symbol => {
      const foundPrice = filteredPrices.find(p => 
        p.symbol === symbol || 
        p.base === symbol || 
        (p.symbol && p.symbol.split('-')[0] === symbol)
      );
      
      return {
        symbol,
        price: foundPrice?.price || null,
        found: !!foundPrice
      };
    });
    
    res.json({
      timestamp: new Date().toISOString(),
      totalRequested: symbols.length,
      totalFound: results.filter(r => r.found).length,
      prices: results
    });
    
  } catch (error: any) {
    log(`Error in /api/markets/v2/batch-prices: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to fetch batch prices', details: error.message });
  }
});

/**
 * רענון מטמון המחירים (למנהלי מערכת)
 * POST /api/markets/v2/refresh-cache
 */
router.post('/v2/refresh-cache', async (req: Request, res: Response) => {
  try {
    await marketPriceService.default.refreshPriceCache();
    const prices = await marketPriceService.getAllCurrencyPrices();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      priceCount: prices.length,
      message: 'Price cache refreshed successfully'
    });
    
  } catch (error: any) {
    log(`Error in /api/markets/v2/refresh-cache: ${error.message}`, 'api');
    res.status(500).json({ error: 'Failed to refresh price cache', details: error.message });
  }
});

export default router;