import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { InsertPaperTradingAccount, InsertPaperTradingPosition, InsertPaperTradingTrade } from '@shared/schema';
import { z } from 'zod';

// Schemas for validation
const createAccountSchema = z.object({
  initialBalance: z.number().min(100).default(1000)
});

const closePositionSchema = z.object({
  exitPrice: z.number().positive()
});

const resetAccountSchema = z.object({
  initialBalance: z.number().min(100).optional()
});

// Router
const router = Router();

// Authentication middleware
const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

// Get account
router.get('/account', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const account = await storage.getUserPaperTradingAccount(userId);

    if (!account) {
      return res.status(404).json({ message: 'Paper trading account not found' });
    }

    return res.json(account);
  } catch (error: any) {
    console.error('Error getting paper trading account:', error);
    return res.status(500).json({ message: error.message || 'Failed to get paper trading account' });
  }
});

// Create account
router.post('/account', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Check if account already exists
    const existingAccount = await storage.getUserPaperTradingAccount(userId);
    if (existingAccount) {
      // אם החשבון כבר קיים, החזר אותו במקום לשלוח שגיאה
      return res.status(200).json(existingAccount);
    }

    // Validate request body
    const validation = createAccountSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.error.errors 
      });
    }

    const { initialBalance } = validation.data;

    // Create account
    const account: InsertPaperTradingAccount = {
      userId,
      initialBalance: initialBalance.toString(),
      currentBalance: initialBalance.toString(),
      isActive: true,
      totalProfitLoss: "0",
      totalProfitLossPercent: "0",
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0
    };

    const createdAccount = await storage.createPaperTradingAccount(account);
    return res.status(201).json(createdAccount);
  } catch (error: any) {
    console.error('Error creating paper trading account:', error);
    return res.status(500).json({ message: error.message || 'Failed to create paper trading account' });
  }
});

// Reset account
router.post('/account/reset', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get existing account
    const account = await storage.getUserPaperTradingAccount(userId);
    if (!account) {
      return res.status(404).json({ message: 'Paper trading account not found' });
    }

    // Validate request body
    const validation = resetAccountSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.error.errors 
      });
    }

    const { initialBalance } = validation.data;
    
    // Reset account
    const resetAccount = await storage.resetPaperTradingAccount(
      account.id, 
      initialBalance ? initialBalance : parseFloat(account.initialBalance)
    );
    
    return res.json(resetAccount);
  } catch (error: any) {
    console.error('Error resetting paper trading account:', error);
    return res.status(500).json({ message: error.message || 'Failed to reset paper trading account' });
  }
});

// Get positions
router.get('/positions', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get account
    const account = await storage.getUserPaperTradingAccount(userId);
    if (!account) {
      return res.status(404).json({ message: 'Paper trading account not found' });
    }

    // Get positions
    const positions = await storage.getAccountPaperTradingPositions(account.id);
    return res.json(positions);
  } catch (error: any) {
    console.error('Error getting paper trading positions:', error);
    return res.status(500).json({ message: error.message || 'Failed to get paper trading positions' });
  }
});

// Close position
router.post('/positions/:id/close', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const positionId = parseInt(req.params.id);
    
    // Get account
    const account = await storage.getUserPaperTradingAccount(userId);
    if (!account) {
      return res.status(404).json({ message: 'Paper trading account not found' });
    }

    // Get position
    const position = await storage.getPaperTradingPosition(positionId);
    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    // Check if user owns the position
    if (position.accountId !== account.id) {
      return res.status(403).json({ message: 'You do not have permission to close this position' });
    }

    // Validate request body
    const validation = closePositionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request data',
        errors: validation.error.errors 
      });
    }

    const { exitPrice } = validation.data;
    
    // Close position
    const trade = await storage.closePaperTradingPosition(positionId, exitPrice);
    if (!trade) {
      return res.status(400).json({ message: 'Failed to close position' });
    }
    
    return res.json(trade);
  } catch (error: any) {
    console.error('Error closing paper trading position:', error);
    return res.status(500).json({ message: error.message || 'Failed to close position' });
  }
});

// Get trades
router.get('/trades', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get account
    const account = await storage.getUserPaperTradingAccount(userId);
    if (!account) {
      return res.status(404).json({ message: 'Paper trading account not found' });
    }

    // Pagination
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    // Get trades
    const trades = await storage.getAccountPaperTradingTrades(account.id, limit, offset);
    return res.json(trades);
  } catch (error: any) {
    console.error('Error getting paper trading trades:', error);
    return res.status(500).json({ message: error.message || 'Failed to get paper trading trades' });
  }
});

// Get stats
router.get('/stats', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get account
    const account = await storage.getUserPaperTradingAccount(userId);
    if (!account) {
      return res.status(404).json({ message: 'Paper trading account not found' });
    }

    // Get stats
    const stats = await storage.getPaperTradingStats(account.id);
    return res.json(stats);
  } catch (error: any) {
    console.error('Error getting paper trading stats:', error);
    return res.status(500).json({ message: error.message || 'Failed to get paper trading stats' });
  }
});

// Create new trade
router.post('/trades', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get account
    const account = await storage.getUserPaperTradingAccount(userId);
    if (!account) {
      return res.status(404).json({ message: 'Paper trading account not found' });
    }

    // Create position
    const position: InsertPaperTradingPosition = {
      accountId: account.id,
      symbol: req.body.symbol,
      quantity: req.body.quantity,
      entryPrice: req.body.entryPrice,
      direction: req.body.direction
    };

    const createdPosition = await storage.createPaperTradingPosition(position);
    
    // Create trade
    const trade: InsertPaperTradingTrade = {
      accountId: account.id,
      positionId: createdPosition.id,
      symbol: req.body.symbol,
      entryPrice: req.body.entryPrice,
      quantity: req.body.quantity,
      direction: req.body.direction,
      status: "OPEN",
      type: req.body.type || "MARKET",
      isAiGenerated: req.body.isAiGenerated || false,
      aiConfidence: req.body.aiConfidence || null,
      signalData: req.body.signalData || null,
      metadata: req.body.metadata || null
    };

    const createdTrade = await storage.createPaperTradingTrade(trade);
    return res.status(201).json({
      position: createdPosition,
      trade: createdTrade
    });
  } catch (error: any) {
    console.error('Error creating paper trading trade:', error);
    return res.status(500).json({ message: error.message || 'Failed to create trade' });
  }
});

export default router;