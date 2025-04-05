import { Router } from 'express';
import agentRoutes from './agent-routes';

const router = Router();

// Register all sub-routes
router.use('/api/agent', agentRoutes);

export default router;