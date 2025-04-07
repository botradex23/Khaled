import express from 'express';
import { storage } from '../storage';
import { insertXgboostTuningRunSchema, insertMarketConditionSchema, insertMlModelPerformanceSchema, insertMlAdminFeedbackSchema, insertStrategySimulationSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Get all XGBoost tuning runs
router.get('/tuning-runs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const tuningRuns = await storage.getAllXgboostTuningRuns(limit);
    
    res.json({
      success: true,
      data: tuningRuns
    });
  } catch (error) {
    console.error('Error fetching XGBoost tuning runs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get XGBoost tuning runs by symbol
router.get('/tuning-runs/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const tuningRuns = await storage.getXgboostTuningRunsBySymbol(symbol);
    
    res.json({
      success: true,
      data: tuningRuns
    });
  } catch (error) {
    console.error(`Error fetching XGBoost tuning runs for symbol ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new XGBoost tuning run
router.post('/tuning-runs', async (req, res) => {
  try {
    const validatedData = insertXgboostTuningRunSchema.parse(req.body);
    const tuningRun = await storage.createXgboostTuningRun(validatedData);
    
    res.status(201).json({
      success: true,
      data: tuningRun
    });
  } catch (error) {
    console.error('Error creating XGBoost tuning run:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Update an existing XGBoost tuning run
router.patch('/tuning-runs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tuningRun = await storage.updateXgboostTuningRun(id, req.body);
    
    if (!tuningRun) {
      return res.status(404).json({
        success: false,
        error: `XGBoost tuning run with ID ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: tuningRun
    });
  } catch (error) {
    console.error(`Error updating XGBoost tuning run ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get market conditions by symbol and timeframe
router.get('/market-conditions', async (req, res) => {
  try {
    const { symbol, timeframe, limit } = req.query;
    
    if (!symbol || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Both symbol and timeframe parameters are required'
      });
    }
    
    const marketConditions = await storage.getMarketConditionsBySymbol(
      symbol as string,
      timeframe as string,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json({
      success: true,
      data: marketConditions
    });
  } catch (error) {
    console.error('Error fetching market conditions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new market condition
router.post('/market-conditions', async (req, res) => {
  try {
    const validatedData = insertMarketConditionSchema.parse(req.body);
    const marketCondition = await storage.createMarketCondition(validatedData);
    
    res.status(201).json({
      success: true,
      data: marketCondition
    });
  } catch (error) {
    console.error('Error creating market condition:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Get all ML model performance records
router.get('/model-performance', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const performances = await storage.getAllMlModelPerformance(limit);
    
    res.json({
      success: true,
      data: performances
    });
  } catch (error) {
    console.error('Error fetching ML model performance records:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get top performing models
router.get('/model-performance/top', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const topModels = await storage.getTopPerformingModels(limit);
    
    res.json({
      success: true,
      data: topModels
    });
  } catch (error) {
    console.error('Error fetching top performing models:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new ML model performance record
router.post('/model-performance', async (req, res) => {
  try {
    const validatedData = insertMlModelPerformanceSchema.parse(req.body);
    const performance = await storage.createMlModelPerformance(validatedData);
    
    res.status(201).json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error creating ML model performance record:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Get admin feedback by user
router.get('/admin-feedback/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const feedback = await storage.getMlAdminFeedbackByUserId(userId);
    
    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error(`Error fetching admin feedback for user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new admin feedback entry
router.post('/admin-feedback', async (req, res) => {
  try {
    const validatedData = insertMlAdminFeedbackSchema.parse(req.body);
    const feedback = await storage.createMlAdminFeedback(validatedData);
    
    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error creating admin feedback:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Mark admin feedback as implemented
router.patch('/admin-feedback/:id/implement', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const implementedAt = new Date();
    
    const feedback = await storage.updateMlAdminFeedback(id, { implementedAt });
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: `Admin feedback with ID ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error(`Error marking admin feedback ${req.params.id} as implemented:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get strategy simulations
router.get('/strategy-simulations', async (req, res) => {
  try {
    const { symbol, timeframe, limit } = req.query;
    
    let simulations;
    if (symbol) {
      simulations = await storage.getStrategySimulationsBySymbol(
        symbol as string,
        timeframe as string | undefined
      );
    } else {
      simulations = await storage.getAllStrategySimulations(
        limit ? parseInt(limit as string) : undefined
      );
    }
    
    res.json({
      success: true,
      data: simulations
    });
  } catch (error) {
    console.error('Error fetching strategy simulations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new strategy simulation
router.post('/strategy-simulations', async (req, res) => {
  try {
    const validatedData = insertStrategySimulationSchema.parse(req.body);
    const simulation = await storage.createStrategySimulation(validatedData);
    
    res.status(201).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Error creating strategy simulation:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

export default router;