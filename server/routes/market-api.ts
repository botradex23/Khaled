/**
 * Market API Router - הנקודת קצה המרכזית לנתוני השוק
 * מתמקד באספקת נתוני מחירים מעודכנים בזמן אמת
 */
import express, { Request, Response } from 'express';
import { binanceMarketService } from '../api/binance/marketPriceService';
import { log } from '../vite';
import { okxService } from '../api/okx/okxService';

// ממשק עבור מחירי בינאנס כפי שמגיע מה-API המקורי
interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

// ממשק עבור תגובת OKX API
interface OkxTicker {
  instId: string;  // למשל "BTC-USDT"
  last: string;    // המחיר האחרון
  askPx: string;   // מחיר מכירה מינימלי
  bidPx: string;   // מחיר קנייה מקסימלי
  open24h: string; // מחיר פתיחה ב-24 שעות אחרונות
  high24h: string; // מחיר הגבוה ביותר ב-24 שעות אחרונות
  low24h: string;  // מחיר הנמוך ביותר ב-24 שעות אחרונות
  volCcy24h: string; // נפח מסחר במטבע הבסיס
  vol24h: string;  // נפח מסחר
}

const router = express.Router();

/**
 * GET /api/market/prices
 * מחזיר מחירי קריפטו מבינאנס כמקור בלעדי (לפי בקשת המשתמש)
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    // מגבלת מספר המחירים להחזרה
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    // סינון לפי מטבעות ספציפיים
    let filterSymbols = req.query.symbols ? (req.query.symbols as string).split(',') : undefined;
    
    // רשימת מטבעות ברירת מחדל אם לא צוין אחרת
    const defaultCoins = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LINK', 'AVAX', 'UNI'];
    
    // אם אין מטבעות מוגדרים, נשתמש ברשימת ברירת מחדל
    if (!filterSymbols || filterSymbols.length === 0) {
      filterSymbols = defaultCoins;
    }
    
    // לפי בקשת המשתמש, נשתמש ישירות בבינאנס כמקור בלעדי
    try {
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
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalRequested: filterSymbols.length,
        totalFound: filteredPrices.length,
        source: 'binance',
        count: filteredPrices.length,
        prices: filteredPrices,
        data: filteredPrices
      });
    } 
    // במקרה של שגיאת API נחזיר שגיאה - לא נשתמש בנתונים מדומים
    catch (apiError: any) {
      log(`API error fetching market prices from Binance: ${apiError.message}`, 'api');
      
      // לפי דרישת המשתמש: רק נתונים אמיתיים, ללא נתונים מדומים
      const statusCode = apiError.response?.status || 503;
      const errorMessage = apiError.message.includes('geo-restriction') ? 
        'Market data APIs unavailable - please try again later' : 
        'Market data service temporarily unavailable - real-time data cannot be displayed';
      
      res.status(statusCode).json({ 
        success: false,
        error: errorMessage,
        details: apiError.message
      });
    }
  } 
  // שגיאה כללית בטיפול בבקשה
  catch (error: any) {
    log(`Error in market prices endpoint: ${error.message}`, 'api');
    res.status(500).json({ 
      success: false,
      error: 'Failed to process market price request', 
      details: error.message
    });
  }
});

export default router;