#!/usr/bin/env python3
"""
Start Python Flask Server

This script starts the Python Flask server with a health check endpoint.
"""

import os
import sys
import time
import logging
import threading
import subprocess
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('start_python_server')

def start_flask_app():
    """Start the Flask application"""
    logger.info("Starting Flask application...")
    
    # Load environment variables
    load_dotenv()
    
    # Add current directory to path
    sys.path.insert(0, os.getcwd())
    
    try:
        # Import the Flask app
        from python_app.app import create_app
        
        # Create the app
        app = create_app()
        
        # Start the app
        app.run(host='0.0.0.0', port=5001, debug=True)
    except Exception as e:
        logger.error(f"Failed to start Flask application: {e}")
        return False
    
    return True

if __name__ == '__main__':
    start_flask_app()