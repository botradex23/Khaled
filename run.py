"""
Run the Flask application in development mode.

This script sets up the Python environment and starts the Flask server.
It's meant to be called directly or by the workflow-run.js script.
"""

import os
import sys
from pathlib import Path
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

def has_python_app():
    """Check if we have a Python app structure"""
    return (
        Path("python_app").exists() and 
        Path("python_app/app.py").exists()
    )

def run_python_app():
    """Run the Python application"""
    logger.info("Starting Python application...")
    
    # Check if we should run the main app directly or use a specific entry point
    if has_python_app():
        logger.info("Found python_app/app.py - running that")
        python_path = str(Path.cwd())
        env = os.environ.copy()
        env["PYTHONPATH"] = f"{python_path}:{env.get('PYTHONPATH', '')}"
        
        try:
            subprocess.run(
                [sys.executable, "python_app/app.py"], 
                env=env,
                check=True
            )
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to run python_app/app.py: {e}")
            return False
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt, shutting down...")
            return True
            
        return True
    else:
        logger.error("No Python application structure found")
        return False

def run_flask_app():
    """Run a minimal Flask app as fallback"""
    try:
        # Try to import Flask
        from flask import Flask, jsonify
        from flask_cors import CORS
    except ImportError:
        logger.error("Flask not installed. Trying to install...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "flask-cors"])
            from flask import Flask, jsonify
            from flask_cors import CORS
        except Exception as e:
            logger.error(f"Failed to install Flask: {e}")
            return False
    
    app = Flask(__name__, static_folder="public")
    CORS(app)
    
    @app.route('/api/status')
    def status():
        return jsonify({
            "status": "ok",
            "message": "Python fallback server running",
            "python_version": sys.version
        })
    
    @app.route('/')
    def index():
        return "Python fallback server running. The main application seems to be having issues."
    
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting minimal Flask server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
    return True

def main():
    """Main entry point"""
    logger.info("Python runner script starting")
    
    # Try to run the full Python app if it exists
    if has_python_app():
        success = run_python_app()
        if success:
            return
    
    # Otherwise run a minimal Flask app as fallback
    logger.info("Falling back to minimal Flask app")
    run_flask_app()

if __name__ == "__main__":
    main()