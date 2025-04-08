import express from 'express';
import { storage } from '../storage';
import { insertXgboostTuningRunSchema, insertMarketConditionSchema, insertMlModelPerformanceSchema, insertMlAdminFeedbackSchema, insertStrategySimulationSchema } from '@shared/schema';
import { z } from 'zod';
import axios from 'axios';

const router = express.Router();

// Python service URL for ML optimization
const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

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

// Get model performance by symbol
router.get('/model-performance/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    const performances = await storage.getMlModelPerformanceBySymbol(normalizedSymbol);
    
    res.json({
      success: true,
      data: performances
    });
  } catch (error) {
    console.error(`Error fetching ML model performance for symbol ${req.params.symbol}:`, error);
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

// Start a new XGBoost optimization process
router.post('/start-optimization', async (req, res) => {
  try {
    const { symbol, timeframe, optimizationType } = req.body;
    
    if (!symbol || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and timeframe are required'
      });
    }
    
    // Normalize symbol format for API request
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    
    // Forward the request to the Python ML service
    console.log(`Starting XGBoost optimization for ${normalizedSymbol} on ${timeframe} timeframe with ${optimizationType} method`);
    
    try {
      const pythonResponse = await axios.post(`${pythonServiceUrl}/api/ml/optimization/start`, {
        symbol: normalizedSymbol,
        timeframe: timeframe,
        optimizationType: optimizationType || 'all'
      });
      
      // Also create a record in our database
      const tuningRun = await storage.createXgboostTuningRun({
        symbol: normalizedSymbol,
        timeframe: timeframe,
        optimizationType: optimizationType || 'all',
        status: 'running'
      });
      
      res.json({
        success: true,
        message: `XGBoost optimization started for ${symbol} on ${timeframe} timeframe`,
        processKey: pythonResponse.data.processKey,
        tuningRunId: tuningRun.id
      });
    } catch (pythonError) {
      console.error('Error from Python service:', pythonError);
      
      // Still create a record in our database but mark it as failed
      const tuningRun = await storage.createXgboostTuningRun({
        symbol: normalizedSymbol,
        timeframe: timeframe,
        optimizationType: optimizationType || 'all',
        status: 'failed',
        errorMessage: pythonError.message
      });
      
      // Return a graceful error response
      res.status(200).json({
        success: false,
        message: 'Failed to start optimization, but created a record',
        error: pythonError.message,
        tuningRunId: tuningRun.id
      });
    }
  } catch (error) {
    console.error('Error starting XGBoost optimization:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get XGBoost optimization status
router.get('/optimization-status', async (req, res) => {
  try {
    // Try to get status from Python service
    try {
      const pythonResponse = await axios.get(`${pythonServiceUrl}/api/ml/optimization/status`);
      
      res.json({
        success: true,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error getting optimization status from Python service:', pythonError);
      
      // Fallback to database records
      const tuningRuns = await storage.getAllXgboostTuningRuns(10);
      
      res.json({
        success: true,
        message: 'Python service unavailable, showing database records only',
        activeProcesses: {},
        databaseRecords: tuningRuns
      });
    }
  } catch (error) {
    console.error('Error getting optimization status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get XGBoost optimization parameters
router.get('/optimization-parameters', async (req, res) => {
  try {
    // Try to get parameters from Python service
    try {
      const pythonResponse = await axios.get(`${pythonServiceUrl}/api/ml/optimization/parameters`);
      
      res.json({
        success: true,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error getting optimization parameters from Python service:', pythonError);
      
      // Return default parameters
      res.json({
        success: true,
        message: 'Python service unavailable, showing default parameters',
        data: {
          grid_search: {
            max_depth: [3, 4, 5, 6, 7, 8],
            learning_rate: [0.01, 0.05, 0.1, 0.2],
            min_child_weight: [1, 2, 3, 4],
            gamma: [0, 0.1, 0.2, 0.3],
            subsample: [0.7, 0.8, 0.9, 1.0],
            colsample_bytree: [0.7, 0.8, 0.9, 1.0],
            n_estimators: [100, 200, 300]
          },
          random_search: {
            max_depth: [3, 10],
            learning_rate: [0.01, 0.3],
            min_child_weight: [1, 6],
            gamma: [0, 0.5],
            subsample: [0.6, 1.0],
            colsample_bytree: [0.6, 1.0],
            n_estimators: [50, 500]
          },
          bayesian: {
            max_depth: [3, 10],
            learning_rate: [0.01, 0.3],
            min_child_weight: [1, 6],
            gamma: [0, 0.5],
            subsample: [0.6, 1.0],
            colsample_bytree: [0.6, 1.0],
            n_estimators: [50, 500]
          }
        }
      });
    }
  } catch (error) {
    console.error('Error getting optimization parameters:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Compare optimization methods
router.get('/compare-optimization/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    
    // Normalize symbol format
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    
    // Try to get comparison from Python service
    try {
      const pythonResponse = await axios.get(`${pythonServiceUrl}/api/ml/optimization/compare/${normalizedSymbol}/${timeframe}`);
      
      res.json({
        success: true,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error getting optimization comparison from Python service:', pythonError);
      
      // Get tuning runs from database for fallback
      const tuningRuns = await storage.getXgboostTuningRunsBySymbol(normalizedSymbol);
      
      // Get model performance records for this symbol
      const modelPerformance = await storage.getMlModelPerformanceBySymbol(normalizedSymbol);
      
      // Build comparison data
      const comparison = {
        baseline: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 },
        grid_search: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 },
        random_search: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 },
        bayesian: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 }
      };
      
      // Fill in data from model performance records
      modelPerformance.forEach(model => {
        const type = model.modelType === 'standard' ? 'baseline' : model.modelType;
        if (type in comparison) {
          comparison[type] = {
            accuracy: model.accuracy,
            precision: model.precision,
            recall: model.recall,
            f1Score: model.f1Score
          };
        }
      });
      
      res.json({
        success: true,
        message: 'Python service unavailable, showing database records only',
        data: comparison,
        tuningRuns: tuningRuns
      });
    }
  } catch (error) {
    console.error('Error comparing optimization methods:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;