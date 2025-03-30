// dotenv package not available - environment variables are already loaded by Replit
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

// Create a PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a Drizzle instance
export const db = drizzle(pool, { schema });

// Function to run database migrations programmatically if needed
export async function runMigrations() {
  try {
    console.log('Checking database tables...');
    
    // Simple query to see if our tables exist
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const usersTableExists = result.rows[0].exists;
    
    if (!usersTableExists) {
      console.log('Tables do not exist, attempting to create schema...');
      
      // Create all tables defined in our schema
      // This is a simple approach - in production you'd use a migration tool
      const createTablesQuery = `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT,
          first_name TEXT,
          last_name TEXT,
          default_broker TEXT,
          use_testnet BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- API Keys table
        CREATE TABLE IF NOT EXISTS user_api_keys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          okx_api_key TEXT,
          okx_secret_key TEXT,
          okx_passphrase TEXT,
          binance_api_key TEXT,
          binance_secret_key TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Trading Bots table
        CREATE TABLE IF NOT EXISTS trading_bots (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          name TEXT NOT NULL,
          description TEXT,
          symbol TEXT NOT NULL,
          broker TEXT NOT NULL,
          strategy_type TEXT NOT NULL,
          parameters JSONB,
          is_active BOOLEAN DEFAULT FALSE,
          is_running BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Bot Trades table
        CREATE TABLE IF NOT EXISTS bot_trades (
          id SERIAL PRIMARY KEY,
          bot_id INTEGER NOT NULL REFERENCES trading_bots(id),
          user_id INTEGER NOT NULL REFERENCES users(id),
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          type TEXT NOT NULL,
          price TEXT NOT NULL,
          amount TEXT NOT NULL,
          status TEXT NOT NULL,
          order_id TEXT,
          fee TEXT,
          fee_currency TEXT,
          is_test BOOLEAN DEFAULT FALSE,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Paper Trading Accounts table
        CREATE TABLE IF NOT EXISTS paper_trading_accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          initial_balance TEXT NOT NULL,
          current_balance TEXT NOT NULL,
          total_profit_loss TEXT DEFAULT '0',
          total_profit_loss_percent TEXT DEFAULT '0',
          total_trades INTEGER DEFAULT 0,
          winning_trades INTEGER DEFAULT 0,
          losing_trades INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Paper Trading Positions table
        CREATE TABLE IF NOT EXISTS paper_trading_positions (
          id SERIAL PRIMARY KEY,
          account_id INTEGER NOT NULL REFERENCES paper_trading_accounts(id),
          symbol TEXT NOT NULL,
          entry_price TEXT NOT NULL,
          quantity TEXT NOT NULL,
          direction TEXT NOT NULL,
          opened_at TIMESTAMP DEFAULT NOW()
        );

        -- Paper Trading Trades table
        CREATE TABLE IF NOT EXISTS paper_trading_trades (
          id SERIAL PRIMARY KEY,
          account_id INTEGER NOT NULL REFERENCES paper_trading_accounts(id),
          position_id INTEGER REFERENCES paper_trading_positions(id),
          symbol TEXT NOT NULL,
          entry_price TEXT NOT NULL,
          exit_price TEXT,
          quantity TEXT NOT NULL,
          direction TEXT NOT NULL,
          status TEXT NOT NULL,
          profit_loss TEXT,
          profit_loss_percent TEXT,
          fee TEXT DEFAULT '0',
          opened_at TIMESTAMP DEFAULT NOW(),
          closed_at TIMESTAMP,
          type TEXT DEFAULT 'MARKET',
          is_ai_generated BOOLEAN DEFAULT FALSE,
          ai_confidence TEXT
        );

        -- AI Trading Data table
        CREATE TABLE IF NOT EXISTS ai_trading_data (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          symbol TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW(),
          decision TEXT NOT NULL,
          confidence TEXT,
          features JSONB,
          market_price TEXT,
          result TEXT,
          profit_loss TEXT,
          metadata JSONB
        );
      `;
      
      await pool.query(createTablesQuery);
      console.log('Database schema created successfully');
      return true;
    } else {
      console.log('Database tables already exist');
      return false;
    }
  } catch (error) {
    console.error('Error setting up database schema:', error);
    throw error;
  }
}

// Helper function to clean and reset the database (for testing only)
export async function resetDatabase() {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new Error('Cannot reset database in production environment');
  }
  
  try {
    // Drop all tables in correct order to respect foreign keys
    await pool.query(`
      DROP TABLE IF EXISTS ai_trading_data CASCADE;
      DROP TABLE IF EXISTS paper_trading_trades CASCADE;
      DROP TABLE IF EXISTS paper_trading_positions CASCADE;
      DROP TABLE IF EXISTS paper_trading_accounts CASCADE;
      DROP TABLE IF EXISTS bot_trades CASCADE;
      DROP TABLE IF EXISTS trading_bots CASCADE;
      DROP TABLE IF EXISTS user_api_keys CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    
    console.log('Database reset complete');
    
    // Recreate tables
    await runMigrations();
    
    return { success: true, message: 'Database reset and recreated successfully' };
  } catch (error) {
    console.error('Error resetting database:', error);
    return { success: false, message: 'Failed to reset database', error };
  }
}