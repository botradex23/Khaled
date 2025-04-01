/**
 * PaperTradingApi.ts
 * 
 * API for paper trading system, allowing for simulated trading and price manipulation
 * This is primarily used for testing trading bots and strategies
 */

import { storage } from '../../storage';
import { EventEmitter } from 'events';

class PaperTradingApi extends EventEmitter {
  private prices: Map<string, number> = new Map();
  private static instance: PaperTradingApi;
  
  private constructor() {
    super();
    this.initialize();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PaperTradingApi {
    if (!PaperTradingApi.instance) {
      PaperTradingApi.instance = new PaperTradingApi();
    }
    return PaperTradingApi.instance;
  }
  
  /**
   * Initialize the API with some default prices
   */
  private async initialize(): Promise<void> {
    // Set some default prices
    this.prices.set('BTCUSDT', 70000);
    this.prices.set('ETHUSDT', 3500);
    this.prices.set('BNBUSDT', 600);
    
    console.log('PaperTradingApi initialized with default prices');
  }
  
  /**
   * Get current price for a symbol
   */
  public async getCurrentPrice(symbol: string): Promise<number> {
    // Normalize the symbol format
    const normalizedSymbol = symbol.replace('-', '').toUpperCase();
    
    // Get price from the cache
    const price = this.prices.get(normalizedSymbol);
    
    // If we have it cached, return it
    if (price !== undefined) {
      return price;
    }
    
    // Otherwise, try to get from a real API and cache it
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${normalizedSymbol}`);
      const data = await response.json();
      
      if (data && data.price) {
        const currentPrice = parseFloat(data.price);
        this.prices.set(normalizedSymbol, currentPrice);
        return currentPrice;
      }
    } catch (error) {
      console.error(`Error fetching price for ${normalizedSymbol}:`, error);
    }
    
    // If all else fails, return a fallback price
    console.warn(`Using fallback price for ${normalizedSymbol}`);
    return 1.0; 
  }
  
  /**
   * Set price for a symbol (used for testing)
   */
  public async simulatePriceChange(symbol: string, price: number): Promise<void> {
    const normalizedSymbol = symbol.replace('-', '').toUpperCase();
    
    // Store old price for event
    const oldPrice = this.prices.get(normalizedSymbol) || await this.getCurrentPrice(normalizedSymbol);
    
    // Update the price
    this.prices.set(normalizedSymbol, price);
    
    console.log(`Simulated price change for ${normalizedSymbol}: ${oldPrice} -> ${price}`);
    
    // Emit price change event for interested subscribers
    this.emit('priceChange', {
      symbol: normalizedSymbol,
      oldPrice,
      newPrice: price,
      changePercent: ((price - oldPrice) / oldPrice) * 100
    });
    
    // Update all open positions with this symbol
    try {
      // Get all users with paper trading accounts
      // Using the available methods in storage to get accounts
      const accounts = [];
      // We'll use user ID 1 for simplicity in this test implementation
      const account = await storage.getUserPaperTradingAccount(1);
      if (account) accounts.push(account);
      
      for (const account of accounts) {
        const positions = await storage.getAccountPaperTradingPositions(account.id);
        
        for (const position of positions) {
          if (position.symbol === normalizedSymbol) {
            // Calculate current PnL
            const entryPrice = parseFloat(position.entryPrice);
            const quantity = parseFloat(position.quantity);
            const currentValue = price * quantity;
            const costBasis = entryPrice * quantity;
            
            const pnl = position.direction === 'LONG' 
              ? currentValue - costBasis 
              : costBasis - currentValue;
            
            const pnlPercent = (pnl / costBasis) * 100;
            
            // Update position with current values
            try {
              await storage.updatePaperTradingPosition(position.id, {
                // Using metadata to store additional information since schema doesn't have these fields
                metadata: JSON.stringify({
                  currentPrice: price,
                  unrealizedPnl: pnl,
                  unrealizedPnlPercent: pnlPercent
                })
              });
              
              console.log(`Updated position ${position.id} with new price: ${price}, PnL: ${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
            } catch (err) {
              console.error(`Error updating position with new price:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating positions with new price:', error);
    }
  }
  
  /**
   * Initialize an account with a specific balance (for testing)
   */
  public async initializeAccount(userId: number, balance: number): Promise<number> {
    try {
      // Check if user already has an account
      const existingAccount = await storage.getUserPaperTradingAccount(userId);
      
      if (existingAccount) {
        // Update the balance
        await storage.updatePaperTradingAccount(existingAccount.id, {
          initialBalance: balance.toString(),
          currentBalance: balance.toString()
        });
        
        console.log(`Updated paper trading account ${existingAccount.id} for user ${userId} with balance ${balance}`);
        return existingAccount.id;
      }
      
      // Create new account
      const account = await storage.createPaperTradingAccount({
        userId,
        initialBalance: balance.toString(),
        currentBalance: balance.toString(),
        totalProfitLoss: "0",
        totalProfitLossPercent: "0",
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0
      });
      
      console.log(`Created new paper trading account ${account.id} for user ${userId} with balance ${balance}`);
      return account.id;
    } catch (error) {
      console.error(`Error initializing account for user ${userId}:`, error);
      throw error;
    }
  }
}

export default PaperTradingApi.getInstance();