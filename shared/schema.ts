import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  password: text("password").notNull().default(""),
  googleId: text("google_id").unique(),
  appleId: text("apple_id").unique(),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Broker API credentials for user-specific trading
  okxApiKey: text("okx_api_key"),
  okxSecretKey: text("okx_secret_key"),
  okxPassphrase: text("okx_passphrase"),
  
  // Binance API credentials
  binanceApiKey: text("binance_api_key"),
  binanceSecretKey: text("binance_secret_key"),
  binanceAllowedIp: text("binance_allowed_ip"),
  
  // Default broker for trading (e.g., 'okx', 'binance')
  defaultBroker: text("default_broker").default("okx"),
  
  // Whether to use demo/test mode
  useTestnet: boolean("use_testnet").default(true),
  
  // Stripe fields for payment integration
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  hasPremium: boolean("has_premium").default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  
  // Admin privileges
  isAdmin: boolean("is_admin").default(false),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    password: z.string().optional(),
    googleId: z.string().optional(),
    appleId: z.string().optional(),
    profilePicture: z.string().optional(),
    okxApiKey: z.string().optional(),
    okxSecretKey: z.string().optional(),
    okxPassphrase: z.string().optional(),
    binanceApiKey: z.string().optional(),
    binanceSecretKey: z.string().optional(),
    useTestnet: z.boolean().default(true),
    defaultBroker: z.string().default("okx"),
  })
  .refine(data => {
    // User must authenticate with either password or OAuth
    return (
      (data.password !== undefined && data.password !== '') || 
      (data.googleId !== undefined && data.googleId !== '') ||
      (data.appleId !== undefined && data.appleId !== '')
    );
  }, {
    message: "User must authenticate with password or social login",
    path: ["authentication"]
  })
  .transform(data => ({
    ...data,
    firstName: data.firstName || "",
    lastName: data.lastName || ""
  }));

// Bots table schema
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  strategy: text("strategy").notNull(),
  description: text("description").notNull(),
  minInvestment: decimal("min_investment").notNull(),
  monthlyReturn: decimal("monthly_return").notNull(),
  riskLevel: integer("risk_level").notNull(),
  rating: decimal("rating").notNull(),
  isPopular: boolean("is_popular").notNull().default(false),
  userId: integer("user_id").notNull(),
  isRunning: boolean("is_running").notNull().default(false),
  tradingPair: text("trading_pair").notNull().default("BTC-USDT"),
  totalInvestment: decimal("total_investment").notNull().default("1000"),
  parameters: text("parameters"), // JSON string of bot parameters
  createdAt: timestamp("created_at").defaultNow(),
  lastStartedAt: timestamp("last_started_at"),
  lastStoppedAt: timestamp("last_stopped_at"),
  profitLoss: decimal("profit_loss").default("0"), // Actual P&L in USD
  profitLossPercent: decimal("profit_loss_percent").default("0"), // P&L as percentage
  totalTrades: integer("total_trades").default(0),
});

export const botSchema = createInsertSchema(bots)
  .omit({ 
    id: true, 
    createdAt: true, 
    lastStartedAt: true, 
    lastStoppedAt: true,
    isRunning: true,
    totalTrades: true,
    profitLoss: true,
    profitLossPercent: true
  });

// Pricing plans table schema
export const pricingPlans = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price").notNull(),
  features: text("features").array().notNull(),
  isPopular: boolean("is_popular").notNull().default(false),
});

export const pricingPlanSchema = createInsertSchema(pricingPlans);

// Payments table schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(), // 'pending', 'succeeded', 'failed'
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  planId: integer("plan_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: text("metadata"), // JSON string for additional data
});

export const paymentSchema = createInsertSchema(payments)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  });

// Paper Trading Account table schema
export const paperTradingAccounts = pgTable("paper_trading_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  initialBalance: text("initial_balance").notNull().default("1000"),
  currentBalance: text("current_balance").notNull().default("1000"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  lastResetAt: timestamp("last_reset_at"),
  totalProfitLoss: text("total_profit_loss").default("0"),
  totalProfitLossPercent: text("total_profit_loss_percent").default("0"),
  totalTrades: integer("total_trades").default(0),
  winningTrades: integer("winning_trades").default(0),
  losingTrades: integer("losing_trades").default(0),
  metadata: jsonb("metadata"),
});

export const paperTradingAccountSchema = createInsertSchema(paperTradingAccounts)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true,
    lastResetAt: true
  });

// Paper Trading Positions (current open positions)
export const paperTradingPositions = pgTable("paper_trading_positions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  symbol: text("symbol").notNull(),
  entryPrice: text("entry_price").notNull(),
  quantity: text("quantity").notNull(),
  direction: text("direction").notNull(), // 'LONG' or 'SHORT'
  openedAt: timestamp("opened_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  currentPrice: text("current_price"),
  currentProfitLoss: text("current_profit_loss").default("0"),
  currentProfitLossPercent: text("current_profit_loss_percent").default("0"),
  stopLoss: text("stop_loss"),
  takeProfit: text("take_profit"),
  metadata: jsonb("metadata"),
});

export const paperTradingPositionSchema = createInsertSchema(paperTradingPositions)
  .omit({ 
    id: true, 
    openedAt: true, 
    updatedAt: true,
    currentPrice: true,
    currentProfitLoss: true,
    currentProfitLossPercent: true
  });

// Paper Trading Trades (historical trade records - both closed and open)
export const paperTradingTrades = pgTable("paper_trading_trades", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  positionId: integer("position_id"),
  symbol: text("symbol").notNull(),
  entryPrice: text("entry_price").notNull(),
  exitPrice: text("exit_price"),
  quantity: text("quantity").notNull(),
  direction: text("direction").notNull(), // 'LONG' or 'SHORT'
  status: text("status").notNull(), // 'OPEN', 'CLOSED', 'CANCELED'
  profitLoss: text("profit_loss"),
  profitLossPercent: text("profit_loss_percent"),
  fee: text("fee").default("0"),
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  type: text("type").notNull(), // 'MARKET', 'LIMIT', etc.
  isAiGenerated: boolean("is_ai_generated").default(false),
  aiConfidence: text("ai_confidence"),
  signalData: jsonb("signal_data"),
  metadata: jsonb("metadata"),
});

export const paperTradingTradeSchema = createInsertSchema(paperTradingTrades)
  .omit({ 
    id: true, 
    openedAt: true, 
    closedAt: true,
    profitLoss: true,
    profitLossPercent: true
  });

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof botSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type InsertPricingPlan = z.infer<typeof pricingPlanSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof paymentSchema>;
export type PaperTradingAccount = typeof paperTradingAccounts.$inferSelect;
export type InsertPaperTradingAccount = z.infer<typeof paperTradingAccountSchema>;
export type PaperTradingPosition = typeof paperTradingPositions.$inferSelect;
export type InsertPaperTradingPosition = z.infer<typeof paperTradingPositionSchema>;
export type PaperTradingTrade = typeof paperTradingTrades.$inferSelect;
export type InsertPaperTradingTrade = z.infer<typeof paperTradingTradeSchema>;
