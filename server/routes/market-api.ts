/**
 * Market API Router - הנקודת קצה המרכזית לנתוני השוק
 * מתמקד באספקת נתוני מחירים מעודכנים בזמן אמת
 */
import express, { Request, Response } from 'express';
import { binanceMarketService } from '../api/binance/marketPriceService';
import { log } from '../vite';

// ממשק עבור מחירי בינאנס כפי שמגיע מה-API המקורי
interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

const router = express.Router();

/**
 * GET /api/market/prices
 * מחזיר את מחירי הקריפטו מבינאנס או ממקור מדומה אם אין גישה
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
    
    // נסה להשיג מחירים מ-API בינאנס
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
      res.json({
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
    // במקרה של שגיאת API נשתמש במחירים מדומים
    catch (apiError: any) {
      log(`API error fetching market prices: ${apiError.message}`, 'api');
      
      // נסה לספק מחירים מדומים
      try {
        log('Using fallback prices', 'api');
        
        // מחירים מדומים קבועים
        const generateFallbackPrices = () => {
          // מחירים בסיסיים לשימוש כשאין מקור אחר
          const baseData = [
            { symbol: 'BTC', price: 69250.25, priceChangePercent: 1.24 },
            { symbol: 'ETH', price: 3475.50, priceChangePercent: 0.85 },
            { symbol: 'BNB', price: 608.75, priceChangePercent: -0.32 },
            { symbol: 'SOL', price: 188.15, priceChangePercent: 2.15 },
            { symbol: 'XRP', price: 0.6125, priceChangePercent: -1.05 },
            { symbol: 'ADA', price: 0.45, priceChangePercent: 0.72 },
            { symbol: 'DOGE', price: 0.16, priceChangePercent: 3.21 },
            { symbol: 'DOT', price: 8.25, priceChangePercent: -0.65 },
            { symbol: 'MATIC', price: 0.78, priceChangePercent: 1.18 },
            { symbol: 'LINK', price: 15.85, priceChangePercent: 0.92 },
            { symbol: 'AVAX', price: 41.28, priceChangePercent: -1.25 },
            { symbol: 'UNI', price: 12.35, priceChangePercent: 0.48 },
            { symbol: 'SHIB', price: 0.00002654, priceChangePercent: 2.35 },
            { symbol: 'LTC', price: 93.21, priceChangePercent: -0.28 },
            { symbol: 'ATOM', price: 11.23, priceChangePercent: 0.75 },
            { symbol: 'NEAR', price: 7.15, priceChangePercent: -0.52 },
            { symbol: 'BCH', price: 523.75, priceChangePercent: 1.32 },
            { symbol: 'FIL', price: 8.93, priceChangePercent: 0.65 },
            { symbol: 'TRX', price: 0.1426, priceChangePercent: -0.42 },
            { symbol: 'XLM', price: 0.1392, priceChangePercent: 0.38 }
          ];
          
          // עדכון המחירים בסימולציה קטנה
          return baseData.map(coin => {
            const randomChange = (Math.random() * 0.01 - 0.005); // -0.5% עד +0.5%
            const newPrice = coin.price * (1 + randomChange);
            const changePercent = coin.priceChangePercent + randomChange * 100;
            
            return {
              ...coin,
              price: newPrice,
              priceChangePercent: changePercent.toFixed(2)
            };
          });
        };
        
        // יצירת מחירים מדומים
        const fallbackPrices = generateFallbackPrices();
        
        // סינון לפי המטבעות המבוקשים
        let filteredPrices = fallbackPrices;
        if (filterSymbols && filterSymbols.length > 0) {
          filteredPrices = fallbackPrices.filter(p => 
            filterSymbols!.includes(p.symbol) || 
            filterSymbols!.some(s => p.symbol.startsWith(s))
          );
        }
        
        // הגבלת כמות התוצאות אם נדרש
        if (limit && !isNaN(limit) && limit > 0) {
          filteredPrices = filteredPrices.slice(0, limit);
        }
        
        // החזרת תשובה עם המחירים המדומים
        return res.json({
          success: true,
          timestamp: new Date().toISOString(),
          totalRequested: filterSymbols ? filterSymbols.length : 0,
          totalFound: filteredPrices.length,
          source: 'fallback-data',
          count: filteredPrices.length,
          prices: filteredPrices,
          data: filteredPrices,
          isSimulated: true
        });
      } 
      // אם גם הסימולציה נכשלה
      catch (simulationError: any) {
        log(`Failed to use simulated prices: ${simulationError}`, 'api');
      
        // נחזיר שגיאה מתאימה
        const statusCode = apiError.response?.status || 503;
        const errorMessage = apiError.message.includes('geo-restriction') ? 
          'Binance API unavailable in your region' : 
          'Market data service temporarily unavailable';
        
        res.status(statusCode).json({ 
          success: false,
          error: errorMessage,
          details: apiError.message 
        });
      }
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