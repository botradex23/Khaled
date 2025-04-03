"""
API Status Service

This service checks the status of external APIs (Binance, etc.) 
and provides status information to clients.
"""

import os
import json
import logging
import requests
from datetime import datetime
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

# Status constants
API_MODE_LIVE = "live"
API_MODE_DEMO = "demo"
API_MODE_ERROR = "error"

class ApiStatusService:
    """Service to check and report API connection status"""
    
    def __init__(self):
        """Initialize the service"""
        load_dotenv()
        self.use_demo_mode = os.getenv("USE_DEMO_MODE", "false").lower() == "true"
        self.fallback_to_demo = os.getenv("FALLBACK_TO_DEMO", "true").lower() == "true"
        self.api_mode_file = os.path.join("data", "api_mode.json")
        self.demo_market_data_file = os.path.join("data", "demo_market_data.json")
        self.demo_account_data_file = os.path.join("data", "demo_account_data.json")
        
        # Ensure data directory exists
        os.makedirs("data", exist_ok=True)
        
        # Initialize or load status
        self._initialize_status()
    
    def _initialize_status(self):
        """Initialize or load API status"""
        # Check if status file exists
        if os.path.exists(self.api_mode_file):
            try:
                with open(self.api_mode_file, "r") as f:
                    self.status = json.load(f)
                logger.info(f"Loaded API status from {self.api_mode_file}")
            except Exception as e:
                logger.error(f"Error loading API status: {e}")
                self._create_default_status()
        else:
            self._create_default_status()
    
    def _create_default_status(self):
        """Create default API status"""
        self.status = {
            "mode": API_MODE_DEMO if self.use_demo_mode else API_MODE_LIVE,
            "reason": "Initial status",
            "timestamp": datetime.utcnow().isoformat(),
            "features": {
                "market_data": "simulated" if self.use_demo_mode else "live",
                "trading": "simulated" if self.use_demo_mode else "live",
                "account": "simulated" if self.use_demo_mode else "live"
            },
            "status": {
                "direct_connection": "unknown",
                "proxy_connection": "unknown"
            }
        }
        self._save_status()
    
    def _save_status(self):
        """Save API status to file"""
        try:
            with open(self.api_mode_file, "w") as f:
                json.dump(self.status, f, indent=2)
            logger.info(f"Saved API status to {self.api_mode_file}")
        except Exception as e:
            logger.error(f"Error saving API status: {e}")
    
    def check_binance_api(self):
        """
        Check Binance API connection status
        
        Returns:
            dict: Status information
        """
        if self.use_demo_mode:
            logger.info("Demo mode is enabled, skipping API check")
            return self._get_demo_status()
        
        # Check direct connection
        direct_status = self._check_direct_connection()
        
        # If direct connection is working, we're good
        if direct_status.get("working", False):
            self._update_status_live(direct_status)
            return self.get_status()
        
        # If direct connection failed but fallback to demo is enabled
        if self.fallback_to_demo:
            self._update_status_demo(direct_status)
            self._ensure_demo_data_exists()
        else:
            self._update_status_error(direct_status)
        
        return self.get_status()
    
    def _check_direct_connection(self):
        """
        Check direct connection to Binance API
        
        Returns:
            dict: Status information
        """
        try:
            response = requests.get("https://api.binance.com/api/v3/ping", timeout=10)
            
            if response.status_code == 200:
                return {
                    "working": True,
                    "method": "direct",
                    "status_code": response.status_code,
                    "message": "Binance API is accessible"
                }
            elif response.status_code == 451:
                return {
                    "working": False,
                    "method": "direct",
                    "status_code": response.status_code,
                    "message": "Binance API is geo-restricted (HTTP 451)"
                }
            else:
                return {
                    "working": False,
                    "method": "direct",
                    "status_code": response.status_code,
                    "message": f"Binance API returned unexpected status: {response.status_code}"
                }
        except Exception as e:
            return {
                "working": False,
                "method": "direct",
                "status_code": None,
                "message": f"Cannot connect to Binance API: {str(e)}"
            }
    
    def _update_status_live(self, connection_status):
        """
        Update status for live mode
        
        Args:
            connection_status: Connection status information
        """
        self.status["mode"] = API_MODE_LIVE
        self.status["reason"] = "API connection successful"
        self.status["timestamp"] = datetime.utcnow().isoformat()
        self.status["features"] = {
            "market_data": "live",
            "trading": "live",
            "account": "live"
        }
        self.status["status"] = {
            "direct_connection": "successful",
            "proxy_connection": "not used"
        }
        self.status["details"] = connection_status
        self._save_status()
    
    def _update_status_demo(self, connection_status):
        """
        Update status for demo mode
        
        Args:
            connection_status: Connection status information
        """
        self.status["mode"] = API_MODE_DEMO
        self.status["reason"] = connection_status.get("message", "API connection failed")
        self.status["timestamp"] = datetime.utcnow().isoformat()
        self.status["features"] = {
            "market_data": "simulated",
            "trading": "simulated",
            "account": "simulated"
        }
        self.status["status"] = {
            "direct_connection": f"failed - {connection_status.get('message')}",
            "proxy_connection": "not used"
        }
        self.status["details"] = connection_status
        self._save_status()
    
    def _update_status_error(self, connection_status):
        """
        Update status for error mode
        
        Args:
            connection_status: Connection status information
        """
        self.status["mode"] = API_MODE_ERROR
        self.status["reason"] = connection_status.get("message", "API connection failed")
        self.status["timestamp"] = datetime.utcnow().isoformat()
        self.status["features"] = {
            "market_data": "unavailable",
            "trading": "unavailable",
            "account": "unavailable"
        }
        self.status["status"] = {
            "direct_connection": f"failed - {connection_status.get('message')}",
            "proxy_connection": "not used"
        }
        self.status["details"] = connection_status
        self._save_status()
    
    def _get_demo_status(self):
        """
        Get status for demo mode
        
        Returns:
            dict: Status information
        """
        self.status["mode"] = API_MODE_DEMO
        self.status["reason"] = "Demo mode is enabled"
        self.status["timestamp"] = datetime.utcnow().isoformat()
        self.status["features"] = {
            "market_data": "simulated",
            "trading": "simulated",
            "account": "simulated"
        }
        self.status["status"] = {
            "direct_connection": "not checked",
            "proxy_connection": "not checked"
        }
        self._save_status()
        return self.status
    
    def _ensure_demo_data_exists(self):
        """Ensure demo data files exist"""
        # Create demo market data if it doesn't exist
        if not os.path.exists(self.demo_market_data_file):
            self._create_demo_market_data()
        
        # Create demo account data if it doesn't exist
        if not os.path.exists(self.demo_account_data_file):
            self._create_demo_account_data()
    
    def _create_demo_market_data(self):
        """Create demo market data file"""
        demo_data = {
            "markets": [
                {
                    "symbol": "BTCUSDT",
                    "price": 68543.12,
                    "change_24h": 2.35,
                    "volume_24h": 12456789.45,
                    "high_24h": 69234.56,
                    "low_24h": 67123.45
                },
                {
                    "symbol": "ETHUSDT",
                    "price": 3456.78,
                    "change_24h": 1.23,
                    "volume_24h": 6789123.45,
                    "high_24h": 3567.89,
                    "low_24h": 3345.67
                },
                {
                    "symbol": "BNBUSDT",
                    "price": 567.89,
                    "change_24h": -0.75,
                    "volume_24h": 1234567.89,
                    "high_24h": 584.32,
                    "low_24h": 562.34
                },
                {
                    "symbol": "SOLUSDT",
                    "price": 145.67,
                    "change_24h": 3.45,
                    "volume_24h": 897654.32,
                    "high_24h": 149.87,
                    "low_24h": 140.21
                },
                {
                    "symbol": "ADAUSDT",
                    "price": 0.4567,
                    "change_24h": -1.23,
                    "volume_24h": 7654321.09,
                    "high_24h": 0.4678,
                    "low_24h": 0.4501
                }
            ],
            "last_update": datetime.utcnow().isoformat(),
            "source": "simulation",
            "note": "This is simulated data for demonstration purposes"
        }
        
        try:
            with open(self.demo_market_data_file, "w") as f:
                json.dump(demo_data, f, indent=2)
            logger.info(f"Created demo market data at {self.demo_market_data_file}")
        except Exception as e:
            logger.error(f"Error creating demo market data: {e}")
    
    def _create_demo_account_data(self):
        """Create demo account data file"""
        demo_data = {
            "account": {
                "total_balance_usdt": 25000.00,
                "available_balance_usdt": 15000.00,
                "pnl_24h_usdt": 345.67,
                "pnl_24h_percent": 1.35,
                "margin_used_usdt": 10000.00,
                "margin_level": 2.5
            },
            "balances": [
                {
                    "asset": "BTC",
                    "free": 0.15,
                    "locked": 0.05,
                    "total_usdt": 13708.62
                },
                {
                    "asset": "ETH",
                    "free": 2.5,
                    "locked": 0.0,
                    "total_usdt": 8641.95
                },
                {
                    "asset": "USDT",
                    "free": 15000.00,
                    "locked": 0.0,
                    "total_usdt": 15000.00
                },
                {
                    "asset": "BNB",
                    "free": 5.0,
                    "locked": 0.0,
                    "total_usdt": 2839.45
                }
            ],
            "positions": [
                {
                    "symbol": "BTCUSDT",
                    "position_size": 0.05,
                    "entry_price": 67500.00,
                    "mark_price": 68543.12,
                    "pnl_usdt": 52.16,
                    "pnl_percent": 1.54,
                    "leverage": 5,
                    "margin_usdt": 675.00
                },
                {
                    "symbol": "ETHUSDT",
                    "position_size": 0.5,
                    "entry_price": 3400.00,
                    "mark_price": 3456.78,
                    "pnl_usdt": 28.39,
                    "pnl_percent": 1.67,
                    "leverage": 10,
                    "margin_usdt": 170.00
                }
            ],
            "last_update": datetime.utcnow().isoformat(),
            "source": "simulation",
            "note": "This is simulated data for demonstration purposes"
        }
        
        try:
            with open(self.demo_account_data_file, "w") as f:
                json.dump(demo_data, f, indent=2)
            logger.info(f"Created demo account data at {self.demo_account_data_file}")
        except Exception as e:
            logger.error(f"Error creating demo account data: {e}")
    
    def get_status(self):
        """
        Get current API status
        
        Returns:
            dict: Status information
        """
        return self.status
    
    def is_demo_mode(self):
        """
        Check if system is in demo mode
        
        Returns:
            bool: True if in demo mode, False otherwise
        """
        return self.status.get("mode") == API_MODE_DEMO

# Create singleton instance
api_status_service = ApiStatusService()

def get_api_status_service():
    """Get the API status service singleton"""
    return api_status_service