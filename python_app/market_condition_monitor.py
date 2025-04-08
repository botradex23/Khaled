#!/usr/bin/env python3
"""
Market Condition Monitor

This module monitors market conditions and triggers model retraining when significant 
changes in market dynamics are detected. It analyzes various market indicators including:
- Volatility changes
- Trend direction shifts
- Volume fluctuations
- Correlation breakdowns
- Regime shifts

It integrates with the XGBoost optimization system to automatically adapt models to 
changing market conditions.
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Union
from datetime import datetime, timedelta
import requests
import time
from threading import Thread, Lock
from queue import Queue

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'market_monitor.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# For using the local imports in both standalone mode and when imported
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import necessary local modules
from adaptive_tuning import perform_adaptive_tuning
from xgboost_optimization import run_xgboost_optimization


class MarketConditionMonitor:
    """
    Monitor market conditions and trigger model retraining based on significant changes
    """
    
    def __init__(self, 
                api_base_url: str = 'http://localhost:3000/api/ml/optimization',
                check_interval: int = 3600,  # 1 hour in seconds
                volatility_threshold: float = 0.2,
                volume_threshold: float = 0.3,
                correlation_threshold: float = 0.3,
                trend_window: int = 14,
                config_path: Optional[str] = None):
        """
        Initialize the market condition monitor
        
        Args:
            api_base_url: Base URL for the ML optimization API
            check_interval: How often to check market conditions (seconds)
            volatility_threshold: Threshold for significant volatility change (fraction)
            volume_threshold: Threshold for significant volume change (fraction)
            correlation_threshold: Threshold for significant correlation change
            trend_window: Window size for trend analysis
            config_path: Optional path to configuration file
        """
        self.api_base_url = api_base_url
        self.check_interval = check_interval
        self.volatility_threshold = volatility_threshold
        self.volume_threshold = volume_threshold
        self.correlation_threshold = correlation_threshold
        self.trend_window = trend_window
        
        # Track symbols and timeframes to monitor
        self.monitored_assets = []
        
        # Track last conditions for each asset
        self.last_conditions = {}
        
        # Track when each model was last retrained
        self.last_retrain_time = {}
        
        # Track significant condition changes
        self.condition_changes = {}
        
        # Minimum time between retrainings (24 hours by default)
        self.min_retrain_interval = 24 * 3600  # seconds
        
        # Retraining queue and workers
        self.retrain_queue = Queue()
        self.retrain_lock = Lock()
        self.workers = []
        self.num_workers = 2  # Number of parallel retraining jobs
        self.running = False
        
        # Load configuration if provided
        if config_path and os.path.exists(config_path):
            self.load_config(config_path)
    
    def load_config(self, config_path: str) -> None:
        """
        Load configuration from file
        
        Args:
            config_path: Path to configuration file
        """
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                
            # Update parameters from config
            self.check_interval = config.get('check_interval', self.check_interval)
            self.volatility_threshold = config.get('volatility_threshold', self.volatility_threshold)
            self.volume_threshold = config.get('volume_threshold', self.volume_threshold)
            self.correlation_threshold = config.get('correlation_threshold', self.correlation_threshold)
            self.trend_window = config.get('trend_window', self.trend_window)
            self.min_retrain_interval = config.get('min_retrain_interval', self.min_retrain_interval)
            self.num_workers = config.get('num_workers', self.num_workers)
            
            # Set monitored assets
            if 'monitored_assets' in config:
                self.monitored_assets = config['monitored_assets']
                
            logger.info(f"Configuration loaded from {config_path}")
            
        except Exception as e:
            logger.error(f"Error loading configuration: {str(e)}")
    
    def save_config(self, config_path: str) -> None:
        """
        Save configuration to file
        
        Args:
            config_path: Path to save configuration
        """
        try:
            config = {
                'check_interval': self.check_interval,
                'volatility_threshold': self.volatility_threshold,
                'volume_threshold': self.volume_threshold,
                'correlation_threshold': self.correlation_threshold,
                'trend_window': self.trend_window,
                'min_retrain_interval': self.min_retrain_interval,
                'num_workers': self.num_workers,
                'monitored_assets': self.monitored_assets
            }
            
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
                
            logger.info(f"Configuration saved to {config_path}")
            
        except Exception as e:
            logger.error(f"Error saving configuration: {str(e)}")
    
    def add_asset(self, symbol: str, timeframe: str) -> None:
        """
        Add an asset to monitor
        
        Args:
            symbol: Trading pair symbol
            timeframe: Timeframe (e.g., '1h', '4h', '1d')
        """
        asset_key = f"{symbol}_{timeframe}"
        if asset_key not in [f"{a['symbol']}_{a['timeframe']}" for a in self.monitored_assets]:
            self.monitored_assets.append({
                'symbol': symbol,
                'timeframe': timeframe
            })
            logger.info(f"Added asset to monitor: {symbol} {timeframe}")
    
    def remove_asset(self, symbol: str, timeframe: str) -> None:
        """
        Remove an asset from monitoring
        
        Args:
            symbol: Trading pair symbol
            timeframe: Timeframe
        """
        asset_key = f"{symbol}_{timeframe}"
        self.monitored_assets = [
            a for a in self.monitored_assets 
            if f"{a['symbol']}_{a['timeframe']}" != asset_key
        ]
        logger.info(f"Removed asset from monitoring: {symbol} {timeframe}")
    
    def get_market_conditions(self, symbol: str, timeframe: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent market conditions for a symbol and timeframe
        
        Args:
            symbol: Trading pair symbol
            timeframe: Timeframe
            limit: Number of conditions to retrieve
            
        Returns:
            List of market condition records
        """
        try:
            # Normalize symbol format
            normalized_symbol = symbol.replace('/', '').lower()
            
            response = requests.get(
                f"{self.api_base_url}/market-conditions",
                params={
                    'symbol': normalized_symbol,
                    'timeframe': timeframe,
                    'limit': limit
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('success') and 'data' in data:
                conditions = data['data']
                return conditions
            else:
                logger.warning(f"Failed to get market conditions for {symbol} {timeframe}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting market conditions: {str(e)}")
            return []
    
    def detect_volatility_change(self, 
                               current_conditions: List[Dict[str, Any]], 
                               previous_conditions: List[Dict[str, Any]]) -> Tuple[bool, float]:
        """
        Detect if there has been a significant change in volatility
        
        Args:
            current_conditions: Current market conditions
            previous_conditions: Previous market conditions
            
        Returns:
            Tuple of (change_detected, change_magnitude)
        """
        if not current_conditions or not previous_conditions:
            return False, 0
            
        # Calculate average volatility for each period
        current_volatility = sum(c.get('volatility', 0) for c in current_conditions) / len(current_conditions)
        previous_volatility = sum(p.get('volatility', 0) for p in previous_conditions) / len(previous_conditions)
        
        # Calculate percent change
        if previous_volatility > 0:
            change = (current_volatility - previous_volatility) / previous_volatility
            significant_change = abs(change) > self.volatility_threshold
            return significant_change, change
        else:
            return False, 0
    
    def detect_volume_change(self, 
                           current_conditions: List[Dict[str, Any]], 
                           previous_conditions: List[Dict[str, Any]]) -> Tuple[bool, float]:
        """
        Detect if there has been a significant change in trading volume
        
        Args:
            current_conditions: Current market conditions
            previous_conditions: Previous market conditions
            
        Returns:
            Tuple of (change_detected, change_magnitude)
        """
        if not current_conditions or not previous_conditions:
            return False, 0
            
        # Calculate average volume for each period
        current_volume = sum(c.get('volume', 0) for c in current_conditions) / len(current_conditions)
        previous_volume = sum(p.get('volume', 0) for p in previous_conditions) / len(previous_conditions)
        
        # Calculate percent change
        if previous_volume > 0:
            change = (current_volume - previous_volume) / previous_volume
            significant_change = abs(change) > self.volume_threshold
            return significant_change, change
        else:
            return False, 0
    
    def detect_trend_change(self, 
                          current_conditions: List[Dict[str, Any]], 
                          previous_conditions: List[Dict[str, Any]]) -> Tuple[bool, Dict[str, Any]]:
        """
        Detect if there has been a significant change in trend direction or strength
        
        Args:
            current_conditions: Current market conditions
            previous_conditions: Previous market conditions
            
        Returns:
            Tuple of (change_detected, change_details)
        """
        if not current_conditions or not previous_conditions:
            return False, {}
        
        # Check if trend direction flipped
        current_trend = current_conditions[0].get('trendDirection', 0)
        previous_trend = previous_conditions[0].get('trendDirection', 0)
        
        direction_change = current_trend != previous_trend
        
        # Check if trend strength changed significantly
        current_strength = current_conditions[0].get('trendStrength', 0)
        previous_strength = previous_conditions[0].get('trendStrength', 0)
        
        strength_change = abs(current_strength - previous_strength) > 0.3
        
        return (direction_change or strength_change), {
            'direction_change': direction_change,
            'strength_change': strength_change,
            'previous_direction': previous_trend,
            'current_direction': current_trend,
            'previous_strength': previous_strength,
            'current_strength': current_strength
        }
    
    def check_asset_conditions(self, symbol: str, timeframe: str) -> Dict[str, Any]:
        """
        Check conditions for a specific asset and determine if retraining is needed
        
        Args:
            symbol: Trading pair symbol
            timeframe: Timeframe
            
        Returns:
            Dictionary with check results
        """
        normalized_symbol = symbol.replace('/', '').lower()
        asset_key = f"{normalized_symbol}_{timeframe}"
        
        # Get current and previous conditions
        all_conditions = self.get_market_conditions(normalized_symbol, timeframe, 20)
        
        if not all_conditions or len(all_conditions) < 10:
            logger.warning(f"Not enough market condition data for {symbol} {timeframe}")
            return {
                'symbol': symbol,
                'timeframe': timeframe,
                'retraining_needed': False,
                'reason': 'Not enough market condition data'
            }
        
        # Split conditions into current and previous windows
        current_conditions = all_conditions[:5]  # Most recent 5 records
        previous_conditions = all_conditions[5:10]  # 5 records before that
        
        # Detect changes
        volatility_change, volatility_magnitude = self.detect_volatility_change(current_conditions, previous_conditions)
        volume_change, volume_magnitude = self.detect_volume_change(current_conditions, previous_conditions)
        trend_change, trend_details = self.detect_trend_change(current_conditions, previous_conditions)
        
        # Determine if retraining is needed
        retraining_needed = volatility_change or volume_change or trend_change
        
        # Check if we've retrained recently
        current_time = time.time()
        if asset_key in self.last_retrain_time:
            time_since_last_retrain = current_time - self.last_retrain_time[asset_key]
            if time_since_last_retrain < self.min_retrain_interval:
                logger.info(f"Skipping retraining for {symbol} {timeframe}: retrained too recently ({time_since_last_retrain/3600:.1f} hours ago)")
                retraining_needed = False
        
        # Build result
        result = {
            'symbol': symbol,
            'timeframe': timeframe,
            'retraining_needed': retraining_needed,
            'condition_changes': {
                'volatility': {
                    'changed': volatility_change,
                    'magnitude': volatility_magnitude
                },
                'volume': {
                    'changed': volume_change,
                    'magnitude': volume_magnitude
                },
                'trend': {
                    'changed': trend_change,
                    'details': trend_details
                }
            },
            'current_conditions': current_conditions[0] if current_conditions else {},
            'timestamp': datetime.now().isoformat()
        }
        
        # If conditions changed significantly, log and store
        if retraining_needed:
            # Build reason string
            reasons = []
            if volatility_change:
                direction = "increased" if volatility_magnitude > 0 else "decreased"
                reasons.append(f"Volatility {direction} by {abs(volatility_magnitude)*100:.1f}%")
                
            if volume_change:
                direction = "increased" if volume_magnitude > 0 else "decreased"
                reasons.append(f"Volume {direction} by {abs(volume_magnitude)*100:.1f}%")
                
            if trend_change:
                if trend_details.get('direction_change'):
                    previous = "bullish" if trend_details.get('previous_direction', 0) > 0 else "bearish"
                    current = "bullish" if trend_details.get('current_direction', 0) > 0 else "bearish"
                    reasons.append(f"Trend direction changed from {previous} to {current}")
                    
                if trend_details.get('strength_change'):
                    direction = "increased" if trend_details.get('current_strength', 0) > trend_details.get('previous_strength', 0) else "decreased"
                    reasons.append(f"Trend strength {direction}")
            
            reason_str = "; ".join(reasons)
            result['reason'] = reason_str
            
            logger.info(f"Significant market condition changes detected for {symbol} {timeframe}: {reason_str}")
            
            # Store the change record
            if asset_key not in self.condition_changes:
                self.condition_changes[asset_key] = []
                
            self.condition_changes[asset_key].append(result)
            
            # Keep only the latest 10 change records
            if len(self.condition_changes[asset_key]) > 10:
                self.condition_changes[asset_key] = self.condition_changes[asset_key][-10:]
        
        return result
    
    def queue_retraining_task(self, symbol: str, timeframe: str, method: str = 'adaptive') -> None:
        """
        Queue a retraining task
        
        Args:
            symbol: Trading pair symbol
            timeframe: Timeframe
            method: Retraining method ('adaptive' or 'full')
        """
        normalized_symbol = symbol.replace('/', '').lower()
        asset_key = f"{normalized_symbol}_{timeframe}"
        
        # Add to queue
        self.retrain_queue.put({
            'symbol': normalized_symbol,
            'timeframe': timeframe,
            'method': method,
            'queued_at': datetime.now().isoformat()
        })
        
        # Update last retrain time
        with self.retrain_lock:
            self.last_retrain_time[asset_key] = time.time()
            
        logger.info(f"Queued {method} retraining task for {symbol} {timeframe}")
    
    def retraining_worker(self) -> None:
        """
        Worker thread to process retraining tasks from the queue
        """
        while self.running:
            try:
                # Get a task from the queue with a timeout
                try:
                    task = self.retrain_queue.get(timeout=5)
                except Queue.Empty:
                    continue
                
                # Log task start
                symbol = task['symbol']
                timeframe = task['timeframe']
                method = task['method']
                logger.info(f"Starting {method} retraining for {symbol} {timeframe}")
                
                # Execute retraining based on method
                if method == 'adaptive':
                    result = perform_adaptive_tuning(symbol, timeframe)
                    
                    if result.get('success'):
                        logger.info(f"Adaptive tuning completed for {symbol} {timeframe}")
                        
                        # Record market condition at retraining time
                        self.record_retraining_event(symbol, timeframe, method, result)
                    else:
                        logger.error(f"Adaptive tuning failed for {symbol} {timeframe}: {result.get('error', 'Unknown error')}")
                        
                elif method == 'full':
                    # Run full optimization (grid search)
                    try:
                        run_xgboost_optimization(symbol, timeframe, 'all')
                        logger.info(f"Full optimization completed for {symbol} {timeframe}")
                        
                        # Record market condition at retraining time
                        self.record_retraining_event(symbol, timeframe, method, {'success': True})
                    except Exception as e:
                        logger.error(f"Full optimization failed for {symbol} {timeframe}: {str(e)}")
                
                # Mark task as done
                self.retrain_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error in retraining worker: {str(e)}")
    
    def record_retraining_event(self, symbol: str, timeframe: str, method: str, result: Dict[str, Any]) -> None:
        """
        Record a retraining event and the market conditions at that time
        
        Args:
            symbol: Trading pair symbol
            timeframe: Timeframe
            method: Retraining method used
            result: Result of retraining
        """
        try:
            # Get current market conditions
            current_conditions = self.get_market_conditions(symbol, timeframe, 1)
            
            if not current_conditions:
                logger.warning(f"Could not get current market conditions for {symbol} {timeframe}")
                return
                
            # Create record
            record = {
                'symbol': symbol,
                'timeframe': timeframe,
                'method': method,
                'timestamp': datetime.now().isoformat(),
                'market_conditions': current_conditions[0] if current_conditions else {},
                'result': result
            }
            
            # Send record to API
            try:
                requests.post(
                    f"{self.api_base_url}/retraining-events",
                    json=record,
                    timeout=10
                )
                logger.info(f"Recorded retraining event for {symbol} {timeframe}")
            except Exception as e:
                logger.error(f"Error recording retraining event: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in record_retraining_event: {str(e)}")
    
    def check_all_assets(self) -> Dict[str, Any]:
        """
        Check all monitored assets and queue retraining tasks as needed
        
        Returns:
            Summary of checks and retraining decisions
        """
        results = []
        retraining_queued = 0
        
        for asset in self.monitored_assets:
            symbol = asset['symbol']
            timeframe = asset['timeframe']
            
            # Check conditions
            result = self.check_asset_conditions(symbol, timeframe)
            results.append(result)
            
            # Queue retraining if needed
            if result.get('retraining_needed'):
                self.queue_retraining_task(symbol, timeframe, 'adaptive')
                retraining_queued += 1
                
        return {
            'timestamp': datetime.now().isoformat(),
            'assets_checked': len(self.monitored_assets),
            'retraining_queued': retraining_queued,
            'results': results
        }
    
    def start_monitoring(self) -> None:
        """
        Start the market condition monitoring process
        """
        if self.running:
            logger.warning("Market condition monitoring is already running")
            return
            
        logger.info("Starting market condition monitoring")
        self.running = True
        
        # Start worker threads
        for i in range(self.num_workers):
            worker = Thread(target=self.retraining_worker, daemon=True)
            worker.start()
            self.workers.append(worker)
        
        # Start monitoring loop in a separate thread
        self.monitor_thread = Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        
        logger.info(f"Market condition monitoring started with {self.num_workers} worker threads")
    
    def _monitoring_loop(self) -> None:
        """
        Main monitoring loop
        """
        while self.running:
            try:
                # Check all assets
                logger.info("Checking market conditions for all monitored assets")
                self.check_all_assets()
                
                # Sleep until next check
                sleep_time = self.check_interval
                logger.info(f"Next check in {sleep_time} seconds")
                
                # Sleep in small increments to allow for clean shutdown
                for _ in range(sleep_time // 10):
                    if not self.running:
                        break
                    time.sleep(10)
                    
                time.sleep(sleep_time % 10)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
                time.sleep(60)  # Sleep for a minute if there's an error
    
    def stop_monitoring(self) -> None:
        """
        Stop the market condition monitoring process
        """
        if not self.running:
            logger.warning("Market condition monitoring is not running")
            return
            
        logger.info("Stopping market condition monitoring")
        self.running = False
        
        # Wait for worker threads to finish current tasks
        logger.info("Waiting for worker threads to finish current tasks")
        for worker in self.workers:
            worker.join(timeout=10)
            
        # Clear workers list
        self.workers = []
        
        logger.info("Market condition monitoring stopped")


def start_market_monitor_service(config_path: Optional[str] = None) -> MarketConditionMonitor:
    """
    Start the market condition monitoring service
    
    Args:
        config_path: Optional path to configuration file
        
    Returns:
        The MarketConditionMonitor instance
    """
    # Create monitor
    monitor = MarketConditionMonitor(config_path=config_path)
    
    # Add default assets if none were loaded from config
    if not monitor.monitored_assets:
        default_assets = [
            {'symbol': 'btcusdt', 'timeframe': '1h'},
            {'symbol': 'ethusdt', 'timeframe': '1h'},
            {'symbol': 'bnbusdt', 'timeframe': '1h'},
        ]
        
        for asset in default_assets:
            monitor.add_asset(asset['symbol'], asset['timeframe'])
    
    # Start monitoring
    monitor.start_monitoring()
    
    return monitor


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Market Condition Monitor')
    parser.add_argument('--config', type=str, help='Path to configuration file')
    
    args = parser.parse_args()
    
    config_path = args.config
    
    logger.info("Starting Market Condition Monitor")
    
    monitor = start_market_monitor_service(config_path)
    
    # Keep the main thread alive
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Stopping Market Condition Monitor")
        monitor.stop_monitoring()