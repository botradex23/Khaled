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
        // השתמש במחירים מהשירות של ה-WebSocket
        // הוא כבר מייצר סימולציה שלו בקשות ל-API נכשלות
        const webSocketService = require('../api/binance/websocketService').binanceWebSocketService;
        
        // קבל את כל המחירים האחרונים
        const simulatedPrices = webSocketService.getLastPrices();
        
        if (simulatedPrices && Object.keys(simulatedPrices).length > 0) {
          log(`Using WebSocket simulated prices: ${Object.keys(simulatedPrices).length} prices`, 'api');
          
          // מיפוי המחירים המדומים לפורמט הסטנדרטי
          const mappedSimulatedPrices = Object.entries(simulatedPrices).map(([symbol, price]) => ({
            symbol: symbol.replace('USDT', ''),
            price: typeof price === 'string' ? parseFloat(price) : price,
            found: true,
            priceChangePercent: (Math.random() * 5 - 2.5).toFixed(2), // סימולציה של שינוי מחירים
            source: 'binance-websocket',
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
            totalRequested: filterSymbols ? filterSymbols.length : 0,
            totalFound: filteredPrices.length,
            source: 'binance-websocket',
            count: filteredPrices.length,
            prices: filteredPrices,
            data: filteredPrices,
            isSimulated: true
          });
        } else {
          log('No WebSocket prices available, creating fallback prices', 'api');
          
          // מחירים בסיסיים לשימוש אם אין מקור אחר
          const fallbackPrices = [
            { symbol: 'BTC', price: 69250.25, priceChangePercent: "1.24" },
            { symbol: 'ETH', price: 3475.50, priceChangePercent: "0.85" },
            { symbol: 'BNB', price: 608.75, priceChangePercent: "-0.32" },
            { symbol: 'SOL', price: 188.15, priceChangePercent: "2.15" },
            { symbol: 'XRP', price: 0.6125, priceChangePercent: "-1.05" },
            { symbol: 'ADA', price: 0.45, priceChangePercent: "0.72" },
            { symbol: 'DOGE', price: 0.16, priceChangePercent: "3.21" },
            { symbol: 'DOT', price: 8.25, priceChangePercent: "-0.65" },
            { symbol: 'MATIC', price: 0.78, priceChangePercent: "1.18" },
            { symbol: 'LINK', price: 15.85, priceChangePercent: "0.92" },
            { symbol: 'AVAX', price: 41.28, priceChangePercent: "-1.25" },
            { symbol: 'UNI', price: 12.35, priceChangePercent: "0.48" },
            { symbol: 'SHIB', price: 0.00002654, priceChangePercent: "2.35" },
            { symbol: 'LTC', price: 93.21, priceChangePercent: "-0.28" },
            { symbol: 'ATOM', price: 11.23, priceChangePercent: "0.75" },
            { symbol: 'NEAR', price: 7.15, priceChangePercent: "-0.52" },
            { symbol: 'BCH', price: 523.75, priceChangePercent: "1.32" },
            { symbol: 'FIL', price: 8.93, priceChangePercent: "0.65" },
            { symbol: 'TRX', price: 0.1426, priceChangePercent: "-0.42" },
            { symbol: 'XLM', price: 0.1392, priceChangePercent: "0.38" }
          ];
          
          return res.json({
            success: true,
            timestamp: new Date().toISOString(),
            totalRequested: filterSymbols ? filterSymbols.length : 0, 
            totalFound: fallbackPrices.length,
            source: 'fallback-data',
            count: fallbackPrices.length,
            prices: fallbackPrices,
            data: fallbackPrices,
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