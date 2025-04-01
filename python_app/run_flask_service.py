"""
Run Binance Market Service as a standalone Flask application

This script starts the Flask application on a specified port and makes it accessible for other services.
"""

import os
import sys
import logging
from app import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s UTC %(levelname)s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 5001))
    
    # Create the Flask application
    app = create_app()
    
    logger.info(f"Starting Binance Market Service Flask application on port {port}")
    logger.info(f"Available routes: {[str(rule) for rule in app.url_map.iter_rules()]}")
    
    # Run the application
    app.run(host='0.0.0.0', port=port, debug=True)