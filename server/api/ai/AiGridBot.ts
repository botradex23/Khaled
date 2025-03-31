/**
 * AiGridBot.ts
 * 
 * אינטגרציה בין מערכת ה-AI המתקדמת לבין בוט ה-Grid הקיים
 * מאפשר שימוש במערכת הלמידה העמוקה לייעול והתאמה של פרמטרי הבוט
 */

import { okxService } from '../okx/okxService';
import { aiTradingSystem, MarketState } from './AITradingSystem';
import { dataCollector, TimeFrame } from './DataCollector';
import { storage } from '../../storage';
import fs from 'fs';
import path from 'path';
import { executeAiGridBotTrade } from './AiGridBotPaperTrading';

// מכיוון ש- Bot לא קיים בסכמה, אנחנו מגדירים את הטיפוס הזה כאן
interface Bot {
  id: number;
  name: string;
  strategy: string;
  description: string;
  isRunning: boolean;
  userId: number;
  parameters: string;
  tradingPair: string;
  createdAt: Date;
  lastStartedAt: Date | null;
  lastStoppedAt: Date | null;
  profitLoss: string;
  profitLossPercent: string;
  totalTrades: number;
  [key: string]: any; // שדות נוספים שעשויים להיות קיימים
}

// פרמטרים של בוט גריד מתקדם
export interface AiGridParams {
  symbol: string;                // זוג המסחר (למשל BTC-USDT)
  baseInvestment: number;        // סכום ההשקעה הבסיסי
  forcedTradeInterval: number;   // מרווח זמן מקסימלי בין עסקאות
  aiEnabled: boolean;            // האם מערכת ה-AI מופעלת
  maxPositionSize: number;       // גודל פוזיציה מקסימלי
  riskLevel: number;             // רמת סיכון (1-10)
  maxGridWidth: number;          // רוחב רשת מקסימלי באחוזים
  minGridWidth: number;          // רוחב רשת מינימלי באחוזים
  adaptiveGrids: boolean;        // התאמה דינמית של רשתות
  useVolatilityAdjustment: boolean; // התאמת פרמטרים לפי תנודתיות
  tradingHoursOnly: boolean;     // מסחר רק בשעות פעילות
  updateInterval: number;        // מרווח זמן בין עדכוני רשת (במילישניות)
}

// מידע אודות פעילות הבוט
export interface AiGridBotStats {
  activeTrades: number;          // מספר עסקאות פעילות
  completedTrades: number;       // מספר עסקאות שהושלמו
  profitLoss: number;            // רווח/הפסד כולל
  successRate: number;           // שיעור הצלחה
  lastGridUpdate: number;        // זמן עדכון הרשת האחרון
  totalVolume: number;           // נפח מסחר כולל
  currentMarketState: MarketState; // מצב השוק הנוכחי
  gridLevels: number[];          // רמות הרשת הנוכחיות
  lastActions: {                 // פעולות אחרונות
    action: 'BUY' | 'SELL' | 'GRID_UPDATE' | 'NONE';
    price: number;
    timestamp: number;
    reason: string;
  }[];
  volatility: number;            // תנודתיות נוכחית
  aiConfidence: number;          // רמת ביטחון מערכת ה-AI
}

/**
 * מסד נתונים בזיכרון לאחסון מידע על בוטים מאופשרי AI
 */
class AiGridBotDatabase {
  private bots: Map<number, {
    params: AiGridParams;
    stats: AiGridBotStats;
    botInstance: Bot;
    timers: NodeJS.Timeout[];
  }> = new Map();
  
  private dataPath: string;
  
  constructor(dataDirectory: string = 'data') {
    this.dataPath = path.join(dataDirectory, 'ai_grid_bots.json');
    
    // וודא שתיקיית הנתונים קיימת
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    
    this.loadData();
  }
  
  /**
   * טעינת נתוני בוטים מקובץ
   */
  private loadData(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
        
        for (const botData of data) {
          this.bots.set(botData.id, {
            params: botData.params,
            stats: botData.stats,
            botInstance: botData.botInstance,
            timers: []
          });
        }
        
        console.log(`Loaded ${this.bots.size} AI grid bots from storage`);
      }
    } catch (error) {
      console.error(`Error loading AI grid bot data: ${error}`);
    }
  }
  
  /**
   * שמירת נתוני הבוטים לקובץ
   */
  public saveData(): void {
    try {
      const data = Array.from(this.bots.entries()).map(([id, bot]) => ({
        id,
        params: bot.params,
        stats: bot.stats,
        botInstance: bot.botInstance
      }));
      
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving AI grid bot data: ${error}`);
    }
  }
  
  /**
   * הוספת בוט חדש למסד הנתונים
   * 
   * @param id מזהה הבוט
   * @param params פרמטרי הבוט
   * @param botInstance אובייקט הבוט
   */
  public addBot(id: number, params: AiGridParams, botInstance: Bot): void {
    const stats: AiGridBotStats = {
      activeTrades: 0,
      completedTrades: 0,
      profitLoss: 0,
      successRate: 0,
      lastGridUpdate: Date.now(),
      totalVolume: 0,
      currentMarketState: MarketState.SIDEWAYS,
      gridLevels: [],
      lastActions: [],
      volatility: 0,
      aiConfidence: 0
    };
    
    this.bots.set(id, { params, stats, botInstance, timers: [] });
    this.saveData();
  }
  
  /**
   * קבלת בוט לפי מזהה
   * 
   * @param id מזהה הבוט
   * @returns פרטי הבוט או undefined אם לא נמצא
   */
  public getBot(id: number): { params: AiGridParams; stats: AiGridBotStats; botInstance: Bot; timers: NodeJS.Timeout[] } | undefined {
    return this.bots.get(id);
  }
  
  /**
   * עדכון סטטיסטיקות של בוט
   * 
   * @param id מזהה הבוט
   * @param updatedStats סטטיסטיקות מעודכנות
   */
  public updateStats(id: number, updatedStats: Partial<AiGridBotStats>): void {
    const bot = this.bots.get(id);
    if (bot) {
      bot.stats = { ...bot.stats, ...updatedStats };
      this.saveData();
    }
  }
  
  /**
   * עדכון פרמטרים של בוט
   * 
   * @param id מזהה הבוט
   * @param updatedParams פרמטרים מעודכנים
   */
  public updateParams(id: number, updatedParams: Partial<AiGridParams>): void {
    const bot = this.bots.get(id);
    if (bot) {
      bot.params = { ...bot.params, ...updatedParams };
      this.saveData();
    }
  }
  
  /**
   * עדכון פרטי הבוט במסד הנתונים
   * 
   * @param id מזהה הבוט
   * @param botInstance אובייקט הבוט המעודכן
   */
  public updateBotInstance(id: number, botInstance: Bot): void {
    const bot = this.bots.get(id);
    if (bot) {
      bot.botInstance = botInstance;
      this.saveData();
    }
  }
  
  /**
   * הסרת בוט ממסד הנתונים
   * 
   * @param id מזהה הבוט
   * @returns אמת אם הבוט הוסר בהצלחה
   */
  public removeBot(id: number): boolean {
    const bot = this.bots.get(id);
    if (bot) {
      // ניקוי טיימרים
      bot.timers.forEach(timer => clearTimeout(timer));
      this.bots.delete(id);
      this.saveData();
      return true;
    }
    return false;
  }
  
  /**
   * הוספת טיימר לבוט
   * 
   * @param id מזהה הבוט
   * @param timer אובייקט הטיימר
   */
  public addTimer(id: number, timer: NodeJS.Timeout): void {
    const bot = this.bots.get(id);
    if (bot) {
      bot.timers.push(timer);
    }
  }
  
  /**
   * ניקוי כל הטיימרים של בוט
   * 
   * @param id מזהה הבוט
   */
  public clearTimers(id: number): void {
    const bot = this.bots.get(id);
    if (bot) {
      bot.timers.forEach(timer => clearTimeout(timer));
      bot.timers = [];
    }
  }
  
  /**
   * קבלת רשימת כל מזהי הבוטים
   * 
   * @returns מערך של מזהי בוטים
   */
  public getAllBotIds(): number[] {
    return Array.from(this.bots.keys());
  }
  
  /**
   * הוספת פעולה אחרונה לבוט
   * 
   * @param id מזהה הבוט
   * @param action פרטי הפעולה
   */
  public addAction(id: number, action: { action: 'BUY' | 'SELL' | 'GRID_UPDATE' | 'NONE'; price: number; timestamp: number; reason: string }): void {
    const bot = this.bots.get(id);
    if (bot) {
      bot.stats.lastActions.unshift(action);
      
      // שמירה רק על 10 פעולות אחרונות
      if (bot.stats.lastActions.length > 10) {
        bot.stats.lastActions = bot.stats.lastActions.slice(0, 10);
      }
      
      this.saveData();
    }
  }
}

// מסד נתונים לניהול הבוטים
const botDatabase = new AiGridBotDatabase();

/**
 * מחלקה המנהלת בוטים מאופשרי למידת מכונה
 */
export class AiGridBotManager {
  private isInitialized: boolean = false;
  
  constructor() {
    // אתחול המערכת
    this.initialize();
  }
  
  /**
   * אתחול מערכת הבוטים
   */
  private async initialize(): Promise<void> {
    try {
      // וודא שמערכת ה-AI מאותחלת
      await aiTradingSystem.start();
      
      // הפעלת ה-Paper Trading Bridge למסחר באמצעות Paper Trading
      console.log('Initializing Paper Trading support for AI Grid Bots...');
      try {
        // ייבוא והפעלת הגשר
        const { enablePaperTradingForAiGridBots } = await import('./AiGridBotPaperTrading');
        enablePaperTradingForAiGridBots(this);
        console.log('Paper Trading support initialized successfully');
      } catch (error) {
        console.error(`Failed to initialize Paper Trading support: ${error}`);
      }
      
      // אתחול כל הבוטים ששמורים במערכת
      const botIds = botDatabase.getAllBotIds();
      
      for (const botId of botIds) {
        const botData = botDatabase.getBot(botId);
        if (botData && botData.botInstance.isRunning) {
          // הפעל מחדש בוטים שהיו פעילים
          this.startBot(botId).catch(err => {
            console.error(`Error restarting bot ${botId}: ${err}`);
          });
        }
      }
      
      this.isInitialized = true;
      console.log(`AI Grid Bot Manager initialized successfully with ${botIds.length} bots`);
    } catch (error) {
      console.error(`Error initializing AI Grid Bot Manager: ${error}`);
    }
  }
  
  /**
   * יצירת בוט חדש
   * 
   * @param botId מזהה הבוט
   * @param params פרמטרי הבוט
   * @returns אובייקט הבוט החדש
   */
  public async createBot(botId: number, params: AiGridParams): Promise<Bot> {
    try {
      // קבלת נתוני הבוט הבסיסי
      const bot = await storage.getBotById(botId);
      
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }
      
      // הוספה למסד הנתונים
      botDatabase.addBot(botId, params, bot);
      
      return bot;
    } catch (error) {
      console.error(`Error creating AI grid bot ${botId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * הפעלת בוט
   * 
   * @param botId מזהה הבוט
   * @returns אובייקט הבוט המעודכן
   */
  public async startBot(botId: number): Promise<Bot> {
    try {
      const botData = botDatabase.getBot(botId);
      
      if (!botData) {
        throw new Error(`AI grid bot with ID ${botId} not found`);
      }
      
      // ניקוי טיימרים קודמים אם קיימים
      botDatabase.clearTimers(botId);
      
      // עדכון הבוט במסד הנתונים המרכזי
      const updatedBot = await storage.startBot(botId);
      
      if (!updatedBot) {
        throw new Error(`Failed to start bot with ID ${botId}`);
      }
      
      // עדכון הבוט במסד הנתונים שלנו
      botDatabase.updateBotInstance(botId, updatedBot);
      
      // אתחול רשת ראשונית
      await this.initializeGrid(botId);
      
      // הפעלת מחזורי המסחר
      this.startTradingCycles(botId);
      
      return updatedBot;
    } catch (error) {
      console.error(`Error starting AI grid bot ${botId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * אתחול רשת מסחר ראשונית
   * 
   * @param botId מזהה הבוט
   */
  private async initializeGrid(botId: number): Promise<void> {
    const botData = botDatabase.getBot(botId);
    
    if (!botData) {
      throw new Error(`AI grid bot with ID ${botId} not found`);
    }
    
    try {
      const { params } = botData;
      const { symbol } = params;
      
      // איסוף נתוני שוק עדכניים
      const timeframeData = await dataCollector.collectAndProcessData(symbol, TimeFrame.HOUR_1);
      
      // זיהוי מצב השוק
      const marketState = aiTradingSystem['identifyMarketState'](timeframeData);
      const volatility = this.calculateVolatility(timeframeData.candles.slice(-20).map(c => c.close));
      
      // קביעת רוחב רשת בהתאם למצב השוק ותנודתיות
      let gridWidth = params.minGridWidth;
      
      if (params.useVolatilityAdjustment) {
        // התאמת רוחב הרשת לפי תנודתיות השוק
        gridWidth = Math.min(
          params.maxGridWidth,
          params.minGridWidth + (params.maxGridWidth - params.minGridWidth) * (volatility * 2)
        );
      }
      
      // קבלת המחיר הנוכחי
      const currentPrice = timeframeData.candles[timeframeData.candles.length - 1].close;
      
      // חישוב גבולות הרשת
      const upperPrice = currentPrice * (1 + gridWidth / 100);
      const lowerPrice = currentPrice * (1 - gridWidth / 100);
      
      // קביעת מספר רמות הרשת בהתאם לרמת הסיכון
      const gridCount = Math.max(5, Math.min(10, 5 + params.riskLevel));
      
      // חישוב רמות הרשת
      const gridLevels = [];
      const gridStep = (upperPrice - lowerPrice) / (gridCount - 1);
      
      for (let i = 0; i < gridCount; i++) {
        gridLevels.push(lowerPrice + i * gridStep);
      }
      
      // עדכון הסטטיסטיקות
      botDatabase.updateStats(botId, {
        currentMarketState: marketState,
        gridLevels,
        volatility,
        lastGridUpdate: Date.now(),
        lastActions: [
          {
            action: 'GRID_UPDATE',
            price: currentPrice,
            timestamp: Date.now(),
            reason: 'Initial grid setup'
          },
          ...botData.stats.lastActions
        ]
      });
      
      console.log(`Initialized grid for bot ${botId} with ${gridCount} levels from ${lowerPrice} to ${upperPrice}`);
    } catch (error) {
      console.error(`Error initializing grid for bot ${botId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * חישוב תנודתיות השוק
   * 
   * @param prices מערך מחירים
   * @returns ערך התנודתיות (0-1)
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) {
      return 0;
    }
    
    // חישוב שינויים יומיים באחוזים
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    // חישוב סטיית תקן
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const squaredDiffs = returns.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // נרמול לטווח 0-1
    return Math.min(1, stdDev * 10);
  }
  
  /**
   * הפעלת מחזורי מסחר
   * 
   * @param botId מזהה הבוט
   */
  private startTradingCycles(botId: number): void {
    const botData = botDatabase.getBot(botId);
    
    if (!botData) {
      throw new Error(`AI grid bot with ID ${botId} not found`);
    }
    
    // משתנים כדי לעקוב אחרי מחזורים שרצים
    let tradingCycleInProgress = false;
    let gridUpdateInProgress = false;
    
    // טיימר למחזור מסחר רגיל
    const tradingTimer = setInterval(() => {
      // אם יש כבר מחזור שרץ, נדלג על זה כדי למנוע מהמערכת לעבוד קשה מדי
      if (tradingCycleInProgress) {
        console.log(`Skipping trading cycle for bot ${botId} - previous cycle still running`);
        return;
      }
      
      tradingCycleInProgress = true;
      
      this.executeTradingCycle(botId)
        .catch(err => {
          console.error(`Error in trading cycle for bot ${botId}: ${err}`);
        })
        .finally(() => {
          tradingCycleInProgress = false;
        });
    }, 60000); // בדיקה כל דקה
    
    // טיימר לעדכון רשת
    const gridUpdateTimer = setInterval(() => {
      // אם יש כבר עדכון שרץ, נדלג על זה
      if (gridUpdateInProgress) {
        console.log(`Skipping grid update for bot ${botId} - previous update still running`);
        return;
      }
      
      gridUpdateInProgress = true;
      
      this.updateGrid(botId)
        .catch(err => {
          console.error(`Error updating grid for bot ${botId}: ${err}`);
        })
        .finally(() => {
          gridUpdateInProgress = false;
        });
    }, botData.params.updateInterval || 3600000); // עדכון כל שעה כברירת מחדל
    
    // הוספת הטיימרים למסד הנתונים
    botDatabase.addTimer(botId, tradingTimer);
    botDatabase.addTimer(botId, gridUpdateTimer);
  }
  
  /**
   * ביצוע מחזור מסחר
   * 
   * @param botId מזהה הבוט
   */
  private async executeTradingCycle(botId: number): Promise<void> {
    const botData = botDatabase.getBot(botId);
    
    if (!botData) {
      throw new Error(`AI grid bot with ID ${botId} not found`);
    }
    
    if (!botData.botInstance.isRunning) {
      return;
    }
    
    try {
      const { params, stats } = botData;
      const { symbol } = params;
      
      // קבלת המחיר הנוכחי
      const ticker = await okxService.getTicker(symbol);
      if (!ticker || typeof ticker !== 'object' || !('data' in ticker) || !ticker.data || !ticker.data[0] || !ticker.data[0].last) {
        throw new Error(`Failed to get current price for ${symbol}`);
      }
      
      const currentPrice = parseFloat(ticker.data[0].last);
      const gridLevels = stats.gridLevels;
      
      console.log(`AI Bot ${botId}: Running trading cycle on ${symbol}, current price: ${currentPrice}`);
      console.log(`AI Bot ${botId}: Grid levels: [${gridLevels.join(', ')}]`);
      
      // קבלת החלטה מבוססת AI אם הפונקציה מופעלת
      let aiAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let aiConfidence = 0;
      let aiReason = '';
      
      if (params.aiEnabled) {
        try {
          // הפעלת מערכת ה-AI לקבלת החלטה
          const result = await aiTradingSystem.runTradingCycle(symbol);
          
          if (result) {
            aiAction = result.decision.action;
            aiConfidence = result.decision.confidence;
            aiReason = result.decision.reason;
            
            // עדכון הסטטיסטיקות
            botDatabase.updateStats(botId, {
              aiConfidence,
              currentMarketState: result.decision.marketState
            });
          }
        } catch (error) {
          console.error(`Error getting AI decision for bot ${botId}: ${error}`);
        }
      }
      
      // בדיקת חציית רמות רשת
      let gridAction: 'BUY' | 'SELL' | 'NONE' = 'NONE';
      let crossedLevel = -1;
      
      for (let i = 0; i < gridLevels.length - 1; i++) {
        const lowerLevel = gridLevels[i];
        const upperLevel = gridLevels[i + 1];
        
        // בדיקת המחיר הנוכחי ביחס לרמות הרשת
        if (currentPrice >= lowerLevel && currentPrice < upperLevel) {
          // המחיר נמצא בתוך קו רשת - בדיקת חציית גבולות
          
          // האם הגענו לגבול העליון של הרשת ועברנו אותו?
          if (i < gridLevels.length - 2 && currentPrice > upperLevel * 0.998) {
            gridAction = 'SELL';
            crossedLevel = i + 1;
            break;
          }
          
          // האם הגענו לגבול התחתון של הרשת וירדנו ממנו?
          if (i > 0 && currentPrice < lowerLevel * 1.002) {
            gridAction = 'BUY';
            crossedLevel = i;
            break;
          }
        }
      }
      
      // קבלת החלטה משולבת - AI + רשת
      let finalAction: 'BUY' | 'SELL' | 'NONE' = 'NONE';
      let reason = '';
      
      if (gridAction !== 'NONE') {
        // החלטת הרשת היא החלטה חזקה שמתבצעת תמיד
        finalAction = gridAction;
        reason = `Grid level ${crossedLevel} crossed - ${gridAction}`;
      } else if (aiAction !== 'HOLD' && aiConfidence > 0.7) {
        // החלטת ה-AI גוברת במקרה של ביטחון גבוה
        finalAction = aiAction;
        reason = `AI recommendation with high confidence (${aiConfidence.toFixed(2)}) - ${aiReason}`;
      } else {
        // בדיקת החלטה מאולצת לפי זמן
        const lastActionTime = stats.lastActions.length > 0 ? 
                              stats.lastActions[0].timestamp : 
                              Date.now() - params.forcedTradeInterval - 1;
        
        const timeSinceLastAction = Date.now() - lastActionTime;
        
        if (timeSinceLastAction > params.forcedTradeInterval) {
          // ביצוע פעולה מאולצת אם עבר מספיק זמן
          // בחירת פעולה על בסיס המיקום בתוך הרשת
          
          // מציאת הרמה הקרובה ביותר ובדיקה אם היא מעל או מתחת למחיר הנוכחי
          let closestLevel = gridLevels[0];
          let minDistance = Math.abs(currentPrice - closestLevel);
          
          for (let i = 1; i < gridLevels.length; i++) {
            const distance = Math.abs(currentPrice - gridLevels[i]);
            if (distance < minDistance) {
              minDistance = distance;
              closestLevel = gridLevels[i];
            }
          }
          
          if (currentPrice < closestLevel) {
            finalAction = 'BUY';
          } else {
            finalAction = 'SELL';
          }
          
          reason = `Forced trade after ${Math.floor(timeSinceLastAction / 60000)} minutes of inactivity`;
        }
      }
      
      // ביצוע הפעולה אם נבחרה פעולה
      if (finalAction !== 'NONE') {
        console.log(`AI Bot ${botId}: Executing ${finalAction} order at price ${currentPrice}`);
        
        try {
          // ביצוע העסקה
          const orderType = 'market';
          const amount = '0.001'; // כמות קטנה לדוגמה
          
          // המר את הפעולה לפורמט שמתקבל ע"י ה-API
          const side = finalAction === 'BUY' ? 'buy' : 'sell';
          
          // ביצוע העסקה באמצעות Paper Trading במקום OKX
          // ייבוא והשתמש בפונקציה מהמודול
          const { executeAiGridBotTrade } = await import('./AiGridBotPaperTrading');
          const paperTradingResult = await executeAiGridBotTrade(
            botId,
            symbol,
            currentPrice,
            parseFloat(amount),
            side === 'buy',
            reason,
            aiConfidence || 0.5
          );
          
          // לשם תאימות עם הקוד הקיים, גם אם אנחנו מבצעים ב-Paper Trading, נשמור את התשובה בפורמט דומה
          const result = paperTradingResult ? { 
            data: { ordId: `paper_${Date.now()}` },
            code: '0',
            msg: 'success'
          } : null;
          
          if (result && typeof result === 'object' && 'data' in result && result.data && typeof result.data === 'object' && 'ordId' in result.data) {
            console.log(`AI Bot ${botId}: ${finalAction} order executed successfully - Order ID: ${result.data.ordId}`);
            
            // עדכון סטטיסטיקות
            botDatabase.updateStats(botId, {
              activeTrades: stats.activeTrades + 1,
              totalVolume: stats.totalVolume + (currentPrice * parseFloat(amount))
            });
            
            // הוספת הפעולה להיסטוריה
            botDatabase.addAction(botId, {
              action: finalAction,
              price: currentPrice,
              timestamp: Date.now(),
              reason
            });
            
            // עדכון הסטטיסטיקות של הבוט במסד הנתונים המרכזי
            let profitLoss = stats.profitLoss;
            if (stats.lastActions.length > 1) {
              const lastAction = stats.lastActions[1];
              if (lastAction.action !== finalAction) {
                // חישוב רווח/הפסד אם זו פעולה הפוכה לפעולה הקודמת
                const priceDiff = finalAction === 'SELL' ? 
                                 (currentPrice - lastAction.price) : 
                                 (lastAction.price - currentPrice);
                
                profitLoss += priceDiff * 0.001; // רווח/הפסד מחושב על הכמות
              }
            }
            
            await storage.updateBotStatus(botId, true, {
              profitLoss: profitLoss.toFixed(2),
              profitLossPercent: ((profitLoss / params.baseInvestment) * 100).toFixed(2) + '%',
              totalTrades: stats.completedTrades + stats.activeTrades
            });
          } else {
            console.error(`AI Bot ${botId}: Failed to execute ${finalAction} order`);
          }
        } catch (error) {
          console.error(`AI Bot ${botId}: Error executing ${finalAction} order - ${error}`);
        }
      } else {
        console.log(`AI Bot ${botId}: No action taken this cycle`);
      }
    } catch (error) {
      console.error(`Error in trading cycle for bot ${botId}: ${error}`);
    }
  }
  
  /**
   * עדכון רשת המסחר
   * 
   * @param botId מזהה הבוט
   */
  private async updateGrid(botId: number): Promise<void> {
    const botData = botDatabase.getBot(botId);
    
    if (!botData) {
      throw new Error(`AI grid bot with ID ${botId} not found`);
    }
    
    if (!botData.botInstance.isRunning) {
      return;
    }
    
    try {
      const { params, stats } = botData;
      const { symbol } = params;
      
      // בדיקה אם הרשת זקוקה לעדכון
      const timeSinceLastUpdate = Date.now() - stats.lastGridUpdate;
      if (timeSinceLastUpdate < params.updateInterval / 2) {
        // לא נדרש עדכון אם עבר פחות מחצי מהזמן המוגדר
        return;
      }
      
      console.log(`AI Bot ${botId}: Updating grid parameters...`);
      
      // איסוף נתוני שוק עדכניים
      const timeframeData = await dataCollector.collectAndProcessData(symbol, TimeFrame.HOUR_1);
      
      // זיהוי מצב השוק
      const marketState = aiTradingSystem['identifyMarketState'](timeframeData);
      const volatility = this.calculateVolatility(timeframeData.candles.slice(-20).map(c => c.close));
      
      // קביעת רוחב רשת חדש בהתאם למצב השוק ותנודתיות
      let gridWidth = params.minGridWidth;
      
      if (params.useVolatilityAdjustment) {
        // התאמת רוחב הרשת לפי תנודתיות השוק
        gridWidth = Math.min(
          params.maxGridWidth,
          params.minGridWidth + (params.maxGridWidth - params.minGridWidth) * (volatility * 2)
        );
      } else if (params.adaptiveGrids) {
        // התאמת רוחב הרשת לפי מצב השוק
        if (marketState === MarketState.VOLATILE) {
          gridWidth = params.maxGridWidth * 0.8;
        } else if (marketState === MarketState.SIDEWAYS) {
          gridWidth = params.minGridWidth * 1.2;
        } else if (marketState.includes('UPTREND') || marketState.includes('DOWNTREND')) {
          gridWidth = (params.minGridWidth + params.maxGridWidth) / 2;
        }
      }
      
      // קבלת המחיר הנוכחי
      const currentPrice = timeframeData.candles[timeframeData.candles.length - 1].close;
      
      // חישוב גבולות הרשת החדשים
      const upperPrice = currentPrice * (1 + gridWidth / 100);
      const lowerPrice = currentPrice * (1 - gridWidth / 100);
      
      // קביעת מספר רמות הרשת בהתאם לרמת הסיכון
      const gridCount = Math.max(5, Math.min(10, 5 + params.riskLevel));
      
      // חישוב רמות הרשת החדשות
      const gridLevels = [];
      const gridStep = (upperPrice - lowerPrice) / (gridCount - 1);
      
      for (let i = 0; i < gridCount; i++) {
        gridLevels.push(lowerPrice + i * gridStep);
      }
      
      // עדכון הסטטיסטיקות
      botDatabase.updateStats(botId, {
        currentMarketState: marketState,
        gridLevels,
        volatility,
        lastGridUpdate: Date.now()
      });
      
      // הוספת הפעולה להיסטוריה
      botDatabase.addAction(botId, {
        action: 'GRID_UPDATE',
        price: currentPrice,
        timestamp: Date.now(),
        reason: `Grid updated due to ${marketState} market state with ${volatility.toFixed(2)} volatility`
      });
      
      console.log(`AI Bot ${botId}: Updated grid with ${gridCount} levels from ${lowerPrice.toFixed(2)} to ${upperPrice.toFixed(2)}`);
    } catch (error) {
      console.error(`Error updating grid for bot ${botId}: ${error}`);
    }
  }
  
  /**
   * עצירת בוט
   * 
   * @param botId מזהה הבוט
   * @returns אובייקט הבוט המעודכן
   */
  public async stopBot(botId: number): Promise<Bot> {
    try {
      // ניקוי טיימרים
      botDatabase.clearTimers(botId);
      
      // עדכון הבוט במסד הנתונים המרכזי
      const updatedBot = await storage.stopBot(botId);
      
      if (!updatedBot) {
        throw new Error(`Failed to stop bot with ID ${botId}`);
      }
      
      // עדכון הבוט במסד הנתונים שלנו
      botDatabase.updateBotInstance(botId, updatedBot);
      
      return updatedBot;
    } catch (error) {
      console.error(`Error stopping AI grid bot ${botId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * קבלת פרטי בוט
   * 
   * @param botId מזהה הבוט
   * @returns פרטי הבוט
   */
  public getBotDetails(botId: number): { params: AiGridParams; stats: AiGridBotStats; botInstance: Bot } | undefined {
    const botData = botDatabase.getBot(botId);
    
    if (!botData) {
      return undefined;
    }
    
    return {
      params: botData.params,
      stats: botData.stats,
      botInstance: botData.botInstance
    };
  }
  
  /**
   * עדכון פרמטרים של בוט
   * 
   * @param botId מזהה הבוט
   * @param updatedParams פרמטרים מעודכנים
   * @returns אובייקט הבוט המעודכן
   */
  public async updateBotParams(botId: number, updatedParams: Partial<AiGridParams>): Promise<Bot> {
    try {
      const botData = botDatabase.getBot(botId);
      
      if (!botData) {
        throw new Error(`AI grid bot with ID ${botId} not found`);
      }
      
      // עדכון הפרמטרים
      botDatabase.updateParams(botId, updatedParams);
      
      // עדכון הרשת אם הבוט פעיל
      if (botData.botInstance.isRunning) {
        await this.updateGrid(botId);
      }
      
      return botData.botInstance;
    } catch (error) {
      console.error(`Error updating AI grid bot ${botId} parameters: ${error}`);
      throw error;
    }
  }
  
  /**
   * בדיקת ביצועי הבוט
   * 
   * @param botId מזהה הבוט
   * @returns סטטיסטיקות ביצועים
   */
  public async getBotPerformance(botId: number): Promise<any> {
    try {
      const botData = botDatabase.getBot(botId);
      
      if (!botData) {
        throw new Error(`AI grid bot with ID ${botId} not found`);
      }
      
      // תוספת ביצועי AI
      const aiPerformance = aiTradingSystem.getPerformance();
      
      // מיזוג נתוני ביצועים
      return {
        ...botData.stats,
        aiPerformance: {
          winRate: aiPerformance.winRate,
          averageProfitLoss: aiPerformance.averageProfitLoss,
          confidence: botData.stats.aiConfidence
        }
      };
    } catch (error) {
      console.error(`Error getting AI grid bot ${botId} performance: ${error}`);
      throw error;
    }
  }
  
  /**
   * הפעלת למידה מחדש של מערכת ה-AI
   */
  public async triggerRelearning(): Promise<void> {
    try {
      // הפעלת למידה מחדש במערכת ה-AI
      await aiTradingSystem['relearn']();
      console.log('AI system relearning triggered successfully');
    } catch (error) {
      console.error(`Error triggering AI system relearning: ${error}`);
      throw error;
    }
  }
}

// יצירת מופע יחיד של מנהל הבוטים
export const aiGridBotManager = new AiGridBotManager();