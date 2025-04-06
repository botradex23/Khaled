import { Router } from 'express';
import agentRoutes from './agent-routes';
import memoryApiRoutes from './memory-api-routes';
import { initializeAgentMemoryRoutes } from './agent-memory-routes';
import analyticsRoutes from './analytics-routes';      // Import the new analytics routes
import authRoutes from './auth-routes';                // Import the new auth routes
import binanceMarketPrices from './binance-market-prices'; // Import Binance market prices routes
import marketApiRoutes from './market-api';            // Import market API routes
import { storage } from '../storage';

const router = Router();

// Initialize memory-based agent routes with MongoDB database
const agentMemoryRoutes = initializeAgentMemoryRoutes(storage.getDb());

// Register all API routes
router.use('/api/agent', agentRoutes);                 // Primary agent API routes
router.use('/api/memory', memoryApiRoutes);            // Memory-based conversation API routes
router.use('/api/agent-memory', agentMemoryRoutes);    // Combined agent and memory API routes
router.use('/api/analytics', analyticsRoutes);         // Analytics routes
router.use('/api/auth', authRoutes);                   // Authentication routes
router.use('/api/binance', binanceMarketPrices);       // Binance market prices routes
router.use('/api/market', marketApiRoutes);            // Market API routes

export default router;