# Proxy Setup Guide for Binance API Access

This guide provides instructions for setting up and troubleshooting proxy connections to access the Binance API from geo-restricted locations.

## Table of Contents

1. [Background](#background)
2. [Proxy Configuration](#proxy-configuration)
3. [Testing Proxy Connections](#testing-proxy-connections)
4. [Troubleshooting](#troubleshooting)
5. [Updating Proxy Settings](#updating-proxy-settings)
6. [Advanced Configuration](#advanced-configuration)

## Background

Binance API access is geo-restricted in certain locations. This system incorporates proxy support to ensure consistent functionality regardless of location. When properly configured, the application will transparently handle API requests through a proxy server.

If Binance is not geo-restricted in your location, you can disable the proxy by setting `USE_PROXY=false` in your `.env` file.

## Proxy Configuration

Proxy settings are configured in the `.env` file at the root of the project. Here are the essential configuration parameters:

```
# Proxy Settings
USE_PROXY=true                   # Enable/disable proxy (true/false)
PROXY_IP=your.proxy.ip           # Proxy server IP address
PROXY_PORT=port                  # Proxy server port
PROXY_USERNAME=username          # Proxy authentication username
PROXY_PASSWORD=password          # Proxy authentication password
FALLBACK_TO_DIRECT=true          # Whether to fall back to direct connection if proxy fails
PROXY_PROTOCOL=http              # Protocol (http/https)
PROXY_ENCODING_METHOD=quote_plus # URL encoding method for credentials
```

## Testing Proxy Connections

The system includes several testing scripts to verify your proxy connection:

### Quick Proxy Test

```bash
python test_proxy_connection.py
```

This script will test your current proxy configuration from `.env` and show if it can connect to Binance API.

### Testing Multiple Proxies

```bash
python test_proxy_list.py
```

This utility tests multiple proxies from a list and identifies which ones work best for accessing Binance API. It will update your `.env` with the best working proxy.

### Direct Proxy Update and Test

To update and test a specific proxy configuration:

```bash
python python_app/update_proxy_settings.py <proxy_ip> <proxy_port> <username> <password>
```

Example:
```bash
python python_app/update_proxy_settings.py 86.38.234.176 6630 ahjqspco dzx3r1prpz9k
```

## Troubleshooting

### Common Issues and Solutions

#### 407 Proxy Authentication Required

This error occurs when proxy credentials are not properly formatted or encoded.

**Solution**: Run the fix script to test different URL encoding methods:

```bash
python fix_proxy_connection.py
```

#### 451 Service Unavailable from Restricted Location

This indicates that the proxy IP is also in a geo-restricted region.

**Solution**: Try a different proxy from a non-restricted region.

```bash
python test_proxy_list.py
```

#### API Authentication Errors

If you see messages like "Invalid API-key, IP, or permissions for action", your API key may have IP restrictions that don't include the proxy IP.

**Solution**: Update your Binance API key settings to include the proxy IP address or remove IP restrictions.

### Connection Diagnostics

To perform a comprehensive diagnostic check:

```bash
python test_binance_connection_fixed.py
```

This will provide detailed information about connection status, API access, and any errors encountered.

## Updating Proxy Settings

### Automatic Update

The `fix_proxy_connection.py` script automatically:

1. Tests different URL encoding methods for proxy credentials
2. Updates the `.env` file with the most effective method
3. Applies changes to Python configuration files
4. Verifies the connection after applying fixes

To run the automatic update:

```bash
python fix_proxy_connection.py
```

### Manual Update

1. Edit the `.env` file directly with your new proxy settings
2. Restart the application to apply changes

```bash
# Edit .env file
nano .env

# Restart the application
npm run dev
```

## Advanced Configuration

### URL Encoding Methods

The system supports three URL encoding methods for proxy credentials:

- `none`: No encoding (use raw credentials)
- `quote`: Standard URL encoding (spaces become '%20')
- `quote_plus`: Enhanced URL encoding (spaces become '+')

Most proxy servers work best with `quote_plus` encoding, but some may require different methods depending on their configuration.

### Fallback Behavior

When `FALLBACK_TO_DIRECT=true`, the system will attempt to connect directly to Binance API if the proxy connection fails. This provides better resilience but may expose your actual IP address to Binance.

To ensure strict proxy usage only, set `FALLBACK_TO_DIRECT=false`.

### WebSocket Configuration

The WebSocket connection for real-time data also uses a proxy, configured separately in the code. If you're experiencing issues with real-time updates, check the WebSocket proxy settings in `client/src/services/binanceWebSocket.ts`.

---

## Additional Resources

For more detailed information about proxy authentication methods and troubleshooting, see:

- [PROXY_AUTHENTICATION.md](./PROXY_AUTHENTICATION.md) - Details on proxy authentication methods and URL encoding
- [Binance API Documentation](https://binance-docs.github.io/apidocs/spot/en/) - Official Binance API documentation