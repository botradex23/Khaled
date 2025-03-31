/**
 * AiGridBotPaperTrading.ts
 * 
 * אינטגרציה בין מערכת הבוט AI Grid ומערכת ה-Paper Trading
 * מאפשר לבוט AI Grid לבצע עסקאות מבוססות סימולציה במקום עסקאות אמיתיות
 */

import { AiGridBotManager } from './AiGridBot';
import { aiTradingSystem } from './AITradingSystem';
import { getPaperTradingBridge, TradeDirection } from '../paper-trading/PaperTradingBridge';

/**
 * Enable paper trading for AI Grid Bots
 * מאפשר לבוטים לבצע עסקאות בחשבון paper trading
 * 
 * @param botManager מנהל הבוטים AI Grid
 */
export function enablePaperTradingForAiGridBots(botManager: AiGridBotManager): void {
  if (!botManager) {
    console.error('Failed to enable paper trading: Invalid AI Grid Bot Manager');
    return;
  }
  
  try {
    console.log('Enabling Paper Trading for AI Grid Bots...');
    
    // Get the paper trading bridge (default user)
    const paperTradingBridge = getPaperTradingBridge(1);
    
    // Initialize the paper trading bridge
    paperTradingBridge.initialize().then(success => {
      if (success) {
        console.log('Paper Trading Bridge initialized successfully for AI Grid Bots');
        
        // Hook into AI trading system signals
        if (aiTradingSystem) {
          // The paper trading bridge already listens to the 'trade-signal' event from the AI trading system
          console.log('AI Grid Bot Paper Trading integration enabled successfully');
        } else {
          console.warn('AI Trading System not available - Paper Trading will not receive signals automatically');
        }
        
        // If needed, you can pass the bridge to the bot manager for direct access
        (botManager as any).paperTradingBridge = paperTradingBridge;
      } else {
        console.error('Failed to initialize Paper Trading Bridge for AI Grid Bots');
      }
    }).catch(error => {
      console.error(`Error initializing Paper Trading Bridge: ${error.message}`);
    });
  } catch (error: any) {
    console.error(`Failed to enable paper trading for AI Grid Bots: ${error.message}`);
  }
}

/**
 * Execute AI Grid Bot Trade in Paper Trading
 * מבצע עסקה של בוט AI Grid במערכת ה-Paper Trading
 * 
 * @param botId מזהה הבוט
 * @param symbol סמל המטבע (למשל BTCUSDT)
 * @param price מחיר הכניסה
 * @param quantity כמות
 * @param isBuy האם זו עסקת קנייה או מכירה
 * @param reason סיבת העסקה
 * @param confidence רמת הביטחון (0-1)
 * @returns true אם העסקה בוצעה בהצלחה
 */
export async function executeAiGridBotTrade(
  botId: number,
  symbol: string,
  price: number,
  quantity: number,
  isBuy: boolean,
  reason: string = 'AI Grid Trading Signal',
  confidence: number = 0.75
): Promise<boolean> {
  try {
    // Get the paper trading bridge (default user)
    const paperTradingBridge = getPaperTradingBridge(1);
    
    // Ensure the bridge is initialized
    const isInitialized = await paperTradingBridge.initialize();
    if (!isInitialized) {
      console.error(`Failed to initialize Paper Trading Bridge for bot ${botId}`);
      return false;
    }
    
    // Execute the trade
    const result = await paperTradingBridge.executeTrade({
      symbol: symbol,
      direction: isBuy ? TradeDirection.LONG : TradeDirection.SHORT,
      entryPrice: price,
      quantity: quantity,
      reason: reason,
      confidence: confidence,
      signalSource: 'ai_grid',
      metadata: {
        botId: botId,
        timestamp: Date.now(),
        gridLevel: 0, // Could be updated with actual grid level if available
        marketState: 'unknown' // Could be updated with actual market state
      }
    });
    
    if (result.success) {
      console.log(`Bot ${botId} executed ${isBuy ? 'BUY' : 'SELL'} trade for ${quantity} ${symbol} at ${price}: ${result.message}`);
      return true;
    } else {
      console.error(`Bot ${botId} failed to execute trade: ${result.message}`);
      return false;
    }
  } catch (error: any) {
    console.error(`Error executing AI Grid Bot trade: ${error.message}`);
    return false;
  }
}

export default {
  enablePaperTradingForAiGridBots,
  executeAiGridBotTrade
};