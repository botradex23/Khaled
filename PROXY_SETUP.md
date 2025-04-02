# Binance API Proxy Configuration Utility

This set of utilities helps you configure and test proxies for Binance API connections. If you're experiencing geographical restrictions (HTTP 451 errors) or authentication issues (HTTP 407 errors) when connecting to Binance API, these tools can help you find and configure a working proxy.

## Available Utilities

### 1. JavaScript Proxy Tester (`check_proxy.js`)

Tests multiple proxies from both the WebShare proxy list file and environment variables.

**Features:**
- Loads proxies from `attached_assets/Webshare 3 proxies 3.txt`
- Falls back to environment variables if no proxy file is found
- Tests each proxy with Binance API ping endpoint
- Automatically updates .env file with the best working proxy

**Run with:**
```bash
node check_proxy.js
```

### 2. Python Multi-Proxy Tester (`test_multiple_proxies.py`)

A Python-based utility that tests multiple proxies with different URL encoding methods for authentication.

**Features:**
- Loads proxies from WebShare file
- Tests each proxy with different URL encoding methods (none, quote, quote_plus)
- Updates .env file with the best working proxy and encoding method
- Integrates with the Python Binance SDK

**Run with:**
```bash
python test_multiple_proxies.py
```

### 3. Proxy Connection Fix (`fix_proxy_connection.py`)

An enhanced utility that fixes proxy connection issues by testing different encoding methods and updating configuration files.

**Features:**
- Tests different URL encoding methods for proxy credentials
- Updates .env file with the best configuration
- Updates Python config.py to include encoding method
- Updates Binance service files to use the encoding method

**Run with:**
```bash
python fix_proxy_connection.py
```

### 4. All-in-One Proxy Test (`test_all_proxies.sh`)

A shell script that runs all the proxy testing utilities in sequence.

**Features:**
- Runs all three proxy testing utilities
- Provides a comprehensive testing approach
- Asks if you want to restart the application after tests

**Run with:**
```bash
./test_all_proxies.sh
```

## Proxy File Format

The WebShare proxy file (`attached_assets/Webshare 3 proxies 3.txt`) should have the following format:

```
<IP>:<PORT>:<USERNAME>:<PASSWORD>
<IP>:<PORT>:<USERNAME>:<PASSWORD>
...
```

Example:
```
86.38.234.176:6630:ahjqspco:dzx3r1prpz9k
154.36.110.199:6853:ahjqspco:dzx3r1prpz9k
45.151.162.198:6600:ahjqspco:dzx3r1prpz9k
```

## Troubleshooting

If none of the proxies work, check the following:

1. Verify your API keys are correct in the .env file
2. Make sure the proxies in the WebShare file are valid and active
3. Check if the proxies have access to Binance API (not all proxies do)
4. Try adding more proxies to the WebShare file
5. Check your network connectivity

## Environment Variables

The following environment variables are used by these utilities:

- `PROXY_IP`: Proxy server IP address
- `PROXY_PORT`: Proxy server port
- `PROXY_USERNAME`: Username for proxy authentication
- `PROXY_PASSWORD`: Password for proxy authentication
- `USE_PROXY`: Set to "true" to enable proxy (set by the utilities when a working proxy is found)
- `PROXY_ENCODING_METHOD`: URL encoding method for proxy credentials (none, quote, quote_plus)
- `FALLBACK_TO_DIRECT`: Whether to fall back to direct connection if proxy fails (recommended: true)