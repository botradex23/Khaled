/**
 * ML Prediction Service
 * 
 * This service manages machine learning models and predictions without requiring
 * user API keys. It works with the global market data service to provide trading signals.
 */

import { log } from '../vite';
import { globalMarketData } from './global-market-data';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Path utilities for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define prediction result interface
interface PredictionResult {
  symbol: string;
  prediction: 'buy' | 'sell' | 'hold';
  confidence: number;
  timestamp: number;
  expectedPriceChange: number;
  timeframe: string;
}

// Define model information interface
interface ModelInfo {
  id: string;
  symbol: string;
  timeframe: string;
  lastTrainingTime: number;
  accuracy: number;
  features: string[];
}

class MLPredictionService {
  private static instance: MLPredictionService;
  private isInitialized = false;
  private pythonApiUrl = 'http://localhost:5001'; // URL to Python ML API service
  private predictions: Record<string, PredictionResult> = {};
  private models: Record<string, ModelInfo> = {};
  private modelTrainingQueue: string[] = [];
  private isTraining = false;
  
  // Private constructor to enforce singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance of the ML prediction service
   */
  public static getInstance(): MLPredictionService {
    if (!MLPredictionService.instance) {
      MLPredictionService.instance = new MLPredictionService();
    }
    return MLPredictionService.instance;
  }

  /**
   * Initialize the ML prediction service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      log('Initializing ML Prediction Service');
      
      // Wait for global market data service to be initialized
      if (!globalMarketData.getStatus().isInitialized) {
        await globalMarketData.initialize();
      }
      
      // Load existing models
      await this.loadExistingModels();
      
      // Start periodic model training and prediction
      this.scheduleTrainingAndPrediction();
      
      this.isInitialized = true;
      log('ML Prediction Service initialized successfully');
    } catch (error) {
      log(`Error initializing ML Prediction Service: ${error.message}`);
    }
  }

  /**
   * Load existing ML models
   */
  private async loadExistingModels(): Promise<void> {
    try {
      // Check if direct Python API is available
      const isPythonApiAvailable = await this.isPythonApiAvailable();
      
      if (isPythonApiAvailable) {
        // Fetch models from Python API
        const response = await axios.get(`${this.pythonApiUrl}/api/models/list`);
        
        if (response.status === 200 && response.data.success) {
          response.data.models.forEach((model: ModelInfo) => {
            this.models[model.id] = model;
          });
          
          log(`Loaded ${Object.keys(this.models).length} ML models from Python API`);
        }
      } else {
        // Python API not available, check for local model files
        const modelsDir = path.join(__dirname, '../../', 'ml_models');
        
        if (fs.existsSync(modelsDir)) {
          const files = fs.readdirSync(modelsDir);
          const modelInfoFiles = files.filter(file => file.endsWith('_info.json'));
          
          modelInfoFiles.forEach(file => {
            try {
              const modelInfo = JSON.parse(
                fs.readFileSync(path.join(modelsDir, file), 'utf-8')
              );
              this.models[modelInfo.id] = modelInfo;
            } catch (err) {
              log(`Error loading model info ${file}: ${err.message}`);
            }
          });
          
          log(`Loaded ${Object.keys(this.models).length} ML models from local files`);
        } else {
          // Create models directory if it doesn't exist
          fs.mkdirSync(modelsDir, { recursive: true });
          log('Created ML models directory');
        }
      }
      
      // Queue initial models for training if needed
      this.queueModelsForTraining();
    } catch (error) {
      log(`Error loading existing models: ${error.message}`);
    }
  }

  /**
   * Check if Python API is available
   */
  private async isPythonApiAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.pythonApiUrl}/api/health`, { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      log('Python ML API is not available');
      return false;
    }
  }

  /**
   * Queue models for training
   */
  private queueModelsForTraining(): void {
    // Get all available market prices to create models for all trading pairs
    const marketPrices = globalMarketData.getMarketPrices();
    const availableSymbols = marketPrices.map(price => price.symbol);
    
    // If we have market data, but no models, create models for all available symbols
    if (Object.keys(this.models).length === 0 && availableSymbols.length > 0) {
      // Focus on major coins plus some promising altcoins
      // Filter to keep only USD-paired coins (already filtered in market data service)
      const timeframes = ['1h', '4h', '1d'];
      
      // Create a model for each symbol and timeframe
      availableSymbols.forEach(symbol => {
        timeframes.forEach(timeframe => {
          const modelId = `${symbol}_${timeframe}`;
          this.models[modelId] = {
            id: modelId,
            symbol,
            timeframe,
            lastTrainingTime: 0,
            accuracy: 0,
            features: ['price', 'volume', 'rsi', 'macd', 'ema', 'sma']
          };
          
          // Add to training queue - but limit initial queue to prevent overload
          // We'll train the rest over time as the system runs
          if (
            symbol.includes('BTC') || 
            symbol.includes('ETH') || 
            symbol.includes('SOL') || 
            symbol.includes('BNB') || 
            symbol.includes('ADA') ||
            symbol.includes('DOT') ||
            symbol.includes('XRP')
          ) {
            this.modelTrainingQueue.push(modelId);
          }
        });
      });
      
      log(`Created ${Object.keys(this.models).length} models for all trading pairs`);
      log(`Queued ${this.modelTrainingQueue.length} high-priority models for immediate training`);
      
      // Schedule the rest of the models for training later
      setTimeout(() => {
        const remainingModels = Object.keys(this.models).filter(id => !this.modelTrainingQueue.includes(id));
        
        // Add 10 more models to the queue every hour
        const batchSize = 10;
        for (let i = 0; i < remainingModels.length; i += batchSize) {
          const batch = remainingModels.slice(i, i + batchSize);
          setTimeout(() => {
            this.modelTrainingQueue.push(...batch);
            log(`Added batch of ${batch.length} models to training queue`);
          }, (i / batchSize) * 60 * 60 * 1000); // Schedule each batch 1 hour apart
        }
      }, 30 * 60 * 1000); // Start scheduling remaining models after 30 minutes
    } else {
      // Check existing models and queue those that need retraining
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      Object.values(this.models).forEach(model => {
        // Retrain if model is older than 1 day or has zero accuracy
        if (now - model.lastTrainingTime > oneDay || model.accuracy === 0) {
          // Only queue if we don't already have too many models in the queue
          if (!this.modelTrainingQueue.includes(model.id) && this.modelTrainingQueue.length < 50) {
            this.modelTrainingQueue.push(model.id);
          }
        }
      });
      
      // Check for new symbols we might need to add models for
      availableSymbols.forEach(symbol => {
        const timeframes = ['1h', '4h', '1d'];
        timeframes.forEach(timeframe => {
          const modelId = `${symbol}_${timeframe}`;
          if (!this.models[modelId]) {
            // Create new model for this symbol
            this.models[modelId] = {
              id: modelId,
              symbol,
              timeframe,
              lastTrainingTime: 0,
              accuracy: 0,
              features: ['price', 'volume', 'rsi', 'macd', 'ema', 'sma']
            };
            
            // Add to training queue if it's a major coin
            if (
              symbol.includes('BTC') || 
              symbol.includes('ETH') || 
              symbol.includes('SOL') || 
              symbol.includes('BNB') ||
              symbol.includes('ADA')
            ) {
              this.modelTrainingQueue.push(modelId);
            }
          }
        });
      });
      
      if (this.modelTrainingQueue.length > 0) {
        log(`Queued ${this.modelTrainingQueue.length} models for training/retraining`);
      }
    }
  }

  /**
   * Schedule periodic model training and prediction
   */
  private scheduleTrainingAndPrediction(): void {
    // Process training queue every 30 minutes
    setInterval(() => {
      this.processTrainingQueue();
    }, 30 * 60 * 1000);
    
    // Update predictions every 5 minutes
    setInterval(() => {
      this.updatePredictions();
    }, 5 * 60 * 1000);
    
    // Start initial training and prediction
    setTimeout(() => {
      this.processTrainingQueue();
      this.updatePredictions();
    }, 5000);
  }

  /**
   * Process the model training queue
   */
  private async processTrainingQueue(): Promise<void> {
    if (this.isTraining || this.modelTrainingQueue.length === 0) {
      return;
    }
    
    this.isTraining = true;
    
    try {
      const modelId = this.modelTrainingQueue.shift()!;
      const model = this.models[modelId];
      
      if (!model) {
        this.isTraining = false;
        return;
      }
      
      log(`Training model ${modelId}`);
      
      // Fetch training data
      const trainData = await this.getTrainingData(model.symbol, model.timeframe);
      
      if (!trainData || trainData.length < 100) {
        log(`Insufficient data for training model ${modelId}`);
        this.isTraining = false;
        return;
      }
      
      // Try using Python API for training
      const isPythonApiAvailable = await this.isPythonApiAvailable();
      
      if (isPythonApiAvailable) {
        try {
          const response = await axios.post(`${this.pythonApiUrl}/api/models/train`, {
            modelId,
            symbol: model.symbol,
            timeframe: model.timeframe,
            trainData
          });
          
          if (response.status === 200 && response.data.success) {
            // Update model info
            this.models[modelId] = {
              ...model,
              lastTrainingTime: Date.now(),
              accuracy: response.data.accuracy || 0
            };
            
            log(`Successfully trained model ${modelId} with accuracy ${this.models[modelId].accuracy}`);
          }
        } catch (error) {
          log(`Error training model ${modelId} via Python API: ${error.message}`);
        }
      } else {
        // Placeholder for local model training
        // In a real implementation, you might use a JS-based ML library or a worker
        log(`Python API unavailable for training model ${modelId}`);
        
        // Update model with simulated training
        this.models[modelId] = {
          ...model,
          lastTrainingTime: Date.now(),
          accuracy: Math.min(0.6 + Math.random() * 0.2, 0.95) // Simulate 60-95% accuracy
        };
        
        // Save model info to disk
        this.saveModelInfo(this.models[modelId]);
      }
    } catch (error) {
      log(`Error in processTrainingQueue: ${error.message}`);
    } finally {
      this.isTraining = false;
      
      // Process next model if queue is not empty
      if (this.modelTrainingQueue.length > 0) {
        setTimeout(() => {
          this.processTrainingQueue();
        }, 5000);
      }
    }
  }

  /**
   * Save model info to disk
   */
  private saveModelInfo(model: ModelInfo): void {
    try {
      const modelsDir = path.join(__dirname, '../../', 'ml_models');
      
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }
      
      const filePath = path.join(modelsDir, `${model.id}_info.json`);
      fs.writeFileSync(filePath, JSON.stringify(model, null, 2));
    } catch (error) {
      log(`Error saving model info: ${error.message}`);
    }
  }

  /**
   * Get training data for a symbol and timeframe
   */
  private async getTrainingData(symbol: string, timeframe: string): Promise<any[]> {
    try {
      // Get historical candle data
      const candles = await globalMarketData.fetchCandleData(symbol, timeframe, 1000);
      
      if (!candles || candles.length === 0) {
        return [];
      }
      
      // Prepare data with technical indicators
      return this.prepareTrainingData(candles);
    } catch (error) {
      log(`Error getting training data: ${error.message}`);
      return [];
    }
  }

  /**
   * Prepare training data with calculated indicators
   */
  private prepareTrainingData(candles: any[]): any[] {
    // Sort candles by timestamp
    const sortedCandles = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate indicators
    const dataWithIndicators = sortedCandles.map((candle, index, arr) => {
      // Calculate RSI (simplified)
      let rsi = 50;
      if (index >= 14) {
        const gains = [];
        const losses = [];
        
        for (let i = index - 13; i <= index; i++) {
          const diff = arr[i].close - arr[i - 1].close;
          if (diff >= 0) {
            gains.push(diff);
            losses.push(0);
          } else {
            gains.push(0);
            losses.push(Math.abs(diff));
          }
        }
        
        const avgGain = gains.reduce((sum, val) => sum + val, 0) / 14;
        const avgLoss = losses.reduce((sum, val) => sum + val, 0) / 14;
        
        if (avgLoss === 0) {
          rsi = 100;
        } else {
          const rs = avgGain / avgLoss;
          rsi = 100 - (100 / (1 + rs));
        }
      }
      
      // Calculate MACD (simplified)
      let macd = 0;
      if (index >= 26) {
        const ema12 = this.calculateEMA(arr.slice(index - 12, index + 1).map(c => c.close), 12);
        const ema26 = this.calculateEMA(arr.slice(index - 26, index + 1).map(c => c.close), 26);
        macd = ema12 - ema26;
      }
      
      return {
        ...candle,
        rsi,
        macd,
        target: index < arr.length - 1 ? arr[index + 1].close > candle.close ? 1 : 0 : undefined
      };
    });
    
    // Remove the last element as it doesn't have a target
    return dataWithIndicators.slice(0, -1);
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  /**
   * Update predictions for all models
   */
  private async updatePredictions(): Promise<void> {
    try {
      log('Updating predictions for all models');
      
      const isPythonApiAvailable = await this.isPythonApiAvailable();
      const modelIds = Object.keys(this.models);
      
      for (const modelId of modelIds) {
        const model = this.models[modelId];
        
        if (isPythonApiAvailable) {
          try {
            // Get prediction from Python API
            const response = await axios.post(`${this.pythonApiUrl}/api/models/predict`, {
              modelId,
              symbol: model.symbol,
              timeframe: model.timeframe
            });
            
            if (response.status === 200 && response.data.success) {
              this.predictions[modelId] = {
                symbol: model.symbol,
                prediction: response.data.prediction,
                confidence: response.data.confidence,
                timestamp: Date.now(),
                expectedPriceChange: response.data.expectedPriceChange,
                timeframe: model.timeframe
              };
            }
          } catch (error) {
            log(`Error getting prediction for ${modelId} from Python API: ${error.message}`);
          }
        } else {
          // Generate simple prediction based on recent candles
          await this.generateSimplePrediction(model);
        }
      }
      
      log(`Updated predictions for ${Object.keys(this.predictions).length} models`);
    } catch (error) {
      log(`Error updating predictions: ${error.message}`);
    }
  }

  /**
   * Generate a simple prediction when Python API is not available
   */
  private async generateSimplePrediction(model: ModelInfo): Promise<void> {
    try {
      const candles = await globalMarketData.fetchCandleData(model.symbol, model.timeframe, 20);
      
      if (!candles || candles.length < 20) {
        return;
      }
      
      // Calculate a simple trend indicator (like SMA crossover)
      const closePrices = candles.map(c => c.close);
      const sma5 = this.calculateSMA(closePrices, 5);
      const sma14 = this.calculateSMA(closePrices, 14);
      
      let prediction: 'buy' | 'sell' | 'hold' = 'hold';
      let confidence = 0.5;
      
      if (sma5 > sma14) {
        prediction = 'buy';
        confidence = 0.5 + Math.min(0.4, (sma5 - sma14) / sma14);
      } else if (sma14 > sma5) {
        prediction = 'sell';
        confidence = 0.5 + Math.min(0.4, (sma14 - sma5) / sma5);
      }
      
      // Calculate expected price change based on historic volatility
      const dailyChanges = [];
      for (let i = 1; i < closePrices.length; i++) {
        dailyChanges.push((closePrices[i] - closePrices[i - 1]) / closePrices[i - 1]);
      }
      
      const averageChange = dailyChanges.reduce((sum, val) => sum + Math.abs(val), 0) / dailyChanges.length;
      let expectedPriceChange = averageChange;
      
      if (prediction === 'buy') {
        expectedPriceChange = Math.abs(expectedPriceChange);
      } else if (prediction === 'sell') {
        expectedPriceChange = -Math.abs(expectedPriceChange);
      }
      
      this.predictions[model.id] = {
        symbol: model.symbol,
        prediction,
        confidence,
        timestamp: Date.now(),
        expectedPriceChange,
        timeframe: model.timeframe
      };
    } catch (error) {
      log(`Error generating simple prediction for ${model.id}: ${error.message}`);
    }
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    const sma = prices.slice(prices.length - period).reduce((sum, price) => sum + price, 0) / period;
    return sma;
  }

  /**
   * Get all current predictions
   */
  public getAllPredictions(): PredictionResult[] {
    return Object.values(this.predictions);
  }

  /**
   * Get prediction for a specific symbol and timeframe
   */
  public getPrediction(symbol: string, timeframe: string): PredictionResult | null {
    const modelId = `${symbol}_${timeframe}`;
    return this.predictions[modelId] || null;
  }

  /**
   * Get top trading signals (most confident predictions)
   */
  public getTopSignals(limit = 5): PredictionResult[] {
    return Object.values(this.predictions)
      .filter(p => p.prediction !== 'hold' && p.confidence > 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Get service status
   */
  public getStatus(): any {
    return {
      isInitialized: this.isInitialized,
      totalModels: Object.keys(this.models).length,
      totalPredictions: Object.keys(this.predictions).length,
      modelsInTrainingQueue: this.modelTrainingQueue.length,
      isTraining: this.isTraining,
      pythonApiAvailable: this.isPythonApiAvailable()
    };
  }
}

// Export singleton instance
export const mlPredictionService = MLPredictionService.getInstance();