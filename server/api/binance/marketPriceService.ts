import axios from 'axios';
import { EventEmitter } from 'events';
import https from 'https';

// Base URLs for Binance API
const BINANCE_BASE_URL = 'https://api.binance.com';
const BINANCE_TEST_URL = 'https://testnet.binance.vision';

// Proxy configuration for bypassing geo-restrictions (using the credentials from check_proxy.js)
const USE_PROXY = true; // Set to true to use proxy
const PROXY_USERNAME = "ahjqspco";
const PROXY_PASSWORD = "dzx3r1prpz9k";
const PROXY_IP = process.env.PROXY_IP || '38.154.227.167'; // Use environment variable or value from check_proxy.js
const PROXY_PORT = process.env.PROXY_PORT || '5868';       // Port from check_proxy.js

// Create axios instance with proxy if needed
const createAxiosInstance = () => {
  if (USE_PROXY && PROXY_IP) {
    console.log(`Using proxy: ${PROXY_IP}:${PROXY_PORT} for Binance API requests`);
    
    // Create direct proxy config for axios
    return axios.create({
      proxy: {
        host: PROXY_IP,
        port: Number(PROXY_PORT),
        auth: {
          username: PROXY_USERNAME,
          password: PROXY_PASSWORD
        }
      },
      timeout: 10000, // 10 seconds timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json'
      }
    });
  }
  
  // Return regular axios if proxy is not needed
  return axios;
};

// ממשק עבור נתוני המחיר בזמן אמת
export interface LivePriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  source: 'binance' | 'binance-websocket' | 'simulated';
}

/**
 * Service for fetching market price data from Binance public API
 * מאפשר גם עדכון מחירים בזמן אמת באמצעות WebSocket
 */
export class BinanceMarketPriceService extends EventEmitter {
  private baseUrl: string;
  private livePrices: Record<string, number> = {}; // שמירת מחירים עדכניים
  
  constructor(useTestnet: boolean = false) {
    super();
    this.baseUrl = useTestnet ? BINANCE_TEST_URL : BINANCE_BASE_URL;
    console.log(`Binance Market Price Service initialized with base URL: ${this.baseUrl}`);
  }
  
  /**
   * עדכון מחיר של מטבע בזמן אמת
   * @param symbol סמל המטבע (לדוגמה BTCUSDT)
   * @param price המחיר החדש
   */
  public updatePrice(symbol: string, price: number): void {
    const formattedSymbol = symbol.toUpperCase();
    const oldPrice = this.livePrices[formattedSymbol];
    this.livePrices[formattedSymbol] = price;
    
    // שלח אירוע עדכון מחיר
    const update: LivePriceUpdate = {
      symbol: formattedSymbol,
      price,
      timestamp: Date.now(),
      source: 'binance-websocket'
    };
    
    // הפצת האירוע
    this.emit('price-update', update);
    this.emit(`price-update:${formattedSymbol}`, update);
    
    // אם המחיר השתנה בצורה משמעותית, שלח גם אירוע שינוי גדול
    if (oldPrice && Math.abs(price - oldPrice) / oldPrice > 0.01) {
      this.emit('significant-price-change', {
        ...update,
        previousPrice: oldPrice,
        changePercent: ((price - oldPrice) / oldPrice) * 100
      });
    }
    
    // כאשר עדכון מחיר מגיע, עדכן גם את המחיר האחרון בסימולציה שלנו
    // כך הסימולציה תמשיך ממחיר אמיתי במקרה של נפילה
    if (this._lastSimulatedPrices && formattedSymbol in this._lastSimulatedPrices) {
      this._lastSimulatedPrices[formattedSymbol] = price.toString();
    }
  }
  
  /**
   * קבלת המחיר העדכני ביותר של מטבע
   * @param symbol סמל המטבע
   * @returns המחיר העדכני או undefined אם לא נמצא
   */
  public getLatestPrice(symbol: string): number | undefined {
    const formattedSymbol = symbol.toUpperCase();
    return this.livePrices[formattedSymbol];
  }
  
  /**
   * קבלת כל המחירים העדכניים בזמן אמת
   * @returns רשימה של כל המחירים
   */
  public getAllLatestPrices(): LivePriceUpdate[] {
    const now = Date.now();
    return Object.entries(this.livePrices).map(([symbol, price]) => ({
      symbol,
      price,
      timestamp: now,
      source: 'binance-websocket'
    }));
  }
  
  /**
   * קבלת המחירים המדומים (סימולציה) לשימוש כאשר ה-API אינו זמין
   * @returns אובייקט עם כל המחירים המדומים
   */
  public getSimulatedPrices(): Record<string, number> {
    // אם יש מחירים במערכת המדומה, השתמש בהם
    if (this._lastSimulatedPrices && Object.keys(this._lastSimulatedPrices).length > 0) {
      // המר את המחירים ממחרוזות למספרים
      return Object.entries(this._lastSimulatedPrices).reduce((acc, [symbol, price]) => {
        acc[symbol] = typeof price === 'string' ? parseFloat(price) : price;
        return acc;
      }, {} as Record<string, number>);
    }
    
    // אם אין מחירים מדומים, השתמש במחירים אמיתיים אם יש
    if (Object.keys(this.livePrices).length > 0) {
      return { ...this.livePrices };
    }
    
    // אם אין מחירים אמיתיים או מדומים, יצור מחירים בסיסיים
    const defaultPrices: Record<string, number> = {
      'BTCUSDT': 69250.25,
      'ETHUSDT': 3475.50,
      'BNBUSDT': 608.75,
      'SOLUSDT': 188.15,
      'XRPUSDT': 0.6125,
      'ADAUSDT': 0.45,
      'DOGEUSDT': 0.16,
      'DOTUSDT': 8.25,
      'MATICUSDT': 0.78,
      'LINKUSDT': 15.85,
      'AVAXUSDT': 41.28,
      'UNIUSDT': 12.35,
      'SHIBUSDT': 0.00002654,
      'LTCUSDT': 93.21,
      'ATOMUSDT': 11.23,
      'NEARUSDT': 7.15,
      'BCHUSDT': 523.75,
      'FILUSDT': 8.93,
      'TRXUSDT': 0.1426,
      'XLMUSDT': 0.1392
    };
    
    // עדכן את המחירים המדומים הבסיסיים ב-1% לחץ או למעלה באופן אקראי
    return Object.entries(defaultPrices).reduce((acc, [symbol, basePrice]) => {
      const randomChange = (Math.random() * 0.02) - 0.01; // -1% עד +1%
      acc[symbol] = basePrice * (1 + randomChange);
      return acc;
    }, {} as Record<string, number>);
  }
  
  /**
   * Get the current price for all available symbols
   * @returns Array of ticker prices
   */
  async getAllPrices(): Promise<BinanceTickerPrice[]> {
    try {
      // השתמש ב-Axios עם פרוקסי כשצריך
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(`${this.baseUrl}/api/v3/ticker/price`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        console.log(`Successfully fetched ${response.data.length} prices from Binance`);
        return response.data;
      } else {
        console.error('Unexpected response format from Binance:', response.data);
        throw new Error('Invalid response format from Binance API');
      }
    } catch (error: any) {
      console.error('Error fetching all prices from Binance:', error.message);
      
      if (error.response?.status === 451) {
        console.log('Binance API access restricted due to geo-restriction (451)');
        throw new Error('Binance API access restricted in your region');
      } else {
        throw error; // זרוק את השגיאה המקורית
      }
    }
  }
  
  /**
   * Generate simulated market price data for development and testing
   * @returns Array of simulated ticker prices
   */
  private getSimulatedMarketPrices(): BinanceTickerPrice[] {
    // עדכון: מחירים בסיסיים מעודכנים לכל המטבעות הנפוצים (מחירים נכונים לקרוב למרץ 2023)
    const basePrices = {
      'BTCUSDT': '71530.25',
      'ETHUSDT': '3946.12',
      'BNBUSDT': '605.87',
      'SOLUSDT': '185.23',
      'XRPUSDT': '0.6215',
      'ADAUSDT': '0.5320',
      'DOGEUSDT': '0.1823',
      'DOTUSDT': '8.56',
      'MATICUSDT': '0.8935',
      'AVAXUSDT': '41.28',
      'LINKUSDT': '17.89',
      'UNIUSDT': '12.35',
      'SHIBUSDT': '0.00002654',
      'LTCUSDT': '93.21',
      'ATOMUSDT': '11.23',
      'NEARUSDT': '7.15',
      'BCHUSDT': '523.75',
      'FILUSDT': '8.93',
      'TRXUSDT': '0.1426',
      'XLMUSDT': '0.1392'
    };
    
    // שמירת המחירים האחרונים בין קריאות כדי ליצור תנועת מחירים יותר הגיונית
    if (!this._lastSimulatedPrices) {
      // אם אין לנו מחירים קודמים, שמור את המחירים הבסיסיים
      this._lastSimulatedPrices = {...basePrices};
    }

    // הוסף גם הזזה עונתית (שינוי כיוון השוק מדי פעם)
    const now = Date.now();
    const minuteOfDay = Math.floor(now / 60000) % 1440; // דקה ביום (0-1439)
    
    // יצירת מצב שוק כללי שמשתנה לאורך היום - האם שוק עולה או יורד
    const marketTrend = Math.sin(minuteOfDay / 240 * Math.PI) * 0.02; // סינוס לתנודות עולות ויורדות (-0.02 עד 0.02)
    
    // סימולציה של תנועות מחירים שמבוססות על:
    // 1. המחיר הבסיסי
    // 2. המחיר האחרון
    // 3. מגמת השוק הכללית
    // 4. רעש אקראי קטן
    const simulatedPrices: BinanceTickerPrice[] = Object.entries(basePrices).map(([symbol, basePrice]) => {
      const lastPrice = this._lastSimulatedPrices[symbol] || basePrice;
      const basePriceValue = parseFloat(basePrice);
      const lastPriceValue = parseFloat(lastPrice);
      
      // גורם אקראי אבל מותאם למגמת השוק הכללית
      const randomFactor = 0.995 + Math.random() * 0.01 + marketTrend;
      
      // הוספת יותר תנודתיות למטבעות מסוימים
      const volatilityFactor = 
        symbol === 'SOLUSDT' || symbol === 'DOGEUSDT' || symbol === 'SHIBUSDT' ? 1.5 :
        symbol === 'BTCUSDT' || symbol === 'ETHUSDT' ? 0.8 : 
        1.0;
        
      // חישוב המחיר החדש המדומה בהתבסס על המחיר האחרון + תנודתיות
      const newPrice = lastPriceValue * (1 + (randomFactor - 1) * volatilityFactor);
      
      // אחת ל-30 דקות בערך, מתכנסים חזרה למחיר הבסיסי כדי למנוע סטייה גדולה מדי
      const revertToBaseFactor = minuteOfDay % 30 === 0 ? 0.1 : 0.0;
      const finalPrice = newPrice * (1 - revertToBaseFactor) + basePriceValue * revertToBaseFactor;
      
      // עיגול בהתאם לדיוק הנדרש למטבע
      const adjustedPrice = finalPrice.toFixed(
        symbol === 'SHIBUSDT' ? 8 : 
        finalPrice < 0.1 ? 4 : 
        finalPrice < 10 ? 2 : 
        2
      );
      
      // שמור את המחיר החדש לסימולציה הבאה
      this._lastSimulatedPrices[symbol] = adjustedPrice;
      
      return {
        symbol,
        price: adjustedPrice.toString()
      };
    });
    
    return simulatedPrices;
  }
  
  // משתנה לשמירת המחירים האחרונים
  private _lastSimulatedPrices: Record<string, string> = {};
  
  /**
   * Get the current price for a specific symbol
   * @param symbol The trading pair symbol (e.g., "BTCUSDT")
   * @returns Ticker price or null if not found
   */
  async getSymbolPrice(symbol: string): Promise<BinanceTickerPrice | null> {
    try {
      // Convert symbol format if needed (e.g., "BTC-USDT" -> "BTCUSDT")
      const formattedSymbol = symbol.replace('-', '');
      
      // השתמש ב-Axios עם פרוקסי כשצריך
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(
        `${this.baseUrl}/api/v3/ticker/price`, 
        { params: { symbol: formattedSymbol } }
      );
      
      if (response.status === 200 && response.data?.symbol) {
        console.log(`Successfully fetched price for ${symbol} from Binance: ${response.data.price}`);
        return response.data;
      } else {
        console.error('Unexpected response format from Binance:', response.data);
        throw new Error('Invalid response format from Binance API');
      }
    } catch (error: any) {
      console.error(`Error fetching price for ${symbol} from Binance:`, error.message);
      
      if (error.response?.status === 451) {
        console.log(`Binance API access restricted for ${symbol} due to geo-restriction (451)`);
        throw new Error(`Binance API access restricted for ${symbol} in your region`);
      }
      
      throw error;
    }
  }
  
  /**
   * Get 24hr ticker price change statistics for a specific symbol or all symbols
   * @param symbol Optional symbol to get data for specific pair
   * @returns Array of 24hr ticker statistics
   */
  async get24hrStats(symbol?: string): Promise<Binance24hrTicker[] | Binance24hrTicker | null> {
    try {
      const params: any = {};
      if (symbol) {
        // Convert symbol format if needed (e.g., "BTC-USDT" -> "BTCUSDT")
        params.symbol = symbol.replace('-', '');
      }
      
      // השתמש ב-Axios עם פרוקסי כשצריך
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(
        `${this.baseUrl}/api/v3/ticker/24hr`, 
        { params }
      );
      
      if (response.status === 200) {
        if (symbol) {
          console.log(`Successfully fetched 24hr stats for ${symbol} from Binance`);
          return response.data;
        } else {
          console.log(`Successfully fetched 24hr stats for all symbols from Binance (${response.data.length} pairs)`);
          return response.data;
        }
      } else {
        console.error('Unexpected response format from Binance:', response.data);
        throw new Error('Invalid response format from Binance API');
      }
    } catch (error: any) {
      console.error(`Error fetching 24hr stats from Binance:`, error.message);
      
      if (error.response?.status === 451) {
        console.log(`Binance API access restricted for 24hr data due to geo-restriction (451)`);
        throw new Error('Binance API access restricted in your region');
      }
      
      throw error;
    }
  }
  
  /**
   * Generate simulated 24hr ticker statistics for development and testing
   * @param symbol The trading pair symbol
   * @returns Simulated 24hr ticker statistics
   */
  private getSimulated24hrStats(symbol: string): Binance24hrTicker {
    // קבל את המחיר הנוכחי המדומה עבור סמל זה
    const simulatedPrices = this.getSimulatedMarketPrices();
    const priceTicker = simulatedPrices.find(p => p.symbol === symbol);
    const currentPrice = priceTicker ? parseFloat(priceTicker.price) : 1000.0;
    
    // שמירת נתוני סטטיסטיקה קודמים בין קריאות
    if (!this._last24hrStats) {
      this._last24hrStats = {};
    }
    
    // מידע עונתי על מצב השוק - משתנה משעה לשעה ומיום ליום
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const minuteOfHour = now.getMinutes();
    
    // יצירת מגמה לפי שעה ויום
    // סוף השבוע לרוב יותר יציב, שעות מסחר בארה"ב יותר פעילות
    let marketConditionFactor = 0;
    
    // יום ראשון עד חמישי יותר תנודתיים (0-4)
    if (dayOfWeek < 5) {
      marketConditionFactor += 0.01;
    }
    
    // שעות פעילות בארה"ב - יותר תנודתיות (14-23 שעון ישראל)
    if (hourOfDay >= 14 && hourOfDay <= 23) {
      marketConditionFactor += 0.015;
    }
    
    // שעות מסחר באסיה - תנודתיות בינונית (2-9 שעון ישראל)
    if (hourOfDay >= 2 && hourOfDay <= 9) {
      marketConditionFactor += 0.01;
    }
    
    // מטבעות ספציפיים עם תנודתיות גבוהה יותר
    const volatileTickers = ['SOLUSDT', 'DOGEUSDT', 'SHIBUSDT', 'MATICUSDT', 'AVAXUSDT'];
    const stableTickers = ['BTCUSDT', 'ETHUSDT'];
    
    let volatilityMultiplier = 1.0;
    
    if (volatileTickers.includes(symbol)) {
      volatilityMultiplier = 1.5;
    } else if (stableTickers.includes(symbol)) {
      volatilityMultiplier = 0.8;
    }
    
    // קביעת מגמת השינוי (עולה/יורד) באופן חצי-אקראי, עם נטייה לכיוון מסוים עבור כל מטבע
    const symbolSeed = symbol.charCodeAt(0) + symbol.charCodeAt(1);
    const symbolTrend = ((symbolSeed % 10) - 5) / 10; // ערך בין -0.5 ל +0.5
    
    // יצירת אחוז שינוי שמושפע מנתוני השוק והמטבע הספציפי
    const baseChangePercent = symbolTrend + (Math.random() * 6 - 3); // בין -3% ל +3% בסיס + הטיה לפי המטבע
    const finalChangePercent = (baseChangePercent * volatilityMultiplier * (1 + marketConditionFactor)).toFixed(2);
    
    // אם יש לנו כבר נתונים קודמים, שומרים על המשכיות
    if (this._last24hrStats[symbol]) {
      const lastStats = this._last24hrStats[symbol];
      const lastChangePercent = parseFloat(lastStats.priceChangePercent);
      
      // המשכיות - 70% מהמגמה הקודמת + 30% מהמגמה החדשה לשינוי חלק
      const continuityFactor = 0.7;
      const newChangePercent = (lastChangePercent * continuityFactor + parseFloat(finalChangePercent) * (1 - continuityFactor)).toFixed(2);
      
      // חישוב שאר הנתונים בהתאם למחיר נוכחי ולשינוי
      const priceChange = (currentPrice * parseFloat(newChangePercent) / 100).toFixed(8);
      const openPrice = (currentPrice / (1 + parseFloat(newChangePercent) / 100)).toFixed(8);
      
      // עדכון high/low בהתאם למגמה, אבל שמירה על המשכיות
      const lastHighPrice = parseFloat(lastStats.highPrice);
      const newHighPriceValue = currentPrice * (1 + Math.abs(parseFloat(newChangePercent)) / 40);
      const highPrice = Math.max(
        lastHighPrice,
        newHighPriceValue
      ).toFixed(8);
      
      const lastLowPrice = parseFloat(lastStats.lowPrice); 
      const newLowPriceValue = currentPrice * (1 - Math.abs(parseFloat(newChangePercent)) / 20);
      const lowPrice = Math.min(
        lastLowPrice,
        newLowPriceValue
      ).toFixed(8);
      
      // עדכון נפח המסחר באופן הגיוני
      const volumeChangePercent = (Math.random() * 10) - 5; // שינוי נפח בין -5% ל +5%
      const lastVolume = parseFloat(lastStats.volume);
      const volume = (lastVolume * (1 + volumeChangePercent / 100)).toFixed(1);
      const quoteVolume = (parseFloat(volume) * currentPrice).toFixed(2);
      
      // יצירת חותמות זמן הגיוניות
      const closeTime = Date.now();
      const openTime = closeTime - (24 * 60 * 60 * 1000); // 24 שעות קודם
      
      // יצירת אובייקט הנתונים המעודכן
      const stats: Binance24hrTicker = {
        symbol,
        priceChange,
        priceChangePercent: newChangePercent,
        weightedAvgPrice: ((parseFloat(openPrice) + currentPrice) / 2).toFixed(8),
        prevClosePrice: openPrice,
        lastPrice: currentPrice.toFixed(8),
        lastQty: (Math.random() * 2).toFixed(2),
        bidPrice: (currentPrice * (1 - Math.random() * 0.002)).toFixed(8),
        bidQty: (Math.random() * 5 + 1).toFixed(2),
        askPrice: (currentPrice * (1 + Math.random() * 0.002)).toFixed(8),
        askQty: (Math.random() * 5 + 1).toFixed(2),
        openPrice,
        highPrice,
        lowPrice,
        volume,
        quoteVolume,
        openTime,
        closeTime,
        firstId: lastStats.firstId, // לשמירת עקביות
        lastId: lastStats.lastId + Math.floor(Math.random() * 1000),
        count: lastStats.count + Math.floor(Math.random() * 1000)
      };
      
      // שמירת הנתונים המעודכנים לפעם הבאה
      this._last24hrStats[symbol] = stats;
      
      return stats;
    } else {
      // אם אין נתונים קודמים, ייצר מידע ראשוני
      const priceChange = (currentPrice * parseFloat(finalChangePercent) / 100).toFixed(8);
      const openPrice = (currentPrice / (1 + parseFloat(finalChangePercent) / 100)).toFixed(8);
      const highPrice = (currentPrice * (1 + Math.abs(parseFloat(finalChangePercent)) / 50)).toFixed(8);
      const lowPrice = (currentPrice * (1 - Math.abs(parseFloat(finalChangePercent)) / 30)).toFixed(8);
      
      // יצירת נפח מסחר התואם את המטבע
      const baseVolume = 
        symbol === 'BTCUSDT' ? 50000 : 
        symbol === 'ETHUSDT' ? 30000 : 
        symbol.includes('USDT') ? 10000 : 
        5000;
      
      const volumeRandomFactor = 0.5 + Math.random();
      const volume = (baseVolume * volumeRandomFactor).toFixed(1);
      const quoteVolume = (parseFloat(volume) * currentPrice).toFixed(2);
      
      // יצירת חותמות זמן
      const closeTime = Date.now();
      const openTime = closeTime - (24 * 60 * 60 * 1000);
      
      // יצירת אובייקט הנתונים
      const stats: Binance24hrTicker = {
        symbol,
        priceChange,
        priceChangePercent: finalChangePercent,
        weightedAvgPrice: ((parseFloat(openPrice) + currentPrice) / 2).toFixed(8),
        prevClosePrice: openPrice,
        lastPrice: currentPrice.toFixed(8),
        lastQty: (Math.random() * 2).toFixed(2),
        bidPrice: (currentPrice * 0.999).toFixed(8),
        bidQty: (Math.random() * 5 + 1).toFixed(2),
        askPrice: (currentPrice * 1.001).toFixed(8),
        askQty: (Math.random() * 5 + 1).toFixed(2),
        openPrice,
        highPrice,
        lowPrice,
        volume,
        quoteVolume,
        openTime,
        closeTime,
        firstId: Math.floor(Math.random() * 1000),
        lastId: Math.floor(Math.random() * 100000) + 10000,
        count: Math.floor(Math.random() * 50000) + 10000
      };
      
      // שמירת הנתונים לפעם הבאה
      this._last24hrStats[symbol] = stats;
      
      return stats;
    }
  }
  
  // משתנה לשמירת נתוני הסטטיסטיקה האחרונים
  private _last24hrStats: Record<string, Binance24hrTicker> = {};
  
  /**
   * Convert OKX symbol format to Binance format
   * @param okxSymbol Symbol in OKX format (e.g., "BTC-USDT")
   * @returns Symbol in Binance format (e.g., "BTCUSDT")
   */
  static convertOkxToBinanceSymbol(okxSymbol: string): string {
    return okxSymbol.replace('-', '');
  }
  
  /**
   * Convert Binance symbol format to OKX format
   * @param binanceSymbol Symbol in Binance format (e.g., "BTCUSDT")
   * @returns Symbol in OKX format (e.g., "BTC-USDT")
   */
  static convertBinanceToOkxSymbol(binanceSymbol: string): string {
    // For USDT pairs like BTCUSDT -> BTC-USDT
    if (binanceSymbol.endsWith('USDT')) {
      return binanceSymbol.replace('USDT', '-USDT');
    } 
    // For USDC pairs like BTCUSDC -> BTC-USDC
    else if (binanceSymbol.endsWith('USDC')) {
      return binanceSymbol.replace('USDC', '-USDC');
    }
    // For other quote currencies, try to find the split point
    else {
      // Common quote currencies
      const quoteCurrencies = ['BTC', 'ETH', 'BNB', 'BUSD', 'USD'];
      
      for (const quote of quoteCurrencies) {
        if (binanceSymbol.endsWith(quote)) {
          return binanceSymbol.replace(quote, `-${quote}`);
        }
      }
      
      // If we can't determine the split point, return the original
      return binanceSymbol;
    }
  }
  
  /**
   * Get currency pairs for the most important cryptocurrencies and convert them to Binance format
   * @returns Array of symbols in Binance format
   */
  static getImportantCurrencyPairs(): string[] {
    const okxPairs = [
      'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT', 'XRP-USDT',
      'DOGE-USDT', 'ADA-USDT', 'MATIC-USDT', 'AVAX-USDT', 'DOT-USDT',
      'UNI-USDT', 'LINK-USDT', 'SHIB-USDT', 'LTC-USDT', 'ATOM-USDT',
      'NEAR-USDT', 'BCH-USDT', 'FIL-USDT', 'TRX-USDT', 'XLM-USDT'
    ];
    
    return okxPairs.map(pair => BinanceMarketPriceService.convertOkxToBinanceSymbol(pair));
  }
}

// Type definitions
export interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

export interface Binance24hrTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// Create a default instance for the service
export const binanceMarketService = new BinanceMarketPriceService(false);