import express from 'express';
import myAgentRouter from './routes/my-agent';
import agentRouter from './routes/agent-routes';
import testAuthRouter from './routes/test-auth';
import userRouter from './routes/user';
import updateOpenAIKeyRouter from './routes/update-openai-key';
import updateApiKeysRouter from './routes/update-api-keys';
import marketsRouter from './routes/markets';
import marketsCandlesRouter from './routes/markets-candles';
import aiTradingRouter from './routes/ai-trading';
import marketBrokerRouter from './routes/market-broker-routes';
import mlOptimizationRouter from './routes/ml-optimization';
import additionalRoutes from './routes/index';

const router = express.Router();

// Register all API routes
router.use('/api/my-agent', myAgentRouter);
router.use('/api/agent', agentRouter);
router.use('/api/users', userRouter);
router.use('/api/update-api-keys', updateApiKeysRouter);
router.use('/api/update-openai-key', updateOpenAIKeyRouter);
router.use('/api/test-auth', testAuthRouter);
router.use('/api/markets', marketsRouter);
router.use('/api/markets/candles', marketsCandlesRouter);
router.use('/api/ai/trading', aiTradingRouter);
router.use('/api/market-broker', marketBrokerRouter);
router.use('/api/ml/optimization', mlOptimizationRouter);

// Register additional routes from routes/index.ts
router.use(additionalRoutes);

export default router;