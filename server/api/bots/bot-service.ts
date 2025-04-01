/**
 * bot-service.ts
 * 
 * שירות מרכזי לניהול בוטים
 */

import { storage } from '../../storage';
import { TradingBot, InsertTradingBot } from '@shared/schema';
import { aiGridBotManager } from '../ai/AiGridBot';
import { AITradingSystem } from '../ai/AITradingSystem';
import { getPaperTradingBridge } from '../paper-trading/PaperTradingBridge';

// סוגי האסטרטגיות הנתמכות
export enum BotStrategyType {
  AI_GRID = 'ai_grid',
  DCA = 'dca',
  MACD = 'macd',
}

// פרמטרים משותפים לכל סוגי הבוטים
interface BaseBotParameters {
  symbol: string;
  investmentAmount: number;
  enabled: boolean;
}

// פרמטרים ספציפיים לבוט AI Grid
export interface AiGridBotParameters extends BaseBotParameters {
  gridLevels: number;
  upperLimit: number;
  lowerLimit: number;
  aiOptimized: boolean;
  adaptToVolatility: boolean;
  maxPositionSize: number;
  riskLevel: number;
}

// פרמטרים ספציפיים לבוט DCA
export interface DcaBotParameters extends BaseBotParameters {
  intervalHours: number;
  totalBudget: number;
  purchaseAmount: number;
  maxPurchases: number;
  priceTargetPercentage: number;
  enableStopLoss: boolean;
  stopLossPercentage: number;
}

// פרמטרים ספציפיים לבוט MACD
export interface MacdBotParameters extends BaseBotParameters {
  shortEMA: number;
  longEMA: number;
  signalPeriod: number;
  positionSize: number;
  takeProfitPercentage: number;
  stopLossPercentage: number;
  timeframe: string;
  confirmationCandles: number;
}

// טיפוס כללי לפרמטרי בוט
export type BotParameters = AiGridBotParameters | DcaBotParameters | MacdBotParameters;

/**
 * שירות מרכזי לניהול בוטים
 */
class BotService {
  private aiTradingSystem: AITradingSystem | null = null;
  
  /**
   * אתחול שירות הבוטים
   */
  public async initialize(): Promise<void> {
    console.log('Initializing Bot Service...');
    
    try {
      // איתחול הבוטים השמורים
      await this.loadSavedBots();
      
      // חיבור למערכת ה-AI אם קיימת
      if (global.aiTradingSystem) {
        this.aiTradingSystem = global.aiTradingSystem;
        console.log('Bot Service connected to AI Trading System');
      } else {
        console.log('AI Trading System not available - some bot features will be limited');
      }
      
      console.log('Bot Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Bot Service:', error);
    }
  }
  
  /**
   * טעינת בוטים שמורים מהדאטהבייס
   */
  private async loadSavedBots(): Promise<void> {
    try {
      const savedBots = await storage.getAllBots();
      console.log(`Loaded ${savedBots.length} saved bots from database`);
      
      // אתחול כל בוט לפי הסוג שלו
      for (const bot of savedBots) {
        const parameters = this.parseBotParameters(bot);
        if (bot.isActive) {
          await this.activateBot(bot.id, parameters);
        }
      }
    } catch (error) {
      console.error('Error loading saved bots:', error);
    }
  }
  
  /**
   * פירוש פרמטרי בוט מתוך אובייקט JSON במסד הנתונים
   */
  private parseBotParameters(bot: TradingBot): BotParameters {
    try {
      if (typeof bot.parameters === 'string') {
        return JSON.parse(bot.parameters);
      }
      return bot.parameters as BotParameters;
    } catch (error) {
      console.error(`Error parsing parameters for bot ${bot.id}:`, error);
      
      // החזרת פרמטרים ברירת מחדל לפי סוג האסטרטגיה
      switch (bot.strategyType) {
        case BotStrategyType.AI_GRID:
          return {
            symbol: bot.symbol,
            investmentAmount: 1000,
            enabled: false,
            gridLevels: 5,
            upperLimit: 0,
            lowerLimit: 0,
            aiOptimized: true,
            adaptToVolatility: true,
            maxPositionSize: 100,
            riskLevel: 5
          } as AiGridBotParameters;
          
        case BotStrategyType.DCA:
          return {
            symbol: bot.symbol,
            investmentAmount: 1000,
            enabled: false,
            intervalHours: 24,
            totalBudget: 1000,
            purchaseAmount: 100,
            maxPurchases: 10,
            priceTargetPercentage: 5,
            enableStopLoss: false,
            stopLossPercentage: 10
          } as DcaBotParameters;
          
        case BotStrategyType.MACD:
          return {
            symbol: bot.symbol,
            investmentAmount: 1000,
            enabled: false,
            shortEMA: 12,
            longEMA: 26,
            signalPeriod: 9,
            positionSize: 100,
            takeProfitPercentage: 5,
            stopLossPercentage: 2,
            timeframe: '1h',
            confirmationCandles: 2
          } as MacdBotParameters;
          
        default:
          return {
            symbol: bot.symbol,
            investmentAmount: 1000,
            enabled: false
          } as BaseBotParameters;
      }
    }
  }
  
  /**
   * יצירת בוט חדש
   */
  public async createBot(userId: number, newBot: InsertTradingBot): Promise<TradingBot> {
    try {
      // שמירת הבוט במסד הנתונים
      const savedBot = await storage.createBot(newBot);
      
      console.log(`Bot ${savedBot.id} created: ${savedBot.name} (${savedBot.strategyType})`);
      
      // אם הבוט צריך להיות פעיל, נפעיל אותו
      if (savedBot.isActive) {
        const parameters = this.parseBotParameters(savedBot);
        await this.activateBot(savedBot.id, parameters);
      }
      
      return savedBot;
    } catch (error) {
      console.error('Error creating bot:', error);
      throw error;
    }
  }
  
  /**
   * הפעלת בוט
   */
  public async activateBot(botId: number, parameters?: BotParameters): Promise<void> {
    try {
      // קבלת פרטי הבוט
      const bot = await storage.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }
      
      // עדכון הסטטוס במסד הנתונים
      await storage.updateBot(botId, { isActive: true, isRunning: true });
      
      // הפעלת הבוט לפי סוג האסטרטגיה
      switch (bot.strategyType) {
        case BotStrategyType.AI_GRID:
          // הפעלת בוט AI Grid
          if (aiGridBotManager) {
            await aiGridBotManager.activateBot(botId, parameters as AiGridBotParameters);
          } else {
            console.warn(`Cannot activate AI Grid Bot ${botId} - AI Grid Bot Manager not available`);
          }
          break;
          
        case BotStrategyType.DCA:
          // הפעלת בוט DCA
          this.activateDcaBot(botId, parameters as DcaBotParameters);
          break;
          
        case BotStrategyType.MACD:
          // הפעלת בוט MACD
          this.activateMacdBot(botId, parameters as MacdBotParameters);
          break;
          
        default:
          throw new Error(`Unsupported bot strategy type: ${bot.strategyType}`);
      }
      
      console.log(`Bot ${botId} activated: ${bot.name} (${bot.strategyType})`);
    } catch (error) {
      console.error(`Error activating bot ${botId}:`, error);
      
      // במקרה של שגיאה, נעדכן את הסטטוס למצב לא פעיל
      try {
        await storage.updateBot(botId, { isActive: false, isRunning: false });
      } catch (updateError) {
        console.error(`Error updating bot ${botId} status:`, updateError);
      }
      
      throw error;
    }
  }
  
  /**
   * הפסקת פעילות בוט
   */
  public async deactivateBot(botId: number): Promise<void> {
    try {
      // קבלת פרטי הבוט
      const bot = await storage.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }
      
      // עדכון הסטטוס במסד הנתונים
      await storage.updateBot(botId, { isActive: false, isRunning: false });
      
      // הפסקת פעילות הבוט לפי סוג האסטרטגיה
      switch (bot.strategyType) {
        case BotStrategyType.AI_GRID:
          // הפסקת בוט AI Grid
          if (aiGridBotManager) {
            await aiGridBotManager.deactivateBot(botId);
          }
          break;
          
        case BotStrategyType.DCA:
          // הפסקת בוט DCA
          this.deactivateDcaBot(botId);
          break;
          
        case BotStrategyType.MACD:
          // הפסקת בוט MACD
          this.deactivateMacdBot(botId);
          break;
      }
      
      console.log(`Bot ${botId} deactivated: ${bot.name} (${bot.strategyType})`);
    } catch (error) {
      console.error(`Error deactivating bot ${botId}:`, error);
      throw error;
    }
  }
  
  /**
   * עדכון פרמטרים של בוט
   */
  public async updateBotParameters(botId: number, parameters: BotParameters): Promise<void> {
    try {
      // קבלת פרטי הבוט
      const bot = await storage.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }
      
      // עדכון הפרמטרים במסד הנתונים
      await storage.updateBot(botId, {
        parameters: JSON.stringify(parameters)
      });
      
      // אם הבוט פעיל, נעדכן את הפרמטרים באופן מיידי
      if (bot.isActive) {
        // הפסקה והפעלה מחדש של הבוט עם הפרמטרים החדשים
        await this.deactivateBot(botId);
        await this.activateBot(botId, parameters);
      }
      
      console.log(`Bot ${botId} parameters updated: ${bot.name} (${bot.strategyType})`);
    } catch (error) {
      console.error(`Error updating bot ${botId} parameters:`, error);
      throw error;
    }
  }
  
  /**
   * מחיקת בוט
   */
  public async deleteBot(botId: number): Promise<void> {
    try {
      // קבלת פרטי הבוט
      const bot = await storage.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }
      
      // הפסקת פעילות הבוט אם הוא פעיל
      if (bot.isActive) {
        await this.deactivateBot(botId);
      }
      
      // מחיקת הבוט מהמסד נתונים
      await storage.deleteBot(botId);
      
      console.log(`Bot ${botId} deleted: ${bot.name} (${bot.strategyType})`);
    } catch (error) {
      console.error(`Error deleting bot ${botId}:`, error);
      throw error;
    }
  }
  
  /**
   * הפעלת בוט DCA
   */
  private activateDcaBot(botId: number, parameters: DcaBotParameters): void {
    // הפעלת בוט DCA בחשבון Paper Trading
    const paperTradingBridge = getPaperTradingBridge(1); // משתמש ברירת מחדל
    
    // שמירת פעילות DCA במערכת
    this.scheduleDcaPurchase(botId, parameters, paperTradingBridge);
    
    console.log(`DCA Bot ${botId} activated with parameters:`, {
      symbol: parameters.symbol,
      intervalHours: parameters.intervalHours,
      purchaseAmount: parameters.purchaseAmount,
      maxPurchases: parameters.maxPurchases
    });
  }
  
  /**
   * הפסקת בוט DCA
   */
  private deactivateDcaBot(botId: number): void {
    // הסרת רכישות DCA מתוזמנות
    // לוגיקה להסרת רכישות מתוזמנות...
    
    console.log(`DCA Bot ${botId} deactivated`);
  }
  
  /**
   * תזמון רכישת DCA
   */
  private scheduleDcaPurchase(botId: number, parameters: DcaBotParameters, paperTradingBridge: any): void {
    // חישוב מרווח זמן בין רכישות במילישניות
    const intervalMs = parameters.intervalHours * 60 * 60 * 1000;
    
    // תזמון רכישה ראשונה לאחר דקה
    setTimeout(() => {
      this.executeDcaPurchase(botId, parameters, paperTradingBridge);
      
      // תזמון רכישות נוספות לפי מרווח הזמן
      const interval = setInterval(async () => {
        try {
          // בדיקה אם הבוט עדיין פעיל
          const bot = await storage.getBotById(botId);
          if (!bot || !bot.isActive) {
            clearInterval(interval);
            return;
          }
          
          // ביצוע רכישה נוספת
          this.executeDcaPurchase(botId, parameters, paperTradingBridge);
        } catch (error) {
          console.error(`Error in DCA purchase for bot ${botId}:`, error);
        }
      }, intervalMs);
      
      // שמירת ה-interval ID למקרה של הפסקת הבוט
      // ... קוד לשמירת ה-interval ID ...
      
    }, 60 * 1000); // דקה אחת לאחר ההפעלה
  }
  
  /**
   * ביצוע רכישת DCA
   */
  private async executeDcaPurchase(botId: number, parameters: DcaBotParameters, paperTradingBridge: any): Promise<void> {
    try {
      // ביצוע רכישה בחשבון Paper Trading
      const tradeResult = await paperTradingBridge.executeTrade({
        symbol: parameters.symbol,
        direction: 'LONG',
        quantity: parameters.purchaseAmount.toString(),
        type: 'DCA',
        isAiGenerated: false
      });
      
      if (tradeResult.success) {
        console.log(`DCA Bot ${botId} executed purchase: ${parameters.purchaseAmount} of ${parameters.symbol}`);
        
        // עדכון סטטיסטיקות בוט במסד הנתונים
        // ... קוד לעדכון סטטיסטיקות ...
      } else {
        console.error(`DCA Bot ${botId} purchase failed:`, tradeResult.error);
      }
    } catch (error) {
      console.error(`Error executing DCA purchase for bot ${botId}:`, error);
    }
  }
  
  /**
   * הפעלת בוט MACD
   */
  private activateMacdBot(botId: number, parameters: MacdBotParameters): void {
    // הפעלת בוט MACD בחשבון Paper Trading
    const paperTradingBridge = getPaperTradingBridge(1); // משתמש ברירת מחדל
    
    // התחלת מעקב אחרי אינדיקטור MACD
    this.startMacdMonitoring(botId, parameters, paperTradingBridge);
    
    console.log(`MACD Bot ${botId} activated with parameters:`, {
      symbol: parameters.symbol,
      shortEMA: parameters.shortEMA,
      longEMA: parameters.longEMA,
      signalPeriod: parameters.signalPeriod,
      timeframe: parameters.timeframe
    });
  }
  
  /**
   * הפסקת בוט MACD
   */
  private deactivateMacdBot(botId: number): void {
    // הפסקת מעקב אחרי אינדיקטור MACD
    // ...
    
    console.log(`MACD Bot ${botId} deactivated`);
  }
  
  /**
   * התחלת מעקב אחרי אינדיקטור MACD
   */
  private startMacdMonitoring(botId: number, parameters: MacdBotParameters, paperTradingBridge: any): void {
    // מרווח הזמן לבדיקת האינדיקטור תלוי בטיימפריים
    let checkIntervalMs = 60 * 60 * 1000; // ברירת מחדל - שעה
    
    // התאמת מרווח הזמן לפי הטיימפריים
    switch (parameters.timeframe) {
      case '5m':
        checkIntervalMs = 5 * 60 * 1000;
        break;
      case '15m':
        checkIntervalMs = 15 * 60 * 1000;
        break;
      case '30m':
        checkIntervalMs = 30 * 60 * 1000;
        break;
      case '1h':
        checkIntervalMs = 60 * 60 * 1000;
        break;
      case '4h':
        checkIntervalMs = 4 * 60 * 60 * 1000;
        break;
      case '1d':
        checkIntervalMs = 24 * 60 * 60 * 1000;
        break;
    }
    
    // תזמון בדיקה ראשונה לאחר 30 שניות
    setTimeout(() => {
      this.checkMacdSignal(botId, parameters, paperTradingBridge);
      
      // תזמון בדיקות נוספות לפי מרווח הזמן
      const interval = setInterval(async () => {
        try {
          // בדיקה אם הבוט עדיין פעיל
          const bot = await storage.getBotById(botId);
          if (!bot || !bot.isActive) {
            clearInterval(interval);
            return;
          }
          
          // בדיקת אינדיקטור MACD
          this.checkMacdSignal(botId, parameters, paperTradingBridge);
        } catch (error) {
          console.error(`Error in MACD check for bot ${botId}:`, error);
        }
      }, checkIntervalMs);
      
      // שמירת ה-interval ID למקרה של הפסקת הבוט
      // ... קוד לשמירת ה-interval ID ...
      
    }, 30 * 1000); // 30 שניות לאחר ההפעלה
  }
  
  /**
   * בדיקת אות MACD
   */
  private async checkMacdSignal(botId: number, parameters: MacdBotParameters, paperTradingBridge: any): Promise<void> {
    try {
      // במקרה אמיתי - קבלת נתוני מחיר היסטוריים ממקור חיצוני
      // לצורך הדוגמה - יצירת אות MACD מלאכותי
      
      // בדיקה אם יש אות קנייה/מכירה
      const signal = this.simulateMacdSignal();
      
      if (signal === 'buy') {
        // ביצוע קנייה
        const tradeResult = await paperTradingBridge.executeTrade({
          symbol: parameters.symbol,
          direction: 'LONG',
          quantity: parameters.positionSize.toString(),
          type: 'MACD',
          isAiGenerated: false,
          metadata: {
            strategy: 'MACD',
            signal: 'buy',
            shortEMA: parameters.shortEMA,
            longEMA: parameters.longEMA,
            signalPeriod: parameters.signalPeriod
          }
        });
        
        if (tradeResult.success) {
          console.log(`MACD Bot ${botId} executed buy: ${parameters.positionSize} of ${parameters.symbol}`);
        } else {
          console.error(`MACD Bot ${botId} buy failed:`, tradeResult.error);
        }
      } else if (signal === 'sell') {
        // ביצוע מכירה
        const tradeResult = await paperTradingBridge.executeTrade({
          symbol: parameters.symbol,
          direction: 'SHORT',
          quantity: parameters.positionSize.toString(),
          type: 'MACD',
          isAiGenerated: false,
          metadata: {
            strategy: 'MACD',
            signal: 'sell',
            shortEMA: parameters.shortEMA,
            longEMA: parameters.longEMA,
            signalPeriod: parameters.signalPeriod
          }
        });
        
        if (tradeResult.success) {
          console.log(`MACD Bot ${botId} executed sell: ${parameters.positionSize} of ${parameters.symbol}`);
        } else {
          console.error(`MACD Bot ${botId} sell failed:`, tradeResult.error);
        }
      } else {
        // אין אות - לא מבצעים כלום
        console.log(`MACD Bot ${botId} - No signal for ${parameters.symbol}`);
      }
    } catch (error) {
      console.error(`Error checking MACD signal for bot ${botId}:`, error);
    }
  }
  
  /**
   * סימולציית אות MACD לצורך הדגמה
   * במציאות - יש לחשב את האינדיקטור לפי נתוני מחיר אמיתיים
   */
  private simulateMacdSignal(): 'buy' | 'sell' | 'none' {
    const signals = ['buy', 'sell', 'none', 'none', 'none'];
    const randomIndex = Math.floor(Math.random() * signals.length);
    return signals[randomIndex] as 'buy' | 'sell' | 'none';
  }
  
  /**
   * קבלת נתוני ביצועים של בוט
   */
  public async getBotPerformance(botId: number): Promise<any> {
    try {
      // קבלת פרטי הבוט
      const bot = await storage.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }
      
      // קבלת עסקאות של הבוט
      const trades = await storage.getBotTrades(botId);
      
      // חישוב סטטיסטיקות ביצועים
      let totalProfitLoss = 0;
      let winningTrades = 0;
      let losingTrades = 0;
      
      for (const trade of trades) {
        if (trade.status === 'executed' && trade.metadata?.profitLoss) {
          const profitLoss = parseFloat(trade.metadata.profitLoss);
          totalProfitLoss += profitLoss;
          
          if (profitLoss > 0) {
            winningTrades++;
          } else if (profitLoss < 0) {
            losingTrades++;
          }
        }
      }
      
      const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
      
      return {
        totalTrades: trades.length,
        winningTrades,
        losingTrades,
        winRate,
        totalProfitLoss,
        averageProfitLoss: trades.length > 0 ? totalProfitLoss / trades.length : 0,
        lastTrade: trades.length > 0 ? trades[trades.length - 1] : null
      };
    } catch (error) {
      console.error(`Error getting bot ${botId} performance:`, error);
      throw error;
    }
  }
}

// יצירת שירות בוטים גלובלי
const botService = new BotService();

// ייצוא שירות הבוטים
export { botService };