#!/usr/bin/env python3
"""
Flask Service Runner

This script is designed to run the Flask application as a standalone service.
It is called by the Node.js application to start the ML Flask service.
"""

import os
import sys
import logging

# Add parent directory to path to make local imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Local imports
from python_app.app import create_app
from python_app.config import active_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)

logger = logging.getLogger('python_flask_service')

def main():
    """
    Main entry point for running the Flask application as a service
    """
    # Define the port to run the service on
    port = int(os.environ.get('PORT', 5001))
    
    # Get environment setting
    env = os.environ.get('FLASK_ENV', 'development')
    debug = env == 'development'
    
    # Log startup information
    logger.info(f"Starting Flask service on port {port} in {env} mode")
    logger.info(f"Debug mode: {debug}")
    
    # Create and run the application
    app = create_app(active_config)
    
    # Output environment information
    logger.info(f"Environment: {env}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Using direct Binance SDK integration")
    logger.info(f"Binance test mode: {active_config.USE_TESTNET}")
    logger.info(f"API key available: {bool(active_config.BINANCE_API_KEY)}")
    
    # Run the application
    app.run(host='0.0.0.0', port=port, debug=debug, use_reloader=False)

if __name__ == '__main__':
    main()