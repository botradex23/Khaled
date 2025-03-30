// Shared schema definitions for the entire application
import { pgTable, serial, text, boolean, timestamp, integer, json, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password'), // Stored hashed with bcrypt
  firstName: text('first_name'),
  lastName: text('last_name'),
  defaultBroker: text('default_broker'),
  useTestnet: boolean('use_testnet').default(true),
  
  // OKX API Keys (direct, for compatibility with existing code)
  okxApiKey: text('okx_api_key'),
  okxSecretKey: text('okx_secret_key'),
  okxPassphrase: text('okx_passphrase'),
  
  // Binance API Keys (direct, for compatibility with existing code)  
  binanceApiKey: text('binance_api_key'),
  binanceSecretKey: text('binance_secret_key'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// API Keys table - separate from users for better security
export const userApiKeys = pgTable('user_api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  
  // OKX API Keys (encrypted)
  okxApiKey: text('okx_api_key'),
  okxSecretKey: text('okx_secret_key'),
  okxPassphrase: text('okx_passphrase'),
  
  // Binance API Keys (encrypted)
  binanceApiKey: text('binance_api_key'),
  binanceSecretKey: text('binance_secret_key'),
  
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
  symbol: text('symbol').notNull(), // Trading pair like "BTC-USDT"
  broker: text('broker').notNull(), // "okx", "binance", etc.
  strategyType: text('strategy_type').notNull(), // "grid", "ai", "martingale", etc.
  parameters: json('parameters'), // Strategy-specific parameters as JSON
  isActive: boolean('is_active').default(false),
  isRunning: boolean('is_running').default(false),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(userApiKeys),
  bots: many(tradingBots),
  paperAccounts: many(paperTradingAccounts),
  aiData: many(aiTradingData),
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

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserApiKeysSchema = createInsertSchema(userApiKeys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTradingBotSchema = createInsertSchema(tradingBots).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBotTradeSchema = createInsertSchema(botTrades).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaperTradingAccountSchema = createInsertSchema(paperTradingAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaperTradingPositionSchema = createInsertSchema(paperTradingPositions).omit({ id: true, openedAt: true });
export const insertPaperTradingTradeSchema = createInsertSchema(paperTradingTrades).omit({ id: true, openedAt: true, closedAt: true });
export const insertAiTradingDataSchema = createInsertSchema(aiTradingData).omit({ id: true, timestamp: true });

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