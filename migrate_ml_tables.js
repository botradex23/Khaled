import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('Creating ML optimization tables...');

  try {
    // Create xgboost_tuning_runs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS xgboost_tuning_runs (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'running',
        optimization_type TEXT NOT NULL,
        baseline_accuracy REAL,
        best_accuracy REAL,
        improvement REAL,
        best_params JSONB,
        all_params JSONB,
        results_url TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created xgboost_tuning_runs table');

    // Create market_conditions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS market_conditions (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        volatility REAL NOT NULL,
        volume REAL NOT NULL,
        trend_strength REAL NOT NULL,
        trend_direction REAL NOT NULL,
        rsi REAL,
        macd_histogram REAL,
        significant_change BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created market_conditions table');

    // Create ml_model_performance table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ml_model_performance (
        id SERIAL PRIMARY KEY,
        model_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        model_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        strategy_type TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        accuracy REAL NOT NULL,
        precision REAL NOT NULL,
        recall REAL NOT NULL,
        f1_score REAL NOT NULL,
        pnl REAL NOT NULL,
        pnl_percent REAL NOT NULL,
        win_rate REAL NOT NULL,
        drawdown REAL NOT NULL,
        win_count INTEGER NOT NULL,
        loss_count INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_top_performer BOOLEAN DEFAULT FALSE,
        parameters JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created ml_model_performance table');

    // Create ml_admin_feedback table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ml_admin_feedback (
        id SERIAL PRIMARY KEY,
        model_id TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        feedback TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        implemented_at TIMESTAMP
      );
    `);
    console.log('Created ml_admin_feedback table');

    // Create strategy_simulations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS strategy_simulations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        initial_investment REAL NOT NULL,
        final_balance REAL NOT NULL,
        pnl REAL NOT NULL,
        pnl_percent REAL NOT NULL,
        win_rate REAL NOT NULL,
        drawdown REAL NOT NULL,
        max_drawdown REAL NOT NULL,
        sharpe_ratio REAL,
        volatility REAL,
        trade_count INTEGER NOT NULL,
        win_count INTEGER NOT NULL,
        loss_count INTEGER NOT NULL,
        average_win REAL NOT NULL,
        average_loss REAL NOT NULL,
        largest_win REAL NOT NULL,
        largest_loss REAL NOT NULL,
        model_parameters JSONB NOT NULL,
        trades_snapshot JSONB,
        chart_data_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created strategy_simulations table');

    console.log('All ML optimization tables created successfully');
  } catch (error) {
    console.error('Error creating ML optimization tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});