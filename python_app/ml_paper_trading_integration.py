#!/usr/bin/env python3
"""
ML Paper Trading Integration

This module integrates the ML prediction system with the Paper Trading environment.
It provides a bridge that:
1. Gets predictions from the ML system
2. Uses real market data from Binance SDK
3. Executes simulated trades in Paper Trading
4. Records all activities with detailed logs
5. Tracks performance metrics
"""

import os
import sys
import json
import time
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'ml_paper_trading.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ml_paper_trading')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the trading ML components
from ml_trading_bridge import get_ml_trading_bridge
from trading_ml import get_trading_ml

# Import Binance market service for real-time data
try:
    from services.binance.market_service import BinanceMarketService, binance_market_service
except ImportError:
    try:
        from python_app.services.binance.market_service import BinanceMarketService, binance_market_service
    except ImportError:
        logger.error("Could not import BinanceMarketService - market data might be unavailable")
        binance_market_service = None

# Import logging utilities
try:
    from utils.logging_utils import get_ml_paper_trading_logger, log_with_data
except ImportError:
    try:
        from python_app.utils.logging_utils import get_ml_paper_trading_logger, log_with_data
    except ImportError:
        logger.warning("Could not import custom logging utilities, using standard logging")
        get_ml_paper_trading_logger = lambda: logger
        def log_with_data(logger, level, message, data=None):
            if data:
                logger.log(level, f"{message}: {json.dumps(data)}")
            else:
                logger.log(level, message)


class MLPaperTradingIntegration:
    """
    Integrates ML predictions with Paper Trading for simulation and backtesting
    """
    
    def __init__(self, user_id: int = 1):
        """
        Initialize the ML Paper Trading Integration
        
        Args:
            user_id: The user ID to use for paper trading (default: 1 for system)
        """
        self.user_id = user_id
        self.ml_bridge = get_ml_trading_bridge()
        self.trading_ml = get_trading_ml()
        self.market_service = binance_market_service
        self.logger = get_ml_paper_trading_logger()
        self.api_base_url = "http://localhost:5000"  # Local server URL
        self.active = False
        
        # Monitoring settings
        self.symbols_to_monitor = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
        self.monitoring_interval = 300  # 5 minutes
        self.min_confidence_threshold = 0.7
        self.model_type = "balanced"
        
        # Risk management settings
        self.max_position_risk_pct = 5  # Max 5% of account per position
        self.stop_loss_pct = 2  # 2% stop loss
        self.take_profit_pct = 4  # 4% take profit
        
        log_with_data(self.logger, logging.INFO, "ML Paper Trading Integration initialized", {
            "user_id": self.user_id,
            "symbols_to_monitor": self.symbols_to_monitor,
            "monitoring_interval": self.monitoring_interval,
            "min_confidence_threshold": self.min_confidence_threshold,
            "model_type": self.model_type,
            "risk_settings": {
                "max_position_risk_pct": self.max_position_risk_pct,
                "stop_loss_pct": self.stop_loss_pct,
                "take_profit_pct": self.take_profit_pct
            }
        })
    
    def initialize_paper_trading(self) -> bool:
        """
        Initialize the paper trading environment for the user
        
        Returns:
            Success or failure
        """
        try:
            # Set user for paper trading
            response = requests.post(f"{self.api_base_url}/api/ai/paper-trading/set-user", 
                                   json={"userId": self.user_id},
                                   headers={"X-Test-User-Id": "admin"})
            
            if not response.ok:
                logger.error(f"Failed to set user for paper trading: {response.status_code} {response.text}")
                return False
            
            data = response.json()
            log_with_data(self.logger, logging.INFO, "Paper trading initialized successfully", data)
            return data.get('success', False)
            
        except Exception as e:
            logger.error(f"Error initializing paper trading: {e}")
            return False
    
    def get_account_balance(self) -> Optional[Dict[str, Any]]:
        """
        Get the current paper trading account balance
        
        Returns:
            Account details including balance
        """
        try:
            response = requests.get(f"{self.api_base_url}/api/ai/paper-trading/account", 
                                  headers={"X-Test-User-Id": "admin"})
            
            if not response.ok:
                logger.error(f"Failed to get account balance: {response.status_code} {response.text}")
                return None
            
            data = response.json()
            if data.get('success', False) and data.get('account'):
                return data['account']
            return None
            
        except Exception as e:
            logger.error(f"Error getting account balance: {e}")
            return None
    
    def get_open_positions(self) -> List[Dict[str, Any]]:
        """
        Get all open paper trading positions
        
        Returns:
            List of open positions
        """
        try:
            response = requests.get(f"{self.api_base_url}/api/ai/paper-trading/positions", 
                                  headers={"X-Test-User-Id": "admin"})
            
            if not response.ok:
                logger.error(f"Failed to get open positions: {response.status_code} {response.text}")
                return []
            
            data = response.json()
            if data.get('success', False) and data.get('positions'):
                return data['positions']
            return []
            
        except Exception as e:
            logger.error(f"Error getting open positions: {e}")
            return []
    
    def get_trading_history(self) -> List[Dict[str, Any]]:
        """
        Get paper trading history
        
        Returns:
            List of trades
        """
        try:
            response = requests.get(f"{self.api_base_url}/api/ai/paper-trading/trades", 
                                  headers={"X-Test-User-Id": "admin"})
            
            if not response.ok:
                logger.error(f"Failed to get trading history: {response.status_code} {response.text}")
                return []
            
            data = response.json()
            if data.get('success', False) and data.get('trades'):
                return data['trades']
            return []
            
        except Exception as e:
            logger.error(f"Error getting trading history: {e}")
            return []
    
    def execute_trade(self, symbol: str, action: str, confidence: float) -> Dict[str, Any]:
        """
        Execute a trade in the paper trading system
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            action: Trade action ("BUY" or "SELL")
            confidence: ML prediction confidence (0.0-1.0)
            
        Returns:
            Response data from the trading system
        """
        try:
            # Get current price from Binance
            current_price = self._get_symbol_price(symbol)
            if not current_price:
                logger.error(f"Failed to get current price for {symbol}, trade execution aborted")
                return {
                    "success": False,
                    "message": f"Failed to get current price for {symbol}"
                }
            
            # Prepare trading decision
            decision = {
                "symbol": symbol,
                "action": action,
                "confidence": confidence,
                "price": current_price,
                "timestamp": datetime.now().isoformat()
            }
            
            log_with_data(self.logger, logging.INFO, "Executing trade", decision)
            
            # Execute trade using the API
            response = requests.post(f"{self.api_base_url}/api/ai/paper-trading/execute", 
                                   json=decision,
                                   headers={"X-Test-User-Id": "admin"})
            
            if not response.ok:
                logger.error(f"Failed to execute trade: {response.status_code} {response.text}")
                return {
                    "success": False,
                    "message": f"API error: {response.status_code} {response.text}"
                }
            
            result = response.json()
            
            # Log the result
            log_with_data(self.logger, logging.INFO, 
                        "Trade execution result", 
                        {"success": result.get('success', False), 
                         "details": result.get('result', {})})
            
            return result
            
        except Exception as e:
            error_msg = f"Error executing trade: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "message": error_msg
            }
    
    def monitor_for_trading_signals(self) -> None:
        """
        Start monitoring symbols for trading signals
        This continuously checks for ML signals and executes trades accordingly
        """
        if self.active:
            logger.warning("Monitoring is already active")
            return
        
        self.active = True
        log_with_data(self.logger, logging.INFO, "Starting automated trading signal monitoring", {
            "symbols": self.symbols_to_monitor,
            "interval": f"{self.monitoring_interval} seconds",
            "min_confidence": self.min_confidence_threshold
        })
        
        try:
            while self.active:
                log_with_data(self.logger, logging.INFO, "Checking for trading signals", {
                    "time": datetime.now().isoformat()
                })
                
                # Get signals for all symbols
                self._check_and_execute_signals()
                
                # Update positions with current prices
                self._update_positions_with_current_prices()
                
                # Check for take profit or stop loss conditions
                self._check_exit_conditions()
                
                # Sleep until next check
                time.sleep(self.monitoring_interval)
                
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
            self.active = False
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
            self.active = False
    
    def stop_monitoring(self) -> None:
        """
        Stop the monitoring loop
        """
        self.active = False
        logger.info("Monitoring stopped")
    
    def _get_symbol_price(self, symbol: str) -> Optional[float]:
        """
        Get current price for a symbol using Binance market service
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            
        Returns:
            Current price or None if unavailable
        """
        try:
            # Try to get from market service first
            if self.market_service:
                # Check cached price first
                cached_price = self.market_service.get_latest_price(symbol)
                if cached_price:
                    return cached_price
                
                # If not in cache, fetch from API
                price_data = self.market_service.get_symbol_price(symbol)
                if price_data and 'price' in price_data:
                    return float(price_data['price'])
            
            # Fallback to direct API call
            response = requests.get(f"{self.api_base_url}/api/binance/price?symbol={symbol}")
            if response.ok:
                data = response.json()
                if data.get('success', False) and data.get('data', {}).get('price'):
                    return float(data['data']['price'])
            
            logger.warning(f"Failed to get price for {symbol} from all sources")
            return None
            
        except Exception as e:
            logger.error(f"Error getting price for {symbol}: {e}")
            return None
    
    def _check_and_execute_signals(self) -> None:
        """
        Check for ML signals and execute trades if confident enough
        """
        try:
            # Get batch signals for all symbols
            signals = self.ml_bridge.get_batch_signals(
                self.symbols_to_monitor, 
                model_type=self.model_type, 
                min_confidence=self.min_confidence_threshold
            )
            
            log_with_data(self.logger, logging.INFO, "Received batch signals from ML system", {
                "symbol_count": len(signals),
                "signals": signals
            })
            
            # Get open positions to avoid duplicate trades
            open_positions = self.get_open_positions()
            position_symbols = {pos['symbol'].replace('/', '-') for pos in open_positions}
            
            # Process each signal
            for symbol, signal_data in signals.items():
                # Skip if no actionable signal or low confidence
                if not signal_data.get('success', False) or signal_data.get('signal') == 'HOLD':
                    continue
                
                action = signal_data.get('signal')
                confidence = signal_data.get('confidence', 0)
                
                # Check if we already have a position for this symbol
                if symbol in position_symbols:
                    logger.info(f"Position already open for {symbol}, skipping new trade")
                    continue
                
                # Execute the trade
                if confidence >= self.min_confidence_threshold:
                    execution_result = self.execute_trade(symbol, action, confidence)
                    log_with_data(self.logger, logging.INFO, 
                                 f"{action} signal executed for {symbol}", 
                                 {"result": execution_result})
                
        except Exception as e:
            logger.error(f"Error checking and executing signals: {e}")
    
    def _update_positions_with_current_prices(self) -> None:
        """
        Update all open positions with current market prices
        """
        try:
            # Get open positions
            open_positions = self.get_open_positions()
            if not open_positions:
                return
            
            for position in open_positions:
                # Get symbol in correct format
                symbol = position['symbol'].replace('/', '-')
                # Get current price
                current_price = self._get_symbol_price(symbol)
                
                if current_price:
                    # Simulate price change
                    self._simulate_price_update(symbol, current_price)
                    log_with_data(self.logger, logging.INFO, 
                                f"Updated position for {symbol}", 
                                {"position_id": position['id'], "price": current_price})
        
        except Exception as e:
            logger.error(f"Error updating positions with current prices: {e}")
    
    def _simulate_price_update(self, symbol: str, price: float) -> bool:
        """
        Simulate a price update in the paper trading system
        
        Args:
            symbol: Trading pair symbol
            price: Current price
            
        Returns:
            Success or failure
        """
        try:
            # Call the price simulation API
            response = requests.post(
                f"{self.api_base_url}/api/paper-trading/simulate-price",
                json={"symbol": symbol, "price": price},
                headers={"X-Test-User-Id": "admin"}
            )
            
            return response.ok
            
        except Exception as e:
            logger.error(f"Error simulating price update: {e}")
            return False
    
    def _check_exit_conditions(self) -> None:
        """
        Check all positions for take profit or stop loss conditions
        """
        try:
            # Get open positions
            open_positions = self.get_open_positions()
            if not open_positions:
                return
            
            for position in open_positions:
                # Get symbol and entry price
                symbol = position['symbol'].replace('/', '-')
                entry_price = float(position['entryPrice'])
                quantity = float(position['quantity'])
                direction = position['direction']  # LONG or SHORT
                
                # Get current price
                current_price = self._get_symbol_price(symbol)
                if not current_price:
                    continue
                
                # Calculate profit/loss percentage
                if direction == 'LONG':
                    pnl_pct = ((current_price - entry_price) / entry_price) * 100
                else:  # SHORT
                    pnl_pct = ((entry_price - current_price) / entry_price) * 100
                
                # Check if we should close the position
                should_close = False
                close_reason = ""
                
                # Take profit condition
                if pnl_pct >= self.take_profit_pct:
                    should_close = True
                    close_reason = "Take profit triggered"
                
                # Stop loss condition
                if pnl_pct <= -self.stop_loss_pct:
                    should_close = True
                    close_reason = "Stop loss triggered"
                
                # Close the position if conditions are met
                if should_close:
                    log_with_data(self.logger, logging.INFO, 
                                f"Closing position for {symbol}", 
                                {"position_id": position['id'], 
                                 "reason": close_reason,
                                 "entry_price": entry_price,
                                 "current_price": current_price,
                                 "pnl_pct": pnl_pct})
                    
                    self._close_position(position['id'], current_price, close_reason)
        
        except Exception as e:
            logger.error(f"Error checking exit conditions: {e}")
    
    def _close_position(self, position_id: int, exit_price: float, reason: str) -> bool:
        """
        Close a paper trading position
        
        Args:
            position_id: ID of the position to close
            exit_price: Exit price for the position
            reason: Reason for closing the position
            
        Returns:
            Success or failure
        """
        try:
            # Call the close position API
            response = requests.post(
                f"{self.api_base_url}/api/ai/paper-trading/close-position",
                json={
                    "positionId": position_id,
                    "exitPrice": exit_price,
                    "metadata": {"reason": reason}
                },
                headers={"X-Test-User-Id": "admin"}
            )
            
            if response.ok:
                result = response.json()
                log_with_data(self.logger, logging.INFO, 
                            f"Position {position_id} closed", 
                            {"success": result.get('success', False),
                             "exit_price": exit_price,
                             "reason": reason})
                return result.get('success', False)
            else:
                logger.error(f"Failed to close position: {response.status_code} {response.text}")
                return False
            
        except Exception as e:
            logger.error(f"Error closing position: {e}")
            return False
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """
        Generate a performance report for the ML Paper Trading system
        
        Returns:
            Performance metrics and statistics
        """
        try:
            # Get account info
            account = self.get_account_balance()
            if not account:
                return {"success": False, "message": "Could not get account information"}
            
            # Get trading history
            trades = self.get_trading_history()
            
            # Calculate performance metrics
            total_trades = len(trades)
            winning_trades = sum(1 for t in trades if t['status'] == 'CLOSED' and t['profitLoss'] and float(t['profitLoss']) > 0)
            losing_trades = sum(1 for t in trades if t['status'] == 'CLOSED' and t['profitLoss'] and float(t['profitLoss']) < 0)
            win_rate = winning_trades / total_trades if total_trades > 0 else 0
            
            # Calculate profit/loss metrics
            total_profit_loss = sum(float(t['profitLoss']) for t in trades if t['status'] == 'CLOSED' and t['profitLoss'])
            avg_profit_per_trade = total_profit_loss / total_trades if total_trades > 0 else 0
            
            # Get initial and current balance
            initial_balance = float(account['initialBalance'])
            current_balance = float(account['currentBalance'])
            total_return_pct = ((current_balance - initial_balance) / initial_balance) * 100 if initial_balance > 0 else 0
            
            # Build report
            report = {
                "account_id": account['id'],
                "time_period": {
                    "start": min(t['openedAt'] for t in trades) if trades else "N/A",
                    "end": datetime.now().isoformat()
                },
                "initial_balance": initial_balance,
                "current_balance": current_balance,
                "total_profit_loss": total_profit_loss,
                "total_return_percent": total_return_pct,
                "trading_metrics": {
                    "total_trades": total_trades,
                    "winning_trades": winning_trades,
                    "losing_trades": losing_trades,
                    "win_rate": win_rate,
                    "avg_profit_per_trade": avg_profit_per_trade
                },
                "ml_metrics": {
                    "model_type": self.model_type,
                    "confidence_threshold": self.min_confidence_threshold
                }
            }
            
            # Log the report
            log_with_data(self.logger, logging.INFO, "Generated performance report", report)
            
            return {
                "success": True,
                "report": report
            }
            
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return {
                "success": False,
                "message": f"Error: {e}"
            }


# Singleton instance
_ml_paper_trading = None

def get_ml_paper_trading() -> MLPaperTradingIntegration:
    """
    Get or create the MLPaperTradingIntegration singleton
    
    Returns:
        The MLPaperTradingIntegration instance
    """
    global _ml_paper_trading
    if _ml_paper_trading is None:
        _ml_paper_trading = MLPaperTradingIntegration()
    return _ml_paper_trading


# Test function
if __name__ == "__main__":
    print("\n=== Testing ML Paper Trading Integration ===\n")
    
    # Create the integration
    integration = get_ml_paper_trading()
    
    # Initialize paper trading
    print("Initializing paper trading...")
    success = integration.initialize_paper_trading()
    print(f"Initialization {'successful' if success else 'failed'}")
    
    # Get account info
    print("\nGetting account balance...")
    account = integration.get_account_balance()
    print(f"Account: {json.dumps(account, indent=2) if account else 'Not available'}")
    
    # Execute a test trade
    print("\nExecuting a test trade...")
    test_trade = integration.execute_trade("BTCUSDT", "BUY", 0.85)
    print(f"Trade execution: {json.dumps(test_trade, indent=2)}")
    
    # Get open positions
    print("\nGetting open positions...")
    positions = integration.get_open_positions()
    print(f"Open positions: {json.dumps(positions, indent=2)}")
    
    # Generate a performance report
    print("\nGenerating performance report...")
    report = integration.generate_performance_report()
    print(f"Performance report: {json.dumps(report, indent=2)}")
    
    print("\nTest completed!")