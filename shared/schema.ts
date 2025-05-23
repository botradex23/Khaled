// Shared schema definitions for the entire application
import { pgTable, serial, text, boolean, timestamp, integer, json, varchar, decimal, real } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Message role enum
export const MessageRoleEnum = {
  SYSTEM: 'system',
  ASSISTANT: 'assistant',
  USER: 'user',
} as const;

// Enum for trade actions
export const TradeActionEnum = {
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD',
} as const;

// Enum for trade sources
export const TradeSourceEnum = {
  LIVE_PREDICTION: 'live_prediction',
  BACKTEST: 'backtest',
  VALIDATOR: 'validator',
  MANUAL: 'manual',
  PAPER_TRADING: 'paper_trading',
  LIVE_TRADING: 'live_trading',
  AI_GRID_BOT: 'ai_grid_bot',
  DCA_BOT: 'dca_bot',
  MACD_BOT: 'macd_bot',
} as const;

// Enum for trade status
export const TradeStatusEnum = {
  EXECUTED: 'executed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  PENDING: 'pending',
} as const;

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password'), // Stored hashed with bcrypt
  firstName: text('first_name'),
  lastName: text('last_name'),
  defaultBroker: text('default_broker').default('binance'), // Always set to 'binance'
  useTestnet: boolean('use_testnet').default(true),
  isAdmin: boolean('is_admin').default(false), // Admin user with elevated permissions
  isSuperAdmin: boolean('is_super_admin').default(false), // Super admin flag for full access to admin-my-agent
  
  // OAuth fields
  googleId: text('google_id'),
  appleId: text('apple_id'),
  profilePicture: text('profile_picture'),
  
  // Binance API Keys  
  binanceApiKey: text('binance_api_key'),
  binanceSecretKey: text('binance_secret_key'),
  binanceAllowedIp: text('binance_allowed_ip'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// API Keys table - separate from users for better security
export const userApiKeys = pgTable('user_api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  
  // Binance API Keys only (encrypted)
  binanceApiKey: text('binance_api_key'),
  binanceSecretKey: text('binance_secret_key'),
  binanceAllowedIp: text('binance_allowed_ip'),
  
  // Common fields
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trading bots table
export const tradingBots = pgTable('trading_bots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  symbol: text('symbol').notNull(), // Trading pair like "BTCUSDT"
  broker: text('broker').notNull().default('binance'), // Always "binance" (removed support for other brokers)
  strategyType: text('strategy_type').notNull(), // "grid", "dca", "macd", "ai_grid", etc.
  parameters: json('parameters'), // Strategy-specific parameters as JSON
  botState: json('bot_state'), // Current bot state for persistence
  isActive: boolean('is_active').default(false),
  isRunning: boolean('is_running').default(false),
  enableStopLoss: boolean('enable_stop_loss').default(false),
  stopLossPercentage: decimal('stop_loss_percentage', { precision: 10, scale: 2 }),
  enableTakeProfit: boolean('enable_take_profit').default(false),
  takeProfitPercentage: decimal('take_profit_percentage', { precision: 10, scale: 2 }),
  profitLoss: text('profit_loss').default('0'),
  profitLossPercent: text('profit_loss_percent').default('0'),
  totalTrades: integer('total_trades').default(0),
  lastExecutionTime: timestamp('last_execution_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Bot trades table - records trades made by bots
export const botTrades = pgTable('bot_trades', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').notNull().references(() => tradingBots.id),
  userId: integer('user_id').notNull().references(() => users.id),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(), // "buy" or "sell"
  type: text('type').notNull(), // "market", "limit", etc.
  price: text('price').notNull(),
  amount: text('amount').notNull(),
  status: text('status').notNull(), // "pending", "filled", "canceled", "failed"
  orderId: text('order_id'), // External order ID from the exchange
  fee: text('fee'),
  feeCurrency: text('fee_currency'),
  isTest: boolean('is_test').default(false),
  metadata: json('metadata'), // Additional trade data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Paper trading accounts table
export const paperTradingAccounts = pgTable('paper_trading_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  initialBalance: text('initial_balance').notNull(),
  currentBalance: text('current_balance').notNull(),
  totalProfitLoss: text('total_profit_loss').default('0'),
  totalProfitLossPercent: text('total_profit_loss_percent').default('0'),
  totalTrades: integer('total_trades').default(0),
  winningTrades: integer('winning_trades').default(0),
  losingTrades: integer('losing_trades').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Paper trading positions table
export const paperTradingPositions = pgTable('paper_trading_positions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => paperTradingAccounts.id),
  symbol: text('symbol').notNull(),
  entryPrice: text('entry_price').notNull(),
  quantity: text('quantity').notNull(),
  direction: text('direction').notNull(), // "LONG" or "SHORT"
  openedAt: timestamp('opened_at').defaultNow(),
  metadata: json('metadata'), // For storing additional position data like current price, PnL, etc.
});

// Paper trading trades table
export const paperTradingTrades = pgTable('paper_trading_trades', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => paperTradingAccounts.id),
  positionId: integer('position_id').references(() => paperTradingPositions.id),
  symbol: text('symbol').notNull(),
  entryPrice: text('entry_price').notNull(),
  exitPrice: text('exit_price'),
  quantity: text('quantity').notNull(),
  direction: text('direction').notNull(), // "LONG" or "SHORT"
  status: text('status').notNull(), // "OPEN" or "CLOSED"
  profitLoss: text('profit_loss'),
  profitLossPercent: text('profit_loss_percent'),
  fee: text('fee').default('0'),
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
  type: text('type').default('MARKET'),
  isAiGenerated: boolean('is_ai_generated').default(false),
  aiConfidence: text('ai_confidence'),
  metadata: json('metadata'), // Store AI decision data, signals, etc.
});

// AI Trading data table - store AI decisions and results
export const aiTradingData = pgTable('ai_trading_data', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  symbol: text('symbol').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  decision: text('decision').notNull(), // "buy", "sell", "hold" 
  confidence: text('confidence'), // AI confidence score (0-1)
  features: json('features'), // Input features used for the decision
  marketPrice: text('market_price'), // Price at decision time
  result: text('result'), // "profitable", "unprofitable", "unknown"
  profitLoss: text('profit_loss'), // If trade executed, actual P/L
  metadata: json('metadata'), // Additional AI-specific data
});

// XGBoost Hyperparameter Tuning Runs table
export const xgboostTuningRuns = pgTable('xgboost_tuning_runs', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(), // e.g., "1h", "4h", "1d"
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  status: text('status').notNull().default('running'), // "running", "completed", "failed"
  optimizationType: text('optimization_type').notNull(), // "grid_search", "bayesian"
  baselineAccuracy: real('baseline_accuracy'),
  bestAccuracy: real('best_accuracy'),
  improvement: real('improvement'),
  bestParams: json('best_params'),
  allParams: json('all_params'), // Array of all parameter combinations and their performance
  resultsUrl: text('results_url'), // URL to visualization or detailed results
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Market Condition Records table - for tracking and responding to market changes
export const marketConditions = pgTable('market_conditions', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  volatility: real('volatility').notNull(), // ATR or similar volatility measure
  volume: real('volume').notNull(),  // Volume relative to average
  trendStrength: real('trend_strength').notNull(), // ADX or similar trend strength indicator
  trendDirection: real('trend_direction').notNull(), // -1 to 1 scale for bearish to bullish
  rsi: real('rsi'), // RSI value
  macdHistogram: real('macd_histogram'), // MACD histogram value
  significantChange: boolean('significant_change').default(false), // Whether a significant market change was detected
  createdAt: timestamp('created_at').defaultNow(),
});

// ML Model Performance Tracking table
export const mlModelPerformance = pgTable('ml_model_performance', {
  id: serial('id').primaryKey(),
  modelId: text('model_id').notNull(), // Unique model identifier (could be a filename)
  modelName: text('model_name').notNull(), // Human-readable model name
  modelType: text('model_type').notNull(), // "standard", "balanced", "conservative", "aggressive"
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  strategyType: text('strategy_type'), // "conservative", "balanced", "aggressive"
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  accuracy: real('accuracy').notNull(),
  precision: real('precision').notNull(),
  recall: real('recall').notNull(),
  f1Score: real('f1_score').notNull(),
  pnl: real('pnl').notNull(), // Profit/loss in base currency
  pnlPercent: real('pnl_percent').notNull(), // Profit/loss as percentage
  winRate: real('win_rate').notNull(), // Percentage of profitable trades
  drawdown: real('drawdown').notNull(), // Maximum drawdown
  winCount: integer('win_count').notNull(),
  lossCount: integer('loss_count').notNull(),
  isActive: boolean('is_active').default(true), // Whether this model is currently active
  isTopPerformer: boolean('is_top_performer').default(false), // Marked as current top performer
  parameters: json('parameters').notNull(), // Model hyperparameters
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin Feedback on ML Models table
export const mlAdminFeedback = pgTable('ml_admin_feedback', {
  id: serial('id').primaryKey(),
  modelId: text('model_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  feedback: text('feedback').notNull(), // Admin feedback/comments
  priority: text('priority').notNull().default('medium'), // "low", "medium", "high"
  status: text('status').notNull().default('pending'), // "pending", "implemented", "rejected"
  createdAt: timestamp('created_at').defaultNow(),
  implementedAt: timestamp('implemented_at'),
});

// Retraining Events table
export const retrainingEvents = pgTable('retraining_events', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  retrainingMethod: text('retraining_method').notNull(),
  marketConditions: json('market_conditions'),
  result: json('result'),
  createdAt: timestamp('created_at').defaultNow()
});

// Strategy Simulation Results table
export const strategySimulations = pgTable('strategy_simulations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  strategyType: text('strategy_type').notNull(), // "conservative", "balanced", "aggressive"
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  initialInvestment: real('initial_investment').notNull(),
  finalBalance: real('final_balance').notNull(),
  pnl: real('pnl').notNull(),
  pnlPercent: real('pnl_percent').notNull(),
  winRate: real('win_rate').notNull(),
  drawdown: real('drawdown').notNull(),
  maxDrawdown: real('max_drawdown').notNull(),
  sharpeRatio: real('sharpe_ratio'),
  volatility: real('volatility'),
  tradeCount: integer('trade_count').notNull(),
  winCount: integer('win_count').notNull(),
  lossCount: integer('loss_count').notNull(),
  averageWin: real('average_win').notNull(),
  averageLoss: real('average_loss').notNull(),
  largestWin: real('largest_win').notNull(),
  largestLoss: real('largest_loss').notNull(),
  modelParameters: json('model_parameters').notNull(), // Strategy parameters used
  tradesSnapshot: json('trades_snapshot'), // Sample of trades executed
  chartDataUrl: text('chart_data_url'), // URL to chart data for visualization
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Risk settings table - store user's risk management preferences
export const riskSettings = pgTable('risk_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
  globalStopLoss: decimal('global_stop_loss', { precision: 10, scale: 2 }).notNull().default('5'),
  globalTakeProfit: decimal('global_take_profit', { precision: 10, scale: 2 }).notNull().default('10'),
  maxPositionSize: decimal('max_position_size', { precision: 10, scale: 2 }).notNull().default('10'),
  maxPortfolioRisk: decimal('max_portfolio_risk', { precision: 10, scale: 2 }).notNull().default('20'),
  maxTradesPerDay: integer('max_trades_per_day').notNull().default(10),
  enableGlobalStopLoss: boolean('enable_global_stop_loss').notNull().default(true),
  enableGlobalTakeProfit: boolean('enable_global_take_profit').notNull().default(true),
  enableMaxPositionSize: boolean('enable_max_position_size').notNull().default(true),
  stopLossStrategy: text('stop_loss_strategy').notNull().default('fixed'),
  enableEmergencyStopLoss: boolean('enable_emergency_stop_loss').notNull().default(true),
  emergencyStopLossThreshold: decimal('emergency_stop_loss_threshold', { precision: 10, scale: 2 }).notNull().default('15'),
  defaultStopLossPercent: decimal('default_stop_loss_percent', { precision: 10, scale: 2 }).notNull().default('3'),
  defaultTakeProfitPercent: decimal('default_take_profit_percent', { precision: 10, scale: 2 }).notNull().default('6'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trade logs table - for AI trading activity logs
export const tradeLogs = pgTable('trade_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow(), // UTC timestamp
  symbol: text('symbol').notNull(), // e.g., "BTCUSDT"
  action: text('action').notNull(), // BUY/SELL/HOLD
  entry_price: text('entry_price').notNull(), // Price at trade execution
  quantity: text('quantity').notNull(), // Trade quantity
  predicted_confidence: decimal('predicted_confidence', { precision: 10, scale: 4 }), // ML model confidence (0.0-1.0)
  trade_source: text('trade_source').notNull(), // Source of the trade (live_prediction, backtest, etc.)
  status: text('status').notNull().default('executed'), // Execution status (executed, failed, skipped)
  reason: text('reason'), // Optional explanation or notes
  user_id: integer('user_id').references(() => users.id), // Associated user ID
  position_id: integer('position_id'), // Associated position ID for paper/live trading
  trade_id: text('trade_id'), // Associated trade ID for paper/live trading
  metadata: json('metadata'), // Additional metadata as JSON
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// AI Agent conversations table - stores chat sessions
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull().unique(), // Unique session identifier
  userId: integer('user_id').references(() => users.id), // Associated user (optional)
  title: text('title'), // Conversation title (e.g., first user message)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// AI Agent messages table - stores individual messages in conversations
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  role: text('role').notNull(), // 'system', 'user', or 'assistant'
  content: text('content').notNull(), // Message content
  createdAt: timestamp('created_at').defaultNow(),
  metadata: json('metadata'), // Additional message data (e.g., tokens used, model, etc.)
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  apiKeys: many(userApiKeys),
  bots: many(tradingBots),
  paperAccounts: many(paperTradingAccounts),
  aiData: many(aiTradingData),
  riskSettings: one(riskSettings),
  conversations: many(conversations),
  mlFeedback: many(mlAdminFeedback),
}));

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
}));

export const tradingBotsRelations = relations(tradingBots, ({ one, many }) => ({
  user: one(users, {
    fields: [tradingBots.userId],
    references: [users.id],
  }),
  trades: many(botTrades),
}));

export const botTradesRelations = relations(botTrades, ({ one }) => ({
  bot: one(tradingBots, {
    fields: [botTrades.botId],
    references: [tradingBots.id],
  }),
  user: one(users, {
    fields: [botTrades.userId],
    references: [users.id],
  }),
}));

export const paperTradingAccountsRelations = relations(paperTradingAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [paperTradingAccounts.userId],
    references: [users.id],
  }),
  positions: many(paperTradingPositions),
  trades: many(paperTradingTrades),
}));

export const paperTradingPositionsRelations = relations(paperTradingPositions, ({ one, many }) => ({
  account: one(paperTradingAccounts, {
    fields: [paperTradingPositions.accountId],
    references: [paperTradingAccounts.id],
  }),
  trades: many(paperTradingTrades),
}));

export const paperTradingTradesRelations = relations(paperTradingTrades, ({ one }) => ({
  account: one(paperTradingAccounts, {
    fields: [paperTradingTrades.accountId],
    references: [paperTradingAccounts.id],
  }),
  position: one(paperTradingPositions, {
    fields: [paperTradingTrades.positionId],
    references: [paperTradingPositions.id],
  }),
}));

export const aiTradingDataRelations = relations(aiTradingData, ({ one }) => ({
  user: one(users, {
    fields: [aiTradingData.userId],
    references: [users.id],
  }),
}));

export const riskSettingsRelations = relations(riskSettings, ({ one }) => ({
  user: one(users, {
    fields: [riskSettings.userId],
    references: [users.id],
  }),
}));

export const tradeLogsRelations = relations(tradeLogs, ({ one }) => ({
  user: one(users, {
    fields: [tradeLogs.user_id],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Relations for ML Optimization tables
export const mlAdminFeedbackRelations = relations(mlAdminFeedback, ({ one }) => ({
  user: one(users, {
    fields: [mlAdminFeedback.userId],
    references: [users.id],
  }),
}));

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserApiKeysSchema = createInsertSchema(userApiKeys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTradingBotSchema = createInsertSchema(tradingBots).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBotTradeSchema = createInsertSchema(botTrades).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaperTradingAccountSchema = createInsertSchema(paperTradingAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaperTradingPositionSchema = createInsertSchema(paperTradingPositions).omit({ id: true, openedAt: true });
export const insertPaperTradingTradeSchema = createInsertSchema(paperTradingTrades).omit({ id: true, openedAt: true, closedAt: true });
export const insertAiTradingDataSchema = createInsertSchema(aiTradingData).omit({ id: true, timestamp: true });
export const insertRiskSettingsSchema = createInsertSchema(riskSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTradeLogSchema = createInsertSchema(tradeLogs).omit({ id: true, timestamp: true, created_at: true, updated_at: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// Insert schemas for ML optimization tables
export const insertXgboostTuningRunSchema = createInsertSchema(xgboostTuningRuns).omit({ id: true, startedAt: true, completedAt: true, createdAt: true, updatedAt: true });
export const insertMarketConditionSchema = createInsertSchema(marketConditions).omit({ id: true, timestamp: true, createdAt: true });
export const insertMlModelPerformanceSchema = createInsertSchema(mlModelPerformance).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMlAdminFeedbackSchema = createInsertSchema(mlAdminFeedback).omit({ id: true, createdAt: true, implementedAt: true });
export const insertStrategySimulationSchema = createInsertSchema(strategySimulations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRetrainingEventSchema = createInsertSchema(retrainingEvents).omit({ id: true, createdAt: true });

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserApiKeys = typeof userApiKeys.$inferSelect;
export type InsertUserApiKeys = z.infer<typeof insertUserApiKeysSchema>;

export type TradingBot = typeof tradingBots.$inferSelect;
export type InsertTradingBot = z.infer<typeof insertTradingBotSchema>;

export type BotTrade = typeof botTrades.$inferSelect;
export type InsertBotTrade = z.infer<typeof insertBotTradeSchema>;

export type PaperTradingAccount = typeof paperTradingAccounts.$inferSelect;
export type InsertPaperTradingAccount = z.infer<typeof insertPaperTradingAccountSchema>;

export type PaperTradingPosition = typeof paperTradingPositions.$inferSelect;
export type InsertPaperTradingPosition = z.infer<typeof insertPaperTradingPositionSchema>;

export type PaperTradingTrade = typeof paperTradingTrades.$inferSelect;
export type InsertPaperTradingTrade = z.infer<typeof insertPaperTradingTradeSchema>;

export type AiTradingData = typeof aiTradingData.$inferSelect;
export type InsertAiTradingData = z.infer<typeof insertAiTradingDataSchema>;

export type RiskSettings = typeof riskSettings.$inferSelect;
export type InsertRiskSettings = z.infer<typeof insertRiskSettingsSchema>;

export type TradeLog = typeof tradeLogs.$inferSelect;
export type InsertTradeLog = z.infer<typeof insertTradeLogSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ML Optimization Types
export type XgboostTuningRun = typeof xgboostTuningRuns.$inferSelect;
export type InsertXgboostTuningRun = z.infer<typeof insertXgboostTuningRunSchema>;

export type MarketCondition = typeof marketConditions.$inferSelect;
export type InsertMarketCondition = z.infer<typeof insertMarketConditionSchema>;

export type MlModelPerformance = typeof mlModelPerformance.$inferSelect;
export type InsertMlModelPerformance = z.infer<typeof insertMlModelPerformanceSchema>;

export type MlAdminFeedback = typeof mlAdminFeedback.$inferSelect;
export type InsertMlAdminFeedback = z.infer<typeof insertMlAdminFeedbackSchema>;

export type StrategySimulation = typeof strategySimulations.$inferSelect;
export type InsertStrategySimulation = z.infer<typeof insertStrategySimulationSchema>;

export type RetrainingEvent = typeof retrainingEvents.$inferSelect;
export type InsertRetrainingEvent = z.infer<typeof insertRetrainingEventSchema>;

// Type for market condition change tracking
export type MarketConditionChangeType = {
  timestamp: string;
  reason: string;
  conditionChanges: {
    volatility?: { changed: boolean; magnitude: number };
    volume?: { changed: boolean; magnitude: number };
    trend?: { changed: boolean; details: any };
  };
  currentConditions: {
    symbol?: string;
    timeframe?: string;
    timestamp?: string;
    volatility?: number;
    volume?: number;
    trendDirection?: number;
    trendStrength?: number;
  };
};

// Type for chat messages (used by OpenAI API)
export type ChatMessage = {
  role: typeof MessageRoleEnum[keyof typeof MessageRoleEnum];
  content: string;
};