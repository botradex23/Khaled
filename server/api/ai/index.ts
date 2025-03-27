/**
 * index.ts
 * 
 * נקודת כניסה למערכת ה-AI - מגדיר נתיבי API לניהול ושליטה במערכת למידת המכונה
 */

import { Router, Request, Response } from 'express';
import { aiGridBotManager, AiGridParams } from './AiGridBot';
import { aiTradingSystem } from './AITradingSystem';
import { storage } from '../../storage';
import { ensureAuthenticated } from '../../auth';

const router = Router();

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
    if (!req.user?.isAdmin) {
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

export default router;