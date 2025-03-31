/**
 * Market API Router - הנקודת קצה המרכזית לנתוני השוק
 * מתמקד באספקת נתוני מחירים מעודכנים בזמן אמת מ-Binance
 */
import express, { Request, Response } from 'express';
import { binanceMarketService } from '../api/binance/marketPriceService';
import { log } from '../vite';

const router = express.Router();

/**
 * קבלת כל מחירי השוק הזמינים
 * GET /api/market/prices
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    // מגבלת מספר המחירים להחזרה
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    // סינון לפי מטבעות ספציפיים
    let filterSymbols = req.query.symbols ? (req.query.symbols as string).split(',') : undefined;
    
    // אתחול מערך ברירת מחדל למטבעות נפוצים
    const defaultCoins = ['BTC', 'ETH', 'XRP', 'USDT', 'SOL', 'DOGE', 'DOT', 'ADA', 'AVAX', 'LINK', 'BNB', 'MATIC'];
    
    // אם אין מטבעות מוגדרים, נשתמש ברשימת ברירת מחדל
    if (!filterSymbols || filterSymbols.length === 0) {
      filterSymbols = defaultCoins;
    }
    
    // שליפת המחירים מבינאנס
    const allPrices = await binanceMarketService.getAllPrices();
    
    // מיפוי המחירים לפורמט הסטנדרטי של המערכת
    const mappedPrices = allPrices.map(price => ({
      symbol: price.symbol.replace('USDT', ''),  // הסרת USDT כדי לקבל רק את סמל המטבע
      price: typeof price.price === 'string' ? parseFloat(price.price) : price.price,
      found: true,
      source: 'binance',
      timestamp: Date.now()
    }));
    
    // סינון לפי המטבעות המבוקשים
    let filteredPrices = mappedPrices;
    if (filterSymbols && filterSymbols.length > 0) {
      filteredPrices = mappedPrices.filter(p => 
        filterSymbols!.includes(p.symbol) || 
        filterSymbols!.some(s => p.symbol.startsWith(s))
      );
    }
    
    // הגבלת כמות התוצאות אם נדרש
    if (limit && !isNaN(limit) && limit > 0) {
      filteredPrices = filteredPrices.slice(0, limit);
    }
    
    // החזרת תשובה בפורמט המוכר למערכת
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalRequested: filterSymbols.length,
      totalFound: filteredPrices.length,
      prices: filteredPrices
    });
  } catch (error: any) {
    log(`Error fetching market prices: ${error.message}`, 'api');
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch market prices', 
      details: error.message 
    });
  }
});

export default router;