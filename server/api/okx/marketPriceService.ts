/**
 * שירות מחירי שוק
 * Service for fetching and handling market prices from OKX API
 * מספק יכולת לקבל מחירים עדכניים של כל המטבעות בזמן אמת
 */

import { okxService } from './okxService';

/**
 * ממשק הנתונים של מחיר מטבע
 */
export interface CurrencyPrice {
  symbol: string;           // סמל המטבע (לדוגמה: BTC-USDT)
  price: number;            // מחיר נוכחי
  base: string;             // מטבע הבסיס (לדוגמה: BTC)
  quote: string;            // מטבע הציטוט (לדוגמה: USDT)
  timestamp: number;        // חותמת זמן עדכון המחיר
  source: string;           // מקור המחיר (API, חישוב, ברירת מחדל)
}

// מטמון לאחסון מחירי מטבעות כדי למנוע קריאות API מיותרות
let priceCache = new Map<string, CurrencyPrice>();
let lastCacheRefresh = 0;
const CACHE_REFRESH_INTERVAL = 60000; // 60 שניות

/**
 * השגת מחיר מטבע ספציפי
 * @param currency סמל המטבע לחיפוש (לדוגמה: BTC, ETH)
 * @param forceRefresh האם לרענן את המטמון בכוח
 * @returns מחיר המטבע או null אם לא נמצא
 */
export async function getCurrencyPrice(currency: string, forceRefresh = false): Promise<number | null> {
  // רענון המטמון אם צריך
  if (forceRefresh || isStale()) {
    await refreshPriceCache();
  }

  // חיפוש המטבע במטמון (לא תלוי רישיות)
  const normalizedCurrency = currency.toUpperCase();
  
  // חיפוש ישיר
  const cachedPrice = searchCache(normalizedCurrency);
  if (cachedPrice) {
    return cachedPrice.price;
  }
  
  // חיפוש עם צמד מסחר
  const alternativePair = findBestTradingPair(normalizedCurrency);
  if (alternativePair && priceCache.has(alternativePair)) {
    const pairData = priceCache.get(alternativePair);
    return pairData ? pairData.price : null;
  }
  
  // לא נמצא
  return null;
}

/**
 * פונקציה להשגת כל מחירי המטבעות הידועים
 * @param forceRefresh האם לרענן את המטמון בכוח
 * @returns מערך של כל מחירי המטבעות
 */
export async function getAllCurrencyPrices(forceRefresh = false): Promise<CurrencyPrice[]> {
  // רענון המטמון אם צריך
  if (forceRefresh || isStale()) {
    await refreshPriceCache();
  }
  
  // החזרת כל הערכים מהמטמון
  try {
    return Array.from(priceCache.values());
  } catch (error) {
    console.error("Error converting priceCache to array:", error);
    return [];
  }
}

/**
 * פונקציה לרענון המטמון של מחירי המטבעות
 * מושכת מחירים מעודכנים מה-API של OKX
 */
async function refreshPriceCache(): Promise<void> {
  console.log('Refreshing cryptocurrency price cache...');
  
  try {
    // ניקוי המטמון הקיים אם הרענון מוצלח
    const newCache = new Map<string, CurrencyPrice>();
    
    // קבלת כל נתוני השוק מ-OKX
    const marketData = await okxService.getMarketTickers();
    
    if (!marketData || !marketData.length) {
      console.warn('No market data received from OKX API');
      return; // שמירה על המטמון הקיים אם אין נתונים חדשים
    }
    
    console.log(`Retrieved ${marketData.length} market pairs from OKX API`);
    
    // מיצוי מחיר הביטקוין בדולרים - חשוב לחישובים של צמדים אחרים
    const btcUsdPrice = getBtcUsdPrice(marketData);
    console.log(`Current BTC/USD price: ${btcUsdPrice}`);
    
    // עיבוד כל הצמדים
    for (const ticker of marketData) {
      try {
        // שליפת סמל הצמד וחלוקה לבסיס וציטוט
        const symbol = ticker.instId;
        const [base, quote] = symbol.split('-');
        
        if (!base || !quote) continue; // דילוג על צמדים לא תקינים
        
        // חישוב המחיר הסופי של המטבע
        let price = parseFloat(ticker.last);
        let source = 'API';
        
        // ווידוי שיש לנו מחיר תקף
        if (isNaN(price)) continue;
        
        // טיפול מיוחד בצמדים שלא נסחרים מול דולרים
        if (quote === 'BTC' && btcUsdPrice > 0) {
          price = price * btcUsdPrice; // המרת ערך BTC לדולרים
          source = 'CALCULATED';
        }
        
        // טיפול מיוחד בסטייבלקוינים
        if (isStablecoin(base)) {
          price = 1.0; // סטייבלקוינים כגון USDT, USDC שווים בערך 1 דולר
          source = 'FIXED';
        }
        
        // אחסון הנתונים במטמון החדש
        newCache.set(symbol, {
          symbol,
          price,
          base,
          quote,
          timestamp: Date.now(),
          source
        });
        
        // אחסון גם לפי שם המטבע עצמו (לדוגמה: BTC במקום BTC-USDT)
        // כדי לאפשר חיפוש פשוט יותר
        if (!newCache.has(base) && (quote === 'USDT' || quote === 'USD' || quote === 'USDC')) {
          newCache.set(base, {
            symbol: base,
            price,
            base,
            quote,
            timestamp: Date.now(),
            source
          });
        }
      } catch (err) {
        console.error(`Error processing ticker for ${ticker.instId}:`, err);
      }
    }
    
    // עדכון המטמון הגלובלי רק אם הצלחנו לקבל נתונים חדשים
    if (newCache.size > 0) {
      priceCache = newCache;
      lastCacheRefresh = Date.now();
      console.log(`Price cache refreshed with ${newCache.size} cryptocurrency prices`);
      
      // הדפסת כמה דוגמאות למחירים עבור בדיקה
      console.log('Sample prices:');
      for (const currency of ['BTC', 'ETH', 'USDT', 'XRP'].filter(c => newCache.has(c))) {
        console.log(`${currency}: ${newCache.get(currency)?.price}`);
      }
    }
  } catch (error) {
    console.error('Error refreshing price cache:', error);
  }
}

/**
 * פונקציה עזר לחילוץ מחיר הביטקוין בדולרים מתוך נתוני השוק
 */
function getBtcUsdPrice(marketData: any[]): number {
  // חיפוש צמדים הקשורים לביטקוין מול דולרים
  const btcPairs = marketData.filter(ticker => 
    ticker.instId === 'BTC-USDT' || 
    ticker.instId === 'BTC-USD' || 
    ticker.instId === 'BTC-USDC'
  );
  
  if (btcPairs.length === 0) return 0;
  
  // עדיפות ל-BTC-USDT שהוא הסחיר ביותר בדרך כלל
  const btcUsdt = btcPairs.find(ticker => ticker.instId === 'BTC-USDT');
  if (btcUsdt) {
    return parseFloat(btcUsdt.last);
  }
  
  // אחרת, קח את הראשון שנמצא
  return parseFloat(btcPairs[0].last);
}

/**
 * פונקציה למציאת צמד מסחר מתאים עבור מטבע
 * @param currency סמל המטבע לחיפוש
 * @param quotePreference העדפת מטבעות ציטוט לפי סדר
 * @returns סמל הצמד המתאים ביותר או null אם לא נמצא
 */
export function findBestTradingPair(
  currency: string, 
  quotePreference: string[] = ['USDT', 'USD', 'BTC']
): string | null {
  const normalizedCurrency = currency.toUpperCase();
  
  // עבור על כל העדפות הציטוט לפי סדר
  for (const quote of quotePreference) {
    const pairSymbol = `${normalizedCurrency}-${quote}`;
    if (priceCache.has(pairSymbol)) {
      return pairSymbol;
    }
  }
  
  // חיפוש באופן כללי - כל צמד שמתחיל עם המטבע המבוקש
  const allSymbols = Array.from(priceCache.keys());
  for (const symbol of allSymbols) {
    if (symbol.startsWith(`${normalizedCurrency}-`)) {
      return symbol;
    }
  }
  
  return null;
}

/**
 * חיפוש מטבע במטמון (לא תלוי רישיות)
 */
function searchCache(currency: string): CurrencyPrice | null {
  // חיפוש ישיר
  if (priceCache.has(currency)) {
    return priceCache.get(currency) || null;
  }
  
  // חיפוש בכל הצמדים
  const allPrices = Array.from(priceCache.values());
  for (const price of allPrices) {
    if (price.base === currency &&
        (price.quote === 'USDT' || price.quote === 'USD' || price.quote === 'USDC')) {
      return price;
    }
  }
  
  return null;
}

/**
 * בדיקה האם המטמון ישן ודורש רענון
 */
function isStale(): boolean {
  return Date.now() - lastCacheRefresh > CACHE_REFRESH_INTERVAL;
}

/**
 * בדיקה אם מטבע הוא סטייבלקוין
 */
function isStablecoin(symbol: string): boolean {
  const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD'];
  return stablecoins.includes(symbol.toUpperCase());
}

// ייצוא שירות המחירים כאובייקט עם כל הפונקציות הנדרשות
export default {
  getCurrencyPrice,
  getAllCurrencyPrices,
  findBestTradingPair,
  refreshPriceCache: () => refreshPriceCache()
};