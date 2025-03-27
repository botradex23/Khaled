/**
 * DataCollector.ts
 * 
 * מערכת איסוף הנתונים והמידע ההיסטורי עבור מערכת הלמידה
 * אוספת מידע מה-API של OKX ומארגנת אותו במבנה מתאים לניתוח מתקדם
 */

import { okxService } from "../okx/okxService";
import axios from 'axios';

// סוגי פרקי זמן שהמערכת תומכת בהם
export enum TimeFrame {
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_15 = '15m',
  MINUTE_30 = '30m',
  HOUR_1 = '1H',
  HOUR_4 = '4H',
  HOUR_12 = '12H',
  DAY_1 = '1D',
  WEEK_1 = '1W'
}

// מבנה הנתונים של נר בודד (candlestick)
export interface Candle {
  timestamp: number;   // זמן פתיחת הנר באלפי שניה מאפוכה
  open: number;        // מחיר פתיחה
  high: number;        // מחיר גבוה ביותר
  low: number;         // מחיר נמוך ביותר
  close: number;       // מחיר סגירה
  volume: number;      // נפח מסחר
}

// מבנה נתונים מעובד עם אינדיקטורים
export interface ProcessedData {
  candles: Candle[];   // נתוני הנרות
  symbol: string;      // הזוג הנסחר
  timeframe: TimeFrame; // פרק הזמן
  indicators: {        // אינדיקטורים טכניים
    sma20: number[];   // ממוצע נע פשוט ל-20 נרות
    sma50: number[];   // ממוצע נע פשוט ל-50 נרות
    sma200: number[];  // ממוצע נע פשוט ל-200 נרות
    rsi14: number[];   // אינדיקטור RSI ל-14 תקופות
    macd: {            // אינדיקטור MACD
      line: number[];  // קו MACD
      signal: number[]; // קו איתות
      histogram: number[]; // היסטוגרמה
    };
    atr14: number[];   // ממוצע טווח אמיתי (ATR) ל-14 תקופות
    bollingerBands: {  // רצועות בולינגר
      upper: number[];  // רצועה עליונה
      middle: number[]; // רצועה אמצעית
      lower: number[];  // רצועה תחתונה
    };
  };
}

/**
 * מחלקה לאיסוף ועיבוד נתוני מחירים
 */
export class DataCollector {
  /**
   * שולף נתוני נרות היסטוריים עבור זוג מסחר ופרק זמן
   * 
   * @param symbol זוג המסחר (למשל BTC-USDT)
   * @param timeframe פרק הזמן לנרות
   * @param limit מספר הנרות המקסימלי להחזרה
   * @returns מערך של נתוני נרות
   */
  public async fetchCandles(
    symbol: string,
    timeframe: TimeFrame = TimeFrame.HOUR_1,
    limit: number = 300  // מחזיר 300 נרות כברירת מחדל - מספיק להרבה אינדיקטורים
  ): Promise<Candle[]> {
    try {
      // שימוש בשירות OKX לקבלת נתוני נרות
      const response = await okxService.getKlineData(symbol, timeframe, limit);
      
      if (!response || !response.data) {
        throw new Error(`No data returned for ${symbol}`);
      }
      
      // המרת הנתונים למבנה הנתונים שלנו
      return response.data.map((item: any): Candle => {
        // נתונים נכנסים מ-OKX בפורמט [timestamp, open, high, low, close, volume, ...]
        return {
          timestamp: parseInt(item[0]),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        };
      });
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}: ${error}`);
      throw error;
    }
  }

  /**
   * חישוב ממוצע נע פשוט (SMA)
   * 
   * @param prices מערך של מחירים
   * @param period תקופת הממוצע הנע
   * @returns מערך של ערכי ממוצע נע
   */
  private calculateSMA(prices: number[], period: number): number[] {
    const result: number[] = [];
    
    // לכל נקודת זמן, חשב את הממוצע של period הערכים האחרונים
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        // אין מספיק נתונים לחישוב הממוצע הנע
        result.push(NaN);
      } else {
        // חישוב ממוצע מ-(i-period+1) עד i
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += prices[j];
        }
        result.push(sum / period);
      }
    }
    
    return result;
  }

  /**
   * חישוב אינדיקטור RSI (Relative Strength Index)
   * 
   * @param prices מערך של מחירים
   * @param period תקופת ה-RSI (בדרך כלל 14)
   * @returns מערך של ערכי RSI
   */
  private calculateRSI(prices: number[], period: number = 14): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // חישוב שינויים במחיר
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // אין מספיק נתונים
    if (gains.length < period) {
      return Array(prices.length).fill(NaN);
    }
    
    // חישוב ממוצע ראשוני של רווחים והפסדים
    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    // הערך הראשון של RSI
    result.push(NaN); // אין RSI לנקודת המחיר הראשונה
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
    
    // חישוב RSI לשאר הנקודות
    for (let i = period; i < gains.length; i++) {
      // חישוב ממוצע נע של רווחים והפסדים
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
    
    // השלם את המערך אם יש ערכים חסרים
    while (result.length < prices.length) {
      result.unshift(NaN);
    }
    
    return result;
  }

  /**
   * חישוב אינדיקטור MACD (Moving Average Convergence Divergence)
   * 
   * @param prices מערך של מחירים
   * @param fastPeriod התקופה המהירה (בדרך כלל 12)
   * @param slowPeriod התקופה האיטית (בדרך כלל 26)
   * @param signalPeriod תקופת האיתות (בדרך כלל 9)
   * @returns אובייקט עם קווי MACD, איתות, והיסטוגרמה
   */
  private calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { line: number[]; signal: number[]; histogram: number[] } {
    // חישוב EMA מהיר ואיטי
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // חישוב קו MACD (fastEMA - slowEMA)
    const macdLine = fastEMA.map((fast, i) => {
      return isNaN(fast) || isNaN(slowEMA[i]) ? NaN : fast - slowEMA[i];
    });
    
    // חישוב קו האיתות (EMA of MACD line)
    const signalLine = this.calculateEMA(
      macdLine.filter(val => !isNaN(val)),
      signalPeriod
    );
    
    // מילוי קו האיתות עם NaN עבור הערכים החסרים
    const filledSignalLine = Array(macdLine.length).fill(NaN);
    const validMacdValues = macdLine.filter(val => !isNaN(val)).length;
    for (let i = 0; i < signalLine.length; i++) {
      filledSignalLine[macdLine.length - validMacdValues + i] = signalLine[i];
    }
    
    // חישוב ההיסטוגרמה (MACD line - Signal line)
    const histogram = macdLine.map((macd, i) => {
      return isNaN(macd) || isNaN(filledSignalLine[i]) ? 
        NaN : 
        macd - filledSignalLine[i];
    });
    
    return {
      line: macdLine,
      signal: filledSignalLine,
      histogram: histogram
    };
  }

  /**
   * חישוב ממוצע נע מעריכי (EMA)
   * 
   * @param prices מערך של מחירים
   * @param period תקופת הממוצע הנע
   * @returns מערך של ערכי EMA
   */
  private calculateEMA(prices: number[], period: number): number[] {
    const result: number[] = [];
    const k = 2 / (period + 1);
    
    // מחשב SMA ראשוני
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else if (i === period - 1) {
        result.push(ema);
      } else {
        ema = (prices[i] * k) + (ema * (1 - k));
        result.push(ema);
      }
    }
    
    return result;
  }

  /**
   * חישוב ATR (Average True Range)
   * 
   * @param candles מערך של נרות
   * @param period תקופת ATR (בדרך כלל 14)
   * @returns מערך של ערכי ATR
   */
  private calculateATR(candles: Candle[], period: number = 14): number[] {
    const trueRanges: number[] = [];
    const result: number[] = [];
    
    // חישוב טווחים אמיתיים
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        // נר ראשון, הטווח האמיתי הוא פשוט high - low
        trueRanges.push(candles[i].high - candles[i].low);
      } else {
        // מצא את הטווח האמיתי המקסימלי
        const tr1 = candles[i].high - candles[i].low;
        const tr2 = Math.abs(candles[i].high - candles[i-1].close);
        const tr3 = Math.abs(candles[i].low - candles[i-1].close);
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }
    }
    
    // חישוב ATR כממוצע נע של טווחים אמיתיים
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        result.push(NaN);
      } else if (i === period) {
        result.push(atr);
      } else {
        atr = ((atr * (period - 1)) + trueRanges[i]) / period;
        result.push(atr);
      }
    }
    
    return result;
  }

  /**
   * חישוב רצועות בולינגר
   * 
   * @param prices מערך של מחירים
   * @param period תקופת הממוצע (בדרך כלל 20)
   * @param multiplier מכפיל סטיית התקן (בדרך כלל 2)
   * @returns אובייקט עם רצועות עליונה, אמצעית, ותחתונה
   */
  private calculateBollingerBands(
    prices: number[],
    period: number = 20,
    multiplier: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        // אין מספיק נתונים עדיין
        upper.push(NaN);
        middle.push(NaN);
        lower.push(NaN);
      } else {
        // חישוב ממוצע
        const values = prices.slice(i - period + 1, i + 1);
        const avg = values.reduce((sum, price) => sum + price, 0) / period;
        
        // חישוב סטיית תקן
        const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
        const stdDev = Math.sqrt(variance);
        
        middle.push(avg);
        upper.push(avg + (multiplier * stdDev));
        lower.push(avg - (multiplier * stdDev));
      }
    }
    
    return { upper, middle, lower };
  }

  /**
   * עיבוד נתוני נרות וחישוב אינדיקטורים
   * 
   * @param candles מערך של נתוני נרות
   * @param symbol זוג המסחר
   * @param timeframe פרק הזמן
   * @returns נתונים מעובדים עם אינדיקטורים
   */
  public processData(
    candles: Candle[],
    symbol: string,
    timeframe: TimeFrame
  ): ProcessedData {
    // שליפת מערך של מחירי סגירה
    const closePrices = candles.map(candle => candle.close);
    
    // חישוב אינדיקטורים
    const sma20 = this.calculateSMA(closePrices, 20);
    const sma50 = this.calculateSMA(closePrices, 50);
    const sma200 = this.calculateSMA(closePrices, 200);
    const rsi14 = this.calculateRSI(closePrices, 14);
    const macd = this.calculateMACD(closePrices);
    const atr14 = this.calculateATR(candles, 14);
    const bollingerBands = this.calculateBollingerBands(closePrices);
    
    // הכנת הנתונים המעובדים
    return {
      candles,
      symbol,
      timeframe,
      indicators: {
        sma20,
        sma50,
        sma200,
        rsi14,
        macd,
        atr14,
        bollingerBands
      }
    };
  }

  /**
   * איסוף וניתוח נתונים לזוג מסחר מסוים
   * 
   * @param symbol זוג המסחר
   * @param timeframe פרק הזמן
   * @param limit מספר הנרות המקסימלי
   * @returns נתונים מעובדים עם אינדיקטורים
   */
  public async collectAndProcessData(
    symbol: string,
    timeframe: TimeFrame = TimeFrame.HOUR_1,
    limit: number = 300
  ): Promise<ProcessedData> {
    try {
      // שליפת נתוני נרות מה-API
      const candles = await this.fetchCandles(symbol, timeframe, limit);
      
      // עיבוד הנתונים והחזרתם
      return this.processData(candles, symbol, timeframe);
    } catch (error) {
      console.error(`Error collecting data for ${symbol}: ${error}`);
      throw error;
    }
  }

  /**
   * שימוש באלגוריתם למידת מכונה לזיהוי תבניות מחיר
   * בשלב זה מימוש פשוט, בעתיד יכול להיות מוחלף בשימוש בספריות ML
   * 
   * @param data הנתונים המעובדים עם אינדיקטורים
   * @returns תבניות מחיר שזוהו עם ציון אמון
   */
  public identifyPricePatterns(data: ProcessedData): any[] {
    const patterns = [];
    const { candles, indicators } = data;
    const { rsi14, macd, bollingerBands } = indicators;
    
    // לולאה על הנרות לבדיקת תבניות
    for (let i = 50; i < candles.length; i++) {  // מתחיל מ-50 להבטיח שיש מספיק היסטוריה
      // תבנית 1: RSI בתנאי oversold (מתחת ל-30) עם דיברגנס חיובי
      if (rsi14[i-5] < 30 && rsi14[i] > 30 && rsi14[i] > rsi14[i-1]) {
        if (candles[i-5].low < candles[i].low && rsi14[i-5] < rsi14[i]) {
          patterns.push({
            type: 'BULLISH_RSI_DIVERGENCE',
            position: i,
            confidence: 0.7,
            reason: 'RSI oversold with positive divergence'
          });
        }
      }
      
      // תבנית 2: חציית MACD מלמטה למעלה
      if (i > 1 && macd.histogram[i-1] <= 0 && macd.histogram[i] > 0) {
        patterns.push({
          type: 'BULLISH_MACD_CROSSOVER',
          position: i,
          confidence: 0.65,
          reason: 'MACD line crossed above signal line'
        });
      }
      
      // תבנית 3: חציית MACD מלמעלה למטה
      if (i > 1 && macd.histogram[i-1] >= 0 && macd.histogram[i] < 0) {
        patterns.push({
          type: 'BEARISH_MACD_CROSSOVER',
          position: i,
          confidence: 0.65,
          reason: 'MACD line crossed below signal line'
        });
      }
      
      // תבנית 4: מחיר קרוב לרצועת בולינגר תחתונה
      const lowerBandDistance = (candles[i].close - bollingerBands.lower[i]) / candles[i].close;
      if (lowerBandDistance < 0.005 && lowerBandDistance > -0.01) {  // 0.5% קרוב או מתחת קלות
        patterns.push({
          type: 'PRICE_NEAR_LOWER_BOLLINGER',
          position: i,
          confidence: 0.6,
          reason: 'Price near or slightly below lower Bollinger band'
        });
      }
      
      // תבנית 5: מחיר חוצה את ממוצע נע 50 מלמטה למעלה
      if (i > 1 && candles[i-1].close < indicators.sma50[i-1] && candles[i].close > indicators.sma50[i]) {
        patterns.push({
          type: 'BULLISH_SMA50_CROSSOVER',
          position: i,
          confidence: 0.7,
          reason: 'Price crossed above 50-period SMA'
        });
      }
      
      // תבנית 6: מחיר חוצה את ממוצע נע 50 מלמעלה למטה
      if (i > 1 && candles[i-1].close > indicators.sma50[i-1] && candles[i].close < indicators.sma50[i]) {
        patterns.push({
          type: 'BEARISH_SMA50_CROSSOVER',
          position: i,
          confidence: 0.7,
          reason: 'Price crossed below 50-period SMA'
        });
      }
      
      // ניתן להוסיף תבניות רבות נוספות כאן...
    }
    
    return patterns;
  }
  
  /**
   * זיהוי מגמות מחיר ארוכות טווח
   * 
   * @param data הנתונים המעובדים עם אינדיקטורים
   * @returns זיהוי מגמה עם ציון עוצמה
   */
  public identifyTrend(data: ProcessedData): { trend: 'bullish' | 'bearish' | 'neutral', strength: number } {
    const { candles, indicators } = data;
    const { sma20, sma50, sma200 } = indicators;
    
    // בדיקת המיקום של ממוצעים נעים אחד ביחס לשני
    const lastIdx = candles.length - 1;
    const smaAlignmentBullish = sma20[lastIdx] > sma50[lastIdx] && sma50[lastIdx] > sma200[lastIdx];
    const smaAlignmentBearish = sma20[lastIdx] < sma50[lastIdx] && sma50[lastIdx] < sma200[lastIdx];
    
    // בדיקת היחס בין מחיר הסגירה לבין הממוצעים הנעים
    const priceAboveSma20 = candles[lastIdx].close > sma20[lastIdx];
    const priceAboveSma50 = candles[lastIdx].close > sma50[lastIdx];
    const priceAboveSma200 = candles[lastIdx].close > sma200[lastIdx];
    
    const bullishPoints = (smaAlignmentBullish ? 3 : 0) + 
                          (priceAboveSma20 ? 1 : 0) + 
                          (priceAboveSma50 ? 2 : 0) + 
                          (priceAboveSma200 ? 3 : 0);
    
    const bearishPoints = (smaAlignmentBearish ? 3 : 0) + 
                          (!priceAboveSma20 ? 1 : 0) + 
                          (!priceAboveSma50 ? 2 : 0) + 
                          (!priceAboveSma200 ? 3 : 0);
    
    // קביעת המגמה ועוצמתה
    if (bullishPoints > bearishPoints) {
      return { trend: 'bullish', strength: bullishPoints / 9 }; // 9 הוא הציון המקסימלי
    } else if (bearishPoints > bullishPoints) {
      return { trend: 'bearish', strength: bearishPoints / 9 };
    } else {
      return { trend: 'neutral', strength: 0.4 };
    }
  }
}

// יצירת מופע יחיד של המחלקה לשימוש בכל המערכת
export const dataCollector = new DataCollector();