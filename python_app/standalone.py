"""
Standalone Python Application Entry Point

This script is a wrapper around app.py that sets up the Python path correctly
to ensure the python_app module can be imported properly.
"""

import os
import sys
import time
import logging
import argparse
from pathlib import Path

# Get the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Add the project root to the Python path
if project_root not in sys.path:
    sys.path.insert(0, project_root)
    print(f"Added {project_root} to Python path")

# Configure logging
try:
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Configure both file and console logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/python_startup.log'),
            logging.StreamHandler()
        ]
    )
    print("Logging initialized successfully with both console and file handlers")
except Exception as e:
    # Fall back to console-only logging if file handler creation fails
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    print(f"Could not set up file logging, falling back to console only: {e}")

def main():
    """Main entry point for the standalone application"""
    print(f"Python path: {sys.path}")
    logging.info(f"Python path: {sys.path}")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='CryptoTrade Flask Application')
    parser.add_argument('--deferred-init', action='store_true', help='Use deferred initialization for faster startup')
    args = parser.parse_args()
    
    # Set environment variable for deferred initialization
    if args.deferred_init:
        os.environ['DEFERRED_INITIALIZATION'] = 'true'
        print("Using deferred initialization mode")
    
    try:
        # Import and run the Flask application
        from python_app.app import app
        
        # Run the application
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        logging.error(f"Error starting Flask application: {e}", exc_info=True)
        print(f"Error starting Flask application: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()