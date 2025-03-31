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
    
    try {
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
      // הוספת גם data וגם prices לתמיכה בכל הקומפוננטות השונות
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalRequested: filterSymbols.length,
        totalFound: filteredPrices.length,
        source: 'binance',
        count: filteredPrices.length,
        prices: filteredPrices,
        data: filteredPrices // הוספת שדה data עבור קומפוננטות שמצפות לו
      });
    } catch (apiError: any) {
      // במקרה של שגיאת API נבדוק אם יש מחירים מדומים זמינים
      log(`API error fetching market prices: ${apiError.message}`, 'api');
      
      try {
        // ניסיון לקבל את המחירים המדומים מהשירות
        const simulatedPrices = binanceMarketService.getSimulatedPrices();
        
        if (simulatedPrices && Object.keys(simulatedPrices).length > 0) {
          log(`Using simulated prices instead of real API data`, 'api');
          
          // מיפוי המחירים המדומים לפורמט הסטנדרטי
          const mappedSimulatedPrices = Object.entries(simulatedPrices).map(([symbol, price]) => ({
            symbol: symbol.replace('USDT', ''),
            price: typeof price === 'string' ? parseFloat(price) : price,
            found: true,
            source: 'binance-simulation',
            timestamp: Date.now()
          }));
          
          // סינון לפי המטבעות המבוקשים
          let filteredPrices = mappedSimulatedPrices;
          if (filterSymbols && filterSymbols.length > 0) {
            filteredPrices = mappedSimulatedPrices.filter(p => 
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
            totalRequested: filterSymbols.length,
            totalFound: filteredPrices.length,
            source: 'binance-simulation',
            count: filteredPrices.length,
            prices: filteredPrices,
            data: filteredPrices,
            isSimulated: true
          });
        }
      } catch (simulationError) {
        log(`Failed to use simulated prices: ${simulationError}`, 'api');
      }
      
      // אם לא הצלחנו להשתמש במחירים מדומים, נחזיר שגיאה
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
  } catch (error: any) {
    log(`Error in market prices endpoint: ${error.message}`, 'api');
    res.status(500).json({ 
      success: false,
      error: 'Failed to process market price request', 
      details: error.message 
    });
  }
});

export default router;