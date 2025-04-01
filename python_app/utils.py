"""
CryptoTrade Utility Functions

This module contains utility functions used throughout the application.
"""

import logging
from flask import flash, redirect, jsonify

def flash_message(message, category="info"):
    """
    Flash a message with the specified category
    Categories: success, info, warning, error
    """
    flash(message, category)

def handle_api_response(response, success_msg=None, error_msg=None, redirect_url=None):
    """
    Handle API responses consistently
    
    Args:
        response: JSON response from API
        success_msg: Message to flash on success (optional)
        error_msg: Message to flash on error (optional)
        redirect_url: URL to redirect to after flashing message (optional)
        
    Returns:
        Either the original response or a redirect
    """
    try:
        if isinstance(response, tuple):
            data, status_code = response
        else:
            data, status_code = response, 200
            
        # Handle success (2xx status codes)
        if 200 <= status_code < 300:
            if success_msg:
                flash(success_msg, 'success')
        # Handle errors
        else:
            message = error_msg
            if not message and isinstance(data, dict) and 'message' in data:
                message = data['message']
            if message:
                flash(message, 'error')
        
        # Redirect if URL provided, otherwise return the response
        if redirect_url:
            return redirect(redirect_url)
        return response
        
    except Exception as e:
        logging.error(f"Error handling API response: {e}")
        if error_msg:
            flash(error_msg, 'error')
        if redirect_url:
            return redirect(redirect_url)
        return jsonify({'success': False, 'message': str(e)}), 500