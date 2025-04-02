#!/usr/bin/env python3
"""
Demo Trading Bot with ML Integration

This script demonstrates how the ML prediction engine can be integrated with a trading bot.
It connects to the Binance API, fetches latest market data, makes predictions, and simulates
trading decisions based on those predictions.

Note: This is for demonstration purposes only and does not execute real trades.
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
import argparse

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import required modules
try:
    from ml_trading_bridge import MLTradingBridge
except ImportError as e:
    logger.error(f"Error importing ML Trading Bridge: {e}")
    sys.exit(1)

class DemoTradingBot:
    """
    Demo trading bot that uses ML predictions to simulate trading decisions
    """
    
    def __init__(self, symbol="BTCUSDT", interval="1h", model_type="balanced", 
                 confidence_threshold=0.75, initial_balance=10000.0):
        """
        Initialize the demo trading bot
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Timeframe interval (e.g., '1h', '4h')
            model_type: Model type to use ('standard' or 'balanced')
            confidence_threshold: Minimum confidence level for trades (0.0-1.0)
            initial_balance: Initial USDT balance for the simulation
        """
        self.symbol = symbol
        self.interval = interval
        self.model_type = model_type
        self.confidence_threshold = confidence_threshold
        
        # Initialize the ML trading bridge
        self.ml_bridge = MLTradingBridge(model_type=model_type)
        
        # Initialize account state
        self.initial_balance = initial_balance
        self.usdt_balance = initial_balance
        self.coin_balance = 0.0
        self.current_price = 0.0
        
        # Trading state
        self.last_action = "INIT"
        self.position_open = False
        self.entry_price = 0.0
        self.trades = []
        
        # Performance metrics
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.largest_gain = 0.0
        self.largest_loss = 0.0
        
        logger.info(f"Demo Trading Bot initialized for {symbol} on {interval} timeframe")
        logger.info(f"Using {model_type} model with confidence threshold of {confidence_threshold}")
    
    def fetch_latest_price(self):
        """
        Fetch the latest price for the symbol
        
        Returns:
            The latest price as a float, or None on failure
        """
        try:
            # For a real bot, you would use the Binance API directly
            # Here we'll use the ML bridge to get market data which includes the latest price
            prediction = self.ml_bridge.get_prediction(self.symbol, self.interval)
            if prediction and 'current_price' in prediction:
                return float(prediction['current_price'])
            return None
        except Exception as e:
            logger.error(f"Error fetching latest price: {e}")
            return None
    
    def get_prediction(self):
        """
        Get a prediction for the current market conditions
        
        Returns:
            A prediction dictionary or None on failure
        """
        try:
            return self.ml_bridge.get_prediction(self.symbol, self.interval)
        except Exception as e:
            logger.error(f"Error getting prediction: {e}")
            return None
    
    def execute_trade(self, action, price, amount=None, reason=""):
        """
        Simulate executing a trade
        
        Args:
            action: Trade action ('BUY' or 'SELL')
            price: Current market price
            amount: Amount to buy/sell (None for full balance)
            reason: Reason for the trade
            
        Returns:
            True if the trade was executed, False otherwise
        """
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if action == "BUY" and self.usdt_balance > 0:
            # Calculate amount to buy
            usdt_amount = self.usdt_balance if amount is None else min(amount, self.usdt_balance)
            coin_amount = usdt_amount / price
            
            # Update balances
            self.usdt_balance -= usdt_amount
            self.coin_balance += coin_amount
            self.position_open = True
            self.entry_price = price
            
            # Record trade
            trade = {
                'timestamp': timestamp,
                'action': 'BUY',
                'price': price,
                'usdt_amount': usdt_amount,
                'coin_amount': coin_amount,
                'reason': reason
            }
            self.trades.append(trade)
            self.total_trades += 1
            self.last_action = "BUY"
            
            logger.info(f"BUY: {coin_amount:.6f} {self.symbol[:-4]} at ${price:.2f} (${usdt_amount:.2f})")
            logger.info(f"Reason: {reason}")
            return True
            
        elif action == "SELL" and self.coin_balance > 0:
            # Calculate amount to sell
            coin_amount = self.coin_balance if amount is None else min(amount, self.coin_balance)
            usdt_amount = coin_amount * price
            
            # Calculate profit/loss
            if self.position_open:
                entry_value = coin_amount * self.entry_price
                exit_value = usdt_amount
                pnl = exit_value - entry_value
                pnl_percent = (pnl / entry_value) * 100
                
                # Update performance metrics
                if pnl > 0:
                    self.winning_trades += 1
                    self.largest_gain = max(self.largest_gain, pnl_percent)
                else:
                    self.losing_trades += 1
                    self.largest_loss = min(self.largest_loss, pnl_percent)
            
            # Update balances
            self.usdt_balance += usdt_amount
            self.coin_balance -= coin_amount
            
            if self.coin_balance < 0.000001:  # Avoid floating point issues
                self.coin_balance = 0
                self.position_open = False
            
            # Record trade
            trade = {
                'timestamp': timestamp,
                'action': 'SELL',
                'price': price,
                'usdt_amount': usdt_amount,
                'coin_amount': coin_amount,
                'reason': reason
            }
            
            if self.position_open and self.entry_price > 0:
                trade['pnl'] = pnl
                trade['pnl_percent'] = pnl_percent
                trade['entry_price'] = self.entry_price
            
            self.trades.append(trade)
            self.total_trades += 1
            self.last_action = "SELL"
            
            logger.info(f"SELL: {coin_amount:.6f} {self.symbol[:-4]} at ${price:.2f} (${usdt_amount:.2f})")
            if self.position_open and self.entry_price > 0:
                logger.info(f"P&L: ${pnl:.2f} ({pnl_percent:.2f}%)")
            logger.info(f"Reason: {reason}")
            return True
            
        return False
    
    def process_prediction(self, prediction):
        """
        Process a prediction and execute trading logic
        
        Args:
            prediction: Prediction dictionary from the ML model
            
        Returns:
            Action taken ('BUY', 'SELL', or 'HOLD')
        """
        if not prediction:
            logger.warning("No prediction available, holding position")
            return "HOLD"
        
        # Extract prediction data
        action = prediction.get('prediction', 'HOLD')
        confidence = prediction.get('confidence', 0)
        current_price = prediction.get('current_price', self.current_price)
        
        # Update current price
        self.current_price = current_price
        
        # Calculate portfolio value
        portfolio_value = self.usdt_balance + (self.coin_balance * current_price)
        
        # Log current state
        logger.info(f"Current state: ${self.usdt_balance:.2f} + {self.coin_balance:.6f} {self.symbol[:-4]} (${self.coin_balance * current_price:.2f})")
        logger.info(f"Total value: ${portfolio_value:.2f}")
        logger.info(f"Prediction: {action} with {confidence:.4f} confidence")
        
        # Check if confidence meets threshold
        if confidence < self.confidence_threshold:
            logger.info(f"Confidence below threshold ({confidence:.4f} < {self.confidence_threshold}), no action taken")
            return "HOLD"
        
        # Trading logic
        if action == "BUY" and not self.position_open and self.usdt_balance > 0:
            # Buy using 90% of available USDT (keeping some for fees)
            usdt_amount = self.usdt_balance * 0.9
            reason = f"ML model predicted BUY with {confidence:.4f} confidence"
            self.execute_trade("BUY", current_price, usdt_amount, reason)
            return "BUY"
            
        elif action == "SELL" and self.coin_balance > 0:
            # Sell all holdings
            reason = f"ML model predicted SELL with {confidence:.4f} confidence"
            self.execute_trade("SELL", current_price, None, reason)
            return "SELL"
            
        elif action == "HOLD":
            logger.info("ML model predicted HOLD, no action taken")
            return "HOLD"
        
        return "HOLD"
    
    def print_summary(self):
        """Print a summary of the bot's performance"""
        print("\n" + "=" * 60)
        print(f"TRADING BOT SUMMARY FOR {self.symbol}")
        print("=" * 60)
        
        # Calculate final portfolio value
        final_value = self.usdt_balance + (self.coin_balance * self.current_price)
        profit = final_value - self.initial_balance
        profit_percent = (profit / self.initial_balance) * 100
        
        print(f"\nTrading period: {self.trades[0]['timestamp'] if self.trades else 'N/A'} to {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"\nStarting balance: ${self.initial_balance:.2f}")
        print(f"Final balance: ${final_value:.2f}")
        print(f"Profit/Loss: ${profit:.2f} ({profit_percent:.2f}%)")
        
        print(f"\nTotal trades: {self.total_trades}")
        win_rate = (self.winning_trades / self.total_trades) * 100 if self.total_trades > 0 else 0
        print(f"Win rate: {win_rate:.2f}% ({self.winning_trades}/{self.total_trades})")
        print(f"Largest gain: {self.largest_gain:.2f}%")
        print(f"Largest loss: {self.largest_loss:.2f}%")
        
        print(f"\nCurrent holdings:")
        print(f"- USDT: ${self.usdt_balance:.2f}")
        print(f"- {self.symbol[:-4]}: {self.coin_balance:.6f} (${self.coin_balance * self.current_price:.2f})")
        
        print("\n" + "=" * 60)
    
    def save_report(self):
        """Save a trading report to file"""
        report = {
            'symbol': self.symbol,
            'interval': self.interval,
            'model_type': self.model_type,
            'confidence_threshold': self.confidence_threshold,
            'initial_balance': self.initial_balance,
            'final_usdt_balance': self.usdt_balance,
            'final_coin_balance': self.coin_balance,
            'final_coin_value': self.coin_balance * self.current_price,
            'final_portfolio_value': self.usdt_balance + (self.coin_balance * self.current_price),
            'profit_loss': self.usdt_balance + (self.coin_balance * self.current_price) - self.initial_balance,
            'profit_loss_percent': ((self.usdt_balance + (self.coin_balance * self.current_price)) / self.initial_balance - 1) * 100,
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': (self.winning_trades / self.total_trades) * 100 if self.total_trades > 0 else 0,
            'largest_gain': self.largest_gain,
            'largest_loss': self.largest_loss,
            'trades': self.trades
        }
        
        # Save to file
        report_file = f"demo_trading_{self.symbol.lower()}_{self.interval}_{int(time.time())}.json"
        report_path = os.path.join(current_dir, report_file)
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Saved trading report to: {report_path}")
        return report_path
    
    def run_simulation(self, periods=10, interval_minutes=None):
        """
        Run a trading simulation for a specific number of periods
        
        Args:
            periods: Number of trading periods to simulate
            interval_minutes: Minutes between each check (for display only)
            
        Returns:
            Final portfolio value
        """
        logger.info(f"Starting trading simulation for {periods} periods")
        
        for i in range(periods):
            # Get latest price
            price = self.fetch_latest_price()
            if price:
                self.current_price = price
            
            logger.info(f"\n--- PERIOD {i+1}/{periods} ---")
            if interval_minutes:
                logger.info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (simulating {interval_minutes}min intervals)")
            
            # Get prediction
            prediction = self.get_prediction()
            
            # Process prediction
            action = self.process_prediction(prediction)
            
            # Simulate time passing
            if i < periods - 1:
                time.sleep(1)  # Short delay between periods
        
        # Print and save summary
        self.print_summary()
        self.save_report()
        
        # Return final portfolio value
        return self.usdt_balance + (self.coin_balance * self.current_price)

def run_demo():
    """Run the demo trading bot with command line arguments"""
    parser = argparse.ArgumentParser(description='Demo Trading Bot with ML Integration')
    parser.add_argument('--symbol', type=str, default="BTCUSDT", help='Trading pair (e.g., BTCUSDT)')
    parser.add_argument('--interval', type=str, default="1h", help='Trading interval (e.g., 1h, 4h)')
    parser.add_argument('--model', type=str, default="balanced", help='Model type (standard or balanced)')
    parser.add_argument('--confidence', type=float, default=0.75, help='Confidence threshold (0.0-1.0)')
    parser.add_argument('--balance', type=float, default=10000.0, help='Initial USDT balance')
    parser.add_argument('--periods', type=int, default=10, help='Number of trading periods to simulate')
    
    args = parser.parse_args()
    
    # Create and run the bot
    bot = DemoTradingBot(
        symbol=args.symbol,
        interval=args.interval,
        model_type=args.model,
        confidence_threshold=args.confidence,
        initial_balance=args.balance
    )
    
    # Map interval to minutes for display
    interval_map = {
        '1m': 1,
        '5m': 5,
        '15m': 15,
        '30m': 30,
        '1h': 60,
        '2h': 120,
        '4h': 240,
        '6h': 360,
        '12h': 720,
        '1d': 1440,
    }
    interval_minutes = interval_map.get(args.interval, None)
    
    # Run the simulation
    final_value = bot.run_simulation(periods=args.periods, interval_minutes=interval_minutes)
    
    # Return success
    return True

if __name__ == "__main__":
    success = run_demo()
    sys.exit(0 if success else 1)