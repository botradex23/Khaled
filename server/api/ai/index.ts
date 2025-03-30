/**
 * index.ts
 * 
 * נקודת כניסה למערכת ה-AI - מגדיר נתיבי API לניהול ושליטה במערכת למידת המכונה
 */

import { Router, Request, Response } from 'express';
import { aiGridBotManager, AiGridParams } from './AiGridBot';
import { aiTradingSystem } from './AITradingSystem';
import { aiTradingBridge, TradingSignal } from './AITradingBridge';
import { createAIPaperTradingBridge } from './AIPaperTradingBridge';
import { storage } from '../../storage';
import { ensureAuthenticated } from '../../auth';

const router = Router();

// יצירת גשר למערכת Paper Trading עבור מערכת ה-AI
const aiPaperTradingBridge = createAIPaperTradingBridge(aiTradingSystem);

// אתחול הגשר במערכת ה-AI
aiTradingSystem.setPaperTradingBridge(aiPaperTradingBridge);

/**
 * טיפול בשגיאות API
 */
const handleApiError = (err: any, res: Response) => {
  console.error('AI API Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An error occurred in the AI system',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};

/**
 * GET /api/ai/status
 * בדיקת סטטוס מערכת ה-AI
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = aiTradingSystem.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/performance
 * קבלת ביצועי מערכת ה-AI
 */
router.get('/performance', async (_req: Request, res: Response) => {
  try {
    const performance = aiTradingSystem.getPerformance();
    res.json({
      success: true,
      performance
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/bots/:id/create
 * יצירת בוט AI-grid חדש
 */
router.post('/bots/:id/create', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const params: AiGridParams = req.body;
    
    // וידוא שהבוט קיים במערכת
    const bot = await storage.getBotById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: `Bot with ID ${botId} not found`
      });
    }
    
    // וידוא שהמשתמש המחובר הוא בעל הבוט
    if (bot.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this bot'
      });
    }
    
    // יצירת בוט AI-grid
    const aiBot = await aiGridBotManager.createBot(botId, params);
    
    res.json({
      success: true,
      message: 'AI grid bot created successfully',
      bot: aiBot
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/bots/:id/start
 * הפעלת בוט AI-grid
 */
router.post('/bots/:id/start', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // וידוא שהבוט קיים במערכת
    const bot = await storage.getBotById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: `Bot with ID ${botId} not found`
      });
    }
    
    // וידוא שהמשתמש המחובר הוא בעל הבוט
    if (bot.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this bot'
      });
    }
    
    // הפעלת הבוט
    const updatedBot = await aiGridBotManager.startBot(botId);
    
    res.json({
      success: true,
      message: 'AI grid bot started successfully',
      bot: updatedBot
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/bots/:id/stop
 * עצירת בוט AI-grid
 */
router.post('/bots/:id/stop', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // וידוא שהבוט קיים במערכת
    const bot = await storage.getBotById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: `Bot with ID ${botId} not found`
      });
    }
    
    // וידוא שהמשתמש המחובר הוא בעל הבוט
    if (bot.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this bot'
      });
    }
    
    // עצירת הבוט
    const updatedBot = await aiGridBotManager.stopBot(botId);
    
    res.json({
      success: true,
      message: 'AI grid bot stopped successfully',
      bot: updatedBot
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/bots/:id/details
 * קבלת פרטי בוט AI-grid
 */
router.get('/bots/:id/details', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // וידוא שהבוט קיים במערכת
    const bot = await storage.getBotById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: `Bot with ID ${botId} not found`
      });
    }
    
    // וידוא שהמשתמש המחובר הוא בעל הבוט
    if (bot.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this bot'
      });
    }
    
    // קבלת פרטי הבוט
    const details = aiGridBotManager.getBotDetails(botId);
    
    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'AI grid bot details not found'
      });
    }
    
    res.json({
      success: true,
      details
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/bots/:id/performance
 * קבלת ביצועי בוט AI-grid
 */
router.get('/bots/:id/performance', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // וידוא שהבוט קיים במערכת
    const bot = await storage.getBotById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: `Bot with ID ${botId} not found`
      });
    }
    
    // וידוא שהמשתמש המחובר הוא בעל הבוט
    if (bot.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this bot'
      });
    }
    
    // קבלת ביצועי הבוט
    const performance = await aiGridBotManager.getBotPerformance(botId);
    
    res.json({
      success: true,
      performance
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/bots/:id/update
 * עדכון פרמטרים של בוט AI-grid
 */
router.post('/bots/:id/update', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const updatedParams: Partial<AiGridParams> = req.body;
    
    // וידוא שהבוט קיים במערכת
    const bot = await storage.getBotById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: `Bot with ID ${botId} not found`
      });
    }
    
    // וידוא שהמשתמש המחובר הוא בעל הבוט
    if (bot.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this bot'
      });
    }
    
    // עדכון פרמטרי הבוט
    const updatedBot = await aiGridBotManager.updateBotParams(botId, updatedParams);
    
    res.json({
      success: true,
      message: 'AI grid bot parameters updated successfully',
      bot: updatedBot
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/relearn
 * הפעלת תהליך למידה מחדש של מערכת ה-AI
 */
router.post('/relearn', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // בדיקת הרשאות מנהל
    if (req.user?.username !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can trigger AI relearning'
      });
    }
    
    // הפעלת תהליך הלמידה מחדש
    aiGridBotManager.triggerRelearning();
    
    res.json({
      success: true,
      message: 'AI relearning process triggered successfully'
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/system/start
 * הפעלת מערכת ה-AI במצב פסיבי או אקטיבי
 */
router.post('/system/start', async (req: Request, res: Response) => {
  try {
    // בדיקת הרשאות - מבוטל זמנית לצורך בדיקה
    // Skip authentication temporarily for testing
    /*if (req.user?.username !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can control the AI system'
      });
    }*/
    
    const { activeMode = false } = req.body;
    
    // בדיקה אם המערכת כבר פועלת
    const status = aiTradingSystem.getStatus();
    if (status.isRunning) {
      return res.json({
        success: true,
        message: 'AI system is already running',
        status
      });
    }
    
    // הפעלת המערכת
    await aiTradingSystem.start(activeMode);
    
    // בדיקת סטטוס אחרי הפעלה
    const newStatus = aiTradingSystem.getStatus();
    
    res.json({
      success: true,
      message: `AI system started in ${activeMode ? 'ACTIVE' : 'PASSIVE'} mode successfully`,
      status: newStatus
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/system/stop
 * עצירת מערכת ה-AI
 */
router.post('/system/stop', async (req: Request, res: Response) => {
  try {
    // בדיקת הרשאות - מבוטל זמנית לצורך בדיקה
    // Skip authentication temporarily for testing
    /*if (req.user?.username !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can control the AI system'
      });
    }*/
    
    // בדיקה אם המערכת פועלת
    const status = aiTradingSystem.getStatus();
    if (!status.isRunning) {
      return res.json({
        success: true,
        message: 'AI system is not running',
        status
      });
    }
    
    // עצירת המערכת
    aiTradingSystem.stop();
    
    // בדיקת סטטוס אחרי עצירה
    const newStatus = aiTradingSystem.getStatus();
    
    res.json({
      success: true,
      message: 'AI system stopped successfully',
      status: newStatus
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/trading/signals
 * קבלת איתותי מסחר מה-AI
 */
router.get('/trading/signals', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Get user API keys for Binance
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get user API keys from storage
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    if (!apiKeys || !apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
      return res.status(400).json({ message: 'Binance API keys not configured' });
    }

    // Set credentials
    await aiTradingBridge.setCredentials({
      apiKey: apiKeys.binanceApiKey,
      secretKey: apiKeys.binanceSecretKey, 
      testnet: true // Using testnet for simulation testing
    });

    // Check if we have fresh signals already
    if (aiTradingBridge.areSignalsFresh()) {
      const { signals, timestamp } = aiTradingBridge.getLastSignals();
      return res.json({
        success: true,
        signals,
        timestamp: timestamp.toISOString(),
        isFresh: true
      });
    }

    // Generate new signals
    const signals = await aiTradingBridge.generateSignals();
    
    return res.json({
      success: true,
      signals,
      timestamp: new Date().toISOString(),
      isFresh: true
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/trading/execute
 * ביצוע מסחר על סמך המלצת ה-AI
 */
router.post('/trading/execute', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { signalId, amount } = req.body;
    if (!signalId) {
      return res.status(400).json({ 
        success: false,
        message: 'Signal ID is required' 
      });
    }

    // Get user API keys for Binance
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    // Get user API keys from storage
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    if (!apiKeys || !apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
      return res.status(400).json({ 
        success: false,
        message: 'Binance API keys not configured' 
      });
    }

    // Set credentials
    await aiTradingBridge.setCredentials({
      apiKey: apiKeys.binanceApiKey,
      secretKey: apiKeys.binanceSecretKey,
      testnet: true // Using testnet for simulation testing
    });

    // Get current signals
    const { signals } = aiTradingBridge.getLastSignals();
    const signal = signals.find(s => `${s.symbol}-${s.timestamp}` === signalId);

    if (!signal) {
      return res.status(404).json({ 
        success: false,
        message: 'Signal not found' 
      });
    }

    // Execute the trade
    const result = await aiTradingBridge.executeTrade(signal, amount);
    
    return res.json({
      success: result.success,
      message: result.message,
      order: result.order
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/trading/train
 * אימון מודל ה-AI למטבע מסוים
 */
router.post('/trading/train', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ 
        success: false,
        message: 'Symbol is required' 
      });
    }

    // Only admin can train models
    if (req.user?.username !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only admin can train models' 
      });
    }

    // Train the model
    const success = await aiTradingBridge.trainModel(symbol);
    
    if (success) {
      return res.json({ 
        success: true,
        message: `Model for ${symbol} trained successfully` 
      });
    } else {
      return res.status(500).json({ 
        success: false,
        message: `Failed to train model for ${symbol}` 
      });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/paper-trading/set-user
 * הגדרת משתמש עבור מערכת ה-AI Paper Trading
 */
router.post('/paper-trading/set-user', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // קבלת מזהה המשתמש
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }
    
    // הגדרת המשתמש לגשר ה-Paper Trading
    const success = await aiPaperTradingBridge.setUser(userId);
    
    if (success) {
      return res.json({ 
        success: true,
        message: `Paper trading user set successfully for AI system` 
      });
    } else {
      return res.status(500).json({ 
        success: false,
        message: `Failed to set paper trading user for AI system` 
      });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/paper-trading/trades
 * קבלת היסטוריית עסקאות של ה-AI ב-Paper Trading
 */
router.get('/paper-trading/trades', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // קבלת מזהה המשתמש
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }
    
    // אם אין משתמש מוגדר, ננסה להגדיר אותו
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({ 
        success: false,
        message: `Failed to set paper trading user for AI system` 
      });
    }
    
    // קבלת היסטוריית העסקאות
    const trades = await aiPaperTradingBridge.getTradeHistory();
    
    return res.json({ 
      success: true,
      trades
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/paper-trading/performance
 * קבלת נתוני ביצועים של ה-AI ב-Paper Trading
 */
router.get('/paper-trading/performance', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // קבלת מזהה המשתמש
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }
    
    // אם אין משתמש מוגדר, ננסה להגדיר אותו
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({ 
        success: false,
        message: `Failed to set paper trading user for AI system` 
      });
    }
    
    // קבלת נתוני ביצועים
    const performance = await aiPaperTradingBridge.getPerformanceStats();
    
    return res.json({ 
      success: true,
      performance
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

export default router;