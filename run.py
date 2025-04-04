"""
Run the Flask application in development mode
"""

from python_app.app import create_app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)