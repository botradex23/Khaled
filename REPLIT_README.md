# CryptoTrade: Replit Configuration Guide

## Getting Started on Replit

This document provides Replit-specific instructions for running and deploying the CryptoTrade cryptocurrency trading platform.

## Running the Application

### Using the Replit Workflow

1. Click the **Run** button in the Replit interface 
2. The workflow will automatically start both the Node.js and Python servers
3. Access the application via the Webview when it loads

### Manual Start (if needed)

If the workflow isn't working, you can manually start the application:

```bash
./run_app.sh
```

This script will:
1. Start the Node.js server on port 5000
2. Start the Python API server on port 5001
3. Connect the two servers together

## How It Works

The application uses a hybrid architecture:

1. **Node.js Server** (port 5000):
   - Serves the frontend web application
   - Handles API proxying to the Python server
   - Provides status endpoints

2. **Python Flask Server** (port 5001):
   - Connects to the Binance API using official SDK 
   - Manages proxy configuration for geo-restricted regions
   - Provides cryptocurrency market data
   - Executes ML predictions and trading algorithms

## Proxy Configuration

The application is configured to use proxies for accessing the Binance API from geo-restricted regions. Four proxies have been tested and confirmed working:

- 45.151.162.198:6600
- 185.199.229.156:7492
- 185.199.228.220:7300
- 161.123.152.115:6360

The system automatically rotates between these proxies to maintain API connectivity.

## Environment Variables

The following environment variables are used by the application:

```
# Binance API credentials
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key

# Proxy configuration
PROXY_IP=proxy_ip_address
PROXY_PORT=proxy_port
PROXY_USERNAME=proxy_username
PROXY_PASSWORD=proxy_password

# Optional alternate proxy
NEW_PROXY_IP=alternate_proxy_ip
NEW_PROXY_PORT=alternate_proxy_port
NEW_PROXY_USERNAME=alternate_proxy_username
NEW_PROXY_PASSWORD=alternate_proxy_password

# Telegram notification (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id
```

## Troubleshooting

### Workflow Not Starting

If the workflow doesn't start properly:

1. Try running `./run_app.sh` manually in the Shell
2. Check for errors in the console output
3. Verify that all required Python packages are installed

### Proxy Connection Issues

If the proxies aren't working:

1. Run `python fix_proxy_connection.py` to test and fix proxy connections
2. Try updating to new proxy credentials in the environment variables
3. Check if Binance API is accessible from your region directly with `python direct_connection_test.py`

### API Key Verification

Test your Binance API keys with:

```bash
node check_binance_api_keys.cjs
```

## Deployment from Replit

To deploy the application from Replit:

1. Open the Deployment panel in Replit
2. Click "Deploy" to create a new deployment
3. The application will be deployed with all environment variables
4. After deployment, you'll receive a unique URL to access your app

## Additional Resources

For more information, see:
- [Main README.md](./README.md) - General project documentation
- [API Documentation](./API.md) - API reference
- [Installation Guide](./INSTALLATION.md) - Detailed setup instructions
- [Proxy Setup Guide](./PROXY_SETUP.md) - Detailed proxy configuration
