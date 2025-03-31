/**
 * Bot Service API Endpoints
 * מספק נקודות קצה מאוחדות לניהול כל סוגי הבוטים
 */
import { Router, Request, Response } from 'express';
import { botService, BotStrategyEnum, GridParameters, DCAParameters, MACDParameters, AIGridParameters } from './botService';
import { ensureAuthenticated } from '../../auth';
import { storage } from '../../storage';

const router = Router();

// Helper function to handle API errors
function handleApiError(err: any, res: Response) {
  console.error('Bot API Error:', err.message || 'Unknown error');
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err
  });
}

/**
 * GET /api/bots
 * Get all bots for the current user
 */
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const bots = await botService.getUserBots(userId);
    
    // Convert interface format for frontend compatibility
    const formattedBots = bots.map(bot => ({
      id: bot.id,
      userId: bot.userId,
      name: bot.name,
      description: bot.description,
      pair: bot.tradingPair,
      exchange: 'binance', // Default exchange
      strategy: bot.strategy,
      status: bot.isRunning ? 'RUNNING' : 'STOPPED',
      parameters: JSON.parse(bot.parameters),
      profitLoss: bot.profitLoss,
      profitLossPercentage: bot.profitLossPercent,
      createdAt: bot.createdAt,
      updatedAt: bot.lastStartedAt || bot.createdAt
    }));

    res.json(formattedBots);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/bots/:id
 * Get a specific bot by ID
 */
router.get('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const botId = parseInt(req.params.id);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }

    const bot = await botService.getBotById(botId, userId);
    
    // Convert bot to response format
    const formattedBot = {
      id: bot.id,
      userId: bot.userId,
      name: bot.name,
      description: bot.description,
      pair: bot.tradingPair,
      exchange: 'binance', // Default exchange
      strategy: bot.strategy,
      status: bot.isRunning ? 'RUNNING' : 'STOPPED',
      parameters: JSON.parse(bot.parameters),
      profitLoss: bot.profitLoss,
      profitLossPercentage: bot.profitLossPercent,
      createdAt: bot.createdAt,
      updatedAt: bot.lastStartedAt || bot.createdAt
    };

    res.json(formattedBot);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/bots
 * Create a new bot
 */
router.post('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const { name, strategy, parameters, description } = req.body;
    
    // Validate required fields
    if (!name || !strategy || !parameters) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, strategy, parameters'
      });
    }
    
    // Validate strategy type
    if (!Object.values(BotStrategyEnum).includes(strategy as BotStrategyEnum)) {
      return res.status(400).json({
        success: false,
        message: `Invalid strategy type. Must be one of: ${Object.values(BotStrategyEnum).join(', ')}`
      });
    }
    
    // Validate parameters based on strategy type
    switch (strategy) {
      case BotStrategyEnum.GRID:
        // Validate grid parameters
        if (!parameters.symbol || !parameters.upperPrice || 
            !parameters.lowerPrice || !parameters.gridCount || 
            !parameters.totalInvestment) {
          return res.status(400).json({
            success: false,
            message: 'Missing required grid parameters: symbol, upperPrice, lowerPrice, gridCount, totalInvestment'
          });
        }
        break;
        
      case BotStrategyEnum.DCA:
        // Validate DCA parameters
        if (!parameters.symbol || !parameters.initialInvestment || 
            !parameters.interval || !parameters.investmentAmount) {
          return res.status(400).json({
            success: false,
            message: 'Missing required DCA parameters: symbol, initialInvestment, interval, investmentAmount'
          });
        }
        break;
        
      case BotStrategyEnum.MACD:
        // Validate MACD parameters
        if (!parameters.symbol || parameters.fastPeriod === undefined || 
            parameters.slowPeriod === undefined || parameters.signalPeriod === undefined || 
            !parameters.investmentAmount) {
          return res.status(400).json({
            success: false,
            message: 'Missing required MACD parameters: symbol, fastPeriod, slowPeriod, signalPeriod, investmentAmount'
          });
        }
        break;
        
      case BotStrategyEnum.AI_GRID:
        // Validate AI Grid parameters
        if (!parameters.symbol || !parameters.totalInvestment || 
            parameters.riskLevel === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Missing required AI Grid parameters: symbol, totalInvestment, riskLevel'
          });
        }
        break;
    }
    
    // Create the bot
    const newBot = await botService.createBot(
      userId,
      name,
      strategy as BotStrategyEnum,
      parameters,
      description
    );
    
    // Convert bot to response format
    const formattedBot = {
      id: newBot.id,
      userId: newBot.userId,
      name: newBot.name,
      description: newBot.description,
      pair: newBot.tradingPair,
      exchange: 'binance', // Default exchange
      strategy: newBot.strategy,
      status: 'STOPPED', // New bots start stopped
      parameters: JSON.parse(newBot.parameters),
      profitLoss: newBot.profitLoss,
      profitLossPercentage: newBot.profitLossPercent,
      createdAt: newBot.createdAt,
      updatedAt: newBot.createdAt
    };
    
    res.status(201).json(formattedBot);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/bots/:id/start
 * Start a bot
 */
router.post('/:id/start', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const botId = parseInt(req.params.id);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    // Start the bot
    const updatedBot = await botService.startBot(botId, userId);
    
    // Convert bot to response format
    const formattedBot = {
      id: updatedBot.id,
      userId: updatedBot.userId,
      name: updatedBot.name,
      description: updatedBot.description,
      pair: updatedBot.tradingPair,
      exchange: 'binance', // Default exchange
      strategy: updatedBot.strategy,
      status: 'RUNNING',
      parameters: JSON.parse(updatedBot.parameters),
      profitLoss: updatedBot.profitLoss,
      profitLossPercentage: updatedBot.profitLossPercent,
      createdAt: updatedBot.createdAt,
      updatedAt: updatedBot.lastStartedAt
    };
    
    res.json(formattedBot);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/bots/:id/stop
 * Stop a bot
 */
router.post('/:id/stop', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const botId = parseInt(req.params.id);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    // Stop the bot
    const updatedBot = await botService.stopBot(botId, userId);
    
    // Convert bot to response format
    const formattedBot = {
      id: updatedBot.id,
      userId: updatedBot.userId,
      name: updatedBot.name,
      description: updatedBot.description,
      pair: updatedBot.tradingPair,
      exchange: 'binance', // Default exchange
      strategy: updatedBot.strategy,
      status: 'STOPPED',
      parameters: JSON.parse(updatedBot.parameters),
      profitLoss: updatedBot.profitLoss,
      profitLossPercentage: updatedBot.profitLossPercent,
      createdAt: updatedBot.createdAt,
      updatedAt: updatedBot.lastStoppedAt
    };
    
    res.json(formattedBot);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * PUT /api/bots/:id
 * Update a bot's parameters
 */
router.put('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const botId = parseInt(req.params.id);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const { parameters } = req.body;
    
    // Update the bot parameters
    const updatedBot = await botService.updateBotParameters(
      botId,
      userId,
      parameters
    );
    
    // Convert bot to response format
    const formattedBot = {
      id: updatedBot.id,
      userId: updatedBot.userId,
      name: updatedBot.name,
      description: updatedBot.description,
      pair: updatedBot.tradingPair,
      exchange: 'binance', // Default exchange
      strategy: updatedBot.strategy,
      status: updatedBot.isRunning ? 'RUNNING' : 'STOPPED',
      parameters: JSON.parse(updatedBot.parameters),
      profitLoss: updatedBot.profitLoss,
      profitLossPercentage: updatedBot.profitLossPercent,
      createdAt: updatedBot.createdAt,
      updatedAt: new Date()
    };
    
    res.json(formattedBot);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/bots/:id/performance
 * Get a bot's performance metrics
 */
router.get('/:id/performance', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const botId = parseInt(req.params.id);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    // Get the bot's performance metrics
    const performance = await botService.getBotPerformance(botId, userId);
    
    res.json({
      success: true,
      botId,
      performance
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/bots/:id/trades
 * Get a bot's trading history
 */
router.get('/:id/trades', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const botId = parseInt(req.params.id);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    // Get the bot's trading history
    const trades = await botService.getBotTradingHistory(botId, userId);
    
    res.json({
      success: true,
      botId,
      trades
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/bots/strategies
 * Get information about available bot strategies
 */
router.get('/strategies/info', (req: Request, res: Response) => {
  try {
    const strategies = Object.values(BotStrategyEnum).map(strategy => {
      return {
        id: strategy,
        name: strategy.toUpperCase().replace('_', ' '),
        description: getStrategyDescription(strategy as BotStrategyEnum),
        minInvestment: botService.getMinInvestmentForStrategy(strategy as BotStrategyEnum),
        monthlyReturn: botService.getEstimatedReturnForStrategy(strategy as BotStrategyEnum),
        riskLevel: botService.getRiskLevelForStrategy(strategy as BotStrategyEnum)
      };
    });
    
    res.json({
      success: true,
      strategies
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

// Helper function to get strategy descriptions
function getStrategyDescription(strategy: BotStrategyEnum): string {
  switch (strategy) {
    case BotStrategyEnum.GRID:
      return 'Grid trading places buy and sell orders at predetermined price levels, profiting from price movements within a range.';
    case BotStrategyEnum.DCA:
      return 'Dollar-Cost Averaging makes regular purchases regardless of price, reducing the impact of volatility over time.';
    case BotStrategyEnum.MACD:
      return 'MACD (Moving Average Convergence Divergence) strategy uses technical indicators to identify potential entry and exit points.';
    case BotStrategyEnum.AI_GRID:
      return 'AI-optimized Grid Trading uses machine learning to automatically adjust grid parameters based on market conditions.';
    default:
      return 'Automated cryptocurrency trading strategy';
  }
}

export default router;