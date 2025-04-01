"""
WSGI entry point for production deployment

This file is used by WSGI servers like Gunicorn to run the Flask application in production.
"""

import os
from python_app.app import create_app

# Create the application with production configuration
application = create_app()

if __name__ == "__main__":
    # This block will be executed when running directly with Python
    port = int(os.environ.get("PORT", 5000))
    application.run(host="0.0.0.0", port=port)