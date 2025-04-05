import express from 'express';
import myAgentRouter from './routes/my-agent';
import testAuthRouter from './routes/test-auth';
import userRouter from './routes/user';
import updateOpenAIKeyRouter from './routes/update-openai-key';
import updateApiKeysRouter from './routes/update-api-keys';
import marketsRouter from './routes/markets';
import databaseStatusRouter from './routes/database-status';

const router = express.Router();

// Main application routes
router.use('/api/my-agent', myAgentRouter);
router.use('/api/users', userRouter);
router.use('/api/update-api-keys', updateApiKeysRouter);
router.use('/api/update-openai-key', updateOpenAIKeyRouter);
router.use('/api/test-auth', testAuthRouter);
router.use('/api/markets', marketsRouter);
router.use('/api/database-status', databaseStatusRouter);

// Add parallel routes for agent API for compatibility with legacy components
// Make all my-agent routes also available under /api/agent/...
router.use('/api/agent', myAgentRouter);

export default router;