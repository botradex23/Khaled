/**
 * Interface representing a trading decision from the AI system
 */
export interface TradingDecision {
  symbol: string;           // Trading pair symbol (e.g., "BTCUSDT")
  action: string;           // Trading action ("BUY", "SELL", "HOLD")
  confidence: number;       // Confidence level (0.0 to 1.0)
  price: number;            // Current price
  timestamp: string;        // ISO timestamp of the decision
  strategy: string;         // Strategy used for the decision
  parameters: Record<string, any>; // Strategy-specific parameters
  
  // Optional properties that may be available in some contexts
  reason?: string;          // Reason for the decision
  tradingSignals?: Record<string, any>; // Technical indicators and signals
  marketState?: Record<string, any>;    // Current market state
  predictions?: Record<string, any>;    // ML predictions data
}