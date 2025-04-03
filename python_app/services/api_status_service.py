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
API_MODE_ERROR = "error"

class ApiStatusService:
    """Service to check and report API connection status"""
    
    def __init__(self):
        """Initialize the service"""
        load_dotenv()
        self.api_mode_file = os.path.join("data", "api_mode.json")
        
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
            "mode": API_MODE_LIVE,
            "reason": "Initial status",
            "timestamp": datetime.utcnow().isoformat(),
            "features": {
                "market_data": "live",
                "trading": "live",
                "account": "live"
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
        # Check direct connection
        direct_status = self._check_direct_connection()
        
        # If direct connection is working, we're good
        if direct_status.get("working", False):
            self._update_status_live(direct_status)
            return self.get_status()
        
        # If direct connection failed, show error without fallback
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
    
    def get_status(self):
        """
        Get current API status
        
        Returns:
            dict: Status information
        """
        return self.status

# Create singleton instance
api_status_service = ApiStatusService()

def get_api_status_service():
    """Get the API status service singleton"""
    return api_status_service