/**
 * PaperTradingBridge.ts
 * 
 * Bridge between trading bots and the Paper Trading system
 * Allows bots to execute trades in Paper Trading without direct integration with an exchange
 */

import { storage } from '../../storage';
import { InsertPaperTradingPosition, InsertPaperTradingTrade } from '@shared/schema';
import paperTradingApi from './PaperTradingApi';

export enum TradeDirection {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum TradeStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum TradeType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT'
}

export interface TradeSignal {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  quantity: number;
  reason: string;
  confidence: number;
  signalSource: 'ai_grid' | 'dca' | 'macd' | 'manual';
  metadata?: any;
}

export interface TradeResult {
  success: boolean;
  tradeId?: number;
  positionId?: number;
  message?: string;
  error?: string;
}

/**
 * PaperTradingBridge class
 * מספק ממשק לביצוע עסקאות ב-Paper Trading
 */
export class PaperTradingBridge {
  private userId: number;
  private accountId: number | null = null;
  private isInitialized: boolean = false;
  
  /**
   * Constructor
   * @param userId ID של המשתמש שעבורו יתבצעו העסקאות
   */
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Initialize
   * מאתחל את החיבור ומוודא שלמשתמש יש חשבון Paper Trading
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      console.log(`Initializing Paper Trading Bridge for user ${this.userId}...`);
      
      // בדוק אם למשתמש יש חשבון
      let account = await storage.getUserPaperTradingAccount(this.userId);
      
      // אם אין חשבון, צור אחד
      if (!account) {
        console.log(`Creating new paper trading account for user ${this.userId}`);
        account = await storage.createPaperTradingAccount({
          userId: this.userId,
          initialBalance: "10000", // $10,000 initial balance
          currentBalance: "10000",
          totalProfitLoss: "0",
          totalProfitLossPercent: "0",
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0
        });
        
        console.log(`AI Paper Trading Bridge: Created new account ID ${account.id} for user ${this.userId}`);
      } else {
        console.log(`AI Paper Trading Bridge: Using existing account ID ${account.id} for user ${this.userId}`);
      }
      
      this.accountId = account.id;
      this.isInitialized = true;
      
      // חיבור למערכת ה-AI
      this.connectToAiSystem();
      
      return true;
    } catch (error: any) {
      console.error(`Failed to initialize Paper Trading Bridge: ${error.message}`);
      return false;
    }
  }
  
  /**
   * חיבור למערכת ה-AI
   * מאזין לאירועי הסחר שהמערכת מייצרת
   */
  private connectToAiSystem(): void {
    try {
      // בגלל מגבלות מערכת הטיפוסים, בינתיים נוותר על הקשבה ישירה לאירועים
      // וניתן לפונקציה executeAiGridBotTrade לקרוא ישירות ל-executeTrade במקום
      console.log('Paper Trading Bridge ready to receive manual trade signals');
      
      /* 
      // הערה: הקוד הבא יופעל בשלב מאוחר יותר כאשר מערכת ה-AI תתמוך באירועים
      if (aiTradingSystem) {
        console.log('Paper Trading Bridge connected to AI Trading System');
        
        // Listen for trade signals from the AI Trading System
        aiTradingSystem.on('trade-signal', async (signal: TradeSignal) => {
          console.log(`Received AI trade signal for ${signal.symbol}: ${signal.direction} ${signal.quantity} @ ${signal.entryPrice}`);
          
          // Execute the trade in paper trading
          await this.executeTrade(signal);
        });
      }
      */
    } catch (error: any) {
      console.error(`Failed to connect to AI Trading System: ${error.message}`);
    }
  }
  
  /**
   * Execute Trade
   * מבצע עסקת קנייה או מכירה במערכת ה-Paper Trading
   * @param tradeSignal אות המסחר לביצוע
   */
  public async executeTrade(tradeSignal: TradeSignal): Promise<TradeResult> {
    if (!this.isInitialized || this.accountId === null) {
      await this.initialize();
      
      if (!this.isInitialized || this.accountId === null) {
        return {
          success: false,
          error: 'Paper Trading Bridge not initialized',
          message: 'Failed to initialize Paper Trading Bridge'
        };
      }
    }
    
    try {
      // Validate the trade signal
      if (!tradeSignal.symbol || !tradeSignal.entryPrice || !tradeSignal.quantity) {
        return {
          success: false,
          error: 'invalid_parameters',
          message: 'Invalid trade parameters. Symbol, entry price, and quantity are required.'
        };
      }
      
      // Format symbol for consistency
      const formattedSymbol = tradeSignal.symbol.replace('-', '');
      
      // Create position with metadata including stop-loss and take-profit if provided
      const positionMetadata: any = {};
      
      // Process risk management parameters from the metadata
      if (tradeSignal.metadata) {
        // Extract stopLossPercent and takeProfitPercent
        if (tradeSignal.metadata.stopLossPercent !== undefined) {
          positionMetadata.stopLossPercent = tradeSignal.metadata.stopLossPercent;
        }
        
        if (tradeSignal.metadata.takeProfitPercent !== undefined) {
          positionMetadata.takeProfitPercent = tradeSignal.metadata.takeProfitPercent;
        }
        
        // Log the risk parameters for debugging
        console.log(`Trade signal includes risk parameters:`, {
          stopLossPercent: positionMetadata.stopLossPercent,
          takeProfitPercent: positionMetadata.takeProfitPercent
        });
      }
      
      const position: InsertPaperTradingPosition = {
        accountId: this.accountId,
        symbol: formattedSymbol,
        entryPrice: tradeSignal.entryPrice.toString(),
        quantity: tradeSignal.quantity.toString(),
        direction: tradeSignal.direction,
        metadata: Object.keys(positionMetadata).length > 0 ? JSON.stringify(positionMetadata) : null
      };
      
      const createdPosition = await storage.createPaperTradingPosition(position);
      
      // Create trade record
      const trade: InsertPaperTradingTrade = {
        accountId: this.accountId,
        positionId: createdPosition.id,
        symbol: formattedSymbol,
        entryPrice: tradeSignal.entryPrice.toString(),
        quantity: tradeSignal.quantity.toString(),
        direction: tradeSignal.direction,
        status: TradeStatus.OPEN,
        type: TradeType.MARKET,
        isAiGenerated: tradeSignal.signalSource !== 'manual',
        aiConfidence: tradeSignal.confidence?.toString() || null,
        metadata: JSON.stringify({
          reason: tradeSignal.reason,
          source: tradeSignal.signalSource,
          additionalData: tradeSignal.metadata
        })
      };
      
      const createdTrade = await storage.createPaperTradingTrade(trade);
      
      console.log(`Paper Trading Bridge: Executed ${tradeSignal.direction} trade for ${formattedSymbol} - Position ID: ${createdPosition.id}, Trade ID: ${createdTrade.id}`);
      
      return {
        success: true,
        positionId: createdPosition.id,
        tradeId: createdTrade.id,
        message: `Successfully executed ${tradeSignal.direction} trade for ${tradeSignal.quantity} ${formattedSymbol} at ${tradeSignal.entryPrice}`
      };
    } catch (error: any) {
      console.error(`Failed to execute trade: ${error.message}`);
      return {
        success: false,
        error: 'execution_failed',
        message: `Failed to execute trade: ${error.message}`
      };
    }
  }
  
  /**
   * Close Position
   * סוגר פוזיציה קיימת במערכת ה-Paper Trading
   * @param positionId ID של הפוזיציה לסגירה
   * @param exitPriceOrMetadata מחיר היציאה/סגירה או אובייקט מטא-דאטה
   */
  public async closePosition(positionId: number, exitPriceOrMetadata: number | { reason?: string, [key: string]: any }): Promise<TradeResult> {
    if (!this.isInitialized || this.accountId === null) {
      await this.initialize();
      
      if (!this.isInitialized || this.accountId === null) {
        return {
          success: false,
          error: 'not_initialized',
          message: 'Paper Trading Bridge not initialized'
        };
      }
    }
    
    try {
      // Get the position
      const position = await storage.getPaperTradingPosition(positionId);
      
      if (!position) {
        return {
          success: false,
          error: 'position_not_found',
          message: `Position ID ${positionId} not found`
        };
      }
      
      // Check if position belongs to the user's account
      if (position.accountId !== this.accountId) {
        return {
          success: false,
          error: 'unauthorized',
          message: 'You do not have permission to close this position'
        };
      }
      
      // Get current price if not provided
      let exitPrice: number;
      let metadata: any = {};
      
      if (typeof exitPriceOrMetadata === 'number') {
        exitPrice = exitPriceOrMetadata;
      } else {
        // Store metadata
        metadata = exitPriceOrMetadata;
        
        // Check if exit price is provided in metadata
        if (metadata && 'exitPrice' in metadata && typeof metadata.exitPrice === 'number') {
          exitPrice = metadata.exitPrice;
          console.log(`Using exit price provided in metadata: ${exitPrice}`);
        } else {
          // Use direct API call to get the current price
          try {
            // Get current price from PaperTradingApi
            exitPrice = await paperTradingApi.getCurrentPrice(position.symbol);
            console.log(`Got current price for ${position.symbol}: ${exitPrice} from PaperTradingApi`);
          } catch (error) {
            console.error(`Failed to get current price for ${position.symbol} from PaperTradingApi:`, error);
            
            // Use entry price as fallback to avoid blocking the operation
            exitPrice = parseFloat(position.entryPrice);
            console.log(`Using fallback entry price: ${exitPrice}`);
          }
        }
      }
      
      // Close the position with the determined price
      // First update position with metadata if provided
      if (metadata && Object.keys(metadata).length > 0) {
        const position = await storage.getPaperTradingPosition(positionId);
        if (position) {
          await storage.updatePaperTradingPosition(positionId, { 
            metadata: metadata as any 
          });
        }
      }
      
      const closedTrade = await storage.closePaperTradingPosition(positionId, exitPrice);
      
      if (!closedTrade) {
        return {
          success: false,
          error: 'closing_failed',
          message: 'Failed to close position'
        };
      }
      
      console.log(`Paper Trading Bridge: Closed position ID ${positionId} at ${exitPrice}`);
      
      return {
        success: true,
        tradeId: closedTrade.id,
        message: `Successfully closed position ID ${positionId} at ${exitPrice}`
      };
    } catch (error: any) {
      console.error(`Failed to close position: ${error.message}`);
      return {
        success: false,
        error: 'execution_failed',
        message: `Failed to close position: ${error.message}`
      };
    }
  }
  
  /**
   * Get Account Balance
   * מחזיר את היתרה הנוכחית בחשבון ה-Paper Trading
   */
  public async getAccountBalance(): Promise<{ balance: string; initialBalance: string; } | null> {
    if (!this.isInitialized || this.accountId === null) {
      await this.initialize();
      
      if (!this.isInitialized || this.accountId === null) {
        return null;
      }
    }
    
    try {
      // קבלת המידע על חשבון ה-Paper Trading לפי ID
      const account = await storage.getPaperTradingAccount(this.accountId);
      
      if (!account) {
        return null;
      }
      
      return {
        balance: account.currentBalance,
        initialBalance: account.initialBalance
      };
    } catch (error: any) {
      console.error(`Failed to get account balance: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get Open Positions
   * Returns all open positions in the account
   */
  public async getOpenPositions(): Promise<any[]> {
    if (!this.isInitialized || this.accountId === null) {
      await this.initialize();
      
      if (!this.isInitialized || this.accountId === null) {
        return [];
      }
    }
    
    try {
      const positions = await storage.getAccountPaperTradingPositions(this.accountId);
      return positions;
    } catch (error: any) {
      console.error(`Failed to get open positions: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get the current price for a symbol
   * Uses the PaperTradingApi to get simulated or real prices
   */
  public async getCurrentPrice(symbol: string): Promise<number> {
    return paperTradingApi.getCurrentPrice(symbol);
  }
  
  /**
   * Get the PaperTradingApi instance
   * Used for testing and simulating price changes
   */
  public getPaperTradingApi() {
    return paperTradingApi;
  }
  
  /**
   * Initialize account with a specific balance
   * Used for testing
   */
  public async initializeAccount(balance: number): Promise<number> {
    if (!this.userId) {
      throw new Error('User ID is required to initialize account');
    }
    return paperTradingApi.initializeAccount(this.userId, balance);
  }
}

// יצירת מופע ברירת מחדל של הגשר עבור משתמש ברירת מחדל
let defaultBridge: PaperTradingBridge | null = null;

/**
 * Get Paper Trading Bridge
 * מחזיר את הגשר של Paper Trading עבור משתמש ספציפי
 * אם לא צוין משתמש, משתמש במשתמש ברירת מחדל
 */
export function getPaperTradingBridge(userId: number = 1): PaperTradingBridge {
  if (userId === 1 && defaultBridge) {
    return defaultBridge;
  }
  
  const bridge = new PaperTradingBridge(userId);
  
  // Initialize asynchronously
  bridge.initialize().catch(err => {
    console.error(`Failed to initialize Paper Trading Bridge for user ${userId}: ${err.message}`);
  });
  
  if (userId === 1) {
    defaultBridge = bridge;
  }
  
  return bridge;
}

// יצירת ייצוא ברירת מחדל
export default getPaperTradingBridge;