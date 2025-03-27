/**
 * ReinforcementLearning.ts
 * 
 * מערכת למידה מחיזוקים מתקדמת
 * מאפשרת למערכת ללמוד מהניסיון שלה ולשפר את האסטרטגיות והחיזויים עם הזמן
 */

import fs from 'fs';
import path from 'path';

// מצבי שוק אפשריים
export enum MarketState {
  STRONG_UPTREND = 'STRONG_UPTREND',
  UPTREND = 'UPTREND',
  WEAK_UPTREND = 'WEAK_UPTREND',
  SIDEWAYS = 'SIDEWAYS',
  WEAK_DOWNTREND = 'WEAK_DOWNTREND',
  DOWNTREND = 'DOWNTREND',
  STRONG_DOWNTREND = 'STRONG_DOWNTREND',
  VOLATILE = 'VOLATILE',
  BREAKING_OUT = 'BREAKING_OUT',
  BREAKING_DOWN = 'BREAKING_DOWN'
}

// פעולות אפשריות
export enum Action {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD'
}

// סוגי אסטרטגיות אפשריות
export enum StrategyType {
  GRID_NARROW = 'GRID_NARROW',       // רשת צפופה, למצבי מסחר צידי
  GRID_MEDIUM = 'GRID_MEDIUM',       // רשת בינונית, לרוב מצבי השוק
  GRID_WIDE = 'GRID_WIDE',           // רשת רחבה, למצבי תנודתיות
  TREND_FOLLOWING = 'TREND_FOLLOWING',  // מעקב אחרי מגמה
  COUNTER_TREND = 'COUNTER_TREND',   // אסטרטגיית היפוך מגמה
  BREAKOUT = 'BREAKOUT'              // זיהוי פריצות
}

// פרמטרים של אסטרטגיית גריד
export interface GridParams {
  upperPrice: number;        // מחיר עליון של הרשת
  lowerPrice: number;        // מחיר תחתון של הרשת
  gridCount: number;         // מספר קווי הרשת
  investmentPerGrid: number; // השקעה לכל קו רשת
}

// פרמטרים של אסטרטגיה (יכול להכיל פרמטרים שונים לפי סוג האסטרטגיה)
export interface StrategyParams {
  gridParams?: GridParams;
  trendStrengthThreshold?: number;  // סף עוצמת מגמה לאסטרטגיות מגמה
  breakoutVolumeMultiplier?: number; // מכפיל נפח לזיהוי פריצות
  stopLossPercent?: number;          // אחוז הפסד מקסימלי
  takeProfitPercent?: number;        // אחוז רווח לקיחת רווחים
}

// משתנה שמייצג מצב שוק
export interface State {
  marketState: MarketState;
  priceVolatility: number;   // מדד תנודתיות המחיר (0-1)
  trendStrength: number;     // עוצמת המגמה (0-1)
  rsiValue: number;          // ערך RSI נוכחי
  macdHistogram: number;     // ערך היסטוגרמת MACD נוכחי
  bollingerWidth: number;    // רוחב רצועות בולינגר
  volumeChange: number;      // שינוי בנפח המסחר (-1 עד 1)
  lastAction: Action;        // הפעולה האחרונה שננקטה
  lastActionResult: number;  // תוצאת הפעולה האחרונה (רווח/הפסד)
}

// מדיניות הקובעת אילו פעולות לנקוט במצבים שונים
export interface Policy {
  [stateKey: string]: {
    action: Action;
    strategyType: StrategyType;
    strategyParams: StrategyParams;
    expectedReward: number;
    timesVisited: number;
    lastUpdated: number;
  }
}

// תוצאת פעולה
export interface ActionResult {
  action: Action;
  state: State;
  nextState: State;
  reward: number;
  timestamp: number;
}

// מטריצת Q (Q-table) לאלגוריתם למידה מחיזוקים מסוג Q-learning
interface QTable {
  [stateKey: string]: {
    [action: string]: number
  }
}

/**
 * מחלקת למידה מחיזוקים המיישמת אלגוריתם Q-learning
 */
export class ReinforcementLearning {
  private qTable: QTable = {};
  private policy: Policy = {};
  private learningRate: number = 0.1;  // קצב למידה
  private discountFactor: number = 0.9; // פקטור הנחתה
  private explorationRate: number = 0.2; // שיעור חקירה (אפסילון)
  private actionHistory: ActionResult[] = [];
  private dataFilePath: string;
  private explorationDecay: number = 0.995; // שיעור דעיכת החקירה
  private minExplorationRate: number = 0.05; // שיעור חקירה מינימלי
  
  constructor(dataDirectory: string = 'data') {
    // וודא שתיקיית הנתונים קיימת
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    
    this.dataFilePath = path.join(dataDirectory, 'rl_data.json');
    
    // נסה לטעון נתונים קיימים
    this.loadData();
  }
  
  /**
   * טעינת נתוני למידה קיימים
   */
  private loadData(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.dataFilePath, 'utf8'));
        this.qTable = data.qTable || {};
        this.policy = data.policy || {};
        this.actionHistory = data.actionHistory || [];
        this.explorationRate = data.explorationRate || this.explorationRate;
        
        console.log(`Loaded RL data with ${Object.keys(this.qTable).length} states and ${this.actionHistory.length} historical actions`);
      }
    } catch (error) {
      console.error(`Error loading RL data: ${error}`);
      // אתחול נתונים חדשים במקרה של שגיאה
      this.qTable = {};
      this.policy = {};
      this.actionHistory = [];
    }
  }
  
  /**
   * שמירת נתוני למידה לקובץ
   */
  private saveData(): void {
    try {
      const data = {
        qTable: this.qTable,
        policy: this.policy,
        actionHistory: this.actionHistory,
        explorationRate: this.explorationRate,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
      console.log(`Saved RL data with ${Object.keys(this.qTable).length} states and ${this.actionHistory.length} historical actions`);
    } catch (error) {
      console.error(`Error saving RL data: ${error}`);
    }
  }
  
  /**
   * המרת מצב למחרוזת מפתח לשימוש ב-Q-table
   * 
   * @param state מצב למירה למפתח
   * @returns מחרוזת מפתח
   */
  private getStateKey(state: State): string {
    // אנחנו מקדדים את המצב לתאים בדידים כדי להפחית את מרחב המצבים
    // עבור ערכים רציפים, אנחנו מעגלים למספר עשרוני מוגבל
    
    const roundedRSI = Math.round(state.rsiValue / 5) * 5;  // עיגול לקפיצות של 5
    const volatilityBucket = Math.min(Math.floor(state.priceVolatility * 10), 9);
    const trendBucket = Math.min(Math.floor(state.trendStrength * 10), 9);
    const macdBucket = Math.sign(state.macdHistogram); // 1, 0, או -1
    const volChangeBucket = Math.sign(state.volumeChange); // 1, 0, או -1
    
    return `${state.marketState}|${volatilityBucket}|${trendBucket}|${roundedRSI}|${macdBucket}|${volChangeBucket}|${state.lastAction}`;
  }
  
  /**
   * אתחול ערכי Q-table למצב חדש
   * 
   * @param stateKey מפתח המצב
   */
  private initializeState(stateKey: string): void {
    if (!this.qTable[stateKey]) {
      this.qTable[stateKey] = {
        [Action.BUY]: 0,
        [Action.SELL]: 0,
        [Action.HOLD]: 0
      };
    }
  }
  
  /**
   * בחירת פעולה לפי מדיניות אפסילון-חמדנית
   * 
   * @param state המצב הנוכחי
   * @returns הפעולה הנבחרת
   */
  public selectAction(state: State): { action: Action, strategyType: StrategyType, strategyParams: StrategyParams } {
    const stateKey = this.getStateKey(state);
    this.initializeState(stateKey);
    
    // בחינה האם לחקור (exploration) או לנצל (exploitation)
    if (Math.random() < this.explorationRate) {
      // חקירה - בחר פעולה אקראית
      const actions = [Action.BUY, Action.SELL, Action.HOLD];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      // בחירת אסטרטגיה מתאימה
      const strategyType = this.selectStrategyForAction(randomAction, state);
      const strategyParams = this.generateStrategyParams(strategyType, state);
      
      return { action: randomAction, strategyType, strategyParams };
    } else {
      // ניצול - בחר את הפעולה עם ה-Q-value הגבוה ביותר
      const qValues = this.qTable[stateKey];
      let bestAction = Action.HOLD;
      let maxQValue = -Infinity;
      
      for (const action in qValues) {
        if (qValues[action] > maxQValue) {
          maxQValue = qValues[action];
          bestAction = action as Action;
        }
      }
      
      // בדיקה אם המדיניות כבר קיימת למצב זה
      if (this.policy[stateKey]) {
        return {
          action: this.policy[stateKey].action,
          strategyType: this.policy[stateKey].strategyType,
          strategyParams: this.policy[stateKey].strategyParams
        };
      } else {
        // יצירת מדיניות חדשה עבור מצב זה
        const strategyType = this.selectStrategyForAction(bestAction, state);
        const strategyParams = this.generateStrategyParams(strategyType, state);
        
        this.policy[stateKey] = {
          action: bestAction,
          strategyType,
          strategyParams,
          expectedReward: maxQValue,
          timesVisited: 1,
          lastUpdated: Date.now()
        };
        
        return { action: bestAction, strategyType, strategyParams };
      }
    }
  }
  
  /**
   * בחירת אסטרטגיה מתאימה לפעולה ולמצב
   * 
   * @param action הפעולה שנבחרה
   * @param state המצב הנוכחי
   * @returns סוג האסטרטגיה המתאימה
   */
  private selectStrategyForAction(action: Action, state: State): StrategyType {
    // אם המצב הוא תנודתי, נשתמש ברשת רחבה
    if (state.priceVolatility > 0.7) {
      return StrategyType.GRID_WIDE;
    }
    
    // אם המצב הוא מסחר צידי, נשתמש ברשת צפופה
    if (state.marketState === MarketState.SIDEWAYS) {
      return StrategyType.GRID_NARROW;
    }
    
    // אם יש מגמה חזקה
    if (state.trendStrength > 0.7) {
      if (state.marketState.includes('UPTREND') || state.marketState.includes('DOWNTREND')) {
        return StrategyType.TREND_FOLLOWING;
      }
    }
    
    // אם RSI מצביע על מצב קיצוני
    if (state.rsiValue < 30 || state.rsiValue > 70) {
      return StrategyType.COUNTER_TREND;
    }
    
    // אם יש סימני פריצה
    if (state.marketState === MarketState.BREAKING_OUT || state.marketState === MarketState.BREAKING_DOWN) {
      return StrategyType.BREAKOUT;
    }
    
    // ברירת מחדל - רשת בינונית
    return StrategyType.GRID_MEDIUM;
  }
  
  /**
   * יצירת פרמטרים לאסטרטגיה
   * 
   * @param strategyType סוג האסטרטגיה
   * @param state המצב הנוכחי
   * @returns פרמטרים לאסטרטגיה
   */
  private generateStrategyParams(strategyType: StrategyType, state: State): StrategyParams {
    // בהתאם לסוג האסטרטגיה, ייצר פרמטרים מתאימים
    switch (strategyType) {
      case StrategyType.GRID_NARROW:
        return {
          gridParams: {
            upperPrice: 100 * (1 + 0.03), // 3% מעל המחיר הנוכחי (הנחה שהמחיר הוא 100 כערך ייחוס)
            lowerPrice: 100 * (1 - 0.03), // 3% מתחת למחיר הנוכחי
            gridCount: 10,
            investmentPerGrid: 100
          },
          stopLossPercent: 2,
          takeProfitPercent: 5
        };
        
      case StrategyType.GRID_MEDIUM:
        return {
          gridParams: {
            upperPrice: 100 * (1 + 0.08), // 8% מעל המחיר הנוכחי
            lowerPrice: 100 * (1 - 0.08), // 8% מתחת למחיר הנוכחי
            gridCount: 8,
            investmentPerGrid: 125
          },
          stopLossPercent: 4,
          takeProfitPercent: 8
        };
        
      case StrategyType.GRID_WIDE:
        return {
          gridParams: {
            upperPrice: 100 * (1 + 0.15), // 15% מעל המחיר הנוכחי
            lowerPrice: 100 * (1 - 0.15), // 15% מתחת למחיר הנוכחי
            gridCount: 6,
            investmentPerGrid: 167
          },
          stopLossPercent: 7,
          takeProfitPercent: 12
        };
        
      case StrategyType.TREND_FOLLOWING:
        return {
          trendStrengthThreshold: 0.6,
          stopLossPercent: 5,
          takeProfitPercent: 15
        };
        
      case StrategyType.COUNTER_TREND:
        return {
          trendStrengthThreshold: 0.7,
          stopLossPercent: 3,
          takeProfitPercent: 6
        };
        
      case StrategyType.BREAKOUT:
        return {
          breakoutVolumeMultiplier: 2.5,
          stopLossPercent: 6,
          takeProfitPercent: 12
        };
        
      default:
        return {
          gridParams: {
            upperPrice: 100 * (1 + 0.1),
            lowerPrice: 100 * (1 - 0.1),
            gridCount: 7,
            investmentPerGrid: 143
          },
          stopLossPercent: 5,
          takeProfitPercent: 10
        };
    }
  }
  
  /**
   * עדכון Q-table ומדיניות על סמך תוצאת הפעולה
   * 
   * @param action הפעולה שננקטה
   * @param state המצב לפני הפעולה
   * @param nextState המצב אחרי הפעולה
   * @param reward התגמול שהתקבל
   */
  public updatePolicy(action: Action, state: State, nextState: State, reward: number): void {
    const stateKey = this.getStateKey(state);
    const nextStateKey = this.getStateKey(nextState);
    
    this.initializeState(stateKey);
    this.initializeState(nextStateKey);
    
    // התוצאה למטרות היסטוריה
    const result: ActionResult = {
      action,
      state,
      nextState,
      reward,
      timestamp: Date.now()
    };
    
    // הוסף לנתונים היסטוריים
    this.actionHistory.push(result);
    if (this.actionHistory.length > 1000) {
      // הגבל את ההיסטוריה ל-1000 פעולות אחרונות
      this.actionHistory.shift();
    }
    
    // חשב את ערך Q החדש בהתאם לאלגוריתם Q-learning
    const currentQValue = this.qTable[stateKey][action];
    
    // מצא את ערך Q המקסימלי עבור המצב הבא
    const nextQValues = this.qTable[nextStateKey];
    const maxNextQValue = Math.max(...Object.values(nextQValues));
    
    // עדכן את ערך Q בהתאם לנוסחת ה-Q-learning
    const newQValue = currentQValue + this.learningRate * (
      reward + this.discountFactor * maxNextQValue - currentQValue
    );
    
    // עדכן את הטבלה
    this.qTable[stateKey][action] = newQValue;
    
    // עדכן את המדיניות אם ערך Q חדש זה הוא הטוב ביותר
    const bestAction = Object.entries(this.qTable[stateKey])
      .reduce((best, [a, q]) => q > best.q ? { action: a as Action, q } : best, 
        { action: Action.HOLD, q: -Infinity });
    
    if (this.policy[stateKey]) {
      this.policy[stateKey].timesVisited++;
      
      if (bestAction.action !== this.policy[stateKey].action) {
        // אם פעולה חדשה טובה יותר, עדכן את המדיניות
        const strategyType = this.selectStrategyForAction(bestAction.action, state);
        const strategyParams = this.generateStrategyParams(strategyType, state);
        
        this.policy[stateKey] = {
          action: bestAction.action,
          strategyType,
          strategyParams,
          expectedReward: bestAction.q,
          timesVisited: this.policy[stateKey].timesVisited,
          lastUpdated: Date.now()
        };
      } else {
        // עדכן את התגמול הצפוי
        this.policy[stateKey].expectedReward = bestAction.q;
        this.policy[stateKey].lastUpdated = Date.now();
      }
    } else {
      // יצירת מדיניות חדשה למצב זה
      const strategyType = this.selectStrategyForAction(bestAction.action, state);
      const strategyParams = this.generateStrategyParams(strategyType, state);
      
      this.policy[stateKey] = {
        action: bestAction.action,
        strategyType,
        strategyParams,
        expectedReward: bestAction.q,
        timesVisited: 1,
        lastUpdated: Date.now()
      };
    }
    
    // הפחת את שיעור החקירה עם הזמן
    this.explorationRate = Math.max(
      this.minExplorationRate,
      this.explorationRate * this.explorationDecay
    );
    
    // שמור את הנתונים
    if (this.actionHistory.length % 10 === 0) {  // שמור כל 10 פעולות
      this.saveData();
    }
  }
  
  /**
   * מחשב תגמול עבור פעולה בהתאם לתוצאות המסחר
   * 
   * @param action הפעולה שננקטה
   * @param priceBefore המחיר לפני הפעולה
   * @param priceAfter המחיר אחרי הפעולה
   * @param state מצב השוק
   * @returns התגמול המחושב
   */
  public calculateReward(action: Action, priceBefore: number, priceAfter: number, state: State): number {
    const priceChange = (priceAfter - priceBefore) / priceBefore;
    
    switch (action) {
      case Action.BUY:
        // עבור קנייה, רווח מעליית מחיר הוא חיובי
        return priceChange * 100;  // סקלה את השינוי באחוזים
        
      case Action.SELL:
        // עבור מכירה, רווח מירידת מחיר הוא חיובי
        return -priceChange * 100;  // הפוך את הסימן
        
      case Action.HOLD:
        // עבור החזקה, תגמול קטן על יציבות
        if (Math.abs(priceChange) < 0.002) {  // פחות מ-0.2% שינוי
          return 0.5;  // תגמול קטן על יציבות
        } else if (state.marketState === MarketState.SIDEWAYS && Math.abs(priceChange) < 0.01) {
          // במצב שוק אופקי, החזקה היא החלטה טובה
          return 1;
        } else {
          // אחרת, תגמול ניטרלי
          return 0;
        }
    }
  }
  
  /**
   * קבלת ערכי Q לכל הפעולות האפשריות במצב נתון
   * 
   * @param state המצב הנוכחי
   * @returns מיפוי של פעולות לערכי Q שלהן
   */
  public getQValues(state: State): { [action in Action]: number } {
    const stateKey = this.getStateKey(state);
    this.initializeState(stateKey);
    return this.qTable[stateKey] as { [action in Action]: number };
  }
  
  /**
   * קבלת מדיניות עבור מצב נתון
   * 
   * @param state המצב הנוכחי
   * @returns מדיניות למצב זה או undefined אם אין מדיניות קיימת
   */
  public getPolicyForState(state: State): {
    action: Action;
    strategyType: StrategyType;
    strategyParams: StrategyParams;
    expectedReward: number;
  } | undefined {
    const stateKey = this.getStateKey(state);
    if (this.policy[stateKey]) {
      return {
        action: this.policy[stateKey].action,
        strategyType: this.policy[stateKey].strategyType,
        strategyParams: this.policy[stateKey].strategyParams,
        expectedReward: this.policy[stateKey].expectedReward
      };
    }
    return undefined;
  }
  
  /**
   * קבלת היסטוריית הפעולות האחרונות
   * 
   * @param limit מספר פעולות מקסימלי להחזרה
   * @returns היסטוריית פעולות אחרונות
   */
  public getActionHistory(limit: number = 100): ActionResult[] {
    return this.actionHistory.slice(-limit);
  }
  
  /**
   * ניתוח ביצועים של האסטרטגיה
   * 
   * @returns מטריקות ביצועים
   */
  public analyzePerformance(): {
    totalReward: number;
    averageReward: number;
    successRate: number;
    policyStability: number;
    explorationRate: number;
  } {
    if (this.actionHistory.length === 0) {
      return {
        totalReward: 0,
        averageReward: 0,
        successRate: 0,
        policyStability: 0,
        explorationRate: this.explorationRate
      };
    }
    
    const totalReward = this.actionHistory.reduce((sum, result) => sum + result.reward, 0);
    const averageReward = totalReward / this.actionHistory.length;
    
    // חישוב שיעור ההצלחה (פעולות עם תגמול חיובי)
    const successfulActions = this.actionHistory.filter(result => result.reward > 0).length;
    const successRate = successfulActions / this.actionHistory.length;
    
    // יציבות המדיניות - אחוז המצבים שבהם המדיניות לא השתנתה בזמן האחרון
    const recentTimestamp = Date.now() - 24 * 60 * 60 * 1000;  // 24 שעות אחרונות
    const stableStates = Object.values(this.policy).filter(
      policy => policy.timesVisited > 5 && policy.lastUpdated < recentTimestamp
    ).length;
    const policyStability = stableStates / Math.max(1, Object.keys(this.policy).length);
    
    return {
      totalReward,
      averageReward,
      successRate,
      policyStability,
      explorationRate: this.explorationRate
    };
  }
}

// יצירת מופע יחיד של המחלקה לשימוש בכל המערכת
export const reinforcementLearning = new ReinforcementLearning();