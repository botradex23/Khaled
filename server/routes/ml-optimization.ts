import express from 'express';
import { storage } from '../storage';
import { 
  insertXgboostTuningRunSchema, 
  insertMarketConditionSchema, 
  insertMlModelPerformanceSchema, 
  insertMlAdminFeedbackSchema, 
  insertStrategySimulationSchema,
  insertRetrainingEventSchema,
  MarketConditionChangeType
} from '@shared/schema';
import { z } from 'zod';
import axios from 'axios';

const router = express.Router();

// Python service URL for ML optimization
const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

// Track adaptive tuning processes
const adaptiveTuningProcesses: Record<string, any> = {};

// Track market monitor status
const marketMonitor = {
  running: false,
  startedAt: '',
  monitoredAssets: [],
  lastCheck: '',
  significantChanges: {} as Record<string, Array<MarketConditionChangeType>>,
};

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

// Start adaptive hyperparameter tuning
router.post('/adaptive-tuning/start', async (req, res) => {
  try {
    const { symbol, timeframe } = req.body;
    
    if (!symbol || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and timeframe are required'
      });
    }
    
    // Normalize symbol format
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    
    // Check if adaptive tuning is already running for this symbol/timeframe
    const processKey = `${normalizedSymbol}_${timeframe}_adaptive`;
    if (adaptiveTuningProcesses[processKey] && adaptiveTuningProcesses[processKey].status === 'running') {
      return res.json({
        success: false,
        error: `Adaptive tuning already running for ${symbol} on ${timeframe} timeframe`
      });
    }
    
    // Track the process
    adaptiveTuningProcesses[processKey] = {
      symbol: normalizedSymbol,
      timeframe,
      status: 'running',
      startedAt: new Date().toISOString()
    };
    
    // Send request to Python service
    try {
      const pythonResponse = await axios.post(`${pythonServiceUrl}/api/ml/optimization/adaptive-tuning/start`, {
        symbol: normalizedSymbol,
        timeframe
      });
      
      res.json({
        success: true,
        message: `Adaptive tuning started for ${symbol} on ${timeframe} timeframe`,
        processKey,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error from Python service:', pythonError);
      
      // Update process status
      adaptiveTuningProcesses[processKey].status = 'failed';
      adaptiveTuningProcesses[processKey].error = pythonError.message;
      adaptiveTuningProcesses[processKey].completedAt = new Date().toISOString();
      
      res.json({
        success: false,
        message: 'Failed to start adaptive tuning',
        error: pythonError.message
      });
    }
  } catch (error) {
    console.error('Error starting adaptive tuning:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get adaptive tuning status
router.get('/adaptive-tuning/status', async (req, res) => {
  try {
    // Try to get status from Python service
    try {
      const pythonResponse = await axios.get(`${pythonServiceUrl}/api/ml/optimization/adaptive-tuning/status`);
      
      res.json({
        success: true,
        ...pythonResponse.data,
        localProcesses: adaptiveTuningProcesses
      });
    } catch (pythonError) {
      console.error('Error getting adaptive tuning status from Python service:', pythonError);
      
      // Return local process tracking info
      res.json({
        success: true,
        message: 'Python service unavailable, showing local process tracking only',
        activeProcesses: adaptiveTuningProcesses
      });
    }
  } catch (error) {
    console.error('Error getting adaptive tuning status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if adaptive tuning is needed
router.get('/adaptive-tuning/check-needed/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    
    // Normalize symbol format
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    
    // Try to check with Python service
    try {
      const pythonResponse = await axios.get(
        `${pythonServiceUrl}/api/ml/optimization/adaptive-tuning/check-needed/${normalizedSymbol}/${timeframe}`
      );
      
      res.json({
        success: true,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error checking if adaptive tuning is needed:', pythonError);
      
      // Fall back to basic heuristic check
      // Get latest model performance
      const performances = await storage.getMlModelPerformanceBySymbol(normalizedSymbol);
      
      // Sort by creation date (newest first)
      performances.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Get latest market conditions
      const marketConditions = await storage.getMarketConditionsBySymbol(normalizedSymbol, timeframe, 2);
      
      // Check if performance is degrading or market conditions changing
      let adaptationNeeded = false;
      let reason = 'No adaptation needed';
      
      if (performances.length >= 2) {
        const latest = performances[0];
        const previous = performances[1];
        
        // Calculate performance change
        const f1Change = previous.f1Score > 0 
          ? (latest.f1Score - previous.f1Score) / previous.f1Score 
          : 0;
          
        if (f1Change < -0.05) {  // 5% degradation
          adaptationNeeded = true;
          reason = `Performance degraded by ${Math.abs(f1Change * 100).toFixed(1)}%`;
        }
      }
      
      if (marketConditions.length >= 2) {
        const latest = marketConditions[0];
        const previous = marketConditions[1];
        
        // Check for significant market condition changes
        const volatilityChange = Math.abs(latest.volatility - previous.volatility);
        const trendChange = latest.trendDirection !== previous.trendDirection;
        
        if (volatilityChange > 0.2 || trendChange) {
          adaptationNeeded = true;
          reason = 'Significant market condition changes detected';
        }
      }
      
      res.json({
        success: true,
        adaptationNeeded,
        reason,
        data: {
          recentPerformance: performances.slice(0, 2),
          marketConditions: marketConditions
        }
      });
    }
  } catch (error) {
    console.error('Error checking if adaptive tuning is needed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get adaptive tuning history
router.get('/adaptive-tuning/history/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    
    // Normalize symbol format
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    
    // Try to get history from Python service
    try {
      const pythonResponse = await axios.get(
        `${pythonServiceUrl}/api/ml/optimization/adaptive-tuning/history/${normalizedSymbol}/${timeframe}`
      );
      
      res.json({
        success: true,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error getting adaptive tuning history:', pythonError);
      
      // Fallback to looking at model performance records for adapted models
      const performances = await storage.getMlModelPerformanceBySymbol(normalizedSymbol);
      
      // Filter for adapted models
      const adaptedModels = performances.filter(model => 
        model.modelType.includes('adapted') && model.timeframe === timeframe
      );
      
      // Sort by creation date (newest first)
      adaptedModels.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      res.json({
        success: true,
        message: 'Python service unavailable, showing model performance records only',
        data: adaptedModels
      });
    }
  } catch (error) {
    console.error('Error getting adaptive tuning history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start market condition monitoring
router.post('/market-monitor/start', async (req, res) => {
  try {
    const { assets, config } = req.body;
    
    // Check if already tracking as running
    if (marketMonitor.running) {
      return res.status(409).json({
        success: false,
        error: 'Market condition monitor is already running'
      });
    }
    
    // Try to start via Python service
    try {
      const pythonResponse = await axios.post(`${pythonServiceUrl}/api/ml/optimization/market-monitor/start`, {
        assets,
        config
      });
      
      // Update local tracking state
      marketMonitor.running = true;
      marketMonitor.startedAt = new Date().toISOString();
      marketMonitor.monitoredAssets = assets || [];
      
      res.json({
        success: true,
        message: 'Market condition monitor started',
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error starting market condition monitor via Python service:', pythonError);
      
      res.status(500).json({
        success: false,
        error: 'Failed to start market condition monitor'
      });
    }
  } catch (error) {
    console.error('Error starting market condition monitor:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop market condition monitoring
router.post('/market-monitor/stop', async (req, res) => {
  try {
    // Check if already stopped
    if (!marketMonitor.running) {
      return res.status(400).json({
        success: false,
        error: 'Market condition monitor is not running'
      });
    }
    
    // Try to stop via Python service
    try {
      const pythonResponse = await axios.post(`${pythonServiceUrl}/api/ml/optimization/market-monitor/stop`);
      
      // Update local tracking state
      marketMonitor.running = false;
      
      res.json({
        success: true,
        message: 'Market condition monitor stopped',
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error stopping market condition monitor via Python service:', pythonError);
      
      // Even if Python service fails, update our local state
      marketMonitor.running = false;
      
      res.json({
        success: true,
        message: 'Market condition monitor marked as stopped (Python service error)',
        error: pythonError instanceof Error ? pythonError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error stopping market condition monitor:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get market monitor status
router.get('/market-monitor/status', async (req, res) => {
  try {
    // Try to get status from Python service
    try {
      const pythonResponse = await axios.get(`${pythonServiceUrl}/api/ml/optimization/market-monitor/status`);
      
      // Update our local state with the Python service state
      if (pythonResponse.data.success) {
        marketMonitor.running = pythonResponse.data.running;
        marketMonitor.monitoredAssets = pythonResponse.data.monitored_assets || [];
        
        // If available, update significant changes
        if (pythonResponse.data.condition_changes) {
          marketMonitor.significantChanges = pythonResponse.data.condition_changes;
        }
      }
      
      res.json({
        success: true,
        ...pythonResponse.data,
        localTracking: marketMonitor
      });
    } catch (pythonError) {
      console.error('Error getting market monitor status from Python service:', pythonError);
      
      // Return our local tracking info
      res.json({
        success: true,
        message: 'Python service unavailable, showing local tracking only',
        running: marketMonitor.running,
        monitoredAssets: marketMonitor.monitoredAssets,
        startedAt: marketMonitor.startedAt,
        lastCheck: marketMonitor.lastCheck,
        significantChanges: marketMonitor.significantChanges
      });
    }
  } catch (error) {
    console.error('Error getting market monitor status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add asset to monitor
router.post('/market-monitor/assets', async (req, res) => {
  try {
    const { symbol, timeframe } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }
    
    // Normalize symbol format
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    const normalizedTimeframe = timeframe || '1h';
    
    // Try to add asset via Python service
    try {
      const pythonResponse = await axios.post(`${pythonServiceUrl}/api/ml/optimization/market-monitor/assets`, {
        symbol: normalizedSymbol,
        timeframe: normalizedTimeframe
      });
      
      // Update our local state
      const assetExists = marketMonitor.monitoredAssets.some(a => 
        a.symbol === normalizedSymbol && a.timeframe === normalizedTimeframe
      );
      
      if (!assetExists) {
        marketMonitor.monitoredAssets.push({
          symbol: normalizedSymbol,
          timeframe: normalizedTimeframe
        });
      }
      
      res.json({
        success: true,
        message: `Added ${normalizedSymbol} ${normalizedTimeframe} to monitored assets`,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error adding asset to monitor via Python service:', pythonError);
      
      res.status(500).json({
        success: false,
        error: 'Failed to add asset to monitor'
      });
    }
  } catch (error) {
    console.error('Error adding asset to monitor:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Remove asset from monitoring
router.delete('/market-monitor/assets/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    
    // Normalize symbol format
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    
    // Try to remove asset via Python service
    try {
      const pythonResponse = await axios.delete(
        `${pythonServiceUrl}/api/ml/optimization/market-monitor/assets/${normalizedSymbol}/${timeframe}`
      );
      
      // Update our local state
      marketMonitor.monitoredAssets = marketMonitor.monitoredAssets.filter(a => 
        !(a.symbol === normalizedSymbol && a.timeframe === timeframe)
      );
      
      res.json({
        success: true,
        message: `Removed ${normalizedSymbol} ${timeframe} from monitored assets`,
        ...pythonResponse.data
      });
    } catch (pythonError) {
      console.error('Error removing asset from monitor via Python service:', pythonError);
      
      // Even if Python service fails, update our local state
      marketMonitor.monitoredAssets = marketMonitor.monitoredAssets.filter(a => 
        !(a.symbol === normalizedSymbol && a.timeframe === timeframe)
      );
      
      res.json({
        success: true,
        message: `Removed ${normalizedSymbol} ${timeframe} from local tracking (Python service error)`,
        error: pythonError instanceof Error ? pythonError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error removing asset from monitor:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manually check market conditions
router.post('/market-monitor/check', async (req, res) => {
  try {
    // Try to check via Python service
    try {
      const pythonResponse = await axios.post(`${pythonServiceUrl}/api/ml/optimization/market-monitor/check`);
      
      // Update last check time
      marketMonitor.lastCheck = new Date().toISOString();
      
      // If there are significant changes, update our tracking
      if (pythonResponse.data.success && pythonResponse.data.results) {
        // Extract significant changes
        const results = pythonResponse.data.results.results || [];
        const significantChanges = results.filter(r => r.retraining_needed);
        
        // Update local tracking
        significantChanges.forEach(change => {
          const assetKey = `${change.symbol}_${change.timeframe}`;
          
          if (!marketMonitor.significantChanges[assetKey]) {
            marketMonitor.significantChanges[assetKey] = [];
          }
          
          marketMonitor.significantChanges[assetKey].push({
            timestamp: change.timestamp,
            reason: change.reason,
            conditionChanges: change.condition_changes,
            currentConditions: change.current_conditions
          });
          
          // Keep only the latest 10 changes
          if (marketMonitor.significantChanges[assetKey].length > 10) {
            marketMonitor.significantChanges[assetKey] = 
              marketMonitor.significantChanges[assetKey].slice(-10);
          }
        });
      }
      
      res.json({
        success: true,
        ...pythonResponse.data,
        localTracking: {
          lastCheck: marketMonitor.lastCheck,
          significantChanges: marketMonitor.significantChanges
        }
      });
    } catch (pythonError) {
      console.error('Error checking market conditions via Python service:', pythonError);
      
      res.status(500).json({
        success: false,
        error: 'Failed to check market conditions'
      });
    }
  } catch (error) {
    console.error('Error checking market conditions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get retraining events for a symbol and timeframe
router.get('/retraining-events/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    // Normalize the symbol format to match storage format
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    
    let events = [];
    
    // First try to get from database
    try {
      events = await storage.getRetrainingEvents(normalizedSymbol, timeframe, limit);
    } catch (dbError) {
      console.error('Error fetching retraining events from database:', dbError);
      events = [];
    }
    
    // Then try to get from Python service and merge results
    try {
      const pythonResponse = await axios.get(
        `${pythonServiceUrl}/api/ml/optimization/retraining-events/${normalizedSymbol}/${timeframe}`,
        { params: { limit } }
      );
      
      // Merge results from Python service with database results
      // This assumes Python service returns { success: true, events: [...] }
      if (pythonResponse.data.success && pythonResponse.data.events) {
        // We might get duplicates between DB and Python service, so let's handle that
        // by using a Map with eventId as the key
        const eventMap = new Map();
        
        // Add Python events
        pythonResponse.data.events.forEach((event: any) => {
          eventMap.set(event.id || event.eventId, event);
        });
        
        // Add DB events, overwriting Python events with the same ID
        events.forEach(event => {
          eventMap.set(event.id, event);
        });
        
        // Convert back to array
        events = Array.from(eventMap.values());
      }
    } catch (pythonError) {
      console.error('Error fetching retraining events from Python service:', pythonError);
      // Continue with database results only
    }
    
    res.json({
      success: true,
      count: events.length,
      events: events
    });
  } catch (error) {
    console.error('Error fetching retraining events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Record retraining event
router.post('/retraining-events', async (req, res) => {
  try {
    const { symbol, timeframe, method, market_conditions, result } = req.body;
    
    if (!symbol || !timeframe || !method) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, timeframe, and method are required'
      });
    }
    
    // Try to record via Python service
    try {
      const pythonResponse = await axios.post(`${pythonServiceUrl}/api/ml/optimization/retraining-events`, req.body);
      
      // Also store in our database
      try {
        // Convert the data to match our schema
        const retrainingEvent = await storage.createRetrainingEvent({
          symbol: symbol.replace('/', '').toLowerCase(),
          timeframe,
          retrainingMethod: method,
          marketConditions: JSON.stringify(market_conditions || {}),
          result: JSON.stringify(result || {}),
          createdAt: new Date()
        });
        
        res.json({
          success: true,
          message: 'Retraining event recorded',
          eventId: retrainingEvent.id,
          ...pythonResponse.data
        });
      } catch (dbError) {
        console.error('Error storing retraining event in database:', dbError);
        
        res.json({
          success: true,
          message: 'Retraining event recorded in Python service only',
          pythonServiceResponse: pythonResponse.data,
          dbError: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
      }
    } catch (pythonError) {
      console.error('Error recording retraining event via Python service:', pythonError);
      
      // Try to store in our database anyway
      try {
        // Convert the data to match our schema
        const retrainingEvent = await storage.createRetrainingEvent({
          symbol: symbol.replace('/', '').toLowerCase(),
          timeframe,
          retrainingMethod: method,
          marketConditions: JSON.stringify(market_conditions || {}),
          result: JSON.stringify(result || {}),
          createdAt: new Date()
        });
        
        res.json({
          success: true,
          message: 'Retraining event recorded in database only',
          eventId: retrainingEvent.id,
          pythonServiceError: pythonError instanceof Error ? pythonError.message : 'Unknown error'
        });
      } catch (dbError) {
        console.error('Error storing retraining event in database:', dbError);
        
        res.status(500).json({
          success: false,
          error: 'Failed to record retraining event'
        });
      }
    }
  } catch (error) {
    console.error('Error recording retraining event:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;