import { Router } from 'express';
import agentRoutes from './agent-routes';
import memoryApiRoutes from './memory-api-routes';
import { initializeAgentMemoryRoutes } from './agent-memory-routes';
import { storage } from '../storage';

const router = Router();

// Initialize memory-based agent routes with MongoDB database
const agentMemoryRoutes = initializeAgentMemoryRoutes(storage.getDb());

// Register all API routes
router.use('/api/agent', agentRoutes);                 // Primary agent API routes
router.use('/api/memory', memoryApiRoutes);            // Memory-based conversation API routes
router.use('/api/agent-memory', agentMemoryRoutes);    // Combined agent and memory API routes

export default router;