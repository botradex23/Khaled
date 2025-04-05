#!/usr/bin/env python3
"""
Minimal Flask Application
Provides basic health check endpoint for testing Python service manager
"""

import os
import sys
import logging
import subprocess
import json

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

logger = logging.getLogger('minimal_flask')

# Try to import Flask, install if missing
try:
    from flask import Flask, jsonify
except ImportError:
    logger.info("Flask not found. Attempting to install...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
        from flask import Flask, jsonify
        logger.info("Successfully installed Flask")
    except Exception as e:
        logger.error(f"Failed to install Flask: {str(e)}")
        
        # Fallback to a simple HTTP server if Flask can't be installed
        import http.server
        import socketserver
        
        PORT = int(os.environ.get('PORT', 5001))
        
        class SimpleHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                if self.path == "/api/status":
                    response = {
                        'success': True,
                        'message': 'Fallback HTTP server is running',
                        'service': 'python-fallback',
                        'version': '1.0.0',
                    }
                else:
                    response = {
                        'message': 'Fallback HTTP server is running',
                        'endpoints': ['/api/status'],
                    }
                
                self.wfile.write(json.dumps(response).encode('utf-8'))
        
        logger.info(f"Starting fallback HTTP server on port {PORT}")
        with socketserver.TCPServer(("0.0.0.0", PORT), SimpleHTTPRequestHandler) as httpd:
            httpd.serve_forever()
        
        # Exit the script - we're running the fallback server
        sys.exit(0)

# Create the Flask application
app = Flask(__name__)

# Define a simple status endpoint
@app.route('/api/status')
def status():
    """System status endpoint"""
    return jsonify({
        'success': True,
        'message': 'Minimal Flask application is running',
        'service': 'python-minimal',
        'version': '1.0.0',
    })

# Define a root endpoint
@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'Minimal Flask application is running',
        'endpoints': ['/api/status'],
    })

if __name__ == '__main__':
    # Get port from environment or use default 5001
    port = int(os.environ.get('PORT', 5001))
    
    # Log startup information
    logger.info(f"Starting minimal Flask service on port {port}")
    
    # Run the application
    app.run(host='0.0.0.0', port=port, debug=True)