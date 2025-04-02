"""
Flask utilities for flash messages and API responses.
"""

import logging
from typing import Dict, Any, Optional, Union, List
from flask import flash, jsonify

def flash_message(message: str, category: str = 'info') -> None:
    """
    Flash a message to the user
    
    Args:
        message: The message to flash
        category: The category of the message ('success', 'info', 'warning', 'error')
    """
    flash(message, category)

def handle_api_response(
    data: Optional[Union[Dict[str, Any], List[Any]]] = None, 
    success: bool = True, 
    message: Optional[str] = None, 
    status_code: int = 200
) -> tuple:
    """
    Handle a standard API response with consistent formatting
    
    Args:
        data: The data to return
        success: Whether the request was successful
        message: A message to include in the response
        status_code: The HTTP status code to return
        
    Returns:
        A tuple of (response_json, status_code)
    """
    response = {
        'success': success
    }
    
    if data is not None:
        response['data'] = data
    
    if message is not None:
        response['message'] = message
    
    return jsonify(response), status_code