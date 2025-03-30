import mongoose from 'mongoose';
import { encrypt, decrypt, isEncrypted } from './encryption';

// Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-trading-platform';

// Connect to MongoDB
export async function connectToMongoDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB successfully');
    }
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Define schemas

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  password: { type: String, default: '' },
  googleId: { type: String, default: null },
  appleId: { type: String, default: null },
  profilePicture: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  
  // API keys
  okxApiKey: { type: String, default: null },
  okxSecretKey: { type: String, default: null },
  okxPassphrase: { type: String, default: null },
  binanceApiKey: { type: String, default: null },
  binanceSecretKey: { type: String, default: null },
  binanceAllowedIp: { type: String, default: null },
  
  // Broker settings
  defaultBroker: { type: String, default: 'okx' },
  useTestnet: { type: Boolean, default: true },
  
  // Stripe related fields
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  hasPremium: { type: Boolean, default: false },
  premiumExpiresAt: { type: Date, default: null },
  
  // Role
  isAdmin: { type: Boolean, default: false }
});

// Bot schema
const botSchema = new mongoose.Schema({
  name: { type: String, required: true },
  strategy: { type: String, required: true },
  description: { type: String },
  minInvestment: { type: String, required: true },
  monthlyReturn: { type: String },
  riskLevel: { type: Number, default: 2 },
  rating: { type: String },
  isPopular: { type: Boolean, default: false },
  userId: { type: Number, required: true },
  isRunning: { type: Boolean, default: false },
  tradingPair: { type: String, required: true },
  totalInvestment: { type: String, required: true },
  parameters: { type: String, required: true }, // JSON string
  createdAt: { type: Date, default: Date.now },
  lastStartedAt: { type: Date, default: null },
  lastStoppedAt: { type: Date, default: null },
  profitLoss: { type: String, default: '0' },
  profitLossPercent: { type: String, default: '0' },
  totalTrades: { type: Number, default: 0 }
});

// Pricing Plan schema
const pricingPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: String, required: true },
  features: [{ type: String }],
  isPopular: { type: Boolean, default: false }
});

// Payment schema
const paymentSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  planId: { type: Number, required: true },
  amount: { type: String, required: true },
  status: { type: String, required: true },
  paymentMethod: { type: String },
  stripePaymentId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Paper Trading Account schema
const paperTradingAccountSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  initialBalance: { type: String, required: true },
  currentBalance: { type: String, required: true },
  totalProfitLoss: { type: String, default: '0' },
  totalProfitLossPercent: { type: String, default: '0' },
  totalTrades: { type: Number, default: 0 },
  winningTrades: { type: Number, default: 0 },
  losingTrades: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Paper Trading Position schema
const paperTradingPositionSchema = new mongoose.Schema({
  accountId: { type: Number, required: true },
  symbol: { type: String, required: true },
  entryPrice: { type: String, required: true },
  quantity: { type: String, required: true },
  direction: { type: String, required: true, enum: ['LONG', 'SHORT'] },
  openedAt: { type: Date, default: Date.now }
});

// Paper Trading Trade schema
const paperTradingTradeSchema = new mongoose.Schema({
  accountId: { type: Number, required: true },
  positionId: { type: Number, default: null },
  symbol: { type: String, required: true },
  entryPrice: { type: String, required: true },
  exitPrice: { type: String, default: null },
  quantity: { type: String, required: true },
  direction: { type: String, required: true, enum: ['LONG', 'SHORT'] },
  status: { type: String, required: true, enum: ['OPEN', 'CLOSED'] },
  profitLoss: { type: String, default: null },
  profitLossPercent: { type: String, default: null },
  fee: { type: String, default: '0' },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  type: { type: String, default: 'MANUAL' },
  isAiGenerated: { type: Boolean, default: false },
  aiConfidence: { type: String, default: null }
});

// Create models
export const UserModel = mongoose.model('User', userSchema);
export const BotModel = mongoose.model('Bot', botSchema);
export const PricingPlanModel = mongoose.model('PricingPlan', pricingPlanSchema);
export const PaymentModel = mongoose.model('Payment', paymentSchema);
export const PaperTradingAccountModel = mongoose.model('PaperTradingAccount', paperTradingAccountSchema);
export const PaperTradingPositionModel = mongoose.model('PaperTradingPosition', paperTradingPositionSchema);
export const PaperTradingTradeModel = mongoose.model('PaperTradingTrade', paperTradingTradeSchema);

// Counters collection to maintain auto-increment IDs
const countersSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export const CountersModel = mongoose.model('Counters', countersSchema);

// Function to get the next sequence value for a given counter
export async function getNextSequence(name: string): Promise<number> {
  const counter = await CountersModel.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Initialize counter values if needed
export async function initializeCounters() {
  const counters = [
    { _id: 'userId', seq: 2 }, // Start from 3 as we have 2 default users
    { _id: 'botId', seq: 3 },  // Start from 4 as we have 3 default bots
    { _id: 'pricingPlanId', seq: 3 }, // Start from 4 as we have 3 default plans
    { _id: 'paymentId', seq: 0 },
    { _id: 'paperAccountId', seq: 0 },
    { _id: 'paperPositionId', seq: 0 },
    { _id: 'paperTradeId', seq: 0 }
  ];

  for (const counter of counters) {
    await CountersModel.findByIdAndUpdate(
      counter._id,
      { $setOnInsert: { seq: counter.seq } },
      { upsert: true, new: true }
    );
  }
}

// Helper functions to convert between MongoDB and our application models
export function convertToUserModel(doc: any): any {
  if (!doc) return undefined;
  
  // Handle encryption for sensitive fields
  const processField = (field: string | null): string | null => {
    if (!field) return null;
    
    if (typeof field === 'string' && isEncrypted(field)) {
      try {
        return field; // Already encrypted
      } catch (error) {
        console.error(`Error decrypting ${field}:`, error);
        return field;
      }
    } else if (typeof field === 'string') {
      // Not encrypted, encrypt it now
      try {
        return encrypt(field);
      } catch (error) {
        console.error(`Error encrypting ${field}:`, error);
        return field;
      }
    }
    return field;
  };
  
  return {
    id: doc._id,
    username: doc.username,
    email: doc.email,
    firstName: doc.firstName || '',
    lastName: doc.lastName || '',
    password: doc.password || '',
    googleId: doc.googleId,
    appleId: doc.appleId,
    profilePicture: doc.profilePicture,
    createdAt: doc.createdAt,
    
    okxApiKey: processField(doc.okxApiKey),
    okxSecretKey: processField(doc.okxSecretKey),
    okxPassphrase: processField(doc.okxPassphrase),
    binanceApiKey: processField(doc.binanceApiKey),
    binanceSecretKey: processField(doc.binanceSecretKey),
    binanceAllowedIp: doc.binanceAllowedIp,
    
    defaultBroker: doc.defaultBroker,
    useTestnet: doc.useTestnet,
    
    stripeCustomerId: doc.stripeCustomerId,
    stripeSubscriptionId: doc.stripeSubscriptionId,
    hasPremium: doc.hasPremium,
    premiumExpiresAt: doc.premiumExpiresAt,
    
    isAdmin: doc.isAdmin
  };
}

export function convertToBotModel(doc: any): any {
  if (!doc) return undefined;
  
  return {
    id: doc._id,
    name: doc.name,
    strategy: doc.strategy,
    description: doc.description,
    minInvestment: doc.minInvestment,
    monthlyReturn: doc.monthlyReturn,
    riskLevel: doc.riskLevel,
    rating: doc.rating,
    isPopular: doc.isPopular,
    userId: doc.userId,
    isRunning: doc.isRunning,
    tradingPair: doc.tradingPair,
    totalInvestment: doc.totalInvestment,
    parameters: doc.parameters,
    createdAt: doc.createdAt,
    lastStartedAt: doc.lastStartedAt,
    lastStoppedAt: doc.lastStoppedAt,
    profitLoss: doc.profitLoss,
    profitLossPercent: doc.profitLossPercent,
    totalTrades: doc.totalTrades
  };
}

// Similar conversion functions for other models can be added as needed