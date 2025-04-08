#!/usr/bin/env python3
"""
Strategy Simulation Module

This module provides functionality for simulating different trading strategies
based on ML model predictions. It enables:

1. Backtesting of trading strategies with ML model predictions
2. Comparison of different strategy configurations and parameters
3. Performance analysis with key metrics (PnL, Sharpe ratio, drawdown, etc.)
4. Trade-by-trade simulation with detailed reports
5. Visualization data for the UI charts

It integrates with the XGBoost optimization system and model evaluation framework.
"""

import os
import sys
import json
import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional, Union
from datetime import datetime, timedelta
import requests
import matplotlib.pyplot as plt
import io
import base64
from pathlib import Path
import xgboost as xgb
import uuid

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'strategy_simulation.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import helpers from other modules
from model_utils import evaluate_model, load_model_with_metadata
from xgboost_optimization import XGBoostOptimizer, prepare_data_for_training

class StrategySimulator:
    """
    Simulates trading strategies based on ML model predictions
    """
    
    def __init__(self, 
                symbol: str, 
                timeframe: str,
                api_base_url: str = 'http://localhost:3000/api/ml/optimization',
                data_dir: str = None):
        """
        Initialize the strategy simulator
        
        Args:
            symbol: Trading pair symbol (e.g., 'btcusdt')
            timeframe: Timeframe for the data (e.g., '1h', '4h', '1d')
            api_base_url: Base URL for the API
            data_dir: Directory for saving simulation results and charts
        """
        self.symbol = symbol.lower()
        self.timeframe = timeframe
        self.api_base_url = api_base_url
        
        # Set up data directory
        if data_dir is None:
            self.data_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                'data', 
                'simulations'
            )
        else:
            self.data_dir = data_dir
            
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Initialize logger with symbol and timeframe context
        self.logger = logging.getLogger(f"{__name__}.{self.symbol}_{self.timeframe}")
    
    def load_market_data(self, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Load historical market data for the simulation period
        
        Args:
            start_date: Start date in ISO format (YYYY-MM-DD)
            end_date: End date in ISO format (YYYY-MM-DD)
            
        Returns:
            DataFrame with historical market data
        """
        try:
            self.logger.info(f"Loading market data for {self.symbol} from {start_date} to {end_date}")
            
            # Convert dates to datetime objects
            start_dt = datetime.fromisoformat(start_date) if isinstance(start_date, str) else start_date
            end_dt = datetime.fromisoformat(end_date) if isinstance(end_date, str) else end_date
            
            # Request historical data from the API
            response = requests.get(
                f"{self.api_base_url}/historical-data/{self.symbol}/{self.timeframe}",
                params={
                    'startDate': start_dt.isoformat(),
                    'endDate': end_dt.isoformat()
                },
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get('success') or 'data' not in data:
                self.logger.error(f"Failed to load market data: {data.get('error', 'Unknown error')}")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame(data['data'])
            
            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df.set_index('timestamp', inplace=True)
            
            self.logger.info(f"Loaded {len(df)} data points")
            return df
            
        except Exception as e:
            self.logger.error(f"Error loading market data: {str(e)}")
            return pd.DataFrame()
    
    def load_model(self, model_type: str = 'best') -> Tuple[Optional[xgb.Booster], Optional[Dict[str, Any]]]:
        """
        Load an XGBoost model for prediction
        
        Args:
            model_type: Type of model to load ('bayesian', 'grid_search', 'random_search', or 'best')
            
        Returns:
            Tuple of (model, metadata) or (None, None) if loading fails
        """
        try:
            self.logger.info(f"Loading {model_type} model for {self.symbol} {self.timeframe}")
            
            # If model_type is 'best', determine the best model based on performance metrics
            if model_type == 'best':
                response = requests.get(
                    f"{self.api_base_url}/compare/{self.symbol}/{self.timeframe}",
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                
                if not data.get('success') or 'data' not in data:
                    self.logger.error(f"Failed to get model comparison data: {data.get('error', 'Unknown error')}")
                    return None, None
                
                # Find best model based on F1 score
                best_score = 0
                best_type = 'bayesian'  # Default to bayesian if no data
                
                for opt_type, metrics in data['data'].items():
                    if metrics.get('f1Score', 0) > best_score:
                        best_score = metrics.get('f1Score', 0)
                        best_type = opt_type
                
                self.logger.info(f"Determined best model type: {best_type} with F1 score: {best_score}")
                model_type = best_type
            
            # Load the model
            model, metadata = load_model_with_metadata(self.symbol, self.timeframe, model_type)
            
            if model is None:
                self.logger.error(f"Could not load {model_type} model for {self.symbol} {self.timeframe}")
                return None, None
                
            self.logger.info(f"Successfully loaded {model_type} model")
            return model, metadata
            
        except Exception as e:
            self.logger.error(f"Error loading model: {str(e)}")
            return None, None
    
    def prepare_features(self, market_data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare features for prediction using the same process as training
        
        Args:
            market_data: DataFrame with market data
            
        Returns:
            DataFrame with prepared features
        """
        try:
            self.logger.info(f"Preparing features for prediction")
            
            # Use the same feature preparation as in training
            X, y, feature_columns = prepare_data_for_training(
                market_data, 
                self.symbol, 
                self.timeframe
            )
            
            if X is None or len(X) == 0:
                self.logger.error("Feature preparation failed")
                return pd.DataFrame()
                
            self.logger.info(f"Prepared {len(X)} samples with {len(feature_columns)} features")
            return X
            
        except Exception as e:
            self.logger.error(f"Error preparing features: {str(e)}")
            return pd.DataFrame()
    
    def run_simulation(self, 
                       strategy_config: Dict[str, Any], 
                       start_date: str, 
                       end_date: str) -> Dict[str, Any]:
        """
        Run a trading strategy simulation
        
        Args:
            strategy_config: Strategy configuration parameters
            start_date: Start date for the simulation (YYYY-MM-DD)
            end_date: End date for the simulation (YYYY-MM-DD)
            
        Returns:
            Dictionary with simulation results
        """
        try:
            self.logger.info(f"Starting simulation for {self.symbol} {self.timeframe} from {start_date} to {end_date}")
            self.logger.info(f"Strategy config: {json.dumps(strategy_config)}")
            
            # Extract strategy parameters
            strategy_type = strategy_config.get('strategyType', 'balanced')
            initial_investment = float(strategy_config.get('initialInvestment', 1000.0))
            trade_size_percent = float(strategy_config.get('tradeSizePercent', 10.0))
            stop_loss_percent = float(strategy_config.get('stopLossPercent', 2.0))
            take_profit_percent = float(strategy_config.get('takeProfitPercent', 3.0))
            leverage = float(strategy_config.get('leverage', 1.0))
            model_type = strategy_config.get('modelType', 'best')
            confidence_threshold = float(strategy_config.get('confidenceThreshold', 0.6))
            
            # Load market data
            market_data = self.load_market_data(start_date, end_date)
            if market_data.empty:
                return {
                    'success': False,
                    'error': 'Failed to load market data',
                    'symbol': self.symbol,
                    'timeframe': self.timeframe
                }
            
            # Load model
            model, metadata = self.load_model(model_type)
            if model is None:
                return {
                    'success': False,
                    'error': f'Failed to load {model_type} model',
                    'symbol': self.symbol,
                    'timeframe': self.timeframe
                }
            
            # Prepare features
            features = self.prepare_features(market_data)
            if features.empty:
                return {
                    'success': False,
                    'error': 'Failed to prepare features',
                    'symbol': self.symbol,
                    'timeframe': self.timeframe
                }
            
            # Merge features with market data
            # Ensure indexes match
            aligned_index = features.index.intersection(market_data.index)
            features = features.loc[aligned_index]
            simulation_data = market_data.loc[aligned_index].copy()
            
            # Run prediction
            dmatrix = xgb.DMatrix(features)
            predictions = model.predict(dmatrix)
            
            # Add predictions to simulation data
            simulation_data['prediction'] = predictions
            
            # Run the strategy simulation
            results = self._run_strategy(
                simulation_data,
                strategy_type,
                initial_investment,
                trade_size_percent,
                stop_loss_percent,
                take_profit_percent,
                leverage,
                confidence_threshold
            )
            
            # Generate charts
            chart_data_url = self._generate_performance_chart(
                results['balance_history'],
                results['equity_history'],
                results['trades']
            )
            
            # Get sample of trades (latest 50)
            trades_sample = results['trades'][-50:] if len(results['trades']) > 50 else results['trades']
            
            # Prepare results
            simulation_result = {
                'success': True,
                'name': strategy_config.get('name', f"{self.symbol}_{self.timeframe}_{strategy_type}_sim"),
                'description': strategy_config.get('description', f"Simulation of {strategy_type} strategy on {self.symbol}"),
                'symbol': self.symbol,
                'timeframe': self.timeframe,
                'strategyType': strategy_type,
                'startDate': start_date,
                'endDate': end_date,
                'initialInvestment': initial_investment,
                'finalBalance': results['final_balance'],
                'pnl': results['pnl'],
                'pnlPercent': results['pnl_percent'],
                'winRate': results['win_rate'],
                'drawdown': results['average_drawdown'],
                'maxDrawdown': results['max_drawdown'],
                'sharpeRatio': results['sharpe_ratio'],
                'volatility': results['volatility'],
                'tradeCount': results['trade_count'],
                'winCount': results['win_count'],
                'lossCount': results['loss_count'],
                'averageWin': results['average_win'],
                'averageLoss': results['average_loss'],
                'largestWin': results['largest_win'],
                'largestLoss': results['largest_loss'],
                'modelParameters': metadata.get('params', {}),
                'tradesSnapshot': trades_sample,
                'chartDataUrl': chart_data_url
            }
            
            # Save simulation result to file for debugging
            result_path = os.path.join(
                self.data_dir, 
                f"{self.symbol}_{self.timeframe}_{strategy_type}_{int(datetime.now().timestamp())}.json"
            )
            with open(result_path, 'w') as f:
                json.dump(simulation_result, f, indent=2)
            
            self.logger.info(f"Simulation completed: PnL {results['pnl_percent']:.2f}%, Win rate: {results['win_rate']*100:.2f}%")
            return simulation_result
            
        except Exception as e:
            self.logger.error(f"Error running simulation: {str(e)}")
            import traceback
            self.logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e),
                'symbol': self.symbol,
                'timeframe': self.timeframe
            }
    
    def _run_strategy(self,
                     data: pd.DataFrame,
                     strategy_type: str,
                     initial_investment: float,
                     trade_size_percent: float,
                     stop_loss_percent: float,
                     take_profit_percent: float,
                     leverage: float,
                     confidence_threshold: float) -> Dict[str, Any]:
        """
        Run the trading strategy simulation
        
        Args:
            data: DataFrame with market data and predictions
            strategy_type: Type of strategy (conservative, balanced, aggressive)
            initial_investment: Initial investment amount
            trade_size_percent: Percentage of balance to use per trade
            stop_loss_percent: Stop loss percentage
            take_profit_percent: Take profit percentage
            leverage: Leverage multiplier
            confidence_threshold: Minimum prediction confidence to enter a trade
            
        Returns:
            Dictionary with simulation results
        """
        # Initialize simulation state
        balance = initial_investment
        position = None  # None = no position, 'long' or 'short'
        position_size = 0.0
        entry_price = 0.0
        entry_time = None
        
        # Results tracking
        trades = []  # List of completed trades
        balance_history = []  # Balance at each time step
        equity_history = []  # Equity (balance + unrealized PnL) at each time step
        
        # Adjust strategy parameters based on strategy type
        if strategy_type == 'conservative':
            # More conservative approach
            trade_size_percent *= 0.7
            stop_loss_percent *= 0.8
            take_profit_percent *= 1.2
            confidence_threshold = max(0.65, confidence_threshold)
            
        elif strategy_type == 'aggressive':
            # More aggressive approach
            trade_size_percent *= 1.3
            stop_loss_percent *= 1.2
            take_profit_percent *= 0.8
            confidence_threshold = min(0.55, confidence_threshold)
            leverage = min(3.0, leverage * 1.5)
            
        # For date-based iteration
        for timestamp, row in data.iterrows():
            current_price = row['close']
            prediction = row['prediction']
            
            # Calculate current equity
            if position is None:
                equity = balance
            elif position == 'long':
                unrealized_pnl = position_size * (current_price - entry_price) * leverage
                equity = balance + unrealized_pnl
            elif position == 'short':
                unrealized_pnl = position_size * (entry_price - current_price) * leverage
                equity = balance + unrealized_pnl
            
            # Record history
            balance_history.append((timestamp, balance))
            equity_history.append((timestamp, equity))
            
            # Check if we need to close a position (stop loss or take profit)
            if position is not None:
                if position == 'long':
                    # Check stop loss
                    stop_price = entry_price * (1 - stop_loss_percent / 100)
                    if current_price <= stop_price:
                        # Stop loss triggered
                        pnl = position_size * (current_price - entry_price) * leverage
                        balance += pnl
                        
                        trades.append({
                            'type': 'long',
                            'entry_time': entry_time.isoformat(),
                            'exit_time': timestamp.isoformat(),
                            'entry_price': entry_price,
                            'exit_price': current_price,
                            'position_size': position_size,
                            'pnl': pnl,
                            'pnl_percent': (pnl / (position_size * entry_price) * 100),
                            'exit_reason': 'stop_loss'
                        })
                        
                        position = None
                        
                    # Check take profit
                    take_profit_price = entry_price * (1 + take_profit_percent / 100)
                    if current_price >= take_profit_price:
                        # Take profit triggered
                        pnl = position_size * (current_price - entry_price) * leverage
                        balance += pnl
                        
                        trades.append({
                            'type': 'long',
                            'entry_time': entry_time.isoformat(),
                            'exit_time': timestamp.isoformat(),
                            'entry_price': entry_price,
                            'exit_price': current_price,
                            'position_size': position_size,
                            'pnl': pnl,
                            'pnl_percent': (pnl / (position_size * entry_price) * 100),
                            'exit_reason': 'take_profit'
                        })
                        
                        position = None
                        
                elif position == 'short':
                    # Check stop loss
                    stop_price = entry_price * (1 + stop_loss_percent / 100)
                    if current_price >= stop_price:
                        # Stop loss triggered
                        pnl = position_size * (entry_price - current_price) * leverage
                        balance += pnl
                        
                        trades.append({
                            'type': 'short',
                            'entry_time': entry_time.isoformat(),
                            'exit_time': timestamp.isoformat(),
                            'entry_price': entry_price,
                            'exit_price': current_price,
                            'position_size': position_size,
                            'pnl': pnl,
                            'pnl_percent': (pnl / (position_size * entry_price) * 100),
                            'exit_reason': 'stop_loss'
                        })
                        
                        position = None
                        
                    # Check take profit
                    take_profit_price = entry_price * (1 - take_profit_percent / 100)
                    if current_price <= take_profit_price:
                        # Take profit triggered
                        pnl = position_size * (entry_price - current_price) * leverage
                        balance += pnl
                        
                        trades.append({
                            'type': 'short',
                            'entry_time': entry_time.isoformat(),
                            'exit_time': timestamp.isoformat(),
                            'entry_price': entry_price,
                            'exit_price': current_price,
                            'position_size': position_size,
                            'pnl': pnl,
                            'pnl_percent': (pnl / (position_size * entry_price) * 100),
                            'exit_reason': 'take_profit'
                        })
                        
                        position = None
            
            # Check if we need to open a new position based on prediction
            if position is None:
                # Normalizing prediction from 0-1 to -1 to 1 range, where:
                # 0.5 = neutral (hold)
                # >0.5 = bullish (more bullish as it approaches 1)
                # <0.5 = bearish (more bearish as it approaches 0)
                signal = (prediction - 0.5) * 2  # Range from -1 to 1
                
                # Only take positions with sufficient confidence
                if abs(signal) >= confidence_threshold:
                    if signal > 0:  # Bullish signal
                        # Open long position
                        trade_amount = balance * (trade_size_percent / 100)
                        position_size = trade_amount / current_price
                        position = 'long'
                        entry_price = current_price
                        entry_time = timestamp
                        
                    elif signal < 0:  # Bearish signal
                        # Open short position
                        trade_amount = balance * (trade_size_percent / 100)
                        position_size = trade_amount / current_price
                        position = 'short'
                        entry_price = current_price
                        entry_time = timestamp
        
        # Close any open position at the end of simulation
        if position is not None:
            last_price = data.iloc[-1]['close']
            last_time = data.index[-1]
            
            if position == 'long':
                pnl = position_size * (last_price - entry_price) * leverage
            else:  # position == 'short'
                pnl = position_size * (entry_price - last_price) * leverage
                
            balance += pnl
            
            trades.append({
                'type': position,
                'entry_time': entry_time.isoformat(),
                'exit_time': last_time.isoformat(),
                'entry_price': entry_price,
                'exit_price': last_price,
                'position_size': position_size,
                'pnl': pnl,
                'pnl_percent': (pnl / (position_size * entry_price) * 100),
                'exit_reason': 'simulation_end'
            })
        
        # Calculate performance metrics
        final_balance = balance
        pnl = final_balance - initial_investment
        pnl_percent = (pnl / initial_investment) * 100
        
        # Calculate win rate
        win_count = sum(1 for trade in trades if trade['pnl'] > 0)
        loss_count = sum(1 for trade in trades if trade['pnl'] <= 0)
        trade_count = len(trades)
        win_rate = win_count / trade_count if trade_count > 0 else 0
        
        # Calculate average win/loss
        win_trades = [trade['pnl'] for trade in trades if trade['pnl'] > 0]
        loss_trades = [trade['pnl'] for trade in trades if trade['pnl'] <= 0]
        
        average_win = sum(win_trades) / len(win_trades) if win_trades else 0
        average_loss = sum(loss_trades) / len(loss_trades) if loss_trades else 0
        largest_win = max(win_trades) if win_trades else 0
        largest_loss = min(loss_trades) if loss_trades else 0
        
        # Calculate drawdown
        drawdowns = []
        peak = initial_investment
        for _, equity in equity_history:
            if equity > peak:
                peak = equity
            if peak > 0:
                drawdown = (peak - equity) / peak * 100
                drawdowns.append(drawdown)
        
        average_drawdown = sum(drawdowns) / len(drawdowns) if drawdowns else 0
        max_drawdown = max(drawdowns) if drawdowns else 0
        
        # Calculate daily returns for Sharpe ratio
        daily_returns = []
        for i in range(1, len(equity_history)):
            prev_equity = equity_history[i-1][1]
            curr_equity = equity_history[i][1]
            if prev_equity > 0:
                daily_return = (curr_equity - prev_equity) / prev_equity
                daily_returns.append(daily_return)
        
        # Calculate Sharpe ratio (using daily values)
        if daily_returns:
            avg_return = sum(daily_returns) / len(daily_returns)
            std_dev = np.std(daily_returns) if len(daily_returns) > 1 else 0
            sharpe_ratio = (avg_return / std_dev) * np.sqrt(252) if std_dev > 0 else 0
            volatility = std_dev * np.sqrt(252) * 100  # Annualized and in percentage
        else:
            sharpe_ratio = 0
            volatility = 0
        
        return {
            'final_balance': final_balance,
            'pnl': pnl,
            'pnl_percent': pnl_percent,
            'win_rate': win_rate,
            'average_drawdown': average_drawdown,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'volatility': volatility,
            'trade_count': trade_count,
            'win_count': win_count,
            'loss_count': loss_count,
            'average_win': average_win,
            'average_loss': average_loss,
            'largest_win': largest_win,
            'largest_loss': largest_loss,
            'trades': trades,
            'balance_history': balance_history,
            'equity_history': equity_history
        }
    
    def _generate_performance_chart(self, 
                                   balance_history: List[Tuple[datetime, float]],
                                   equity_history: List[Tuple[datetime, float]],
                                   trades: List[Dict[str, Any]]) -> str:
        """
        Generate a performance chart and save it to a file
        
        Args:
            balance_history: List of (timestamp, balance) tuples
            equity_history: List of (timestamp, equity) tuples
            trades: List of trade dictionaries
            
        Returns:
            URL path to the saved chart
        """
        try:
            # Create figure
            plt.figure(figsize=(12, 8))
            
            # Extract data for plotting
            timestamps = [ts for ts, _ in equity_history]
            equity_values = [eq for _, eq in equity_history]
            balance_values = [bal for _, bal in balance_history]
            
            # Plot equity curve
            plt.plot(timestamps, equity_values, label='Equity', color='blue')
            plt.plot(timestamps, balance_values, label='Balance', color='green', linestyle='--')
            
            # Mark trades on the equity curve
            for trade in trades:
                entry_time = datetime.fromisoformat(trade['entry_time'])
                exit_time = datetime.fromisoformat(trade['exit_time'])
                
                # Find the closest equity history points
                entry_idx = min(range(len(timestamps)), key=lambda i: abs(timestamps[i] - entry_time))
                exit_idx = min(range(len(timestamps)), key=lambda i: abs(timestamps[i] - exit_time))
                
                if trade['pnl'] > 0:
                    color = 'green'
                else:
                    color = 'red'
                
                plt.plot([timestamps[entry_idx], timestamps[exit_idx]], 
                         [equity_values[entry_idx], equity_values[exit_idx]], 
                         color=color, alpha=0.5, linewidth=1)
            
            # Add labels and title
            plt.title(f"{self.symbol.upper()} {self.timeframe} Strategy Performance")
            plt.xlabel("Date")
            plt.ylabel("Value")
            plt.legend()
            plt.grid(True, alpha=0.3)
            
            # Rotate x-axis labels for better readability
            plt.xticks(rotation=45)
            
            # Ensure directory exists
            charts_dir = os.path.join(self.data_dir, 'charts')
            os.makedirs(charts_dir, exist_ok=True)
            
            # Generate a unique filename
            filename = f"{self.symbol}_{self.timeframe}_{uuid.uuid4().hex[:8]}.png"
            filepath = os.path.join(charts_dir, filename)
            
            # Save figure
            plt.tight_layout()
            plt.savefig(filepath)
            plt.close()
            
            # Return the URL path (relative to the API)
            return f"/data/simulations/charts/{filename}"
            
        except Exception as e:
            self.logger.error(f"Error generating performance chart: {str(e)}")
            return ""

def run_strategy_simulation(
    symbol: str,
    timeframe: str,
    strategy_config: Dict[str, Any],
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """
    Run a trading strategy simulation with the given parameters
    
    Args:
        symbol: Trading pair symbol
        timeframe: Timeframe for the data
        strategy_config: Dictionary with strategy configuration
        start_date: Start date for the simulation (YYYY-MM-DD)
        end_date: End date for the simulation (YYYY-MM-DD)
        
    Returns:
        Dictionary with simulation results
    """
    try:
        logger.info(f"Starting strategy simulation for {symbol} on {timeframe}")
        
        # Create simulator
        simulator = StrategySimulator(symbol, timeframe)
        
        # Run simulation
        results = simulator.run_simulation(strategy_config, start_date, end_date)
        
        return results
        
    except Exception as e:
        logger.error(f"Error in run_strategy_simulation: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timeframe': timeframe
        }

def compare_strategies(
    symbol: str,
    timeframe: str,
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """
    Compare different strategy types (conservative, balanced, aggressive)
    on the same market data
    
    Args:
        symbol: Trading pair symbol
        timeframe: Timeframe for the data
        start_date: Start date for the simulation (YYYY-MM-DD)
        end_date: End date for the simulation (YYYY-MM-DD)
        
    Returns:
        Dictionary with comparison results
    """
    try:
        logger.info(f"Starting strategy comparison for {symbol} on {timeframe}")
        
        # Create simulator
        simulator = StrategySimulator(symbol, timeframe)
        
        # Base configuration
        base_config = {
            'initialInvestment': 10000.0,
            'tradeSizePercent': 10.0,
            'stopLossPercent': 2.0,
            'takeProfitPercent': 3.0,
            'leverage': 1.0,
            'modelType': 'best',
            'confidenceThreshold': 0.6
        }
        
        # Run simulations for each strategy type
        results = {}
        
        for strategy_type in ['conservative', 'balanced', 'aggressive']:
            strategy_config = {
                **base_config,
                'name': f"{symbol}_{timeframe}_{strategy_type}_comparison",
                'description': f"Comparison of {strategy_type} strategy on {symbol}",
                'strategyType': strategy_type
            }
            
            strategy_result = simulator.run_simulation(strategy_config, start_date, end_date)
            
            if strategy_result.get('success', False):
                results[strategy_type] = {
                    'pnl': strategy_result['pnl'],
                    'pnlPercent': strategy_result['pnlPercent'],
                    'winRate': strategy_result['winRate'],
                    'maxDrawdown': strategy_result['maxDrawdown'],
                    'sharpeRatio': strategy_result['sharpeRatio'],
                    'tradeCount': strategy_result['tradeCount'],
                    'chartDataUrl': strategy_result['chartDataUrl']
                }
            else:
                logger.error(f"Error running {strategy_type} strategy: {strategy_result.get('error', 'Unknown error')}")
        
        return {
            'success': True,
            'symbol': symbol,
            'timeframe': timeframe,
            'startDate': start_date,
            'endDate': end_date,
            'strategies': results
        }
        
    except Exception as e:
        logger.error(f"Error in compare_strategies: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timeframe': timeframe
        }

# If run directly, perform a test simulation
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python strategy_simulation.py <symbol> <timeframe>")
        sys.exit(1)
        
    test_symbol = sys.argv[1]
    test_timeframe = sys.argv[2]
    
    # Default test parameters
    test_config = {
        'name': 'Test Simulation',
        'description': 'Test run of the strategy simulator',
        'strategyType': 'balanced',
        'initialInvestment': 10000.0,
        'tradeSizePercent': 10.0, 
        'stopLossPercent': 2.0,
        'takeProfitPercent': 3.0,
        'leverage': 1.0,
        'modelType': 'best',
        'confidenceThreshold': 0.6
    }
    
    # Default date range (last 30 days)
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    result = run_strategy_simulation(
        test_symbol, 
        test_timeframe,
        test_config,
        start_date,
        end_date
    )
    
    print(json.dumps(result, indent=2))