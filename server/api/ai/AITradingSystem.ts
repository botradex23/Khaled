/**
 * AITradingSystem.ts
 * 
 * מערכת מסחר מבוססת AI שמשלבת את כל רכיבי הלמידה האוטומטית
 * ומנהלת את תהליך המסחר והלמידה לאורך זמן
 */

import fs from 'fs';
import path from 'path';
import { dataCollector, TimeFrame, Candle, ProcessedData } from './DataCollector';
import {
  reinforcementLearning,
  MarketState,
  State,
  Action,
  StrategyType,
  StrategyParams
} from './ReinforcementLearning';

// ייצוא מחדש של ה-MarketState כדי שיהיה נגיש מבחוץ
export { MarketState };
import { geneticAlgorithm, Chromosome } from './GeneticAlgorithm';
import { okxService } from '../okx/okxService';

// מבנה של החלטת מסחר על ידי המערכת
export interface TradingDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  timestamp: number;
  symbol: string;
  price: number;
  strategy: StrategyType;
  parameters: StrategyParams;
  tradingSignals: {
    reinforcementLearning: 'BUY' | 'SELL' | 'HOLD';
    genetic: 'BUY' | 'SELL' | 'HOLD';
    technicalIndicators: 'BUY' | 'SELL' | 'HOLD';
  };
  marketState: MarketState;
  predictions: {
    shortTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
    longTerm: 'UP' | 'DOWN' | 'SIDEWAYS';
  };
}

// מבנה של תוצאות ביצוע החלטת מסחר
export interface TradingResult {
  decision: TradingDecision;
  executed: boolean;
  executionPrice?: number;
  executionTime?: number;
  profitLoss?: number;
  reason?: string;
}

// הגדרות מערכת המסחר
export interface AITradingSystemConfig {
  symbols: string[];                   // זוגות המסחר לניטור
  timeframes: TimeFrame[];             // פרקי זמן לניתוח
  minimumConfidence: number;           // סף ביטחון מינימלי לביצוע עסקה
  relearningInterval: number;          // מרווח זמן בין למידות מחדש (במילישניות)
  forcedTradeInterval: number;         // מרווח זמן מקסימלי בין עסקאות (במילישניות)
  maxPositionSize: number;             // גודל פוזיציה מקסימלי
  enabledStrategies: StrategyType[];   // אסטרטגיות מאופשרות
}

/**
 * מחלקה ראשית של מערכת המסחר האוטומטית
 */
export class AITradingSystem {
  private config: AITradingSystemConfig;
  private dataCache: Map<string, ProcessedData> = new Map();
  private marketStateCache: Map<string, MarketState> = new Map();
  private lastDecisions: Map<string, TradingDecision> = new Map();
  private decisionHistory: TradingDecision[] = [];
  private executionHistory: TradingResult[] = [];
  private lastForcedTradeTime: Map<string, number> = new Map();
  private lastLearnTime: number = 0;
  private dataDirectory: string;
  private isRunning: boolean = false;
  private readyToTrade: boolean = false;
  
  constructor(config?: Partial<AITradingSystemConfig>, dataDirectory: string = 'data') {
    // הגדרות ברירת מחדל
    this.config = {
      symbols: ['BTC-USDT', 'ETH-USDT', 'XRP-USDT'],
      timeframes: [TimeFrame.MINUTE_15, TimeFrame.HOUR_1, TimeFrame.DAY_1],
      minimumConfidence: 0.6,
      relearningInterval: 4 * 60 * 60 * 1000, // 4 שעות
      forcedTradeInterval: 10 * 60 * 1000,    // 10 דקות
      maxPositionSize: 1000,
      enabledStrategies: [
        StrategyType.GRID_MEDIUM,
        StrategyType.TREND_FOLLOWING,
        StrategyType.COUNTER_TREND
      ]
    };
    
    // החלת הגדרות מותאמות אישית
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // וודא שתיקיית הנתונים קיימת
    this.dataDirectory = dataDirectory;
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    
    // טעינת היסטוריית החלטות קודמות
    this.loadData();
  }
  
  /**
   * טעינת נתוני היסטוריה
   */
  private loadData(): void {
    try {
      const filePath = path.join(this.dataDirectory, 'ai_trading_history.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.decisionHistory = data.decisionHistory || [];
        this.executionHistory = data.executionHistory || [];
        this.lastLearnTime = data.lastLearnTime || 0;
        
        console.log(`Loaded AI trading history with ${this.decisionHistory.length} decisions and ${this.executionHistory.length} executions`);
      }
    } catch (error) {
      console.error(`Error loading AI trading history: ${error}`);
      this.decisionHistory = [];
      this.executionHistory = [];
      this.lastLearnTime = 0;
    }
  }
  
  /**
   * שמירת נתוני היסטוריה
   */
  private saveData(): void {
    try {
      const data = {
        decisionHistory: this.decisionHistory,
        executionHistory: this.executionHistory,
        lastLearnTime: this.lastLearnTime,
        lastSaved: new Date().toISOString()
      };
      
      const filePath = path.join(this.dataDirectory, 'ai_trading_history.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Saved AI trading history with ${this.decisionHistory.length} decisions and ${this.executionHistory.length} executions`);
    } catch (error) {
      console.error(`Error saving AI trading history: ${error}`);
    }
  }
  
  /**
   * איסוף נתוני שוק מעודכנים
   * 
   * @param symbol זוג המסחר
   * @param timeframe פרק הזמן
   * @returns נתונים מעובדים
   */
  private async collectMarketData(symbol: string, timeframe: TimeFrame): Promise<ProcessedData> {
    try {
      // שליפת נתוני שוק מעודכנים מה-API
      const data = await dataCollector.collectAndProcessData(symbol, timeframe);
      
      // עדכון המטמון
      const cacheKey = `${symbol}_${timeframe}`;
      this.dataCache.set(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error(`Error collecting market data for ${symbol}/${timeframe}: ${error}`);
      
      // במקרה של שגיאה ננסה להשתמש בנתונים קיימים מהמטמון
      const cacheKey = `${symbol}_${timeframe}`;
      const cachedData = this.dataCache.get(cacheKey);
      if (cachedData) {
        console.log(`Using cached data for ${symbol}/${timeframe}`);
        return cachedData;
      }
      
      throw error;
    }
  }
  
  /**
   * זיהוי מצב השוק הנוכחי
   * 
   * @param data נתוני שוק מעובדים
   * @returns מצב השוק
   */
  private identifyMarketState(data: ProcessedData): MarketState {
    const { candles, indicators } = data;
    
    if (candles.length < 20) {
      return MarketState.SIDEWAYS; // לא מספיק נתונים
    }
    
    const currentCandle = candles[candles.length - 1];
    const previousCandles = candles.slice(-20);
    
    // חישוב תנודתיות
    const priceCloses = previousCandles.map(c => c.close);
    const avgPrice = priceCloses.reduce((sum, price) => sum + price, 0) / priceCloses.length;
    const volatility = priceCloses.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / priceCloses.length;
    const normalizedVolatility = Math.min(Math.sqrt(volatility) / avgPrice * 100, 10) / 10; // 0-1 scale
    
    // בדיקת מגמה על ידי ממוצעים נעים
    const sma20 = indicators.sma20[indicators.sma20.length - 1];
    const sma50 = indicators.sma50[indicators.sma50.length - 1];
    const sma200 = indicators.sma200[indicators.sma200.length - 1];
    
    // בדיקת התכנסות/התפשטות רצועות בולינגר
    const bollingerWidth = (indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1] - 
                           indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1]) / 
                           indicators.bollingerBands.middle[indicators.bollingerBands.middle.length - 1];
    
    // בדיקת RSI
    const currentRSI = indicators.rsi14[indicators.rsi14.length - 1];
    
    // בדיקת נפח מסחר
    const avgVolume = previousCandles.slice(0, -1).reduce((sum, c) => sum + c.volume, 0) / (previousCandles.length - 1);
    const volumeChange = currentCandle.volume / avgVolume;
    
    // זיהוי פריצות
    const isBreakingOut = currentCandle.close > indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1] && 
                         volumeChange > 1.5;
    
    const isBreakingDown = currentCandle.close < indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1] && 
                          volumeChange > 1.5;
    
    // החלטה על מצב השוק
    if (isBreakingOut) {
      return MarketState.BREAKING_OUT;
    } else if (isBreakingDown) {
      return MarketState.BREAKING_DOWN;
    } else if (normalizedVolatility > 0.7) {
      return MarketState.VOLATILE;
    } else if (sma20 > sma50 && sma50 > sma200 && currentRSI > 60) {
      return normalizedVolatility > 0.5 ? MarketState.STRONG_UPTREND : MarketState.UPTREND;
    } else if (sma20 < sma50 && sma50 < sma200 && currentRSI < 40) {
      return normalizedVolatility > 0.5 ? MarketState.STRONG_DOWNTREND : MarketState.DOWNTREND;
    } else if (bollingerWidth < 0.03) {  // רצועות צרות מאוד
      return MarketState.SIDEWAYS;
    } else if (sma20 > sma50) {
      return MarketState.WEAK_UPTREND;
    } else if (sma20 < sma50) {
      return MarketState.WEAK_DOWNTREND;
    } else {
      return MarketState.SIDEWAYS;
    }
  }
  
  /**
   * יצירת מצב (state) עבור מערכת למידה מחיזוקים
   * 
   * @param data נתוני שוק מעובדים
   * @param marketState מצב השוק
   * @returns מצב למערכת למידה מחיזוקים
   */
  private createRLState(data: ProcessedData, marketState: MarketState): State {
    const { indicators, candles } = data;
    const lastIndex = indicators.rsi14.length - 1;
    
    // חישוב תנודתיות המחיר
    const prices = candles.slice(-20).map(c => c.close);
    const priceChanges = prices.slice(1).map((price, i) => Math.abs(price - prices[i]) / prices[i]);
    const priceVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    
    // חישוב עוצמת המגמה
    const trend = this.identifyTrend(data);
    const trendStrength = trend.trend === 'bullish' ? trend.strength : (trend.trend === 'bearish' ? -trend.strength : 0);
    const normalizedTrendStrength = (trendStrength + 1) / 2;  // ממיר ל-0-1
    
    // חישוב רוחב רצועות בולינגר
    const bollingerWidth = (indicators.bollingerBands.upper[lastIndex] - indicators.bollingerBands.lower[lastIndex]) / 
                           indicators.bollingerBands.middle[lastIndex];
    
    // החלטה על הפעולה האחרונה והתוצאה שלה
    let lastAction = Action.HOLD;
    let lastActionResult = 0;
    
    if (this.lastDecisions.has(data.symbol)) {
      const lastDecision = this.lastDecisions.get(data.symbol)!;
      lastAction = lastDecision.action === 'BUY' ? Action.BUY : (lastDecision.action === 'SELL' ? Action.SELL : Action.HOLD);
      
      // בדיקה האם יש תוצאה
      const lastExecution = this.executionHistory.find(exec => exec.decision.timestamp === lastDecision.timestamp);
      if (lastExecution && lastExecution.profitLoss !== undefined) {
        lastActionResult = lastExecution.profitLoss;
      }
    }
    
    // חישוב שינוי בנפח המסחר
    const avgVolume = candles.slice(-10, -1).reduce((sum, c) => sum + c.volume, 0) / 9;
    const volumeChange = candles[candles.length - 1].volume / avgVolume - 1;  // -1 to 1+ scale
    
    // יצירת המצב
    return {
      marketState,
      priceVolatility: Math.min(priceVolatility * 10, 1),  // 0-1 scale
      trendStrength: normalizedTrendStrength,
      rsiValue: indicators.rsi14[lastIndex],
      macdHistogram: indicators.macd.histogram[lastIndex],
      bollingerWidth,
      volumeChange,
      lastAction,
      lastActionResult
    };
  }
  
  /**
   * זיהוי מגמת מחיר
   * 
   * @param data נתוני שוק מעובדים
   * @returns מגמה מזוהה ועוצמתה
   */
  private identifyTrend(data: ProcessedData): { trend: 'bullish' | 'bearish' | 'neutral', strength: number } {
    return dataCollector.identifyTrend(data);
  }
  
  /**
   * קבלת החלטת מסחר על בסיס למידה מחיזוקים
   * 
   * @param state מצב המערכת
   * @returns החלטת מסחר
   */
  private getRLDecision(state: State): { action: 'BUY' | 'SELL' | 'HOLD', strategy: StrategyType, params: StrategyParams } {
    // קבלת החלטה מהמדיניות הנוכחית
    const decision = reinforcementLearning.selectAction(state);
    
    return {
      action: decision.action === Action.BUY ? 'BUY' : (decision.action === Action.SELL ? 'SELL' : 'HOLD'),
      strategy: decision.strategyType,
      params: decision.strategyParams
    };
  }
  
  /**
   * קבלת החלטת מסחר על בסיס האלגוריתם הגנטי
   * 
   * @param marketState מצב השוק
   * @param data נתוני שוק מעובדים
   * @returns החלטת מסחר
   */
  private getGeneticDecision(
    marketState: MarketState,
    data: ProcessedData
  ): { action: 'BUY' | 'SELL' | 'HOLD', strategy: StrategyType, params: StrategyParams } {
    // ניסיון לקבל כרומוזום מותאם למצב השוק
    const bestChromosome = geneticAlgorithm.getBestChromosomeForMarketState(marketState);
    
    if (!bestChromosome) {
      // אם אין כרומוזום מתאים, נחזיר החלטה ברירת מחדל
      return {
        action: 'HOLD',
        strategy: StrategyType.GRID_MEDIUM,
        params: {
          gridParams: {
            upperPrice: data.candles[data.candles.length - 1].close * 1.1,
            lowerPrice: data.candles[data.candles.length - 1].close * 0.9,
            gridCount: 10,
            investmentPerGrid: 100
          },
          stopLossPercent: 5,
          takeProfitPercent: 10
        }
      };
    }
    
    // החלטה על פעולה לפי סוג האסטרטגיה והפרמטרים של הכרומוזום
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const { candles } = data;
    const currentPrice = candles[candles.length - 1].close;
    
    switch (bestChromosome.strategyType) {
      case StrategyType.GRID_NARROW:
      case StrategyType.GRID_MEDIUM:
      case StrategyType.GRID_WIDE:
        if (bestChromosome.params.gridParams) {
          const { upperPrice, lowerPrice } = bestChromosome.params.gridParams;
          if (currentPrice <= lowerPrice * 1.02) {
            action = 'BUY';
          } else if (currentPrice >= upperPrice * 0.98) {
            action = 'SELL';
          }
        }
        break;
        
      case StrategyType.TREND_FOLLOWING:
        if (marketState.includes('UPTREND')) {
          action = 'BUY';
        } else if (marketState.includes('DOWNTREND')) {
          action = 'SELL';
        }
        break;
        
      case StrategyType.COUNTER_TREND:
        if (marketState === MarketState.STRONG_UPTREND) {
          action = 'SELL';
        } else if (marketState === MarketState.STRONG_DOWNTREND) {
          action = 'BUY';
        }
        break;
        
      case StrategyType.BREAKOUT:
        if (marketState === MarketState.BREAKING_OUT) {
          action = 'BUY';
        } else if (marketState === MarketState.BREAKING_DOWN) {
          action = 'SELL';
        }
        break;
    }
    
    return {
      action,
      strategy: bestChromosome.strategyType,
      params: bestChromosome.params
    };
  }
  
  /**
   * קבלת החלטת מסחר על סמך אינדיקטורים טכניים
   * 
   * @param data נתוני שוק מעובדים
   * @returns החלטת מסחר
   */
  private getTechnicalDecision(data: ProcessedData): 'BUY' | 'SELL' | 'HOLD' {
    const { indicators, candles } = data;
    const lastIndex = candles.length - 1;
    
    // שימוש בתבניות מחיר
    const patterns = dataCollector.identifyPricePatterns(data);
    const relevantPatterns = patterns.filter(pattern => pattern.position === lastIndex || pattern.position === lastIndex - 1);
    
    // ניתוח תבניות וקבלת החלטה
    if (relevantPatterns.length > 0) {
      // מיון לפי רמת הביטחון
      relevantPatterns.sort((a, b) => b.confidence - a.confidence);
      
      const bestPattern = relevantPatterns[0];
      if (bestPattern.type.includes('BULLISH')) {
        return 'BUY';
      } else if (bestPattern.type.includes('BEARISH')) {
        return 'SELL';
      }
    }
    
    // אם אין תבניות ברורות, נשתמש באינדיקטורים נוספים
    // 1. MACD חוצה את קו האיתות
    const macdCrossover = indicators.macd.histogram[lastIndex] > 0 && indicators.macd.histogram[lastIndex - 1] <= 0;
    const macdCrossunder = indicators.macd.histogram[lastIndex] < 0 && indicators.macd.histogram[lastIndex - 1] >= 0;
    
    // 2. RSI ערכים קיצוניים
    const rsiOverbought = indicators.rsi14[lastIndex] > 70;
    const rsiOversold = indicators.rsi14[lastIndex] < 30;
    
    // 3. ממוצע נע חוצה את המחיר
    const priceAboveSMA50 = candles[lastIndex].close > indicators.sma50[lastIndex];
    const priceAboveSMA50Changed = (candles[lastIndex].close > indicators.sma50[lastIndex]) !== 
                                   (candles[lastIndex - 1].close > indicators.sma50[lastIndex - 1]);
    
    // 4. מחיר קרוב לרצועות בולינגר
    const nearUpperBand = candles[lastIndex].close > indicators.bollingerBands.upper[lastIndex] * 0.98;
    const nearLowerBand = candles[lastIndex].close < indicators.bollingerBands.lower[lastIndex] * 1.02;
    
    // קבלת החלטה על סמך שילוב אינדיקטורים
    let bullishSignals = 0;
    let bearishSignals = 0;
    
    // MACD
    if (macdCrossover) bullishSignals++;
    if (macdCrossunder) bearishSignals++;
    
    // RSI
    if (rsiOversold) bullishSignals++;
    if (rsiOverbought) bearishSignals++;
    
    // ממוצע נע
    if (priceAboveSMA50 && priceAboveSMA50Changed) bullishSignals++;
    if (!priceAboveSMA50 && priceAboveSMA50Changed) bearishSignals++;
    
    // רצועות בולינגר
    if (nearLowerBand) bullishSignals++;
    if (nearUpperBand) bearishSignals++;
    
    // קבלת החלטה סופית
    if (bullishSignals > bearishSignals && bullishSignals >= 2) {
      return 'BUY';
    } else if (bearishSignals > bullishSignals && bearishSignals >= 2) {
      return 'SELL';
    } else {
      return 'HOLD';
    }
  }
  
  /**
   * קבלת החלטת מסחר סופית על בסיס שילוב של כל המקורות
   * 
   * @param symbol זוג המסחר
   * @param data נתוני שוק מעובדים
   * @param marketState מצב השוק
   * @param state מצב למערכת למידה מחיזוקים
   * @returns החלטת מסחר
   */
  private makeTradingDecision(
    symbol: string,
    data: ProcessedData,
    marketState: MarketState,
    state: State
  ): TradingDecision {
    // קבלת החלטות משלושת מקורות האותות
    const rlDecision = this.getRLDecision(state);
    const geneticDecision = this.getGeneticDecision(marketState, data);
    const technicalDecision = this.getTechnicalDecision(data);
    
    // חישוב פעולה מומלצת משולבת
    let finalAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    // ספירת ההמלצות
    const buyVotes = (rlDecision.action === 'BUY' ? 1 : 0) + 
                     (geneticDecision.action === 'BUY' ? 1 : 0) + 
                     (technicalDecision === 'BUY' ? 1 : 0);
                     
    const sellVotes = (rlDecision.action === 'SELL' ? 1 : 0) + 
                      (geneticDecision.action === 'SELL' ? 1 : 0) + 
                      (technicalDecision === 'SELL' ? 1 : 0);
    
    // בדיקה אם תקופת מרווח עסקאות מאולצות עברה
    const lastForced = this.lastForcedTradeTime.get(symbol) || 0;
    const timeSinceLastForced = Date.now() - lastForced;
    const forceTradeNow = timeSinceLastForced > this.config.forcedTradeInterval;
    
    // קבלת החלטה
    if (buyVotes > sellVotes && buyVotes >= 2) {
      finalAction = 'BUY';
      confidence = 0.5 + (buyVotes / 3) * 0.5;
      reason = 'Multiple signals indicate buying opportunity';
    } else if (sellVotes > buyVotes && sellVotes >= 2) {
      finalAction = 'SELL';
      confidence = 0.5 + (sellVotes / 3) * 0.5;
      reason = 'Multiple signals indicate selling opportunity';
    } else if (forceTradeNow) {
      // אם עבר מספיק זמן מהעסקה האחרונה, נאלץ החלטה
      if (buyVotes > sellVotes || (buyVotes === sellVotes && Math.random() > 0.5)) {
        finalAction = 'BUY';
        confidence = 0.51;  // ביטחון נמוך יחסית
        reason = 'Forced trade due to time interval - weighted buy signal';
      } else {
        finalAction = 'SELL';
        confidence = 0.51;  // ביטחון נמוך יחסית
        reason = 'Forced trade due to time interval - weighted sell signal';
      }
      
      // עדכון זמן העסקה המאולצת האחרונה
      this.lastForcedTradeTime.set(symbol, Date.now());
    } else {
      finalAction = 'HOLD';
      confidence = 0.7;
      reason = 'No clear signal, maintaining position';
    }
    
    // בחירת אסטרטגיה ופרמטרים - נשתמש באלו של RL אם הוא הצביע כמו ההחלטה הסופית
    // אחרת נשתמש באלו של האלגוריתם הגנטי
    let strategy = rlDecision.strategy;
    let parameters = rlDecision.params;
    
    if (rlDecision.action !== finalAction && geneticDecision.action === finalAction) {
      strategy = geneticDecision.strategy;
      parameters = geneticDecision.params;
    }
    
    // תחזיות לטווח קצר וארוך
    const shortTermPrediction = this.predictShortTerm(data, marketState);
    const longTermPrediction = this.predictLongTerm(data, marketState);
    
    // יצירת החלטת המסחר
    const decision: TradingDecision = {
      action: finalAction,
      confidence,
      reason,
      timestamp: Date.now(),
      symbol,
      price: data.candles[data.candles.length - 1].close,
      strategy,
      parameters,
      tradingSignals: {
        reinforcementLearning: rlDecision.action,
        genetic: geneticDecision.action,
        technicalIndicators: technicalDecision
      },
      marketState,
      predictions: {
        shortTerm: shortTermPrediction,
        longTerm: longTermPrediction
      }
    };
    
    // שמירת ההחלטה האחרונה
    this.lastDecisions.set(symbol, decision);
    
    // שמירה להיסטוריה
    this.decisionHistory.push(decision);
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory.shift();
    }
    
    return decision;
  }
  
  /**
   * חיזוי מגמה לטווח קצר
   * 
   * @param data נתוני שוק מעובדים
   * @param marketState מצב השוק
   * @returns תחזית מגמה
   */
  private predictShortTerm(data: ProcessedData, marketState: MarketState): 'UP' | 'DOWN' | 'SIDEWAYS' {
    const { indicators, candles } = data;
    
    // מידע מאינדיקטורים
    const lastRSI = indicators.rsi14[indicators.rsi14.length - 1];
    const lastMACD = indicators.macd.histogram[indicators.macd.histogram.length - 1];
    const trendDirection = indicators.sma20[indicators.sma20.length - 1] > indicators.sma20[indicators.sma20.length - 5];
    
    // תחזית לפי מצב השוק
    if (marketState.includes('UPTREND') || marketState === MarketState.BREAKING_OUT) {
      return 'UP';
    } else if (marketState.includes('DOWNTREND') || marketState === MarketState.BREAKING_DOWN) {
      return 'DOWN';
    } else if (marketState === MarketState.SIDEWAYS) {
      return 'SIDEWAYS';
    }
    
    // תחזית לפי אינדיקטורים
    if (lastRSI > 60 && lastMACD > 0 && trendDirection) {
      return 'UP';
    } else if (lastRSI < 40 && lastMACD < 0 && !trendDirection) {
      return 'DOWN';
    } else {
      return 'SIDEWAYS';
    }
  }
  
  /**
   * חיזוי מגמה לטווח ארוך
   * 
   * @param data נתוני שוק מעובדים
   * @param marketState מצב השוק
   * @returns תחזית מגמה
   */
  private predictLongTerm(data: ProcessedData, marketState: MarketState): 'UP' | 'DOWN' | 'SIDEWAYS' {
    const { indicators } = data;
    
    // בדיקת יחסי ממוצעים נעים ארוכי טווח
    const sma50 = indicators.sma50[indicators.sma50.length - 1];
    const sma200 = indicators.sma200[indicators.sma200.length - 1];
    const lastRSI = indicators.rsi14[indicators.rsi14.length - 1];
    
    // בדיקת מגמה ארוכת טווח
    if (sma50 > sma200 * 1.05) {
      return 'UP';
    } else if (sma50 < sma200 * 0.95) {
      return 'DOWN';
    } else {
      // בדיקת אינדיקטורים אחרים
      if (lastRSI > 55 && marketState.includes('UPTREND')) {
        return 'UP';
      } else if (lastRSI < 45 && marketState.includes('DOWNTREND')) {
        return 'DOWN';
      } else {
        return 'SIDEWAYS';
      }
    }
  }
  
  /**
   * ביצוע החלטת מסחר דרך שליחת ההוראה לברוקר
   * 
   * @param decision החלטת המסחר
   * @returns תוצאת הביצוע
   */
  private async executeTrading(decision: TradingDecision): Promise<TradingResult> {
    // אם ההחלטה היא להחזיק, אין צורך לשלוח פקודה לשוק
    if (decision.action === 'HOLD') {
      return {
        decision,
        executed: false,
        reason: 'No action needed'
      };
    }
    
    // אם הביטחון נמוך מהסף, לא נבצע את העסקה
    if (decision.confidence < this.config.minimumConfidence) {
      return {
        decision,
        executed: false,
        reason: `Confidence (${decision.confidence}) below threshold (${this.config.minimumConfidence})`
      };
    }
    
    try {
      // בדיקה אם ה-API מוגדר כראוי (לאחר השינויים שעשינו לא להשתמש במפתחות גלובליים)
      if (!okxService.isConfigured() || okxService.hasEmptyCredentials()) {
        console.log(`Cannot execute trading decision - missing valid API credentials`);
        return {
          decision,
          executed: false,
          reason: 'API credentials not configured - running in simulation mode only'
        };
      }
      
      // קביעת פרמטרים לפקודת מסחר
      const orderType = 'market'; // נשתמש בפקודות שוק לביצוע מיידי
      const amount = '0.001'; // כמות קטנה לדוגמה - בפועל יש לחשב לפי יתרת חשבון וניהול סיכונים
      
      // שליחת הפקודה לברוקר באמצעות ה-API
      const result = await okxService.placeOrder(
        decision.symbol,
        decision.action.toLowerCase(),
        orderType,
        amount
      );
      
      console.log(`Executed ${decision.action} order for ${decision.symbol} at ${decision.price}: ${JSON.stringify(result)}`);
      
      // בדיקת תוצאת הביצוע
      if (result && typeof result === 'object' && 'data' in result && result.data && typeof result.data === 'object' && 'ordId' in result.data) {
        const executionResult: TradingResult = {
          decision,
          executed: true,
          executionPrice: decision.price,
          executionTime: Date.now(),
          reason: 'Order executed successfully'
        };
        
        // שמירת תוצאת הביצוע להיסטוריה
        this.executionHistory.push(executionResult);
        if (this.executionHistory.length > 1000) {
          this.executionHistory.shift();
        }
        
        // שמירת נתונים מעודכנים
        this.saveData();
        
        return executionResult;
      } else {
        return {
          decision,
          executed: false,
          reason: 'Order API returned invalid result'
        };
      }
    } catch (error) {
      console.error(`Error executing trading decision: ${error}`);
      return {
        decision,
        executed: false,
        reason: `Execution error: ${error}`
      };
    }
  }
  
  /**
   * עדכון תוצאות מסחר לצורך למידה
   * 
   * @param result תוצאת ביצוע ההחלטה
   */
  private async updateLearning(result: TradingResult): Promise<void> {
    // עדכון רק אם העסקה בוצעה
    if (!result.executed) {
      return;
    }
    
    try {
      const { decision } = result;
      const { symbol } = decision;
      
      // בדיקת מצב העסקה לאחר ביצוע
      // לצורך פשטות, נבדוק לאחר זמן מה את המחיר הנוכחי
      await new Promise(resolve => setTimeout(resolve, 60000)); // המתנה של דקה
      
      // קבלת מחיר עדכני
      const ticker = await okxService.getTicker(symbol);
      const currentPrice = ticker && typeof ticker === 'object' && 'data' in ticker && ticker.data?.[0]?.last ? parseFloat(ticker.data[0].last) : decision.price;
      
      // חישוב רווח/הפסד
      let profitLoss = 0;
      if (decision.action === 'BUY') {
        profitLoss = (currentPrice - decision.price) / decision.price * 100;
      } else if (decision.action === 'SELL') {
        profitLoss = (decision.price - currentPrice) / decision.price * 100;
      }
      
      // עדכון תוצאת העסקה
      result.profitLoss = profitLoss;
      
      // שאיבת מידע עדכני
      const data = await this.collectMarketData(symbol, TimeFrame.MINUTE_15);
      const marketState = this.identifyMarketState(data);
      const state = this.createRLState(data, marketState);
      
      // יצירת מצב חדש לאחר העסקה
      const nextState: State = {
        ...state,
        lastAction: decision.action === 'BUY' ? Action.BUY : Action.SELL,
        lastActionResult: profitLoss
      };
      
      // המרת פעולה למבנה למידה מחיזוקים
      const action = decision.action === 'BUY' ? Action.BUY : (decision.action === 'SELL' ? Action.SELL : Action.HOLD);
      
      // עדכון מודל הלמידה מחיזוקים
      reinforcementLearning.updatePolicy(
        action,
        state,
        nextState,
        profitLoss
      );
      
      // בנוסף, נשמור את הנתונים למודל הגנטי
      if (data.candles.length >= 30) {
        geneticAlgorithm.addMarketCondition(marketState, data.candles.slice(-30));
      }
      
      console.log(`Updated learning models with trade result: ${profitLoss.toFixed(2)}% profit/loss`);
      
      // שמירת נתונים מעודכנים
      this.saveData();
    } catch (error) {
      console.error(`Error updating learning from trade results: ${error}`);
    }
  }
  
  /**
   * למידה מחדש של המודלים על בסיס נתונים היסטוריים
   */
  private async relearn(): Promise<void> {
    console.log('Starting AI model relearning process...');
    
    try {
      // עדכון זמן הלמידה האחרונה
      this.lastLearnTime = Date.now();
      
      // איסוף נתונים היסטוריים עבור כל סמל
      for (const symbol of this.config.symbols) {
        console.log(`Collecting historical data for ${symbol}...`);
        
        // איסוף נתונים לטווחי זמן שונים
        const hourlyData = await dataCollector.collectAndProcessData(symbol, TimeFrame.HOUR_1, 300);
        const dailyData = await dataCollector.collectAndProcessData(symbol, TimeFrame.DAY_1, 100);
        
        // זיהוי מצבי שוק שונים בנתונים ההיסטוריים
        const marketStates = new Map<MarketState, { count: number, candles: Candle[] }>();
        
        // ניתוח הנתונים היומיים
        for (let i = 50; i < dailyData.candles.length; i++) {
          const slicedData = {
            ...dailyData,
            candles: dailyData.candles.slice(0, i + 1),
            indicators: {
              sma20: dailyData.indicators.sma20.slice(0, i + 1),
              sma50: dailyData.indicators.sma50.slice(0, i + 1),
              sma200: dailyData.indicators.sma200.slice(0, i + 1),
              rsi14: dailyData.indicators.rsi14.slice(0, i + 1),
              macd: {
                line: dailyData.indicators.macd.line.slice(0, i + 1),
                signal: dailyData.indicators.macd.signal.slice(0, i + 1),
                histogram: dailyData.indicators.macd.histogram.slice(0, i + 1)
              },
              atr14: dailyData.indicators.atr14.slice(0, i + 1),
              bollingerBands: {
                upper: dailyData.indicators.bollingerBands.upper.slice(0, i + 1),
                middle: dailyData.indicators.bollingerBands.middle.slice(0, i + 1),
                lower: dailyData.indicators.bollingerBands.lower.slice(0, i + 1)
              }
            }
          };
          
          const state = this.identifyMarketState(slicedData);
          
          if (!marketStates.has(state)) {
            marketStates.set(state, { count: 0, candles: [] });
          }
          
          const stateData = marketStates.get(state)!;
          stateData.count++;
          
          // שמירת הנרות הרלוונטיים למצב שוק זה
          if (stateData.candles.length < 30) {
            stateData.candles.push(dailyData.candles[i]);
          }
        }
        
        // שימוש באלגוריתם הגנטי עבור מצבי שוק שונים
        // Use Array.from to avoid iterator issues in TypeScript
        for (const [state, data] of Array.from(marketStates.entries())) {
          if (data.count >= 5 && data.candles.length >= 20) {
            console.log(`Training genetic algorithm for ${symbol} in ${state} market state...`);
            
            // אתחול אוכלוסייה ראשונית
            geneticAlgorithm.initializePopulation(
              StrategyType.GRID_MEDIUM,
              state,
              data.candles[data.candles.length - 1].close
            );
            
            // הרצת אבולוציה
            try {
              await geneticAlgorithm.evolve(data.candles, 10);
              console.log(`Completed genetic algorithm evolution for ${symbol} in ${state} market state`);
            } catch (error) {
              console.error(`Error in genetic algorithm evolution: ${error}`);
            }
          }
        }
        
        // אימון מודל למידה מחיזוקים באמצעות הנתונים ההיסטוריים
        console.log(`Training reinforcement learning model for ${symbol}...`);
        
        // מעבר על נתונים שעתיים
        for (let i = 50; i < hourlyData.candles.length - 1; i++) {
          const slicedData = {
            ...hourlyData,
            candles: hourlyData.candles.slice(0, i + 1),
            indicators: {
              sma20: hourlyData.indicators.sma20.slice(0, i + 1),
              sma50: hourlyData.indicators.sma50.slice(0, i + 1),
              sma200: hourlyData.indicators.sma200.slice(0, i + 1),
              rsi14: hourlyData.indicators.rsi14.slice(0, i + 1),
              macd: {
                line: hourlyData.indicators.macd.line.slice(0, i + 1),
                signal: hourlyData.indicators.macd.signal.slice(0, i + 1),
                histogram: hourlyData.indicators.macd.histogram.slice(0, i + 1)
              },
              atr14: hourlyData.indicators.atr14.slice(0, i + 1),
              bollingerBands: {
                upper: hourlyData.indicators.bollingerBands.upper.slice(0, i + 1),
                middle: hourlyData.indicators.bollingerBands.middle.slice(0, i + 1),
                lower: hourlyData.indicators.bollingerBands.lower.slice(0, i + 1)
              }
            }
          };
          
          const nextSlicedData = {
            ...hourlyData,
            candles: hourlyData.candles.slice(0, i + 2),
            indicators: {
              sma20: hourlyData.indicators.sma20.slice(0, i + 2),
              sma50: hourlyData.indicators.sma50.slice(0, i + 2),
              sma200: hourlyData.indicators.sma200.slice(0, i + 2),
              rsi14: hourlyData.indicators.rsi14.slice(0, i + 2),
              macd: {
                line: hourlyData.indicators.macd.line.slice(0, i + 2),
                signal: hourlyData.indicators.macd.signal.slice(0, i + 2),
                histogram: hourlyData.indicators.macd.histogram.slice(0, i + 2)
              },
              atr14: hourlyData.indicators.atr14.slice(0, i + 2),
              bollingerBands: {
                upper: hourlyData.indicators.bollingerBands.upper.slice(0, i + 2),
                middle: hourlyData.indicators.bollingerBands.middle.slice(0, i + 2),
                lower: hourlyData.indicators.bollingerBands.lower.slice(0, i + 2)
              }
            }
          };
          
          const marketState = this.identifyMarketState(slicedData);
          const nextMarketState = this.identifyMarketState(nextSlicedData);
          
          const state = this.createRLState(slicedData, marketState);
          const nextState = this.createRLState(nextSlicedData, nextMarketState);
          
          // קביעת פעולה ותגמול על בסיס ביצועים היסטוריים
          const currentPrice = slicedData.candles[i].close;
          const nextPrice = nextSlicedData.candles[i + 1].close;
          const priceChange = (nextPrice - currentPrice) / currentPrice;
          
          // החלטה על פעולה בהתאם לשינוי המחיר
          let action = Action.HOLD;
          if (priceChange > 0.01) {
            action = Action.BUY;  // אם המחיר עלה משמעותית, היה כדאי לקנות
          } else if (priceChange < -0.01) {
            action = Action.SELL;  // אם המחיר ירד משמעותית, היה כדאי למכור
          }
          
          // חישוב תגמול בהתאם לפעולה ולשינוי המחיר
          const reward = reinforcementLearning.calculateReward(action, currentPrice, nextPrice, state);
          
          // עדכון מודל הלמידה מחיזוקים
          reinforcementLearning.updatePolicy(action, state, nextState, reward);
        }
      }
      
      console.log('AI model relearning process completed successfully');
    } catch (error) {
      console.error(`Error during AI model relearning: ${error}`);
    }
  }
  
  /**
   * מחזור מסחר יחיד - ניתוח השוק, קבלת החלטה וביצועה
   * 
   * @param symbol זוג המסחר לביצוע מחזור מסחר
   * @returns תוצאת המסחר
   */
  public async runTradingCycle(symbol: string): Promise<TradingResult | null> {
    if (!this.readyToTrade) {
      console.log('AI trading system not ready yet. Preparing...');
      return null;
    }
    
    try {
      console.log(`Running trading cycle for ${symbol}...`);
      
      // איסוף נתוני שוק
      const data = await this.collectMarketData(symbol, TimeFrame.HOUR_1);
      
      // זיהוי מצב השוק
      const marketState = this.identifyMarketState(data);
      console.log(`Identified market state for ${symbol}: ${marketState}`);
      
      // עדכון המטמון
      this.marketStateCache.set(symbol, marketState);
      
      // יצירת מצב למערכת למידה מחיזוקים
      const state = this.createRLState(data, marketState);
      
      // קבלת החלטת מסחר
      const decision = this.makeTradingDecision(symbol, data, marketState, state);
      console.log(`Trading decision for ${symbol}: ${decision.action} (Confidence: ${decision.confidence.toFixed(2)})`);
      
      // בדיקה אם צריך לבצע למידה מחדש
      const timeSinceLastLearn = Date.now() - this.lastLearnTime;
      if (timeSinceLastLearn > this.config.relearningInterval) {
        console.log('Starting relearning process...');
        this.relearn(); // אין צורך לחכות לסיום התהליך
      }
      
      // ביצוע ההחלטה
      const result = await this.executeTrading(decision);
      
      // עדכון מודלי הלמידה בהתאם לתוצאות
      if (result.executed) {
        this.updateLearning(result); // אין צורך לחכות לסיום התהליך
      }
      
      return result;
    } catch (error) {
      console.error(`Error in trading cycle for ${symbol}: ${error}`);
      return null;
    }
  }
  
  /**
   * התחלת מערכת המסחר האוטומטית
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('AI trading system is already running');
      return;
    }
    
    console.log('Starting AI trading system...');
    this.isRunning = true;
    this.readyToTrade = false;
    
    try {
      // בדוק אם יש אפשרות לקבל נתוני מחירים ציבוריים - אם לא, אל תמשיך
      try {
        const testTicker = await okxService.getTicker('BTC-USDT');
        if (!testTicker?.data || !testTicker.data[0]) {
          console.error('Cannot start AI trading system - unable to access market data');
          this.isRunning = false;
          this.readyToTrade = false;
          return;
        }
      } catch (error) {
        console.error('Cannot start AI trading system - error accessing market data:', error);
        this.isRunning = false;
        this.readyToTrade = false;
        return;
      }
      // הכנת המערכת - איסוף נתונים התחלתי
      console.log('Preparing system - collecting initial data...');
      
      for (const symbol of this.config.symbols) {
        for (const timeframe of this.config.timeframes) {
          await this.collectMarketData(symbol, timeframe);
        }
      }
      
      // ביצוע למידה התחלתית אם אין נתוני למידה קודמים
      if (this.lastLearnTime === 0) {
        console.log('Performing initial learning...');
        await this.relearn();
      }
      
      this.readyToTrade = true;
      console.log('AI trading system ready - starting trading cycles');
      
      // הרצת מחזורי מסחר
      setInterval(async () => {
        if (!this.isRunning || !this.readyToTrade) return;
        
        for (const symbol of this.config.symbols) {
          await this.runTradingCycle(symbol);
          // המתנה קצרה בין מחזורי מסחר של סמלים שונים
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // שמירת נתונים מעודכנים
        this.saveData();
      }, 2 * 60 * 1000); // הרצת מחזור מסחר כל 2 דקות
    } catch (error) {
      console.error(`Error starting AI trading system: ${error}`);
      this.isRunning = false;
      this.readyToTrade = false;
    }
  }
  
  /**
   * עצירת מערכת המסחר האוטומטית
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('AI trading system is not running');
      return;
    }
    
    console.log('Stopping AI trading system...');
    this.isRunning = false;
    this.readyToTrade = false;
    
    // שמירת נתונים לפני עצירה
    this.saveData();
  }
  
  /**
   * בדיקת מצב מערכת המסחר
   * 
   * @returns מידע על מצב המערכת
   */
  public getStatus(): {
    isRunning: boolean;
    readyToTrade: boolean;
    lastLearnTime: number;
    marketStates: { [symbol: string]: MarketState };
    lastDecisions: { [symbol: string]: TradingDecision };
    decisionCount: number;
    executionCount: number;
    config: AITradingSystemConfig;
  } {
    const marketStates: { [symbol: string]: MarketState } = {};
    // Use Array.from to avoid iterator issues in TypeScript
    for (const [symbol, state] of Array.from(this.marketStateCache.entries())) {
      marketStates[symbol] = state;
    }
    
    const lastDecisions: { [symbol: string]: TradingDecision } = {};
    // Use Array.from to avoid iterator issues in TypeScript
    for (const [symbol, decision] of Array.from(this.lastDecisions.entries())) {
      lastDecisions[symbol] = decision;
    }
    
    return {
      isRunning: this.isRunning,
      readyToTrade: this.readyToTrade,
      lastLearnTime: this.lastLearnTime,
      marketStates,
      lastDecisions,
      decisionCount: this.decisionHistory.length,
      executionCount: this.executionHistory.length,
      config: this.config
    };
  }
  
  /**
   * קבלת ביצועי המערכת
   * 
   * @returns מידע על ביצועי מסחר
   */
  public getPerformance(): {
    totalTrades: number;
    successfulTrades: number;
    winRate: number;
    totalProfitLoss: number;
    averageProfitLoss: number;
    rlPerformance: any;
    largestGain: number;
    largestLoss: number;
    recentDecisions: TradingDecision[];
  } {
    const executedTrades = this.executionHistory.filter(result => result.executed && result.profitLoss !== undefined);
    const totalTrades = executedTrades.length;
    const successfulTrades = executedTrades.filter(result => (result.profitLoss || 0) > 0).length;
    const winRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;
    
    const totalProfitLoss = executedTrades.reduce((sum, result) => sum + (result.profitLoss || 0), 0);
    const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
    
    // מציאת הרווח הגדול ביותר וההפסד הגדול ביותר
    let largestGain = 0;
    let largestLoss = 0;
    
    executedTrades.forEach(result => {
      const profitLoss = result.profitLoss || 0;
      if (profitLoss > largestGain) {
        largestGain = profitLoss;
      } else if (profitLoss < largestLoss) {
        largestLoss = profitLoss;
      }
    });
    
    // קבלת ביצועי מערכת הלמידה מחיזוקים
    const rlPerformance = reinforcementLearning.analyzePerformance();
    
    // החלטות אחרונות
    const recentDecisions = this.decisionHistory.slice(-10);
    
    return {
      totalTrades,
      successfulTrades,
      winRate,
      totalProfitLoss,
      averageProfitLoss,
      rlPerformance,
      largestGain,
      largestLoss,
      recentDecisions
    };
  }
  
  /**
   * החלפת הגדרות המערכת
   * 
   * @param newConfig הגדרות חדשות
   */
  public updateConfig(newConfig: Partial<AITradingSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Updated AI trading system configuration');
  }
}

// יצירת מופע יחיד של המערכת
export const aiTradingSystem = new AITradingSystem();