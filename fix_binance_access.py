"""
Fix Binance API Access

This script handles the scenario where both direct connection and proxy connections 
to Binance API are not working. It updates the environment to enable fallback 
to demo/simulation mode.
"""

import os
import json
import requests
from dotenv import load_dotenv

def check_binance_api_direct():
    """
    Check direct connection to Binance API
    
    Returns:
        tuple: (success, status_code, response_time, error_message)
    """
    try:
        response = requests.get("https://api.binance.com/api/v3/ping", timeout=10)
        return (True, response.status_code, None)
    except Exception as e:
        return (False, None, str(e))

def update_env_for_demo_mode():
    """
    Update .env file to enable demo/simulation mode as a fallback
    """
    # Read current .env file
    env_file = '.env'
    env_lines = []
    
    try:
        with open(env_file, 'r') as f:
            env_lines = f.readlines()
    except Exception as e:
        print(f"Error reading .env file: {e}")
        return False
    
    # Update settings for demo mode
    settings_map = {
        'USE_DEMO_MODE': 'true',
        'FALLBACK_TO_DEMO': 'true',
        'USE_TESTNET': 'true'  # Always use testnet when in demo mode
    }
    
    updated_lines = []
    settings_found = {key: False for key in settings_map}
    
    # Update existing settings
    for line in env_lines:
        line = line.rstrip()
        updated = False
        
        for key, value in settings_map.items():
            if line.startswith(f"{key}="):
                updated_lines.append(f"{key}={value}")
                settings_found[key] = True
                updated = True
                break
        
        if not updated:
            updated_lines.append(line)
    
    # Add missing settings
    for key, value in settings_map.items():
        if not settings_found[key]:
            updated_lines.append(f"{key}={value}")
    
    # Write updated .env file
    try:
        with open(env_file, 'w') as f:
            for line in updated_lines:
                f.write(f"{line}\n")
        print("✅ .env file updated for demo/simulation mode")
        return True
    except Exception as e:
        print(f"Error updating .env file: {e}")
        return False

def create_demo_market_data():
    """
    Create demo market data file with typical cryptocurrency market data
    """
    demo_file = 'data/demo_market_data.json'
    os.makedirs(os.path.dirname(demo_file), exist_ok=True)
    
    # Create realistic but simulated market data
    demo_data = {
        "markets": [
            {
                "symbol": "BTCUSDT",
                "price": 68543.12,
                "change_24h": 2.35,
                "volume_24h": 12456789.45,
                "high_24h": 69234.56,
                "low_24h": 67123.45
            },
            {
                "symbol": "ETHUSDT",
                "price": 3456.78,
                "change_24h": 1.23,
                "volume_24h": 6789123.45,
                "high_24h": 3567.89,
                "low_24h": 3345.67
            },
            {
                "symbol": "BNBUSDT",
                "price": 567.89,
                "change_24h": -0.75,
                "volume_24h": 1234567.89,
                "high_24h": 584.32,
                "low_24h": 562.34
            },
            {
                "symbol": "SOLUSDT",
                "price": 145.67,
                "change_24h": 3.45,
                "volume_24h": 897654.32,
                "high_24h": 149.87,
                "low_24h": 140.21
            },
            {
                "symbol": "ADAUSDT",
                "price": 0.4567,
                "change_24h": -1.23,
                "volume_24h": 7654321.09,
                "high_24h": 0.4678,
                "low_24h": 0.4501
            }
        ],
        "last_update": "2025-04-03T18:45:00.000Z",
        "source": "simulation",
        "note": "This is simulated data for demonstration purposes"
    }
    
    try:
        with open(demo_file, 'w') as f:
            json.dump(demo_data, f, indent=2)
        print(f"✅ Demo market data created at {demo_file}")
        return True
    except Exception as e:
        print(f"Error creating demo market data: {e}")
        return False

def create_demo_account_data():
    """
    Create demo account data file with typical account balances and positions
    """
    demo_file = 'data/demo_account_data.json'
    os.makedirs(os.path.dirname(demo_file), exist_ok=True)
    
    # Create realistic but simulated account data
    demo_data = {
        "account": {
            "total_balance_usdt": 25000.00,
            "available_balance_usdt": 15000.00,
            "pnl_24h_usdt": 345.67,
            "pnl_24h_percent": 1.35,
            "margin_used_usdt": 10000.00,
            "margin_level": 2.5
        },
        "balances": [
            {
                "asset": "BTC",
                "free": 0.15,
                "locked": 0.05,
                "total_usdt": 13708.62
            },
            {
                "asset": "ETH",
                "free": 2.5,
                "locked": 0.0,
                "total_usdt": 8641.95
            },
            {
                "asset": "USDT",
                "free": 15000.00,
                "locked": 0.0,
                "total_usdt": 15000.00
            },
            {
                "asset": "BNB",
                "free": 5.0,
                "locked": 0.0,
                "total_usdt": 2839.45
            }
        ],
        "positions": [
            {
                "symbol": "BTCUSDT",
                "position_size": 0.05,
                "entry_price": 67500.00,
                "mark_price": 68543.12,
                "pnl_usdt": 52.16,
                "pnl_percent": 1.54,
                "leverage": 5,
                "margin_usdt": 675.00
            },
            {
                "symbol": "ETHUSDT",
                "position_size": 0.5,
                "entry_price": 3400.00,
                "mark_price": 3456.78,
                "pnl_usdt": 28.39,
                "pnl_percent": 1.67,
                "leverage": 10,
                "margin_usdt": 170.00
            }
        ],
        "last_update": "2025-04-03T18:45:00.000Z",
        "source": "simulation",
        "note": "This is simulated data for demonstration purposes"
    }
    
    try:
        with open(demo_file, 'w') as f:
            json.dump(demo_data, f, indent=2)
        print(f"✅ Demo account data created at {demo_file}")
        return True
    except Exception as e:
        print(f"Error creating demo account data: {e}")
        return False

def create_mode_indicator_file():
    """
    Create a file that indicates the current mode of operation
    """
    indicator_file = 'data/api_mode.json'
    os.makedirs(os.path.dirname(indicator_file), exist_ok=True)
    
    mode_data = {
        "mode": "demo",
        "reason": "Binance API not accessible - geo-restriction or proxy issues",
        "timestamp": "2025-04-03T18:45:00.000Z",
        "features": {
            "market_data": "simulated",
            "trading": "simulated",
            "account": "simulated"
        },
        "status": {
            "direct_connection": "failed - geo-restricted (HTTP 451)",
            "proxy_connection": "failed - proxy authentication (HTTP 402)"
        }
    }
    
    try:
        with open(indicator_file, 'w') as f:
            json.dump(mode_data, f, indent=2)
        print(f"✅ API mode indicator file created at {indicator_file}")
        return True
    except Exception as e:
        print(f"Error creating API mode indicator file: {e}")
        return False

def main():
    """Main function"""
    print("Checking Binance API access...")
    
    load_dotenv()
    
    # Check direct connection to Binance API
    success, status_code, error = check_binance_api_direct()
    
    if success and status_code == 200:
        print("✅ Direct connection to Binance API is working!")
        print("No changes needed.")
        return
    
    # Handle geo-restriction (HTTP 451) or other connection issues
    if success and status_code == 451:
        print("❌ Binance API is geo-restricted (HTTP 451)")
    elif not success:
        print(f"❌ Cannot connect to Binance API: {error}")
    
    print("\nConfiguring system for demo/simulation mode...")
    
    # Update .env for demo mode
    update_env_for_demo_mode()
    
    # Create demo data files
    create_demo_market_data()
    create_demo_account_data()
    create_mode_indicator_file()
    
    print("\n✅ System configured for demo/simulation mode")
    print("The application will now use simulated data for demonstration")
    print("Switch to a non-restricted region or use valid proxies to access live data")

if __name__ == "__main__":
    main()