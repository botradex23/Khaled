"""
CryptoTrade Flask Application

This is the main entry point for the Flask application.
It initializes the app, registers blueprints for API routes, and handles CORS.
It supports deferred initialization for optimized startup.
"""

import os
import sys
import time
import logging
import argparse
from functools import wraps

# Try different import paths for Flask
try:
    from flask import Flask, jsonify, render_template, request, flash, redirect, url_for, session
    from flask_cors import CORS
except ImportError:
    # If that fails, try adding parent directory to path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from flask import Flask, jsonify, render_template, request, flash, redirect, url_for, session 
    from flask_cors import CORS

from python_app.config import active_config
from python_app.routes.binance_routes import binance_bp
from python_app.routes.ml_routes import ml_bp
from python_app.routes.ml_prediction_routes import ml_prediction_bp, register_routes as register_ml_prediction_routes
from python_app.routes.live_prediction_routes import live_prediction_bp, register_routes as register_live_prediction_routes
# Import our new direct binance prices blueprint
from python_app.routes.direct_binance_prices import direct_binance_prices_bp
# Import the trade logs blueprint
try:
    from python_app.routes.trade_logs_routes import trade_logs_bp
except ImportError:
    logging.warning("Could not import Trade Logs blueprint. Trade logging will be limited.")
    trade_logs_bp = None

# We'll import these later to avoid circular imports
# from routes.ai_signals_routes import ai_signals_bp
# from routes.trading_routes import trading_bp
ai_signals_bp = None  # Will be imported later
trading_bp = None  # Will be imported later

# Configure logging
try:
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Configure both file and console logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/api.log'),
            logging.StreamHandler()
        ]
    )
    logging.info("Logging initialized successfully with both console and file handlers")
except Exception as e:
    # Fall back to console-only logging if file handler creation fails
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logging.warning(f"Could not set up file logging, falling back to console only: {e}")

def create_app(config=None):
    """
    Application factory pattern for Flask
    
    Args:
        config: Configuration object to use (defaults to active_config from config.py)
        
    Returns:
        Configured Flask application
    """
    # Create the Flask application
    app = Flask(__name__, 
                template_folder='templates',
                static_folder='static')
    
    # Load configuration
    if config is None:
        app.config.from_object(active_config)
    else:
        app.config.from_object(config)
        
    # Set a secret key for session management (required for flash messages)
    app.secret_key = app.config.get('SECRET_KEY', os.urandom(24))
    
    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints
    app.register_blueprint(binance_bp)
    app.register_blueprint(ml_bp)
    app.register_blueprint(ml_prediction_bp)
    app.register_blueprint(direct_binance_prices_bp)
    logging.info("Direct Binance Prices blueprint registered successfully")
    
    # Register trade logs blueprint if available
    if trade_logs_bp:
        app.register_blueprint(trade_logs_bp)
        logging.info("Trade Logs blueprint registered successfully")
    
    # Conditionally import and register AI Signals blueprint
    try:
        from python_app.routes.ai_signals_routes import ai_signals_bp
        if ai_signals_bp:
            app.register_blueprint(ai_signals_bp)
            logging.info("AI Signals blueprint registered successfully")
    except ImportError as e:
        logging.warning(f"Could not import AI Signals blueprint: {e}")
        logging.warning("AI Signals functionality will not be available")
        
    # Conditionally import and register Trading blueprint
    try:
        from python_app.routes.trading_routes import trading_bp
        if trading_bp:
            app.register_blueprint(trading_bp)
            logging.info("Trading blueprint registered successfully")
    except ImportError as e:
        logging.warning(f"Could not import Trading blueprint: {e}")
        logging.warning("Trading functionality will not be available")
        
    # Conditionally import and register API Keys blueprint
    try:
        from python_app.routes.api_keys_routes import api_keys_bp
        if api_keys_bp:
            app.register_blueprint(api_keys_bp)
            logging.info("API Keys blueprint registered successfully")
    except ImportError as e:
        logging.warning(f"Could not import API Keys blueprint: {e}")
        logging.warning("API Keys management functionality will not be available")
    
    # Register additional routes using custom registration functions
    register_ml_prediction_routes(app)
    register_live_prediction_routes(app)
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        if request.path.startswith('/api/'):
            return jsonify({
                'success': False,
                'message': 'API endpoint not found'
            }), 404
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(500)
    def server_error(error):
        """Handle 500 errors"""
        logging.error(f"Server error: {error}")
        if request.path.startswith('/api/'):
            return jsonify({
                'success': False,
                'message': 'Internal server error'
            }), 500
        return render_template('errors/500.html'), 500
    
    # Add root route
    @app.route('/')
    def index():
        """Root route"""
        return render_template('index.html')
    
    # Dashboard route
    @app.route('/dashboard')
    def dashboard():
        """Dashboard page showing market data"""
        return render_template('dashboard.html')
        
    # ML Predictions route
    @app.route('/ml-predictions')
    def ml_predictions():
        """ML predictions page showing trading signals"""
        return render_template('ml_predictions.html')
    
    # Test flash messages route
    @app.route('/test-flash')
    def test_flash():
        """Test flash message functionality"""
        flash_type = request.args.get('type', 'info')
        redirect_to = request.args.get('redirect', 'index')
        
        if flash_type == 'success':
            flash('Success message example - Operation completed successfully!', 'success')
        elif flash_type == 'error' or flash_type == 'danger':
            flash('Error message example - Something went wrong!', 'error')
        elif flash_type == 'warning':
            flash('Warning message example - Please check your inputs!', 'warning')
        else:
            flash('Info message example - This is an informational message.', 'info')
        
        return redirect(url_for(redirect_to))
    
    # Add system status route
    @app.route('/api/status')
    def status():
        """System status endpoint"""
        return jsonify({
            'success': True,
            'version': '1.0.0',
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'services': {
                'binance': True,
                'ml': True,
                'live_prediction': True,
                'ai_signals': True,
                'trading': True,
                'api_keys': True,
                'trade_logs': bool(trade_logs_bp)
            }
        })
    
    # Add direct prediction endpoint for testing
    @app.route('/api/direct-predict/<symbol>', methods=['GET'])
    def direct_predict_endpoint(symbol):
        """Direct prediction endpoint for testing"""
        import os
        import sys
        import json
        from datetime import datetime
        
        # Add app directory to path
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        # Import the direct prediction function
        try:
            from python_app.direct_test import direct_predict
            
            # Get query parameters
            model_type = request.args.get('model_type', 'balanced')
            
            # Validate model_type
            if model_type not in ['standard', 'balanced']:
                return jsonify({
                    'success': False,
                    'error': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"',
                    'symbol': symbol,
                    'timestamp': datetime.now().isoformat()
                }), 400
            
            # Make prediction
            result = direct_predict(symbol, model_type)
            
            if result:
                return jsonify(result)
            else:
                return jsonify({
                    'success': False,
                    'error': 'Prediction failed',
                    'symbol': symbol,
                    'timestamp': datetime.now().isoformat()
                }), 500
                
        except Exception as e:
            logging.error(f"Error in direct prediction endpoint: {e}", exc_info=True)
            return jsonify({
                'success': False,
                'error': str(e),
                'symbol': symbol,
                'timestamp': datetime.now().isoformat()
            }), 500
    
    return app

# Import utility functions from utils.py
from python_app.utils import flash_message, handle_api_response

# Parse command line arguments
parser = argparse.ArgumentParser(description='CryptoTrade Flask Application')
parser.add_argument('--deferred-init', action='store_true', help='Use deferred initialization for faster startup')
args, unknown = parser.parse_known_args()

# Also check environment variable
deferred_init = args.deferred_init or os.environ.get('DEFERRED_INITIALIZATION') == 'true'

# Create the app first with minimal initialization
app = create_app()

# Add a basic initialization status endpoint
initialization_status = {
    'initialized': False,
    'startup_time': time.time(),
    'deferred_init': deferred_init,
    'pending_components': ['bot_synchronizer', 'queue_integration', 'ml_models']
}

@app.route('/api/initialization-status')
def get_initialization_status():
    """Initialization status endpoint"""
    elapsed = time.time() - initialization_status['startup_time']
    return jsonify({
        **initialization_status,
        'elapsed_seconds': round(elapsed, 2)
    })

# Update status endpoint to handle pre-initialization state
@app.route('/api/bot-sync/status')
def bot_sync_status():
    """Bot synchronization status endpoint"""
    if not initialization_status['initialized']:
        return jsonify({
            'success': True,
            'bot_sync_available': False,
            'message': 'System still initializing, please try again later',
            'initialized': False
        })
    
    if bot_synchronizer:
        active_bots = len(bot_synchronizer.bot_states)
        collisions = len(bot_synchronizer.collision_history)
        active_trades = sum(len(trades) for trades in bot_synchronizer.active_trades.values())
        return jsonify({
            'success': True,
            'bot_sync_available': True,
            'active_bots': active_bots,
            'trade_collisions_prevented': collisions,
            'active_trades': active_trades,
            'initialized': True
        })
    else:
        return jsonify({
            'success': True,
            'bot_sync_available': False,
            'message': 'Bot synchronization service not available',
            'initialized': True
        })

# Function to initialize remaining components in the background
def initialize_remaining_components():
    """Initialize remaining components in a background thread"""
    global bot_synchronizer
    
    logging.info("Starting deferred initialization...")
    start_time = time.time()
    
    try:
        # Initialize bot synchronization
        try:
            from python_app.services.coordination import bot_synchronizer
            logging.info("Bot Synchronizer initialized successfully")
            initialization_status['pending_components'].remove('bot_synchronizer')
            
            # Initialize queue-bot integration
            try:
                from python_app.services.queue.queue_bot_integration import is_integrated
                if is_integrated:
                    logging.info("Trade Queue-Bot Integration initialized successfully")
                else:
                    logging.warning("Trade Queue-Bot Integration failed to initialize")
                initialization_status['pending_components'].remove('queue_integration')
            except ImportError as e:
                logging.warning(f"Could not import Queue-Bot Integration: {e}")
                initialization_status['pending_components'].remove('queue_integration')
        except ImportError as e:
            logging.warning(f"Could not initialize Bot Synchronizer: {e}")
            bot_synchronizer = None
            initialization_status['pending_components'].remove('bot_synchronizer')
        
        # Initialize ML models and other heavy components
        try:
            # Placeholder for ML model initialization
            time.sleep(1)  # Simulate heavy initialization
            initialization_status['pending_components'].remove('ml_models')
            logging.info("ML models initialized successfully")
        except Exception as e:
            logging.warning(f"Error initializing ML models: {e}")
            initialization_status['pending_components'].remove('ml_models')
        
        # Mark initialization as complete
        initialization_status['initialized'] = True
        elapsed = time.time() - start_time
        logging.info(f"Deferred initialization completed in {elapsed:.2f} seconds")
        
    except Exception as e:
        logging.error(f"Error during deferred initialization: {e}", exc_info=True)
        # Mark as initialized anyway to avoid being stuck
        initialization_status['initialized'] = True

# Start initialization based on mode
if deferred_init:
    logging.info("Using deferred initialization. Basic endpoints available immediately.")
    # Will initialize components in background after server starts
    bot_synchronizer = None  # Initialize as None for now
else:
    logging.info("Using immediate initialization. Server will be ready after full initialization.")
    # Initialize bot synchronization immediately
    try:
        from python_app.services.coordination import bot_synchronizer
        logging.info("Bot Synchronizer initialized successfully")
        
        # Initialize queue-bot integration
        try:
            from python_app.services.queue.queue_bot_integration import is_integrated
            if is_integrated:
                logging.info("Trade Queue-Bot Integration initialized successfully")
            else:
                logging.warning("Trade Queue-Bot Integration failed to initialize")
        except ImportError as e:
            logging.warning(f"Could not import Queue-Bot Integration: {e}")
    except ImportError as e:
        logging.warning(f"Could not initialize Bot Synchronizer: {e}")
        bot_synchronizer = None
    
    # Mark initialization as complete
    initialization_status['initialized'] = True
    initialization_status['pending_components'] = []

if __name__ == '__main__':
    # If using deferred init and this is the main thread, start background initialization
    if deferred_init:
        import threading
        init_thread = threading.Thread(target=initialize_remaining_components)
        init_thread.daemon = True
        init_thread.start()
    
    # Run the application (development)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=active_config.DEBUG)
    
# Fix missing import in error handlers - already imported at the top
# from flask import request