"""
Trading Strategy Module using AI for Binance trading

This module is responsible for:
1. Fetching real-time market data from Binance
2. Processing and analyzing data using AI/ML models
3. Generating trading signals (buy/sell)
4. Sending trading commands to the execution engine
"""

import os
import json
import time
import numpy as np
import pandas as pd
from datetime import datetime
import ccxt
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout

class TradingStrategy:
    def __init__(self, config=None):
        """Initialize the trading strategy with configuration parameters"""
        self.config = config or {}
        self.symbols = self.config.get('symbols', ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'])
        self.timeframe = self.config.get('timeframe', '1h')
        self.limit = self.config.get('limit', 100)
        self.binance = None
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
        
        # Create models directory if it doesn't exist
        if not os.path.exists(self.model_path):
            os.makedirs(self.model_path)
        
        # Initialize connection to Binance
        self.setup_exchange()
        
        # Load or create ML model
        self.load_or_create_model()
    
    def setup_exchange(self):
        """Setup connection to Binance exchange"""
        try:
            # Initialize with API keys if available
            api_key = os.environ.get('BINANCE_API_KEY')
            api_secret = os.environ.get('BINANCE_SECRET_KEY')
            testnet = os.environ.get('BINANCE_TESTNET', 'true').lower() == 'true'
            
            if api_key and api_secret:
                self.binance = ccxt.binance({
                    'apiKey': api_key,
                    'secret': api_secret,
                    'enableRateLimit': True,
                    'options': {
                        'defaultType': 'spot',
                        'adjustForTimeDifference': True,
                        'testnet': testnet
                    }
                })
                print(f"Connected to Binance {'testnet' if testnet else 'live'} environment with API key")
            else:
                # Public API (read-only)
                self.binance = ccxt.binance({
                    'enableRateLimit': True,
                    'options': {
                        'defaultType': 'spot',
                        'adjustForTimeDifference': True, 
                        'testnet': testnet
                    }
                })
                print("Connected to Binance public API (no trading possible)")
        except Exception as e:
            print(f"Error connecting to Binance: {e}")
            self.binance = None
    
    def load_or_create_model(self):
        """Load existing model or create a new one"""
        model_file = os.path.join(self.model_path, 'trading_model.h5')
        
        if os.path.exists(model_file):
            try:
                self.model = load_model(model_file)
                print(f"Loaded existing model from {model_file}")
            except Exception as e:
                print(f"Error loading model: {e}")
                self.create_model()
        else:
            self.create_model()
    
    def create_model(self):
        """Create a new LSTM model for price prediction"""
        try:
            # Simple LSTM model for sequence prediction
            model = Sequential()
            model.add(LSTM(units=50, return_sequences=True, input_shape=(60, 5)))
            model.add(Dropout(0.2))
            model.add(LSTM(units=50, return_sequences=False))
            model.add(Dropout(0.2))
            model.add(Dense(units=25))
            model.add(Dense(units=1))
            
            model.compile(optimizer='adam', loss='mean_squared_error')
            self.model = model
            print("Created new LSTM model for trading")
        except Exception as e:
            print(f"Error creating model: {e}")
            self.model = None
    
    def save_model(self):
        """Save the trained model"""
        if self.model:
            model_file = os.path.join(self.model_path, 'trading_model.h5')
            self.model.save(model_file)
            print(f"Model saved to {model_file}")
    
    def fetch_ohlcv_data(self, symbol):
        """Fetch OHLCV data from Binance for a symbol"""
        if not self.binance:
            print("Binance connection not available")
            return None
        
        try:
            # Fetch the candle data
            ohlcv = self.binance.fetch_ohlcv(symbol, timeframe=self.timeframe, limit=self.limit)
            
            # Convert to dataframe
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            
            # Add indicators
            df['ma_20'] = df['close'].rolling(window=20).mean()
            df['ma_50'] = df['close'].rolling(window=50).mean()
            df['rsi'] = self.calculate_rsi(df['close'], window=14)
            
            # Drop NaN values
            df = df.dropna()
            
            return df
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None
    
    def calculate_rsi(self, prices, window=14):
        """Calculate RSI indicator"""
        delta = prices.diff()
        up, down = delta.copy(), delta.copy()
        up[up < 0] = 0
        down[down > 0] = 0
        
        avg_gain = up.rolling(window=window).mean()
        avg_loss = abs(down.rolling(window=window).mean())
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def prepare_data(self, df):
        """Prepare data for model input"""
        if df is None or df.empty:
            return None, None
        
        # Extract features
        data = df[['open', 'high', 'low', 'close', 'volume']].values
        
        # Scale the data
        scaled_data = self.scaler.fit_transform(data)
        
        # Prepare X (features) and y (target)
        X = []
        y = []
        
        # We use last 60 data points to predict the next value
        for i in range(60, len(scaled_data)):
            X.append(scaled_data[i-60:i])
            y.append(scaled_data[i, 3])  # Predict close price
        
        return np.array(X), np.array(y)
    
    def train_model(self, symbol):
        """Train the model on historical data"""
        # Fetch data
        df = self.fetch_ohlcv_data(symbol)
        if df is None:
            return False
        
        # Prepare data
        X, y = self.prepare_data(df)
        if X is None or y is None:
            return False
        
        # Split into train/test
        split = int(0.8 * len(X))
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]
        
        # Train the model
        self.model.fit(X_train, y_train, epochs=20, batch_size=32, validation_data=(X_test, y_test), verbose=1)
        
        # Save the model
        self.save_model()
        
        return True
    
    def generate_signals(self, symbol):
        """Generate trading signals for a symbol"""
        # Fetch latest data
        df = self.fetch_ohlcv_data(symbol)
        if df is None or df.empty:
            return None
        
        # Prepare the data for prediction
        data = df[['open', 'high', 'low', 'close', 'volume']].values
        scaled_data = self.scaler.transform(data)
        
        # Take the last 60 periods for prediction
        X = []
        if len(scaled_data) >= 60:
            X.append(scaled_data[-60:])
            X = np.array(X)
            
            # Make prediction
            predicted_price_scaled = self.model.predict(X)
            
            # Inverse transform to get the actual price
            predicted_price = self.scaler.inverse_transform(
                np.array([[0, 0, 0, predicted_price_scaled[0][0], 0]])
            )[0, 3]
            
            # Current price
            current_price = df['close'].iloc[-1]
            
            # Technical indicators
            last_ma_20 = df['ma_20'].iloc[-1]
            last_ma_50 = df['ma_50'].iloc[-1]
            last_rsi = df['rsi'].iloc[-1]
            
            # Simple trading logic
            if predicted_price > current_price * 1.01 and last_ma_20 > last_ma_50 and last_rsi < 70:
                signal = 'BUY'
                confidence = min(0.5 + (predicted_price/current_price - 1), 0.99)
            elif predicted_price < current_price * 0.99 and last_ma_20 < last_ma_50 and last_rsi > 30:
                signal = 'SELL'
                confidence = min(0.5 + (1 - predicted_price/current_price), 0.99)
            else:
                signal = 'HOLD'
                confidence = 0.5
            
            return {
                'symbol': symbol,
                'timestamp': datetime.now().isoformat(),
                'current_price': float(current_price),
                'predicted_price': float(predicted_price),
                'ma_20': float(last_ma_20),
                'ma_50': float(last_ma_50),
                'rsi': float(last_rsi),
                'signal': signal,
                'confidence': float(confidence)
            }
        
        return None
    
    def analyze_all_symbols(self):
        """Analyze all configured symbols and generate trading signals"""
        results = []
        for symbol in self.symbols:
            try:
                signal = self.generate_signals(symbol)
                if signal:
                    results.append(signal)
            except Exception as e:
                print(f"Error analyzing {symbol}: {e}")
        
        return results

    def execute_trade(self, signal, amount=None):
        """Execute a trade based on the signal"""
        if not self.binance or not hasattr(self.binance, 'createOrder'):
            print("Trading not available - API key missing or insufficient permissions")
            return None
        
        symbol = signal['symbol']
        trade_type = signal['signal']
        
        if trade_type == 'HOLD':
            return None
        
        try:
            # Default amount if not specified
            if amount is None:
                # Get account balance
                balance = self.binance.fetch_balance()
                if trade_type == 'BUY':
                    # Use USDT for buying
                    usdt_balance = balance.get('total', {}).get('USDT', 0)
                    # Use only 2% of available balance per trade
                    amount = (usdt_balance * 0.02) / signal['current_price']
                else:  # SELL
                    # Extract currency from symbol (e.g., BTC from BTC/USDT)
                    currency = symbol.split('/')[0]
                    # Get currency balance
                    currency_balance = balance.get('total', {}).get(currency, 0)
                    # Sell all available balance
                    amount = currency_balance
            
            # Execute trade
            if amount > 0:
                order_type = 'market'
                side = trade_type.lower()
                
                order = self.binance.create_order(
                    symbol=symbol,
                    type=order_type,
                    side=side,
                    amount=amount
                )
                
                return {
                    'success': True,
                    'order': order,
                    'message': f"Executed {side} order for {amount} {symbol}"
                }
            else:
                return {
                    'success': False,
                    'message': f"Insufficient balance for {trade_type} {symbol}"
                }
        except Exception as e:
            return {
                'success': False,
                'message': f"Error executing {trade_type} for {symbol}: {e}"
            }

# Command-line interface for integration with Node.js
if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='AI Trading Strategy')
    parser.add_argument('--args', type=str, help='JSON arguments')
    
    args = parser.parse_args()
    
    if args.args:
        try:
            params = json.loads(args.args)
            command = params.get('command', 'analyze')
            config = params.get('config', {})
            
            # Initialize strategy
            strategy = TradingStrategy(config)
            
            # Process command
            if command == 'check':
                # Just verify that the script runs correctly
                print(json.dumps({"status": "ok"}))
            
            elif command == 'analyze':
                # Generate trading signals
                signals = strategy.analyze_all_symbols()
                print(json.dumps(signals))
            
            elif command == 'train':
                # Train model for a specific symbol
                symbol = params.get('symbol', 'BTC/USDT')
                success = strategy.train_model(symbol)
                print(json.dumps({"success": success}))
            
            elif command == 'execute':
                # Execute a trade
                signal = params.get('signal')
                amount = params.get('amount')
                
                if signal:
                    result = strategy.execute_trade(signal, amount)
                    print(json.dumps(result))
                else:
                    print(json.dumps({"success": False, "message": "No signal provided"}))
            
            else:
                print(json.dumps({"error": f"Unknown command: {command}"}))
        
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
    else:
        # If no arguments provided, just run as standalone script
        strategy = TradingStrategy()
        signals = strategy.analyze_all_symbols()
        print(json.dumps(signals, indent=2))