#!/usr/bin/env python3
"""
Flask Application Runner

This is a simplified entry point for running the Flask application.
It handles path setup and proper module imports.
"""

import os
import sys
import logging

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

logger = logging.getLogger('flask_runner')

def main():
    """Main entry point for running the Flask application"""
    # Add the current directory to the Python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    logger.info(f"Current directory: {current_dir}")
    logger.info(f"Python path: {sys.path}")
    
    try:
        # Import app module from python_app directory
        from python_app.app import create_app
        from python_app.config import active_config
        
        # Get environment setting
        env = os.environ.get('FLASK_ENV', 'development')
        debug = env == 'development'
        
        # Define the port to run the service on
        port = int(os.environ.get('PORT', 5001))
        
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
    except Exception as e:
        logger.error(f"Error starting Flask application: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()