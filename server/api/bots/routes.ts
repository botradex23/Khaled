/**
 * routes.ts
 * 
 * נתיבי API לניהול בוטים
 */

import { Request, Response, Router } from 'express';
import { botService, BotStrategyType } from './bot-service';
import { ensureAuthenticated } from '../../middleware/auth';
import { storage } from '../../storage';
import { z } from 'zod';
import { insertTradingBotSchema } from '@shared/schema';

const router = Router();

/**
 * Schema לוולידציה של בוט AI Grid
 */
const aiGridBotSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  description: z.string().optional(),
  symbol: z.string().min(1, "Trading pair is required"),
  broker: z.string().min(1, "Broker is required"),
  gridLevels: z.number().int().min(3).max(20),
  upperLimit: z.number().positive(),
  lowerLimit: z.number().positive(),
  investmentAmount: z.number().positive(),
  aiOptimized: z.boolean().default(true),
  adaptToVolatility: z.boolean().default(true),
  maxPositionSize: z.number().positive(),
  riskLevel: z.number().int().min(1).max(10)
});

/**
 * Schema לוולידציה של בוט DCA
 */
const dcaBotSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  description: z.string().optional(),
  symbol: z.string().min(1, "Trading pair is required"),
  broker: z.string().min(1, "Broker is required"),
  intervalHours: z.number().int().min(1),
  totalBudget: z.number().positive(),
  purchaseAmount: z.number().positive(),
  maxPurchases: z.number().int().positive(),
  priceTargetPercentage: z.number().min(0),
  enableStopLoss: z.boolean().default(false),
  stopLossPercentage: z.number().min(0)
});

/**
 * Schema לוולידציה של בוט MACD
 */
const macdBotSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  description: z.string().optional(),
  symbol: z.string().min(1, "Trading pair is required"),
  broker: z.string().min(1, "Broker is required"),
  shortEMA: z.number().int().min(1),
  longEMA: z.number().int().min(1),
  signalPeriod: z.number().int().min(1),
  positionSize: z.number().positive(),
  takeProfitPercentage: z.number().min(0),
  stopLossPercentage: z.number().min(0),
  timeframe: z.string(),
  confirmationCandles: z.number().int().min(0)
});

/**
 * GET /bots
 * קבלת רשימת הבוטים של המשתמש
 */
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // קבלת רשימת בוטים של המשתמש
    const bots = await storage.getUserBots(req.user!.id);
    
    res.json({
      success: true,
      bots
    });
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch bots'
    });
  }
});

/**
 * GET /bots/:id
 * קבלת פרטי בוט ספציפי
 */
router.get('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // קבלת פרטי הבוט
    const bot = await storage.getBotById(botId);
    
    // בדיקה שהבוט קיים ושייך למשתמש
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this bot'
      });
    }
    
    res.json({
      success: true,
      bot
    });
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch bot'
    });
  }
});

/**
 * POST /bots/ai-grid
 * יצירת בוט AI Grid חדש
 */
router.post('/ai-grid', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // וולידציה של פרמטרי הבוט
    const result = aiGridBotSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: result.error.errors
      });
    }
    
    const {
      name,
      description,
      symbol,
      broker,
      gridLevels,
      upperLimit,
      lowerLimit,
      investmentAmount,
      aiOptimized,
      adaptToVolatility,
      maxPositionSize,
      riskLevel
    } = result.data;
    
    // בדיקה שהגבול העליון גדול מהגבול התחתון
    if (upperLimit <= lowerLimit) {
      return res.status(400).json({
        success: false,
        message: 'Upper limit must be greater than lower limit'
      });
    }
    
    // הכנת פרמטרי בוט לשמירה
    const botParameters = {
      symbol,
      investmentAmount,
      enabled: false,
      gridLevels,
      upperLimit,
      lowerLimit,
      aiOptimized,
      adaptToVolatility,
      maxPositionSize,
      riskLevel
    };
    
    // יצירת בוט חדש במסד הנתונים
    const newBot = await botService.createBot(req.user!.id, {
      userId: req.user!.id,
      name,
      description: description || '',
      symbol,
      broker,
      strategyType: BotStrategyType.AI_GRID,
      parameters: JSON.stringify(botParameters),
      isActive: false,
      isRunning: false
    });
    
    res.status(201).json({
      success: true,
      bot: newBot,
      message: 'AI Grid bot created successfully'
    });
  } catch (error) {
    console.error('Error creating AI Grid bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create AI Grid bot'
    });
  }
});

/**
 * POST /bots/dca
 * יצירת בוט DCA חדש
 */
router.post('/dca', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // וולידציה של פרמטרי הבוט
    const result = dcaBotSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: result.error.errors
      });
    }
    
    const {
      name,
      description,
      symbol,
      broker,
      intervalHours,
      totalBudget,
      purchaseAmount,
      maxPurchases,
      priceTargetPercentage,
      enableStopLoss,
      stopLossPercentage
    } = result.data;
    
    // בדיקה שסכום הרכישה הבודדת לא גדול מהתקציב הכולל
    if (purchaseAmount > totalBudget) {
      return res.status(400).json({
        success: false,
        message: 'Purchase amount cannot be greater than total budget'
      });
    }
    
    // הכנת פרמטרי בוט לשמירה
    const botParameters = {
      symbol,
      investmentAmount: totalBudget,
      enabled: false,
      intervalHours,
      totalBudget,
      purchaseAmount,
      maxPurchases,
      priceTargetPercentage,
      enableStopLoss,
      stopLossPercentage
    };
    
    // יצירת בוט חדש במסד הנתונים
    const newBot = await botService.createBot(req.user!.id, {
      userId: req.user!.id,
      name,
      description: description || '',
      symbol,
      broker,
      strategyType: BotStrategyType.DCA,
      parameters: JSON.stringify(botParameters),
      isActive: false,
      isRunning: false
    });
    
    res.status(201).json({
      success: true,
      bot: newBot,
      message: 'DCA bot created successfully'
    });
  } catch (error) {
    console.error('Error creating DCA bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create DCA bot'
    });
  }
});

/**
 * POST /bots/macd
 * יצירת בוט MACD חדש
 */
router.post('/macd', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // וולידציה של פרמטרי הבוט
    const result = macdBotSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: result.error.errors
      });
    }
    
    const {
      name,
      description,
      symbol,
      broker,
      shortEMA,
      longEMA,
      signalPeriod,
      positionSize,
      takeProfitPercentage,
      stopLossPercentage,
      timeframe,
      confirmationCandles
    } = result.data;
    
    // בדיקה ש-EMA הקצר קטן מה-EMA הארוך
    if (shortEMA >= longEMA) {
      return res.status(400).json({
        success: false,
        message: 'Short EMA must be less than long EMA'
      });
    }
    
    // הכנת פרמטרי בוט לשמירה
    const botParameters = {
      symbol,
      investmentAmount: positionSize,
      enabled: false,
      shortEMA,
      longEMA,
      signalPeriod,
      positionSize,
      takeProfitPercentage,
      stopLossPercentage,
      timeframe,
      confirmationCandles
    };
    
    // יצירת בוט חדש במסד הנתונים
    const newBot = await botService.createBot(req.user!.id, {
      userId: req.user!.id,
      name,
      description: description || '',
      symbol,
      broker,
      strategyType: BotStrategyType.MACD,
      parameters: JSON.stringify(botParameters),
      isActive: false,
      isRunning: false
    });
    
    res.status(201).json({
      success: true,
      bot: newBot,
      message: 'MACD bot created successfully'
    });
  } catch (error) {
    console.error('Error creating MACD bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create MACD bot'
    });
  }
});

/**
 * POST /bots/:id/activate
 * הפעלת בוט
 */
router.post('/:id/activate', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // קבלת פרטי הבוט
    const bot = await storage.getBotById(botId);
    
    // בדיקה שהבוט קיים ושייך למשתמש
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to activate this bot'
      });
    }
    
    // הפעלת הבוט
    await botService.activateBot(botId);
    
    res.json({
      success: true,
      message: 'Bot activated successfully'
    });
  } catch (error) {
    console.error('Error activating bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to activate bot'
    });
  }
});

/**
 * POST /bots/:id/deactivate
 * הפסקת בוט
 */
router.post('/:id/deactivate', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // קבלת פרטי הבוט
    const bot = await storage.getBotById(botId);
    
    // בדיקה שהבוט קיים ושייך למשתמש
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to deactivate this bot'
      });
    }
    
    // הפסקת הבוט
    await botService.deactivateBot(botId);
    
    res.json({
      success: true,
      message: 'Bot deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to deactivate bot'
    });
  }
});

/**
 * PUT /bots/:id
 * עדכון פרמטרים של בוט
 */
router.put('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // קבלת פרטי הבוט
    const bot = await storage.getBotById(botId);
    
    // בדיקה שהבוט קיים ושייך למשתמש
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this bot'
      });
    }
    
    // בחירת סכמת וולידציה לפי סוג הבוט
    let validationResult;
    
    switch (bot.strategyType) {
      case BotStrategyType.AI_GRID:
        validationResult = aiGridBotSchema.safeParse(req.body);
        break;
        
      case BotStrategyType.DCA:
        validationResult = dcaBotSchema.safeParse(req.body);
        break;
        
      case BotStrategyType.MACD:
        validationResult = macdBotSchema.safeParse(req.body);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported bot strategy type: ${bot.strategyType}`
        });
    }
    
    if (!validationResult?.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationResult?.error.errors
      });
    }
    
    // עדכון פרטי הבוט במסד הנתונים
    const { name, description, symbol, broker, ...parameters } = validationResult.data;
    
    await storage.updateBot(botId, {
      name,
      description: description || '',
      symbol,
      broker,
      parameters: JSON.stringify(parameters)
    });
    
    // עדכון פרמטרי הבוט בשירות
    if (bot.isActive) {
      await botService.updateBotParameters(botId, parameters);
    }
    
    res.json({
      success: true,
      message: 'Bot updated successfully'
    });
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update bot'
    });
  }
});

/**
 * DELETE /bots/:id
 * מחיקת בוט
 */
router.delete('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // קבלת פרטי הבוט
    const bot = await storage.getBotById(botId);
    
    // בדיקה שהבוט קיים ושייך למשתמש
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this bot'
      });
    }
    
    // מחיקת הבוט
    await botService.deleteBot(botId);
    
    res.json({
      success: true,
      message: 'Bot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete bot'
    });
  }
});

/**
 * GET /bots/:id/performance
 * קבלת ביצועי בוט
 */
router.get('/:id/performance', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    // קבלת פרטי הבוט
    const bot = await storage.getBotById(botId);
    
    // בדיקה שהבוט קיים ושייך למשתמש
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }
    
    if (bot.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this bot performance'
      });
    }
    
    // קבלת ביצועי הבוט
    const performance = await botService.getBotPerformance(botId);
    
    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('Error fetching bot performance:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch bot performance'
    });
  }
});

export default router;