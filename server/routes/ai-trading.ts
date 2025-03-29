/**
 * AI Trading Routes
 * Provides API endpoints for the AI trading functionality
 */

import express from 'express';
import { ensureAuthenticated } from '../auth';
import { aiTradingBridge, TradingSignal } from '../api/ai/AITradingBridge';
import { storage } from '../storage';

const router = express.Router();

// Get AI trading signals
router.get('/signals', ensureAuthenticated, async (req, res) => {
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
      testnet: true // Default to testnet for safety
    });

    // Check if we have fresh signals already
    if (aiTradingBridge.areSignalsFresh()) {
      const { signals, timestamp } = aiTradingBridge.getLastSignals();
      return res.json({
        signals,
        timestamp: timestamp.toISOString(),
        isFresh: true
      });
    }

    // Generate new signals
    const signals = await aiTradingBridge.generateSignals();
    
    return res.json({
      signals,
      timestamp: new Date().toISOString(),
      isFresh: true
    });
  } catch (error) {
    console.error('Error getting AI trading signals:', error);
    return res.status(500).json({ message: 'Failed to generate trading signals' });
  }
});

// Execute a trade based on AI recommendation
router.post('/execute', ensureAuthenticated, async (req, res) => {
  try {
    const { signalId, amount } = req.body;
    if (!signalId) {
      return res.status(400).json({ message: 'Signal ID is required' });
    }

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
      testnet: true // Default to testnet for safety
    });

    // Get current signals
    const { signals } = aiTradingBridge.getLastSignals();
    const signal = signals.find(s => `${s.symbol}-${s.timestamp}` === signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    // Execute the trade
    const result = await aiTradingBridge.executeTrade(signal, amount);
    
    return res.json(result);
  } catch (error) {
    console.error('Error executing AI trade:', error);
    return res.status(500).json({ message: 'Failed to execute trade' });
  }
});

// Train the model for a specific symbol
router.post('/train', ensureAuthenticated, async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    // Only admin can train models
    if (req.user?.username !== 'admin') {
      return res.status(403).json({ message: 'Only admin can train models' });
    }

    // Train the model
    const success = await aiTradingBridge.trainModel(symbol);
    
    if (success) {
      return res.json({ message: `Model for ${symbol} trained successfully` });
    } else {
      return res.status(500).json({ message: `Failed to train model for ${symbol}` });
    }
  } catch (error) {
    console.error('Error training AI model:', error);
    return res.status(500).json({ message: 'Failed to train model' });
  }
});

export default router;