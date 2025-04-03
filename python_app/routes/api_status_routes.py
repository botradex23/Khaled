"""
API Status Routes

API endpoints to check the status of external APIs (Binance, etc.)
"""

from flask import Blueprint, jsonify
from ..services.api_status_service import get_api_status_service

# Create blueprint
api_status_bp = Blueprint('api_status', __name__)

@api_status_bp.route('/api/status', methods=['GET'])
def get_api_status():
    """
    Get the current API status
    
    Returns:
        JSON: API status information
    """
    api_status_service = get_api_status_service()
    status = api_status_service.get_status()
    return jsonify(status)

@api_status_bp.route('/api/status/check', methods=['GET'])
def check_api_status():
    """
    Check API connections and get updated status
    
    Returns:
        JSON: Updated API status information
    """
    api_status_service = get_api_status_service()
    status = api_status_service.check_binance_api()
    return jsonify(status)

@api_status_bp.route('/api/status/demo', methods=['GET'])
def is_demo_mode():
    """
    Check if the system is in demo mode
    
    Returns:
        JSON: Demo mode status
    """
    api_status_service = get_api_status_service()
    is_demo = api_status_service.is_demo_mode()
    return jsonify({"demo_mode": is_demo})