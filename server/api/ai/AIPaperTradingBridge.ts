/**
 * AIPaperTradingBridge.ts
 * 
 * מודול גישור בין מערכת המסחר האוטומטית מבוססת AI לבין מערכת ה-Paper Trading
 * מאפשר למערכת ה-AI להשתמש במערכת ה-Paper Trading לבדיקת אסטרטגיות וחיזוקים חיוביים/שליליים
 */

import { storage } from '../../storage';
import { AITradingSystem, TradingDecision, TradingResult } from './AITradingSystem';
import { InsertPaperTradingPosition, InsertPaperTradingTrade } from '@shared/schema';

export class AIPaperTradingBridge {
  private userId: number | null = null;
  private accountId: number | null = null;
  private aiSystem: AITradingSystem;

  constructor(aiSystem: AITradingSystem) {
    this.aiSystem = aiSystem;
  }

  /**
   * מגדיר את המשתמש והחשבון שמשמשים את מערכת ה-AI
   * 
   * @param userId מזהה המשתמש
   * @returns הצלחה או כישלון
   */
  public async setUser(userId: number): Promise<boolean> {
    try {
      this.userId = userId;
      
      // בדיקה האם למשתמש יש חשבון Paper Trading
      const account = await storage.getUserPaperTradingAccount(userId);
      
      if (account) {
        this.accountId = account.id;
        console.log(`AI Paper Trading Bridge: Using existing account ID ${this.accountId} for user ${userId}`);
        return true;
      } else {
        // יצירת חשבון חדש למשתמש
        const initialBalance = 10000; // $10,000 default balance
        const newAccount = await storage.createPaperTradingAccount({
          userId,
          initialBalance: initialBalance.toString(),
          currentBalance: initialBalance.toString(),
          totalProfitLoss: "0",
          totalProfitLossPercent: "0",
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0
        });

        this.accountId = newAccount.id;
        console.log(`AI Paper Trading Bridge: Created new account ID ${this.accountId} for user ${userId}`);
        return true;
      }
    } catch (error) {
      console.error('Error setting user for AI Paper Trading Bridge:', error);
      return false;
    }
  }

  /**
   * מבצע החלטת מסחר שהתקבלה ממערכת ה-AI במערכת ה-Paper Trading
   * 
   * @param decision החלטת המסחר מה-AI
   * @returns תוצאת הביצוע
   */
  public async executeTrading(decision: TradingDecision): Promise<TradingResult> {
    if (!this.userId || !this.accountId) {
      return {
        decision,
        executed: false,
        reason: 'No user or account set for paper trading'
      };
    }

    // אם ההחלטה היא להחזיק, אין צורך לשלוח פקודה
    if (decision.action === 'HOLD') {
      return {
        decision,
        executed: false,
        reason: 'No action needed (HOLD)'
      };
    }

    try {
      // בדיקת מצב החשבון
      const account = await storage.getPaperTradingAccount(this.accountId);
      if (!account) {
        return {
          decision,
          executed: false,
          reason: 'Paper trading account not found'
        };
      }

      // חישוב כמות לעסקה - מגביל ל-2% מהחשבון
      const currentBalance = parseFloat(account.currentBalance);
      const maxTradeAmount = currentBalance * 0.02; // 2% risk management
      const price = decision.price;
      
      // חישוב כמות המטבע לרכישה/מכירה
      const quantity = maxTradeAmount / price;
      
      // המרת סמל העסקה לפורמט המתאים למערכת הפנימית (BTC-USDT → BTC/USDT)
      const formattedSymbol = decision.symbol.replace('-', '/');
      
      // יצירת פוזיציה חדשה
      const positionData: InsertPaperTradingPosition = {
        accountId: this.accountId,
        symbol: formattedSymbol,
        entryPrice: price.toString(),
        quantity: quantity.toString(),
        direction: decision.action === 'BUY' ? 'LONG' : 'SHORT'
      };

      const position = await storage.createPaperTradingPosition(positionData);
      
      // יצירת עסקה חדשה
      const tradeData: InsertPaperTradingTrade = {
        accountId: this.accountId,
        positionId: position.id,
        symbol: formattedSymbol,
        entryPrice: price.toString(),
        quantity: quantity.toString(),
        direction: decision.action === 'BUY' ? 'LONG' : 'SHORT',
        status: 'OPEN',
        type: 'MARKET',
        isAiGenerated: true,
        aiConfidence: decision.confidence.toString(),
        metadata: JSON.stringify({
          strategy: decision.strategy,
          parameters: decision.parameters,
          marketState: decision.marketState,
          predictions: decision.predictions,
          signals: decision.tradingSignals
        })
      };

      const trade = await storage.createPaperTradingTrade(tradeData);
      
      console.log(`AIPaperTradingBridge: Executed ${decision.action} trade for ${formattedSymbol}, quantity: ${quantity}, price: ${price}`);
      
      return {
        decision,
        executed: true,
        executionPrice: price,
        executionTime: Date.now()
      };
    } catch (error) {
      console.error('Error executing AI decision in paper trading:', error);
      return {
        decision,
        executed: false,
        reason: `Error: ${error}`
      };
    }
  }

  /**
   * סוגר פוזיציה קיימת במערכת ה-Paper Trading
   * 
   * @param positionId מזהה הפוזיציה
   * @param exitPrice מחיר היציאה
   * @returns תוצאת הסגירה
   */
  public async closePosition(positionId: number, exitPrice: number): Promise<boolean> {
    try {
      const trade = await storage.closePaperTradingPosition(positionId, exitPrice);
      return !!trade;
    } catch (error) {
      console.error('Error closing paper trading position:', error);
      return false;
    }
  }

  /**
   * מחזיר את כל הפוזיציות הפתוחות שנוצרו על ידי ה-AI
   * 
   * @returns רשימת פוזיציות פתוחות
   */
  public async getOpenPositions() {
    if (!this.accountId) return [];
    
    try {
      const positions = await storage.getAccountPaperTradingPositions(this.accountId);
      return positions;
    } catch (error) {
      console.error('Error getting open paper trading positions:', error);
      return [];
    }
  }

  /**
   * מחזיר את היסטוריית העסקאות שבוצעו על ידי ה-AI
   * 
   * @param limit מספר העסקאות המקסימלי להחזרה
   * @returns רשימת עסקאות
   */
  public async getTradeHistory(limit: number = 50) {
    if (!this.accountId) return [];
    
    try {
      const trades = await storage.getAccountPaperTradingTrades(this.accountId, limit);
      return trades.filter(trade => trade.isAiGenerated);
    } catch (error) {
      console.error('Error getting AI paper trading history:', error);
      return [];
    }
  }

  /**
   * מחזיר סטטיסטיקות ביצועים של מערכת ה-AI בסימולציה
   * 
   * @returns סטטיסטיקות ביצועים
   */
  public async getPerformanceStats() {
    if (!this.accountId) return null;
    
    try {
      const account = await storage.getPaperTradingAccount(this.accountId);
      const trades = await storage.getAccountPaperTradingTrades(this.accountId);
      const aiTrades = trades.filter(trade => trade.isAiGenerated);
      
      // חישוב סטטיסטיקות ייחודיות למערכת ה-AI
      const successfulTrades = aiTrades.filter(trade => 
        trade.status === 'CLOSED' && trade.profitLoss && parseFloat(trade.profitLoss) > 0
      );
      
      return {
        account,
        totalAiTrades: aiTrades.length,
        successfulAiTrades: successfulTrades.length,
        successRate: aiTrades.length > 0 ? successfulTrades.length / aiTrades.length : 0,
        totalProfitLoss: account?.totalProfitLoss || "0",
        currentBalance: account?.currentBalance || "0"
      };
    } catch (error) {
      console.error('Error getting AI performance stats:', error);
      return null;
    }
  }
}

export const createAIPaperTradingBridge = (aiSystem: AITradingSystem) => {
  return new AIPaperTradingBridge(aiSystem);
};